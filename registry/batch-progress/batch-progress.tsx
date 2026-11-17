"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { flushSync } from "react-dom";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { ScrollArea } from "../scroll-area/scroll-area";
import {
  Segment,
  SegmentedControl,
} from "../segmented-control/segmented-control";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./batch-progress.module.css";

export type BatchItemStatus =
  | "queued"
  | "working"
  | "done"
  | "failed"
  | "skipped";

export type BatchItem = {
  id: string;
  /** What a person would call it: "receipt-07.pdf", "Row 214". */
  name: string;
  status: BatchItemStatus;
  /** Shown when failed. Say what happened: "Password protected". */
  error?: string;
  /** What came of it, shown in the row once done or skipped: "$42.10 · Groceries", "Duplicate". */
  detail?: string;
  /** `Date.now()` when this item started and settled: the row shows how long it took. */
  startedAt?: number;
  finishedAt?: number;
};

type Noun = { one: string; other: string };

export type BatchFilter = "all" | "working" | "failed" | "done";

type BatchProgressProps = {
  items: BatchItem[];
  /** The work as a verb, present then past: { running: "Scanning", done: "Scanned" }. */
  verb?: { running: string; done: string };
  /** What the items are: { one: "receipt", other: "receipts" }. */
  noun?: Noun;
  /** `Date.now()` when the batch started and, once settled, finished. Shift
   *  `startedAt` forward by the time spent paused so the estimate stays true. */
  startedAt?: number;
  finishedAt?: number;
  /** The person stopped it: unfinished items stay as they are. */
  stopped?: boolean;
  /** The person paused it: the clock and the estimate hold, spinners stand still. */
  paused?: boolean;
  /** Shows Stop while it runs, waits or is paused. */
  onStop?: () => void;
  /** With `onResume`, shows Pause / Resume while it runs. */
  onPause?: () => void;
  onResume?: () => void;
  /** Shows "Retry n failed" once it settles, and a retry on each failed row, with their ids. */
  onRetry?: (ids: string[]) => void;
  /** Up to this many items the track has one segment per item; past it, one bar. Default 60. */
  denseAfter?: number;
  /** Rows tall before the list scrolls. Default 8. `0` hides the filters and
   *  the list, for a screen that already lists the items (the header, track
   *  and controls stay). */
  visibleRows?: number;
  className?: string;
};

type Phase = "empty" | "idle" | "running" | "paused" | "stopped" | "done";

/** Below this width the row stacks its detail under the name and controls go icon-only. */
const NARROW = 480;
/** Row heights, one line and two. Set from here so the list can be windowed. */
const ROW = 40;
const ROW_STACKED = 52;
/** Rows drawn past each edge of the visible window. */
const OVERSCAN = 6;

/** 1000 → "1,000". English copy, so English grouping, the same on server and client. */
const num = (n: number) => n.toLocaleString("en-US");

const count = (n: number, noun: Noun) =>
  `${num(n)} ${n === 1 ? noun.one : noun.other}`;

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 2400 → "2s", 74000 → "1m 14s"; `precise` keeps a tenth under 10s: "2.4s". */
function formatElapsed(ms: number, precise = false) {
  const s = Math.max(0, ms) / 1000;
  // Never "0.0s": a fast item still took a moment.
  if (precise && s < 10) return `${Math.max(0.1, s).toFixed(1)}s`;
  const whole = Math.floor(s);
  if (whole < 60) return `${whole}s`;
  const rest = whole % 60;
  return rest
    ? `${Math.floor(whole / 60)}m ${rest}s`
    : `${Math.floor(whole / 60)}m`;
}

/** Items per second as a person says it: "1.4 a second", "12 a second", "40 a minute". */
function formatRate(perSecond: number) {
  if (perSecond >= 10) return `${Math.round(perSecond)} a second`;
  if (perSecond >= 1)
    return `${perSecond.toFixed(1).replace(/\.0$/, "")} a second`;
  return `${Math.max(1, Math.round(perSecond * 60))} a minute`;
}

/** Ticks four times a second while `on`; holds its last value when off, so a paused clock stands still. */
function useNow(on: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [on]);
  return now;
}

