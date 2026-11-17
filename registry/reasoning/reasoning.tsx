"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import { Icon } from "../icons/icons";
import styles from "./reasoning.module.css";

type ReasoningProps = {
  /** True while the model is still thinking. Flip it to false when the answer starts. */
  streaming: boolean;
  /** The reasoning text so far. A string is split into paragraphs on blank lines. */
  children?: ReactNode;
  /** Short headlines for what the model is doing, newest last: "Reading the guest list". While
   *  thinking, the newest one is the label, and each new one rises into place over the last. */
  steps?: string[];
  /** Seconds spent thinking. When omitted, it's measured from `streaming`. */
  duration?: number;
  /** When thinking began (a `Date.now()` value), so a remount keeps counting from the right time. */
  startedAt?: number;
  /** Controlled open state. Leave it out and the block opens while thinking and closes when done. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/** 8 → "8s", 134 → "2m 14s", 120 → "2m". */
export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

/** Paragraphs that arrive after the first render rise in; the ones already
 *  there when it mounts (an open, finished block) don't. */
function Paragraphs({ children }: { children: ReactNode }) {
  const paragraphs = typeof children === "string" ? children.split(/\n{2,}/).filter((p) => p.trim()) : null;
  const [initial] = useState(() => paragraphs?.length ?? 0);
  if (!paragraphs) return <>{children}</>;
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={i >= initial ? styles.arrive : undefined}>
          {p}
        </p>
      ))}
    </>
  );
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One line of text that swaps by rising: the old line moves up and out
 * while the new one moves up into its place, and the width glides from one
 * to the other so whatever sits beside it shifts instead of jumping.
 */
function LineSwap({ text, className }: { text: string; className?: string }) {
  const [lines, setLines] = useState([{ id: 0, text, leaving: false }]);
  const [shown, setShown] = useState(text);
  if (text !== shown) {
    setShown(text);
    setLines((all) => [
      // Anything still leaving is dropped: only the latest change animates.
      ...all.filter((l) => !l.leaving).map((l) => ({ ...l, leaving: true })),
      { id: (all.at(-1)?.id ?? 0) + 1, text, leaving: false },
    ]);
  }

  const box = useRef<HTMLSpanElement>(null);
  // True while the width glides, so the text isn't cut with an ellipsis mid-move.
  const [gliding, setGliding] = useState(false);
  const newest = lines.at(-1)?.id;
  // At rest the box has no set width: it's as wide as its text, whatever
  // the font does. Only when a new line arrives does it get one, pinned at
  // what it was, then set to the new line's width so it glides there; the
  // width is cleared again when the glide ends.
  useLayoutEffect(() => {
    const el = box.current;
    const line = el?.lastElementChild as HTMLElement | null | undefined;
    if (!el || !line || newest === 0) return;
    // Start from the old line's own width (it's still here, on its way out).
    const leaving = el.querySelector<HTMLElement>("[data-leaving]");
    const from = leaving ? Math.ceil(leaving.scrollWidth) : el.getBoundingClientRect().width;
    const to = Math.ceil(line.scrollWidth);
    if (reducedMotion() || Math.abs(to - from) < 1) {
      el.style.width = "";
      return;
    }
    el.style.width = `${from}px`;
    void el.offsetWidth;
    el.style.width = `${to}px`;
    setGliding(true);
  }, [newest]);

  const swapping = lines.length > 1;
  return (
    <span
      ref={box}
      className={className ? `${styles.swap} ${className}` : styles.swap}
      data-swapping={swapping || undefined}
      data-gliding={gliding || undefined}
      onTransitionEnd={(e) => {
        if (e.propertyName !== "width" || e.target !== e.currentTarget) return;
        e.currentTarget.style.width = "";
        setGliding(false);
      }}
    >
      {lines.map((l) => (
        <span
          key={l.id}
          className={styles.line}
          data-leaving={l.leaving || undefined}
          data-entering={(swapping && !l.leaving) || undefined}
          aria-hidden={l.leaving || undefined}
          onAnimationEnd={() => {
            if (l.leaving) setLines((all) => all.filter((x) => x.id !== l.id));
          }}
        >
          {l.text}
        </span>
      ))}
    </span>
  );
}

