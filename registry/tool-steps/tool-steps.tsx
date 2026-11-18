"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./tool-steps.module.css";

export type StepStatus = "pending" | "running" | "done" | "failed" | "skipped" | "cancelled";

export type ToolStep = {
  id: string;
  /** Past tense once done: "Read estimate.pdf". */
  title: string;
  status: StepStatus;
  /** One quiet line under the title. */
  detail?: ReactNode;
  /** Shown when failed. Say what happened. */
  error?: string;
  input?: string;
  output?: string;
  /** `Date.now()` at start and finish; drives the timers. */
  startedAt?: number;
  finishedAt?: number;
};

type ToolStepsProps = {
  steps: ToolStep[];
  onRetry?: (id: string) => void;
  /** Names the list for screen readers. */
  label?: string;
  /** Default: open while running, folded once every step succeeds. */
  defaultOpen?: boolean;
  className?: string;
};

const SETTLED: StepStatus[] = ["done", "failed", "skipped", "cancelled"];
const STATUS_TEXT: Record<StepStatus, string> = {
  pending: "Not started",
  running: "Running",
  done: "Done",
  failed: "Failed",
  skipped: "Skipped",
  cancelled: "Cancelled",
};

/** 2400 → "2.4s", 12000 → "12s", 74000 → "1m 14s". */
export function formatElapsed(ms: number, precise = false) {
  const s = ms / 1000;
  if (s < 10 && precise) return `${Math.max(0.1, Math.round(s * 10) / 10)}s`;
  const whole = Math.floor(s);
  if (whole < 60) return `${whole}s`;
  const rest = whole % 60;
  return rest ? `${Math.floor(whole / 60)}m ${rest}s` : `${Math.floor(whole / 60)}m`;
}

function summarize(steps: ToolStep[]) {
  const n = steps.length;
  const of = `${n} ${n === 1 ? "step" : "steps"}`;
  const failed = steps.findIndex((s) => s.status === "failed");
  const running = steps.findIndex((s) => s.status === "running");
  if (running !== -1) return `Running ${running + 1} of ${n}…`;
  if (failed !== -1) return `Step ${failed + 1} of ${n} failed`;
  // Between steps, point at the next one so the label doesn't flicker.
  const next = steps.findIndex((s) => s.status === "pending");
  if (next === 0) return `${of} queued`;
  if (next !== -1) return `Running ${next + 1} of ${n}…`;
  const done = steps.filter((s) => s.status === "done").length;
  const starts = steps.map((s) => s.startedAt).filter((t): t is number => t !== undefined);
  const ends = steps.map((s) => s.finishedAt).filter((t): t is number => t !== undefined);
  const took = starts.length && ends.length ? ` in ${formatElapsed(Math.max(...ends) - Math.min(...starts))}` : "";
  return done === n ? `Ran ${of}${took}` : `Ran ${done} of ${of}${took}`;
}

function allSucceeded(steps: ToolStep[]) {
  return steps.length > 0 && steps.every((s) => s.status === "done" || s.status === "skipped");
}