/**
 * The latest value, at most once per `every` ms. A count that changes forty
 * times a second can't be read; five steps a second can, and the last value
 * always lands.
 */
function usePaced(value: string, every = 200) {
  const [shown, setShown] = useState(value);
  const at = useRef(0);
  useEffect(() => {
    if (value === shown) return;
    const t = window.setTimeout(
      () => {
        at.current = Date.now();
        setShown(value);
      },
      Math.max(0, at.current + every - Date.now()),
    );
    return () => window.clearTimeout(t);
  }, [value, shown, every]);
  return shown;
}

/**
 * Text whose characters change in place: each is keyed by its place from the
 * right, so only the ones that changed remount. The old character lifts out
 * as the new one rises in, a few pixels, like a counter rolling. In tabular
 * figures the rest never move. Nothing on first paint.
 */
function Digits({ text: latest, every }: { text: string; every?: number }) {
  const text = usePaced(latest, every);
  const [last, setLast] = useState({ text, previous: text, changed: false });
  if (last.text !== text) setLast({ text, previous: last.text, changed: true });
  const chars = Array.from(text);
  const before = Array.from(last.previous);
  return (
    <span className={styles.digits}>
      <span className={styles.srOnly}>{text}</span>
      <span aria-hidden="true">
        {chars.map((char, i) => {
          const place = chars.length - i;
          const was = before[before.length - place];
          const changed = last.changed && was !== char;
          return (
            <span
              key={`${place}:${char}`}
              className={styles.digit}
              data-changed={changed || undefined}
            >
              {changed && was !== undefined && (
                <span className={styles.was}>{was}</span>
              )}
              <span className={styles.is}>{char}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

/** Two labels in one cell, the widest setting the width, so a button never resizes as it swaps. */
function Swap({ on, a, b }: { on: boolean; a: string; b: string }) {
  return (
    <span className={styles.swap}>
      <span data-shown={!on || undefined} aria-hidden={on || undefined}>
        {a}
      </span>
      <span data-shown={on || undefined} aria-hidden={!on || undefined}>
        {b}
      </span>
    </span>
  );
}

/** Every mark drawn, the one for this status shown, so a change crossfades in place. */
function Mark({ status }: { status: BatchItemStatus }) {
  return (
    <span className={styles.mark} data-status={status} aria-hidden="true">
      <svg data-mark="queued" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" />
      </svg>
      <svg data-mark="working" viewBox="0 0 16 16">
        <circle
          cx="8"
          cy="8"
          r="5.25"
          fill="none"
          stroke="currentColor"
          opacity="0.25"
        />
        <circle
          className={styles.arc}
          cx="8"
          cy="8"
          r="5.25"
          fill="none"
          stroke="currentColor"
          pathLength={1}
        />
      </svg>
      <svg data-mark="done" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.5" fill="currentColor" />
        <path
          className={styles.tick}
          d="M5.4 8.2l1.8 1.8 3.4-3.7"
          pathLength={1}
          fill="none"
          stroke="var(--ui-surface)"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg data-mark="failed" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.5" fill="currentColor" />
        <path
          d="M8 4.9v3.4"
          stroke="var(--ui-on-danger)"
          strokeLinecap="round"
        />
        <circle cx="8" cy="10.85" r="0.9" fill="var(--ui-on-danger)" />
      </svg>
      <svg data-mark="skipped" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" />
        <path d="M5.9 8h4.2" stroke="currentColor" strokeLinecap="round" />
      </svg>
    </span>
  );
}

type RowProps = {
  item: BatchItem;
  index: number;
  setSize: number;
  last: boolean;
  top: number;
  statusText: string;
  /** Live for an item in flight, so only those rows re-render as the clock ticks. */
  now: number;
  times: boolean;
  onRetry?: (ids: string[]) => void;
};

/** One item. Memoized and placed by its index, so a status change repaints one row and moves none. */
const Row = memo(function Row({
  item,
  index,
  setSize,
  last,
  top,
  statusText,
  now,
  times,
  onRetry,
}: RowProps) {
  let time = "";
  if (times && item.startedAt !== undefined) {
    if (item.status === "working") {
      const ms = now - item.startedAt;
      time = ms >= 1000 ? formatElapsed(ms) : "";
    } else if (item.finishedAt !== undefined && item.status !== "queued") {
      time = formatElapsed(item.finishedAt - item.startedAt, true);
    }
  }
  const failed = item.status === "failed";
  return (
    <li
      className={styles.row}
      data-status={item.status}
      data-last={last || undefined}
      aria-setsize={setSize}
      aria-posinset={index + 1}
      style={{ "--y": `${top}px` } as CSSProperties}
    >
      <Mark status={item.status} />
      <span className={styles.name} title={item.name}>
        {item.name}
      </span>
      <span
        className={styles.detail}
        title={failed || item.detail ? statusText : undefined}
      >
        <span className={styles.srOnly}>: </span>
        {statusText}
      </span>
      {times && (
        <span
          className={styles.time}
          aria-hidden={item.status === "working" || undefined}
        >
          {time && <span className={styles.srOnly}>, took </span>}
          {time}
        </span>
      )}
      {onRetry && (
        <span className={styles.action}>
          {failed && (
            <Button
              variant="ghost"
              aria-label={`Retry ${item.name}`}
              onClick={() => onRetry([item.id])}
            >
              <Icon name="retry" />
            </Button>
          )}
        </span>
      )}
    </li>
  );
});

export function BatchProgress({
  items,
  verb = { running: "Processing", done: "Processed" },
  noun = { one: "item", other: "items" },
  startedAt,
  finishedAt,
  stopped = false,
  paused = false,
  onStop,
  onPause,
  onResume,
  onRetry,
  denseAfter = 60,
  visibleRows = 8,
  className,
}: BatchProgressProps) {
  const id = useId();
  const total = items.length;
  const tally = { queued: 0, working: 0, done: 0, failed: 0, skipped: 0 };
  for (const item of items) tally[item.status]++;
  const settled = tally.done + tally.failed + tally.skipped;
  const failedIds = items.filter((i) => i.status === "failed").map((i) => i.id);
  const started = startedAt !== undefined || tally.queued < total;

  const phase: Phase =
    total === 0
      ? "empty"
      : settled === total
        ? "done"
        : stopped
          ? "stopped"
          : paused
            ? "paused"
            : started
              ? "running"
              : "idle";
  const live = phase === "running" || phase === "paused" || phase === "idle";
  const times = items.some((i) => i.startedAt !== undefined);
  const now = useNow(phase === "running" && (startedAt !== undefined || times));
  const elapsed =
    startedAt !== undefined
      ? Math.max(
          0,
          (finishedAt ?? (phase === "idle" ? startedAt : now)) - startedAt,
        )
      : null;

  // A pace and a rough time left, only once there's a pace to go on, and the
  // estimate never below 5 seconds, where it would only flicker.
  const paced =
    elapsed !== null &&
    elapsed >= 1000 &&
    settled >= 3 &&
    settled / total >= 0.15;
  const rate = paced ? formatRate(settled / (elapsed / 1000)) : null;
  let left: string | null = null;
  if (phase === "running" && paced) {
    const ms = (elapsed / settled) * (total - settled);
    if (ms >= 5000)
      left = `about ${formatElapsed(Math.ceil(ms / 5000) * 5000)} left`;
  }

  const doneWord = verb.done.toLowerCase();
  const title =
    phase === "empty"
      ? `No ${noun.other} yet`
      : phase === "idle"
        ? `${capital(count(total, noun))} waiting`
        : phase === "running"
          ? `${verb.running} ${count(total, noun)}`
          : phase === "paused"
            ? `Paused after ${count(settled, noun)}`
            : phase === "stopped"
              ? `Stopped after ${count(settled, noun)}`
              : tally.done === total
                ? `${verb.done} ${count(total, noun)}`
                : `${verb.done} ${num(tally.done)} of ${count(total, noun)}`;

  // Left of the meta line: how far, then (settled) how it went.
  const tallyParts: { text: string; tone?: "danger" }[] = [];
  if (live) {
    tallyParts.push({ text: `${num(settled)} of ${num(total)}` });
    if (tally.failed)
      tallyParts.push({ text: `${num(tally.failed)} failed`, tone: "danger" });
  } else if (phase !== "empty") {
    tallyParts.push({ text: `${num(tally.done)} ${doneWord}` });
    if (tally.failed)
      tallyParts.push({ text: `${num(tally.failed)} failed`, tone: "danger" });
    if (tally.skipped)
      tallyParts.push({ text: `${num(tally.skipped)} skipped` });
    if (phase === "stopped" && total - settled > 0)
      tallyParts.push({ text: `${num(total - settled)} not started` });
  }
  // Right of it: the clock.
  const clock = (
    phase === "idle"
      ? ["Waiting to start"]
      : phase === "running"
        ? [elapsed !== null ? formatElapsed(elapsed) : null, left]
        : phase === "paused"
          ? ["Paused", elapsed !== null ? formatElapsed(elapsed) : null]
          : phase === "empty"
            ? []
            : [elapsed !== null ? `Took ${formatElapsed(elapsed)}` : null, rate]
  ).filter((part): part is string => Boolean(part));

  // ---------- Size: one line per row, or two on a narrow card ----------
  const rootRef = useRef<HTMLElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const narrow = width !== null && width < NARROW;
  const rowH = narrow ? ROW_STACKED : ROW;

  // One segment per item while each still has room to be seen.
  const segmented =
    total > 0 &&
    total <= denseAfter &&
    (width === null || (width - 40) / total >= 6);

  // ---------- Filter ----------
  const [filter, setFilter] = useState<BatchFilter>("all");
  const shown =
    filter === "all"
      ? items
      : items.filter((i) =>
          filter === "working" ? i.status === "working" : i.status === filter,
        );

  // ---------- Windowing ----------
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rows = Math.max(1, Math.min(total, visibleRows));
  const first = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN);
  const last = Math.min(
    shown.length,
    Math.ceil((scrollTop + rows * rowH) / rowH) + OVERSCAN,
  );

  const frame = useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() =>
      setScrollTop(viewportRef.current?.scrollTop ?? 0),
    );
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // ---------- Follow the work ----------
  // While it runs, the list keeps the item in flight in view, one row of what
  // just finished above it, until the person scrolls the list themselves.
  // Settled with failures, it brings the first failure into view once.
  const follow = useRef(true);
  const lastFollow = useRef(0);
  const firstWorking =
    filter === "all" ? items.findIndex((i) => i.status === "working") : -1;
  const firstFailed =
    filter === "all" ? items.findIndex((i) => i.status === "failed") : -1;
  const target =
    phase === "running"
      ? firstWorking
      : phase === "done" || phase === "stopped"
        ? firstFailed
        : -1;

  const scrollToRow = useCallback(
    (index: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const to = Math.max(0, (index - 1) * rowH);
      const max = el.scrollHeight - el.clientHeight;
      if (Math.abs(Math.min(to, max) - el.scrollTop) < 1) return;
      // Inside the window already, with a row to spare: leave it be.
      if (
        index * rowH >= el.scrollTop + rowH &&
        (index + 2) * rowH <= el.scrollTop + el.clientHeight
      )
        return;
      // A long way is a jump: a smooth scroll past dozens of rows is only a blur.
      const far = Math.abs(to - el.scrollTop) > el.clientHeight * 2;
      const still = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (still || far) {
        // Draw the rows it lands on before it lands, so a jump never shows an empty list.
        flushSync(() => setScrollTop(Math.min(to, max)));
        el.scrollTop = to;
      } else {
        el.scrollTo({ top: to, behavior: "smooth" });
      }
    },
    [rowH],
  );

  useEffect(() => {
    if (!follow.current || target < 0) return;
    // At most twice a second, so a fast batch glides instead of twitching.
    const wait = Math.max(0, lastFollow.current + 500 - Date.now());
    const t = window.setTimeout(() => {
      lastFollow.current = Date.now();
      if (follow.current) scrollToRow(target);
    }, wait);
    return () => window.clearTimeout(t);
  }, [target, scrollToRow]);

  // A new run (everything back to waiting) follows again from the top.
  const fresh = phase === "idle" || (phase === "running" && settled === 0);
  useEffect(() => {
    if (fresh) follow.current = true;
  }, [fresh]);

  const userScrolls = () => {
    follow.current = false;
  };

  const changeFilter = (next: string) => {
    setFilter(next as BatchFilter);
    follow.current = next === "all";
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
    setScrollTop(0);
  };

  // ---------- Announcements: milestones only ----------
  const [announce, setAnnounce] = useState("");
  const half = useRef(false);
  const wasLive = useRef(live);
  useEffect(() => {
    if (phase === "idle") half.current = false;
    if (
      phase === "running" &&
      !half.current &&
      settled >= total / 2 &&
      total >= 6
    ) {
      half.current = true;
      setAnnounce(`Halfway: ${num(settled)} of ${num(total)} ${noun.other}.`);
    }
    if (!live && wasLive.current && phase !== "empty") {
      setAnnounce(
        tally.failed ? `${title}. ${tally.failed} failed.` : `${title}.`,
      );
    }
    wasLive.current = live;
  }, [phase, live, settled, total, tally.failed, title, noun.other]);

  const statusText = (item: BatchItem) =>
    item.status === "done"
      ? (item.detail ?? "")
      : item.status === "working"
        ? `${verb.running}…`
        : item.status === "failed"
          ? (item.error ?? "Failed")
          : item.status === "skipped"
            ? (item.detail ?? "Skipped")
            : "Waiting";

  const filters: { value: BatchFilter; label: string; n?: number }[] = [
    { value: "all", label: "All" },
    { value: "working", label: "Running", n: tally.working },
    { value: "failed", label: "Failed", n: tally.failed },
    { value: "done", label: "Done", n: tally.done },
  ];
  const emptyFilter =
    filter === "working"
      ? `Nothing ${verb.running.toLowerCase()} right now`
      : filter === "failed"
        ? `No failed ${noun.other}`
        : `No ${noun.other} ${doneWord} yet`;

  const canPause =
    Boolean(onPause && onResume) && (phase === "running" || phase === "paused");
  const canStop = Boolean(onStop) && live;
  const canRetry = Boolean(onRetry) && !live && tally.failed > 0;

  const progressText = `${num(settled)} of ${num(total)}${tally.failed ? `, ${num(tally.failed)} failed` : ""}`;

  return (
    <section
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-phase={phase}
      data-narrow={narrow || undefined}
      aria-labelledby={`${id}-title`}
      style={{ "--row": `${rowH}px`, "--rows": rows } as CSSProperties}
    >
      <header className={styles.header}>
        <h3 id={`${id}-title`} className={styles.title}>
          {/* A morph holds one line; on a narrow card the title may need two. */}
          {narrow ? title : <TextMorph>{title}</TextMorph>}
        </h3>
        <div className={styles.actions}>
          {canPause &&
            (narrow ? (
              <Button
                variant="ghost"
                aria-label={phase === "paused" ? "Resume" : "Pause"}
                onClick={phase === "paused" ? onResume : onPause}
              >
                <Icon name={phase === "paused" ? "play" : "pause"} />
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={phase === "paused" ? onResume : onPause}
              >
                <Icon name={phase === "paused" ? "play" : "pause"} />
                <Swap on={phase === "paused"} a="Pause" b="Resume" />
              </Button>
            ))}
          {canStop &&
            (narrow ? (
              <Button
                variant="ghost"
                aria-label="Stop"
                onClick={onStop}
              >
                <Icon name="stop" />
              </Button>
            ) : (
              <Button variant="ghost" onClick={onStop}>
                <Icon name="stop" />
                Stop
              </Button>
            ))}
          {canRetry && onRetry && (
            <Button
              variant="secondary"
              aria-label={
                narrow ? `Retry ${num(tally.failed)} failed` : undefined
              }
              onClick={() => onRetry(failedIds)}
            >
              <Icon name="retry" />
              {narrow
                ? `Retry ${num(tally.failed)}`
                : `Retry ${num(tally.failed)} failed`}
            </Button>
          )}
        </div>
      </header>

      {phase === "empty" ? (
        <p className={styles.empty}>
          {capital(noun.other)} appear here as the agent finds them.
        </p>
      ) : (
        <>
          <div className={styles.progress}>
            <div
              className={styles.track}
              data-kind={segmented ? "segments" : "bar"}
              role="progressbar"
              aria-label={`${verb.running} ${noun.other}`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={settled}
              aria-valuetext={progressText}
            >
              {segmented ? (
                items.map((item) => (
                  <span
                    key={item.id}
                    className={styles.segment}
                    data-status={item.status}
                  />
                ))
              ) : (
                <>
                  <span
                    className={styles.fill}
                    data-status="working"
                    style={
                      {
                        "--from": 0,
                        "--to": (settled + tally.working) / total,
                      } as CSSProperties
                    }
                  />
                  <span
                    className={styles.fill}
                    data-status="skipped"
                    style={
                      { "--from": 0, "--to": settled / total } as CSSProperties
                    }
                  />
                  <span
                    className={styles.fill}
                    data-status="failed"
                    style={
                      {
                        "--from": 0,
                        "--to": (tally.done + tally.failed) / total,
                      } as CSSProperties
                    }
                  />
                  <span
                    className={styles.fill}
                    data-status="done"
                    style={
                      {
                        "--from": 0,
                        "--to": tally.done / total,
                      } as CSSProperties
                    }
                  />
                </>
              )}
            </div>
            <p className={styles.meta}>
              <span className={styles.tally}>
                {tallyParts.map((part, i) => (
                  <span
                    key={`${phase}-${i}`}
                    className={styles.part}
                    data-tone={part.tone}
                  >
                    {i === 0 && live ? <Digits text={part.text} /> : part.text}
                  </span>
                ))}
              </span>
              <span className={styles.clock}>
                {clock.map((part, i) => (
                  <span key={`${phase}-${i}`} className={styles.part}>
                    {/* The clock steps once a second, so it reads as a clock, not a blur. */}
                    <Digits text={part} every={1000} />
                  </span>
                ))}
              </span>
            </p>
          </div>

          {visibleRows > 0 && (
            <>
              <div className={styles.listHead}>
                <SegmentedControl
                  size="sm"
                  widths="content"
                  value={filter}
                  onValueChange={changeFilter}
                  aria-label={`Show ${noun.other}`}
                  className={styles.filters}
                >
                  {filters.map((f) => (
                    <Segment key={f.value} value={f.value}>
                      <span className={styles.filter}>
                        {f.label}
                        {f.n !== undefined &&
                          (!narrow || f.value === "failed") && (
                            <span
                              className={styles.count}
                              data-tone={
                                f.value === "failed" && f.n > 0
                                  ? "danger"
                                  : undefined
                              }
                            >
                              <Digits text={num(f.n)} every={250} />
                            </span>
                          )}
                      </span>
                    </Segment>
                  ))}
                </SegmentedControl>
              </div>

              <div
                className={styles.list}
                onWheel={userScrolls}
                onTouchMove={userScrolls}
                onKeyDown={userScrolls}
                onPointerDown={userScrolls}
              >
                <ScrollArea
                  ref={viewportRef}
                  className={styles.scroll}
                  label={capital(noun.other)}
                  onScroll={onScroll}
                >
                  {shown.length === 0 ? (
                    <p className={styles.none}>{emptyFilter}</p>
                  ) : (
                    <ul
                      className={styles.rows}
                      style={{ height: shown.length * rowH }}
                    >
                      {shown.slice(first, last).map((item, k) => {
                        const index = first + k;
                        return (
                          <Row
                            key={item.id}
                            item={item}
                            index={index}
                            setSize={shown.length}
                            last={index === shown.length - 1}
                            top={index * rowH}
                            statusText={statusText(item)}
                            now={item.status === "working" ? now : 0}
                            times={times}
                            onRetry={onRetry}
                          />
                        );
                      })}
                    </ul>
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </>
      )}

      <span role="status" className={styles.srOnly}>
        {announce}
      </span>
    </section>
  );
}
