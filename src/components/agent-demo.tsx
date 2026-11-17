"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Avatar } from "@registry/avatar/avatar";
import { Button } from "@registry/button/button";
import { CodeBlock } from "@registry/code-block/code-block";
import { Icon } from "@registry/icons/icons";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import styles from "./agent-demo.module.css";
import slop from "./agent-demo-without.module.css";

/* One prompt, built twice and laid one over the other. A divider splits
   them: what an agent writes on its own to the left of it, the same screen
   with UI Polish connected to the right, with the same parts in the same
   places. Both are frozen at the same moment, the one that tells them
   apart: one refund just sent, one that failed, one in flight and one
   waiting. The screens are stills, so they're inert and nothing in them
   moves; the slider is the one control.
   In a narrow frame (a phone) a divider would leave each screen half a
   phone wide, so there the slider gives way to a segmented control above
   the frame: one screen at a time, full width, crossfading, with the frame
   gliding to the height of the one shown. CSS picks the mode (a container
   query on the demo); the script reads it off whether the control shows. */

const PROMPT = "> Add a screen where hosts approve refunds Copper wants to send.";

/* The moment both screens show: where each refund is. */
type State = "sent" | "failed" | "sending" | "waiting";

const REFUNDS: { id: string; name: string; reason: string; amount: string; cents: number; state: State }[] = [
  { id: "alexandria", name: "Alexandria Konstantinopoulou-Whitfield", reason: "Cancelled three days before Friday supper", amount: "$48.00", cents: 4800, state: "sent" },
  { id: "priya", name: "Priya Natarajan", reason: "Shellfish course swapped without notice", amount: "$18.00", cents: 1800, state: "failed" },
  { id: "theo", name: "Theo Okafor", reason: "Charged twice for one seat", amount: "$62.00", cents: 6200, state: "sending" },
  { id: "marcus", name: "Marcus Bell", reason: "Wine pairing never arrived", amount: "$36.00", cents: 3600, state: "waiting" },
];

const RAW = `{"message":"Network Error","code":"ERR_BAD_RESPONSE","status":500}`;

/* ---- The divider is a small physical object ----
   Held, it is wherever the pointer is. Let go, it keeps the pointer's
   velocity and coasts to a stop on friction. Anything that sends it to a
   place (an arrow key, Home or End, a fling into an
   edge) runs one critically damped spring, so it all feels like one thing.
   It never moves on its own: it rests in the middle until someone drags it,
   presses the frame or uses a key.
   Positions are percent of the frame's width, velocities percent a second. */

/** Friction, per second: velocity falls by e^(-F t), so a release at v rests v / F further on. */
const FRICTION = 5.5;
/** The spring's natural frequency, per second (stiffness 256, critically damped). */
const SPRING = 16;
/** A fling that would come to rest within this many percent of an edge settles onto it. */
const EDGE = 6;
/** Below this speed a release is a placement, not a fling. */
const FLING = 20;
/** Release velocity is measured over the pointer's last 80ms (or its last two
    reports, if they're sparser), and is zero if it was still for 50ms. */
const VELOCITY_WINDOW = 80;
const STILL = 50;
const MAX_SPEED = 900;
const REST_SPEED = 0.5;

const STEP = 5;

type Motion =
  | { kind: "coast"; x0: number; v0: number; t0: number }
  /* d(t) = (d0 + b t) e^(-w t), the distance left to the target. */
  | { kind: "spring"; target: number; d0: number; b: number; w: number; t0: number };

const clamp = (n: number) => Math.min(100, Math.max(0, n));

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Where a motion is at time `now` (ms), how fast it's going, and whether it has stopped. */
function sample(m: Motion, now: number) {
  const t = Math.max(0, now - m.t0) / 1000;
  if (m.kind === "coast") {
    const decay = Math.exp(-FRICTION * t);
    const v = m.v0 * decay;
    const x = m.x0 + (m.v0 / FRICTION) * (1 - decay);
    return { x: clamp(x), v, done: Math.abs(v) < REST_SPEED };
  }
  const decay = Math.exp(-m.w * t);
  const d = (m.d0 + m.b * t) * decay;
  const v = (m.b - m.w * (m.d0 + m.b * t)) * decay;
  const done = Math.abs(d) < 0.02 && Math.abs(v) < REST_SPEED;
  return { x: clamp(done ? m.target : m.target + d), v, done };
}

/** A spring from x, moving at v, to target. Stiffened just enough that it can't pass the target. */
function spring(x: number, v: number, target: number, now: number): Motion {
  const d0 = x - target;
  // It crosses the target only if b = v + w d0 has the opposite sign to d0.
  const w = d0 !== 0 ? Math.max(SPRING, -v / d0) : SPRING;
  return { kind: "spring", target, d0, b: v + w * d0, w, t0: now };
}