function StatusIcon({ status }: { status: StepStatus }) {
  return (
    <span className={styles.icon} data-status={status} aria-hidden="true">
      <svg data-icon="pending" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" />
      </svg>
      <span data-icon="running" className={styles.pulse} />
      <svg data-icon="done" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path className={styles.tick} d="M5.25 8.25l1.9 1.9 3.6-3.9" pathLength={1} fill="none" stroke="var(--ui-surface)" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg data-icon="failed" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M8 4.75v3.6" stroke="var(--ui-on-danger)" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" />
        <circle cx="8" cy="10.9" r="0.95" fill="var(--ui-on-danger)" />
      </svg>
      <svg data-icon="skipped" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" />
        <path d="M5.75 8h4.5" stroke="currentColor" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return <Icon className={styles.chevron} name="chevron-right" data-turn={open ? "open" : ""} />;
}

function Step({ step, now, onRetry }: { step: ToolStep; now: number; onRetry?: (id: string) => void }) {
  const ioId = useId();
  const [open, setOpen] = useState(false);
  const itemRef = useRef<HTMLLIElement>(null);
  const hasIO = Boolean(step.input || step.output);
  const settled = SETTLED.includes(step.status);

  let meta = "";
  if (step.status === "running" && step.startedAt !== undefined) meta = formatElapsed(Math.max(0, now - step.startedAt));
  else if ((step.status === "done" || step.status === "failed") && step.startedAt !== undefined && step.finishedAt !== undefined)
    meta = formatElapsed(step.finishedAt - step.startedAt, true);
  else if (step.status === "skipped" || step.status === "cancelled") meta = STATUS_TEXT[step.status];

  function retry() {
    onRetry?.(step.id);
    // The Retry button is about to unmount; keep focus on this step.
    requestAnimationFrame(() => itemRef.current?.querySelector<HTMLElement>("[data-step-title]")?.focus());
  }

  return (
    <li ref={itemRef} className={styles.step} data-status={step.status}>
      <StatusIcon status={step.status} />
      <span className={styles.rail} aria-hidden="true" />
      <div className={styles.main}>
        <div className={styles.line}>
          <span className={styles.srOnly}>{STATUS_TEXT[step.status]}: </span>
          {hasIO ? (
            <button
              type="button"
              className={styles.title}
              data-step-title
              aria-expanded={open}
              aria-controls={ioId}
              onClick={() => setOpen((o) => !o)}
            >
              <TextMorph className={styles.titleText}>{step.title}</TextMorph>
              <Chevron open={open} />
            </button>
          ) : (
            <span className={styles.title} data-step-title tabIndex={-1}>
              <TextMorph className={styles.titleText}>{step.title}</TextMorph>
            </span>
          )}
          <span className={styles.meta} aria-hidden={step.status === "running" ? true : undefined}>
            {meta}
          </span>
        </div>
        {step.detail && <p className={styles.detail}>{step.detail}</p>}
        {step.status === "failed" && (
          <div className={styles.error}>
            <p>{step.error ?? "This step didn’t finish."}</p>
            {onRetry && (
              <Button variant="secondary" onClick={retry}>
                Retry
              </Button>
            )}
          </div>
        )}
        {hasIO && (
          <div id={ioId} className={styles.io} data-open={open} inert={!open}>
            <div className={styles.clip}>
              <div className={styles.ioInner}>
                {step.input && (
                  <div className={styles.block}>
                    <span className={styles.blockLabel}>Input</span>
                    <pre tabIndex={0} aria-label={`Input for ${step.title}`}>
                      {step.input}
                    </pre>
                  </div>
                )}
                {step.output && settled && (
                  <div className={styles.block}>
                    <span className={styles.blockLabel}>Output</span>
                    <pre tabIndex={0} aria-label={`Output for ${step.title}`}>
                      {step.output}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export function ToolSteps({ steps, onRetry, label = "Agent steps", defaultOpen, className }: ToolStepsProps) {
  const listId = useId();
  const [open, setOpen] = useState(defaultOpen ?? !allSucceeded(steps));
  const [announcement, setAnnouncement] = useState("");

  // Announce settled steps; fold on a clean finish, open on failure.
  const [previous, setPrevious] = useState(steps);
  if (previous !== steps) {
    setPrevious(steps);
    const said: string[] = [];
    for (const step of steps) {
      const before = previous.find((p) => p.id === step.id);
      if (before?.status === step.status || !SETTLED.includes(step.status)) continue;
      said.push(
        step.status === "failed"
          ? `${step.title} failed${step.error ? `: ${step.error}` : ""}`
          : `${step.title}: ${STATUS_TEXT[step.status].toLowerCase()}`,
      );
    }
    const finished = allSucceeded(steps) && !allSucceeded(previous);
    if (finished) {
      said.push(summarize(steps));
      setOpen(false);
    }
    if (steps.some((s) => s.status === "failed") && !previous.some((s) => s.status === "failed")) setOpen(true);
    if (said.length) setAnnouncement(said.join(". "));
  }

  // Ticks twice a second so whole-second labels never lag.
  const running = steps.some((s) => s.status === "running");
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

  const summary = summarize(steps);

  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      data-open={open}
      data-running={running}
    >
      <button
        type="button"
        className={styles.header}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <TextMorph className={styles.summary}>{summary}</TextMorph>
        <Chevron open={open} />
      </button>

      <div id={listId} className={styles.panel} inert={!open}>
        <div className={styles.clip}>
          <ol className={styles.list} aria-label={label}>
            {steps.map((step) => (
              <Step key={step.id} step={step} now={now} onRetry={onRetry} />
            ))}
          </ol>
        </div>
      </div>

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}
