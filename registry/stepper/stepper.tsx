"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./stepper.module.css";

export type StepperStatus = "complete" | "current" | "upcoming" | "error" | "skipped";

export type StepperStep = {
  id: string;
  title: ReactNode;
  /** One quiet line under the title: what the step asks, or what went wrong. */
  description?: ReactNode;
  /** Overrides what `current` implies: `error` and `skipped` are the usual ones. */
  status?: StepperStatus;
};

type StepperProps = {
  steps: StepperStep[];
  /** Index of the step in progress. `steps.length` once every step is done. Without it, each step's `status` says. */
  current?: number;
  /** `horizontal` (default): a row with titles under the marks. `vertical`: a column, titles beside them. */
  orientation?: "horizontal" | "vertical";
  /** `auto` (default): a horizontal stepper turns compact when its container is under 128px a step. */
  variant?: "auto" | "full" | "compact";
  /** Makes the steps behind the current one buttons, to go back to them. */
  onStepClick?: (index: number, step: StepperStep) => void;
  /** Names the list for screen readers. */
  label?: string;
  className?: string;
};

const STATUS_TEXT: Record<StepperStatus, string> = {
  complete: "Done",
  current: "Current",
  upcoming: "Not started",
  error: "Needs attention",
  skipped: "Skipped",
};

/** The status of each step, from `current` unless a step says its own. */
function statuses(steps: StepperStep[], current: number | undefined): StepperStatus[] {
  return steps.map((step, i) => {
    if (step.status) return step.status;
    if (current === undefined) return "upcoming";
    return i < current ? "complete" : i === current ? "current" : "upcoming";
  });
}

/** Where the line has reached: the current step, else the first not reached, else the end. */
function reached(status: StepperStatus[], current: number | undefined) {
  if (current !== undefined) return Math.min(Math.max(Math.round(current), 0), status.length);
  const at = status.findIndex((s) => s === "current" || s === "upcoming");
  return at === -1 ? status.length : at;
}

function Mark({ status, n }: { status: StepperStatus; n: number }) {
  return (
    <span className={styles.mark} data-status={status} aria-hidden="true">
      <span className={styles.layer} data-layer="number">
        {n}
      </span>
      <Icon className={styles.check} name="check" data-layer="check" />
      <svg className={styles.glyph} data-layer="error" viewBox="0 0 16 16">
        <path d="M8 4.5v4.25" />
        <path d="M8 11.25v0.01" />
      </svg>
      <Icon className={styles.glyph} name="minus" data-layer="skipped" />
    </span>
  );
}