export function AgentDemo({ className }: { className?: string }) {
  const [value, setValue] = useState(50);
  const [dragging, setDragging] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const pos = useRef(50);
  const motion = useRef<Motion | null>(null);
  const raf = useRef(0);
  const grab = useRef<{ offset: number; samples: { t: number; x: number }[] } | null>(null);
  // Phones only: which screen shows, and whether the switch is in use.
  const [view, setView] = useState<"without" | "with">("with");
  const [compact, setCompact] = useState(false);
  const switcher = useRef<HTMLDivElement>(null);
  const before = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLDivElement>(null);

  // The switch is displayed only under the container query, so its size
  // says which mode the CSS chose: no second breakpoint to keep in step.
  useEffect(() => {
    const el = switcher.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setCompact(el.offsetWidth > 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // On a phone the frame is as tall as the screen it shows, so the shorter
  // one isn't left with a gap under it. The layers keep their own heights
  // there; the frame's height follows the shown one (the CSS glides it).
  useLayoutEffect(() => {
    const el = frame.current;
    const shown = (view === "with" ? after : before).current;
    if (!el || !shown) return;
    if (!compact) {
      el.style.removeProperty("--frame-h");
      return;
    }
    const fit = () => el.style.setProperty("--frame-h", `${shown.offsetHeight}px`);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(shown);
    return () => observer.disconnect();
  }, [compact, view]);

  // Painting skips React: the clips, divider and handle all read one custom
  // property, so a frame is one style write and a repaint, never a layout.
  function paint(x: number) {
    pos.current = x;
    frame.current?.style.setProperty("--compare-pos", `${x}%`);
    setValue(Math.round(x));
  }

  function stop() {
    cancelAnimationFrame(raf.current);
    motion.current = null;
  }

  function run(next: Motion) {
    motion.current = next;
    cancelAnimationFrame(raf.current);
    const tick = (now: number) => {
      const m = motion.current;
      if (!m) return;
      const s = sample(m, now);
      paint(s.x);
      if (s.done) motion.current = null;
      else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  /** Where it is and how fast it's going right now, mid-motion or not. */
  function current(now: number) {
    return motion.current ? sample(motion.current, now) : { x: pos.current, v: 0 };
  }

  function glideTo(target: number) {
    if (reducedMotion()) {
      stop();
      paint(target);
      return;
    }
    const now = performance.now();
    const { x, v } = current(now);
    run(spring(x, v, target, now));
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function pointerX(clientX: number) {
    const box = frame.current?.getBoundingClientRect();
    return box && box.width > 0 ? ((clientX - box.left) / box.width) * 100 : null;
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || compact) return;
    const x = pointerX(event.clientX);
    if (x === null) return;
    stop();
    event.currentTarget.setPointerCapture(event.pointerId);
    // Grabbed by the handle, it keeps where the finger took hold; pressed
    // anywhere else, the divider comes to the finger.
    const onHandle = (event.target as Element).closest("[role=slider]") !== null;
    const offset = onHandle ? x - pos.current : 0;
    grab.current = { offset, samples: [{ t: event.timeStamp, x: clamp(x - offset) }] };
    setDragging(true);
    paint(clamp(x - offset));
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const g = grab.current;
    if (!g) return;
    const x = pointerX(event.clientX);
    if (x === null) return;
    const next = clamp(x - g.offset);
    g.samples.push({ t: event.timeStamp, x: next });
    while (g.samples.length > 2 && event.timeStamp - g.samples[1].t > VELOCITY_WINDOW) g.samples.shift();
    paint(next);
  }

  function release(event: PointerEvent<HTMLDivElement>, fling: boolean) {
    const g = grab.current;
    if (!g) return;
    grab.current = null;
    setDragging(false);
    if (!fling || reducedMotion()) return;
    // From the oldest sample in the window, or the one just before it when
    // the pointer reports sparsely, to the newest.
    const last = g.samples[g.samples.length - 1];
    const inside = g.samples.findIndex((s) => last.t - s.t <= VELOCITY_WINDOW);
    const first = g.samples[inside > 0 && inside === g.samples.length - 1 ? inside - 1 : inside];
    if (!first || event.timeStamp - last.t > STILL || last.t - first.t < 8 || last.t - first.t > VELOCITY_WINDOW * 2)
      return;
    const v = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, ((last.x - first.x) / (last.t - first.t)) * 1000));
    if (Math.abs(v) < FLING) return;
    const x = pos.current;
    const rest = x + v / FRICTION;
    const now = performance.now();
    // Headed into an edge, or to rest just short of one: the spring takes it
    // the rest of the way and lands it there without a knock.
    if (rest <= EDGE) run(spring(x, v, 0, now));
    else if (rest >= 100 - EDGE) run(spring(x, v, 100, now));
    else run({ kind: "coast", x0: x, v0: v, t0: now });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Steps count from where it's headed, so a held key keeps its pace.
    const from = motion.current?.kind === "spring" ? motion.current.target : pos.current;
    const next =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? from - STEP
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? from + STEP
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 100
              : null;
    if (next === null) return;
    event.preventDefault();
    glideTo(clamp(Math.round(next / STEP) * STEP));
  }

  return (
    <div className={className ? `${styles.demo} ${className}` : styles.demo}>
      <CodeBlock code={PROMPT} language="console" title="Your prompt" highlight={false} defaultWrap className={styles.prompt} />

      <figure className={styles.figure}>
        <div ref={switcher} className={styles.switch}>
          <SegmentedControl
            aria-label="Compare"
            value={view}
            onValueChange={(next) => {
              setView(next as "without" | "with");
                      }}
            className={styles.switchControl}
          >
            <Segment value="without">Without UI Polish</Segment>
            <Segment value="with">With UI Polish</Segment>
          </SegmentedControl>
        </div>
        <div
          ref={frame}
          className={styles.compare}
          data-dragging={dragging || undefined}
          data-view={view}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => release(e, true)}
          onPointerCancel={(e) => release(e, false)}
          onLostPointerCapture={(e) => release(e, false)}
        >
          <div
            ref={before}
            className={`${styles.layer} ${styles.before}`}
            aria-hidden={(compact && view !== "without") || undefined}
            inert
          >
            <SlopScreen />
            <span className={styles.corner} data-side="start">
              Without UI Polish
            </span>
          </div>
          <div
            ref={after}
            className={`${styles.layer} ${styles.after}`}
            aria-hidden={(compact && view !== "with") || undefined}
            inert
          >
            <PolishScreen />
            <span className={styles.corner} data-side="end">
              With UI Polish
            </span>
          </div>
          <div className={styles.divider} aria-hidden="true" />
          <div
            role="slider"
            tabIndex={0}
            aria-label="Compare"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
            aria-valuetext={`${value}% without UI Polish, ${100 - value}% with`}
            className={styles.handle}
            onKeyDown={onKeyDown}
          >
            <Icon name="chevron-left" />
            <Icon name="chevron-right" />
          </div>
        </div>
        <figcaption className={styles.caption}>
          <span className={styles.captionDrag}>
            Drag to compare. Left: what an agent writes on its own. Right: the same prompt with UI Polish connected.
          </span>
          <span className={styles.captionTap}>
            Tap to compare. Without: what an agent writes on its own. With: the same prompt with UI Polish connected.
          </span>
        </figcaption>
      </figure>
    </div>
  );
}

/* What an agent writes with no rules to go on: the same screen at the same
   moment, done the default way. A gradient header, a card per refund, emoji
   badges, stat cards. The counts were never wired up, a toast says
   "something went wrong" over the title, the catch block prints the raw
   response in the card, the busy button is a spinner that narrows it, and
   the sent refund still offers Approve and Reject. */
const SLOP_BADGE: Record<State, [tone: "red" | "amber" | "green" | "blue", label: string]> = {
  sent: ["green", "✅ APPROVED"],
  failed: ["red", "❌ FAILED"],
  sending: ["blue", "⏳ PROCESSING"],
  waiting: ["amber", "PENDING"],
};

/* Stat cards, because dashboards have them; nothing updates them. */
const SLOP_STATS = [
  ["📊 Total", "4"],
  ["✅ Approved", "0"],
  ["💰 Amount", "$164"],
];

const SlopScreen = memo(function SlopScreen() {
  return (
    <div className={slop.screen}>
      <div className={slop.toast}>❌ Oops! Something went wrong.</div>
      <div className={slop.hero}>
        <div>
          <p className={slop.heroTitle}>💸 Pending Refunds</p>
          <p className={slop.heroSub}>You have 4 pending refunds 💰</p>
        </div>
        <span className={slop.heroButton}>🚀 Approve All</span>
      </div>
      <div className={slop.stats}>
        {SLOP_STATS.map(([label, value]) => (
          <div key={label} className={slop.stat}>
            <p className={slop.statLabel}>{label}</p>
            <p className={slop.statValue}>{value}</p>
          </div>
        ))}
      </div>
      <div className={slop.cards}>
        {REFUNDS.map((r) => {
          const [tone, label] = SLOP_BADGE[r.state];
          return (
            <div key={r.id} className={slop.card}>
              <div className={slop.cardMain}>
                <span className={slop.avatar}>{r.name[0]}</span>
                <div className={slop.who}>
                  <p className={slop.name}>
                    {r.name}{" "}
                    <span className={slop.badge} data-tone={tone}>
                      {label}
                    </span>
                  </p>
                  <p className={slop.reason}>{r.reason}</p>
                </div>
                <p className={slop.amount}>{r.amount}</p>
                <div className={slop.buttons}>
                  <span className={slop.approve} data-busy={r.state === "sending" || undefined}>
                    {r.state === "sending" ? (
                      <span className={slop.spinner} />
                    ) : r.state === "failed" ? (
                      "🔄 Retry"
                    ) : r.state === "sent" ? (
                      "✅ Approved!"
                    ) : (
                      "✅ Approve"
                    )}
                  </span>
                  <span className={slop.reject}>Reject</span>
                </div>
              </div>
              {r.state === "failed" && <pre className={slop.raw}>{RAW}</pre>}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* The same screen from UI Polish components, frozen at the same moment.
   One surface, one grid: the Copper tile and every avatar share a column,
   the title and every name start on one line, and Approve all and every
   row's main action end on another. Each row is avatar, who, amount
   (tabular, right-aligned), then a slot for Decline and one for the main
   action, each as wide as its widest label, so Approving… holds the width
   of Approve and Retry sits where Approve would.
   Under the header, how far the batch has got: a count, the money, and a
   track cut into one segment per refund, as long as its amount, in row
   order. Only what needs a person is in color: the failure, in red, on the
   track and on its row, where the line under the name says what happened
   and that retrying is safe. */
const TOTAL = REFUNDS.reduce((sum, r) => sum + r.cents, 0);
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const SENT = REFUNDS.filter((r) => r.state === "sent");
const SENT_CENTS = SENT.reduce((sum, r) => sum + r.cents, 0);

const PolishScreen = memo(function PolishScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <span className={styles.mark} aria-hidden="true">
          C
        </span>
        <div className={styles.headText}>
          <p className={styles.title}>Refunds</p>
          <p className={styles.desc}>
            {REFUNDS.length} from Copper
          </p>
        </div>
        <Button>Approve all</Button>
      </div>

      <div className={styles.progress}>
        <p className={styles.progressLine}>
          <span>
            {SENT.length} of {REFUNDS.length} sent
          </span>
          <span className={styles.progressMoney}>
            {money(SENT_CENTS)} of {money(TOTAL)}
          </span>
        </p>
        <div className={styles.track} aria-hidden="true">
          {REFUNDS.map((r) => (
            <span key={r.id} className={styles.segment} data-state={r.state} style={{ flexGrow: r.cents }} />
          ))}
        </div>
      </div>

      <ul className={styles.rows}>
        {REFUNDS.map((r) => (
          <li key={r.id} className={styles.row} data-state={r.state}>
            <Avatar name={r.name} size={32} decorative className={styles.avatar} />
            <div className={styles.who}>
              <div className={styles.line}>
                <p className={styles.name} title={r.name}>
                  {r.name}
                </p>
                {/* On a phone the amount ends the name's line. */}
                <span className={styles.lineAmount}>{r.amount}</span>
              </div>
              {r.state === "sent" ? (
                <p className={styles.status} data-tone="success">
                  <Icon name="check" className={styles.statusIcon} />
                  <span>
                    <span className={styles.statusLead}>Sent</span>{" "}
                    <span className={styles.statusRest}>· receipt emailed</span>
                  </span>
                </p>
              ) : r.state === "failed" ? (
                <p className={styles.status} data-tone="danger">
                  <Icon name="alert" className={styles.statusIcon} />
                  <span>
                    <span className={styles.statusLead}>Bank timed out.</span>{" "}
                    <span className={styles.statusRest}>Safe to retry — no one is paid twice.</span>
                  </span>
                </p>
              ) : (
                <p className={styles.reason} title={r.reason}>
                  {r.reason}
                </p>
              )}
            </div>
            <span className={styles.amount}>{r.amount}</span>
            {r.state === "sent" ? (
              <span className={styles.when}>Just now</span>
            ) : (
              <div className={styles.actions}>
                <Button variant="ghost" className={styles.secondary}>
                  Decline
                </Button>
                {/* In flight it says so in the Approve slot, at its width. */}
                <Button
                  variant="secondary"
                  busy={r.state === "sending"}
                  className={r.state === "sending" ? `${styles.primary} ${styles.held}` : styles.primary}
                >
                  {r.state === "failed" ? "Retry" : r.state === "sending" ? "Approving…" : "Approve"}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className={styles.note}>
        <Icon name="info" className={styles.noteIcon} />
        <span>Copper matched each refund to its booking. Money goes back to the card that paid, in 5–&#8288;10 days.</span>
      </p>
    </div>
  );
});
