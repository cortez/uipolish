"use client";

import type { ReactNode } from "react";
import { Icon } from "../icons/icons";
import { cx, type RunStatus, type RunStepStatus, type RunTrigger } from "./shared";
import styles from "./run-history.module.css";

export const STATUS_TEXT: Record<RunStatus | RunStepStatus, string> = {
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
  retried: "Retried",
};

export const TRIGGER_TEXT: Record<RunTrigger, string> = {
  user: "Person",
  schedule: "Schedule",
  webhook: "Webhook",
};

/**
 * The status as a 16px glyph. Every shape is drawn and the status picks one,
 * so a run that finishes trades the turning arc for a tick that draws on, in
 * place, without the row moving.
 */
export function StatusGlyph({ status, className }: { status: RunStatus | RunStepStatus; className?: string }) {
  return (
    <span className={cx(styles.glyph, className)} data-status={status} aria-hidden="true">
      <svg data-icon="running" viewBox="0 0 16 16">
        <circle className={styles.spinTrack} cx="8" cy="8" r="6" fill="none" />
        <path className={styles.spinArc} d="M8 2a6 6 0 0 1 6 6" fill="none" strokeLinecap="round" />
      </svg>
      <svg data-icon="succeeded" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path
          className={styles.check}
          d="M5.25 8.25l1.9 1.9 3.6-3.9"
          fill="none"
          style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg data-icon="failed" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M8 4.75v3.6" stroke="var(--ui-on-danger)" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" />
        <circle cx="8" cy="10.9" r="0.95" fill="var(--ui-on-danger)" />
      </svg>
      <svg data-icon="retried" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} />
        <path d="M8 5v3.4" stroke="currentColor" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" />
        <circle cx="8" cy="10.75" r="0.85" fill="currentColor" />
      </svg>
      <svg data-icon="cancelled" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} />
        <path d="M5.5 8h5" stroke="currentColor" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Glyph and word: the status in a table cell or a header. */
export function StatusTag({ status, size = "sm" }: { status: RunStatus; size?: "sm" | "md" }) {
  return (
    <span className={styles.statusTag} data-status={status} data-size={size}>
      <StatusGlyph status={status} />
      <span className={styles.statusWord}>
        {/* Every word sits underneath, so the cell keeps the widest one's width. */}
        {(["Succeeded", "Cancelled", "Running", "Failed"] as const).map((w) => (
          <span key={w} className={styles.reserve} aria-hidden="true">
            {w}
          </span>
        ))}
        <span>{STATUS_TEXT[status]}</span>
      </span>
    </span>
  );
}

/** A number in a box sized by its widest value, so it never nudges its neighbours. */
export function Counter({ value, reserve, className }: { value: string; reserve: string | string[]; className?: string }) {
  return (
    <span className={cx(styles.counter, className)}>
      {(Array.isArray(reserve) ? reserve : [reserve]).map((r) => (
        <span key={r} className={styles.reserve} aria-hidden="true">
          {r}
        </span>
      ))}
      <span>{value}</span>
    </span>
  );
}

/** How a run started: a person by name, a schedule, or a webhook's event. */
export function TriggerLabel({ trigger, by }: { trigger: RunTrigger; by?: string }) {
  const icon: ReactNode =
    trigger === "user" ? (
      <svg viewBox="0 0 16 16" className={styles.triggerIcon} aria-hidden="true">
        <circle cx="8" cy="5.5" r="2.5" fill="none" stroke="currentColor" />
        <path d="M3.25 13c.6-2.3 2.4-3.5 4.75-3.5s4.15 1.2 4.75 3.5" fill="none" stroke="currentColor" strokeLinecap="round" />
      </svg>
    ) : (
      <Icon name={trigger === "schedule" ? "calendar" : "link"} className={styles.triggerIcon} />
    );
  return (
    <span className={styles.trigger}>
      {icon}
      <span className={styles.triggerText}>
        <span className={styles.srOnly}>{TRIGGER_TEXT[trigger]}: </span>
        {by ?? TRIGGER_TEXT[trigger]}
      </span>
    </span>
  );
}