/** Scrolls to `to` on an ease-out curve, restarting from wherever it is. */
function glide(el: HTMLElement, to: number, frame: { current: number }) {
  cancelAnimationFrame(frame.current);
  const from = el.scrollTop;
  if (reducedMotion() || Math.abs(to - from) < 1) {
    el.scrollTop = to;
    return;
  }
  const start = performance.now();
  const duration = 320;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    el.scrollTop = from + (to - from) * (1 - Math.pow(1 - t, 3));
    if (t < 1) frame.current = requestAnimationFrame(tick);
  };
  frame.current = requestAnimationFrame(tick);
}

function hasContent(children: ReactNode) {
  return Children.toArray(children).some((c) => (typeof c === "string" ? c.trim() !== "" : isValidElement(c) || typeof c === "number"));
}

export function Reasoning({
  streaming,
  children,
  steps,
  duration,
  startedAt,
  open: openProp,
  defaultOpen,
  onOpenChange,
  className,
}: ReasoningProps) {
  const panelId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const scrollFrame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);

  const [openState, setOpenState] = useState(defaultOpen ?? streaming);
  const open = openProp ?? openState;

  // Stays capped through the collapse, so the close starts from the height you saw.
  const [capped, setCapped] = useState(streaming);

  const [wasStreaming, setWasStreaming] = useState(streaming);
  if (wasStreaming !== streaming) {
    setWasStreaming(streaming);
    setOpenState(streaming);
    if (streaming) setCapped(true);
  }

  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    onOpenChangeRef.current?.(streaming);
  }, [streaming]);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!streaming) return;
    const start = startedAt ?? Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    const id = window.setInterval(tick, 250);
    const first = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
      tick();
    };
  }, [streaming, startedAt]);

  // Follow the newest line unless the reader has scrolled up to reread.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && streaming && stickToBottom.current) glide(el, el.scrollHeight - el.clientHeight, scrollFrame);
  }, [children, streaming]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    el.dataset.scrolled = el.scrollTop > 0 ? "true" : "false";
  }

  function toggle() {
    const next = !open;
    if (next && !streaming) setCapped(false);
    setOpenState(next);
    onOpenChange?.(next);
  }

  const seconds = duration ?? (elapsed > 0 ? elapsed : null);
  const step = steps?.at(-1)?.trim();
  const label = streaming
    ? step || "Thinking"
    : seconds === null
      ? "Thought for a few seconds"
      : `Thought for ${formatDuration(Math.max(1, seconds))}`;
  const content = hasContent(children);

  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      data-state={streaming ? "thinking" : "done"}
      data-open={open}
      data-empty={!content || undefined}
      data-ticking={(streaming && content) || elapsed > 0 || undefined}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className={styles.label}>
          <LineSwap text={label} />
        </span>
        <span className={styles.timer} aria-hidden="true">
          <span>
            <span className={styles.time}>{formatDuration(elapsed)}</span>
          </span>
        </span>
        <Icon className={styles.chevron} name="chevron-right" data-turn={open ? "open" : ""} />
      </button>

      <div id={panelId} className={styles.panel} inert={!open}>
        <div className={styles.clip}>
          {content && (
            <div className={styles.inner}>
              <div
                ref={scrollRef}
                className={styles.body}
                data-capped={capped}
                data-live={streaming || undefined}
                onScroll={handleScroll}
                // A capped window scrolls, so it has to be reachable by keyboard.
                tabIndex={capped ? 0 : undefined}
                role={capped ? "region" : undefined}
                aria-label={capped ? "Reasoning" : undefined}
              >
                <Paragraphs>{children}</Paragraphs>
              </div>
            </div>
          )}
        </div>
      </div>

      <span role="status" className={styles.srOnly}>
        {streaming ? (step ? `Thinking: ${step}` : "Thinking") : label}
      </span>
    </div>
  );
}
