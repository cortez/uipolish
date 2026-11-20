"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { useDelayedBusy } from "../button/use-delayed-busy";
import styles from "./terminal-output.module.css";

export type TerminalStatus = "running" | "done" | "failed" | "stopped";

export type TerminalLine = {
  text: string;
  /** Written to stderr: drawn in the danger text color. */
  stderr?: boolean;
};

type TerminalOutputProps = {
  /** The command as it was run: `npm test`. */
  command: string;
  /** Everything printed so far. A string is stdout; pass lines to mark stderr. Only append. */
  output: string | TerminalLine[];
  status: TerminalStatus;
  /** The exit code once it has ended. `done` reads 0 when left out. */
  exitCode?: number;
  /** `Date.now()` at start and finish; drive the elapsed time and the duration. */
  startedAt?: number;
  finishedAt?: number;
  /** Shows Stop while running. Set `status` to `stopped` once it has. Return a promise to show an error if it rejects. */
  onStop?: () => void | Promise<unknown>;
  /** Show only the last this-many lines, with "Show all 214 lines" above them. */
  collapseAfter?: number;
  /** Caps the body; it scrolls and follows new lines at the bottom. Default about 16 lines. */
  maxHeight?: CSSProperties["maxHeight"];
  className?: string;
};

/** 2400 → "2.4s" and 2000 → "2.0s" (precise), 12000 → "12s", 74000 → "1m 14s". */
export function formatElapsed(ms: number, precise = false) {
  const s = Math.max(0, ms) / 1000;
  // One decimal always, so "Exit 0 2.0s" doesn't read as a rounder figure than "1.6s".
  const tenths = Math.max(0.1, Math.round(s * 10) / 10);
  if (precise && tenths < 10) return `${tenths.toFixed(1)}s`;
  const whole = Math.floor(s);
  if (whole < 60) return `${whole}s`;
  const rest = whole % 60;
  return rest ? `${Math.floor(whole / 60)}m ${rest}s` : `${Math.floor(whole / 60)}m`;
}

// Colors and cursor moves from the program: the card has its own.
const ANSI = new RegExp("\\u001b\\[[0-9;?]*[A-Za-z]", "g");

/** Splits raw output into lines: no escape codes, a `\r` overwrite keeps its last pass, no empty line after the final newline. */
export function toLines(output: string | TerminalLine[]): TerminalLine[] {
  if (typeof output !== "string") return output;
  const lines = output.replace(ANSI, "").split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines.map((line) => {
    const text = line.endsWith("\r") ? line.slice(0, -1) : line;
    return { text: text.slice(text.lastIndexOf("\r") + 1) };
  });
}

/** Ticks twice a second while running, after mount only, so the server and the first client render agree. */
function useNow(running: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [running]);
  return now;
}

function said(command: string, status: TerminalStatus, exitCode?: number) {
  if (status === "done") return `${command} finished`;
  if (status === "failed") return exitCode === undefined ? `${command} failed` : `${command} failed with exit code ${exitCode}`;
  if (status === "stopped") return `${command} stopped`;
  return "";
}

/** Tabular on each figure, not the line: on "1m 14s" some fonts would widen the space too. */
function figures(time: string) {
  return time.split(" ").flatMap((part, i) => [
    i ? " " : null,
    <span key={i} className={styles.figure}>
      {part}
    </span>,
  ]);
}

type CopyState = "idle" | "copied" | "failed";