/** Progress through a multi-step flow: a row or column of marks joined by a line that fills toward the current step. */
export function Stepper({
  steps,
  current,
  orientation = "horizontal",
  variant = "auto",
  onStepClick,
  label = "Steps",
  className,
}: StepperProps) {
  const id = useId();
  const status = statuses(steps, current);
  const at = reached(status, current);
  const total = steps.length;
  const shown = Math.min(at, total - 1);

  // Which way the last change went: forward, the line fills first and the
  // next mark lights as it arrives; back, the mark lights at once and the
  // line drains behind it.
  const [previous, setPrevious] = useState(at);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [announcement, setAnnouncement] = useState("");
  if (previous !== at) {
    setPrevious(at);
    setDirection(at > previous ? "forward" : "back");
    const step = steps[at];
    setAnnouncement(at >= total ? `All ${total} steps done` : `Step ${at + 1} of ${total}${typeof step?.title === "string" ? `: ${step.title}` : ""}`);
  }

  // A step that turns to an error says so, with its description if it's words.
  const errors = status.map((s, i) => (s === "error" ? i : -1)).filter((i) => i >= 0).join();
  const [previousErrors, setPreviousErrors] = useState(errors);
  if (previousErrors !== errors) {
    setPreviousErrors(errors);
    const before = previousErrors.split(",");
    const fresh = status.findIndex((s, i) => s === "error" && !before.includes(String(i)));
    const step = steps[fresh];
    if (step) {
      const name = typeof step.title === "string" ? step.title : `Step ${fresh + 1}`;
      setAnnouncement(`${name} needs attention${typeof step.description === "string" ? `: ${step.description}` : ""}`);
    }
  }

  // Steps behind the line can be revisited; the rest are where you're going.
  const clickable = (i: number) => onStepClick !== undefined && i < at && status[i] !== "current";

  const full = variant !== "compact" && (
    <ol
      className={styles.list}
      aria-label={label}
      data-orientation={orientation}
      // A row: every step an equal column, the last only as wide as its
      // title needs (at most a share), so the line runs to the final mark.
      style={
        orientation === "horizontal"
          ? { gridTemplateColumns: total > 1 ? `repeat(${total - 1}, minmax(0, 1fr)) fit-content(${100 / total}%)` : "minmax(0, 1fr)" }
          : undefined
      }
    >
      {steps.map((step, i) => {
        const s = status[i];
        const isCurrent = s === "current" || (current !== undefined && i === at && s !== "complete");
        const head = (
          <>
            <Mark status={s} n={i + 1} />
            <span className={styles.text}>
              <span className={styles.srOnly}>{STATUS_TEXT[s]}: </span>
              <span className={styles.title}>{step.title}</span>
              {step.description && <span className={styles.description}>{step.description}</span>}
            </span>
          </>
        );
        return (
          <li
            key={step.id}
            className={styles.step}
            data-status={s}
            data-filled={i < at || undefined}
          >
            {clickable(i) ? (
              <button
                type="button"
                className={styles.head}
                aria-describedby={`${id}-${i}-hint`}
                onClick={() => onStepClick?.(i, step)}
              >
                {head}
                <span id={`${id}-${i}-hint`} className={styles.srOnly}>
                  Go back to this step
                </span>
              </button>
            ) : (
              <div className={styles.head} aria-current={isCurrent ? "step" : undefined}>
                {head}
              </div>
            )}
            {i < total - 1 && (
              <span className={styles.connector} aria-hidden="true">
                <span className={styles.fill} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );

  const compact = (variant === "compact" || (variant === "auto" && orientation === "horizontal")) && (
    <div className={styles.compact}>
      <div className={styles.track} style={{ "--at": shown } as CSSProperties}>
        <ol className={styles.dots} aria-label={label}>
          {steps.map((step, i) => {
            const s = status[i];
            const name = typeof step.title === "string" ? step.title : `Step ${i + 1}`;
            return (
              <li key={step.id} className={styles.slot} data-status={s} data-filled={i < at || undefined}>
                {clickable(i) ? (
                  <button
                    type="button"
                    className={styles.dot}
                    aria-label={`${name}, ${STATUS_TEXT[s].toLowerCase()}. Go back to this step`}
                    onClick={() => onStepClick?.(i, step)}
                  />
                ) : (
                  <span
                    className={styles.dot}
                    role="img"
                    aria-label={`${name}, ${STATUS_TEXT[s].toLowerCase()}`}
                    aria-current={i === at ? "step" : undefined}
                  />
                )}
              </li>
            );
          })}
        </ol>
        {/* One pill that glides from dot to dot, over the dot it marks. */}
        <span className={styles.indicator} data-status={at < total ? status[at] : "complete"} data-done={at >= total || undefined} aria-hidden="true" />
      </div>
      <span className={styles.count} aria-hidden="true">
        <TextMorph>{at >= total ? `${total} of ${total} done` : `Step ${at + 1} of ${total}`}</TextMorph>
      </span>
    </div>
  );

  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      data-orientation={orientation}
      data-variant={variant}
      data-count={Math.min(total, 8)}
      data-direction={direction}
      data-clickable={onStepClick ? "" : undefined}
    >
      {full}
      {compact}
      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}
