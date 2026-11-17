"use client";

import type { CSSProperties, ReactNode } from "react";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./progress.module.css";

type ProgressProps = {
  /** 0 to `max`, or `null` when unknown. */
  value: number | null;
  max?: number;
  /** What the work is; the bar's accessible name. */
  label: string;
  /** Defaults to the percentage; `false` hides it. */
  valueText?: ReactNode | false;
  /** `warning` when it's close to a limit, `danger` once the work has failed or the limit is hit. */
  tone?: "neutral" | "warning" | "danger";
  className?: string;
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** A linear progress bar, built on Base UI's Progress. */
export function Progress({ value, max = 100, label, valueText, tone = "neutral", className }: ProgressProps) {
  const known = value !== null && Number.isFinite(value);
  const fraction = known ? clamp(value / (max || 1), 0, 1) : 0;
  const percent = Math.round(fraction * 100);
  const live = valueText === undefined && known;
  const shownValue = valueText === undefined ? (known ? `${percent}%` : null) : valueText;

  return (
    <BaseProgress.Root
      value={known ? value : null}
      max={max}
      {...(known && typeof shownValue === "string" ? { "aria-valuetext": shownValue } : {})}
      aria-busy={!known || undefined}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-tone={tone}
    >
      <div className={styles.header}>
        <BaseProgress.Label className={styles.label}>{label}</BaseProgress.Label>
        {shownValue !== false && shownValue !== null && (
          <span className={styles.value} data-live={live || undefined}>
            {shownValue}
          </span>
        )}
      </div>
      <BaseProgress.Track className={styles.track} style={{ "--progress": fraction } as CSSProperties}>
        {/* Full width and slid back, so Base UI's width is replaced. */}
        <BaseProgress.Indicator className={styles.fill} style={known ? { width: "auto" } : undefined} />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}

type ProgressStepsProps = {
  steps: string[];
  /** Index of the step in progress. `steps.length` once all are done. */
  current: number;
  label: string;
  className?: string;
};

/** Segmented progress through named steps, built on Base UI's Progress. */
export function ProgressSteps({ steps, current, label, className }: ProgressStepsProps) {
  const total = steps.length;
  const at = clamp(Math.round(current), 0, total);
  const done = at >= total;
  const caption = done ? "Done" : steps[at] ?? "";
  const text = done ? `All ${total} steps done` : `Step ${at + 1} of ${total}: ${caption}`;

  return (
    <BaseProgress.Root
      value={at}
      max={Math.max(total, 1)}
      aria-valuetext={text}
      className={className ? `${styles.root} ${className}` : styles.root}
    >
      <div className={styles.header}>
        <BaseProgress.Label className={styles.label}>{label}</BaseProgress.Label>
        <span className={styles.value}>
          <TextMorph>{done ? `${total} of ${total}` : `${at + 1} of ${total}`}</TextMorph>
        </span>
      </div>
      <BaseProgress.Track
        className={styles.segments}
        style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, minmax(0, 1fr))` }}
      >
        {steps.map((step, i) => (
          <span
            key={`${i}-${step}`}
            className={styles.segment}
            data-state={i < at ? "done" : i === at ? "current" : undefined}
          />
        ))}
      </BaseProgress.Track>
      <span className={styles.caption} aria-hidden="true">
        <TextMorph>{caption}</TextMorph>
      </span>
    </BaseProgress.Root>
  );
}