export function TerminalOutput({
  command,
  output,
  status,
  exitCode,
  startedAt,
  finishedAt,
  onStop,
  collapseAfter,
  maxHeight,
  className,
}: TerminalOutputProps) {
  const scrollerId = useId();
  const [copy, setCopy] = useState<CopyState>("idle");
  const [stopping, setStopping] = useState(false);
  const [stopFailed, setStopFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState({ start: false, end: false, y: false });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const stopFocused = useRef(false);
  const atBottom = useRef(true);
  const copyTimer = useRef(0);

  const running = status === "running";
  // Busy waits 300ms before it shows and then stays 400ms: a quick command
  // never flashes "Running" and a Stop button.
  const busyShown = useDelayedBusy(running);
  const shown: TerminalStatus | "starting" = busyShown ? "running" : running ? "starting" : status;
  const now = useNow(running);

  const lines = useMemo(() => toLines(output), [output]);
  const foldable = collapseAfter !== undefined && collapseAfter >= 0 && lines.length > collapseAfter;
  const first = foldable && !expanded ? lines.length - collapseAfter : 0;

  // Announce how it ended, once, when it ends; not on mount.
  const [announcement, setAnnouncement] = useState("");
  const [previous, setPrevious] = useState(status);
  if (previous !== status) {
    setPrevious(status);
    if (previous === "running") setAnnouncement(said(command, status, exitCode));
    if (status === "running") setStopFailed(false);
  }

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = Math.abs(el.scrollLeft);
    const next = { start: left > 1, end: max - left > 1, y: el.scrollHeight - el.clientHeight > 1 };
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    setOverflow((prev) => (prev.start === next.start && prev.end === next.end && prev.y === next.y ? prev : next));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  // Follow new lines only while the reader is at the bottom. Starts at the
  // bottom too: the end of a command's output is what's read first.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  // Stop goes away when the command ends; keep focus in the card.
  const showStop = shown === "running" && Boolean(onStop);
  // Stop stays for its fade when the command ends, then leaves the header.
  const [stopMounted, setStopMounted] = useState(showStop);
  if (showStop && !stopMounted) setStopMounted(true);
  // A status that replaces another fades in; the one a block is first drawn with is simply there.
  const [firstShown] = useState(shown);
  const [statusMoved, setStatusMoved] = useState(false);
  if (!statusMoved && shown !== firstShown) setStatusMoved(true);
  useLayoutEffect(() => {
    if (!showStop && stopFocused.current) {
      stopFocused.current = false;
      copyRef.current?.focus();
    }
  }, [showStop]);

  async function handleCopy() {
    clearTimeout(copyTimer.current);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(lines.map((l) => l.text).join("\n"));
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
    copyTimer.current = window.setTimeout(() => setCopy("idle"), 2000);
  }

  async function handleStop() {
    if (!onStop || stopping) return;
    setStopFailed(false);
    const result = onStop();
    if (!result) return;
    setStopping(true);
    try {
      await result;
    } catch {
      setStopFailed(true);
      setAnnouncement(`Couldn’t stop ${command}. Press Stop to try again.`);
    } finally {
      setStopping(false);
    }
  }

  function toggle() {
    // Keep the reader on the lines they were reading: the end.
    atBottom.current = true;
    setExpanded((e) => !e);
  }

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [expanded]);

  const duration = startedAt !== undefined && finishedAt !== undefined ? formatElapsed(finishedAt - startedAt, true) : null;
  const elapsed = startedAt !== undefined && now > 0 ? formatElapsed(now - startedAt) : null;
  const scrollable = overflow.start || overflow.end || overflow.y;
  const visible = first > 0 ? lines.slice(first) : lines;

  return (
    <div className={className ? `${styles.block} ${className}` : styles.block} aria-busy={running || undefined}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.command} title={command}>
            <span className={styles.prompt} aria-hidden="true">
              $
            </span>
            {command}
          </span>
          {shown !== "starting" && (
            <span key={shown} className={styles.status} data-status={shown} data-enter={statusMoved || undefined}>
              {shown === "running" ? (
                <>
                  <svg className={styles.pulse} viewBox="0 0 16 16" aria-hidden="true">
                    <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" />
                    <circle className={styles.dot} cx="8" cy="8" r="2.25" fill="currentColor" />
                  </svg>
                  <span>Running</span>
                  {elapsed && (
                    <span className={styles.time} aria-hidden="true">
                      {figures(elapsed)}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className={styles.code}>
                    {shown === "stopped"
                      ? "Stopped"
                      : exitCode === undefined && shown === "failed"
                        ? "Failed"
                        : `Exit ${exitCode ?? 0}`}
                  </span>
                  {duration && <span className={styles.time}>{figures(duration)}</span>}
                </>
              )}
            </span>
          )}
        </div>
        <div className={styles.actions}>
          {stopMounted && (
            <span
              className={styles.stop}
              data-shown={showStop}
              inert={!showStop}
              onTransitionEnd={(e) => {
                if (e.target === e.currentTarget && e.propertyName === "opacity" && !showStop) setStopMounted(false);
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                className={styles.action}
                busy={stopping}
                busyLabel="Stopping…"
                onClick={handleStop}
                onFocus={() => (stopFocused.current = true)}
                onBlur={() => (stopFocused.current = false)}
                aria-label={`Stop ${command}`}
              >
                {stopFailed ? "Stop failed" : "Stop"}
              </Button>
            </span>
          )}
          <Button ref={copyRef} variant="ghost" size="sm" className={styles.action} onClick={handleCopy} aria-label={`Copy output of ${command}`}>
            {copy === "copied" ? "Copied" : copy === "failed" ? "Copy failed" : "Copy"}
          </Button>
          <span role="status" className={styles.srOnly}>
            {copy === "copied" ? "Copied to clipboard" : copy === "failed" ? "Couldn’t copy. Select the output and copy it manually." : ""}
          </span>
          <span role="status" className={styles.srOnly}>
            {announcement}
          </span>
        </div>
      </div>

      {foldable && (
        <div className={styles.fold}>
          <Button variant="ghost" className={styles.more} onClick={toggle} aria-expanded={expanded} aria-controls={scrollerId}>
            {expanded ? `Show last ${collapseAfter} ${collapseAfter === 1 ? "line" : "lines"}` : `Show all ${lines.length} lines`}
          </Button>
        </div>
      )}

      {/* The body's height eases: a fold opening or a line landing pushes what's below instead of bumping it. */}
      <AnimatedSize>
        <div
          ref={scrollerRef}
          id={scrollerId}
          className={styles.scroller}
          data-fade-start={overflow.start || undefined}
          data-fade-end={overflow.end || undefined}
          style={maxHeight === undefined ? undefined : { maxHeight }}
          onScroll={measure}
          // Focusable only when scrollable, so the keyboard can scroll it.
          tabIndex={scrollable ? 0 : undefined}
          role={scrollable ? "region" : undefined}
          aria-label={scrollable ? `Output of ${command}` : undefined}
        >
          <pre className={styles.pre}>
            <code className={styles.output}>
              {visible.length === 0 ? (
                <span className={`${styles.line} ${styles.quiet}`}>{running ? "Waiting for output…" : "No output"}</span>
              ) : (
                visible.map((line, i) => <Line key={first + i} text={line.text} stderr={Boolean(line.stderr)} />)
              )}
            </code>
          </pre>
        </div>
      </AnimatedSize>
    </div>
  );
}

// Memoized on its text, so earlier lines never re-render as output arrives.
const Line = memo(function Line({ text, stderr }: { text: string; stderr: boolean }) {
  return (
    <span className={styles.line} data-stderr={stderr || undefined}>
      {text}
    </span>
  );
});
