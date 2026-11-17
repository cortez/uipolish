import type { ComponentProps } from "react";
import styles from "./diff-stat.module.css";

// No "use client": stateless, so it renders on the server.

type DiffStatProps = Omit<ComponentProps<"span">, "children"> & {
  /** Lines added. */
  added: number;
  /** Lines removed. */
  removed: number;
  /** Leave out a side that is 0 ("+12" for a new file). Default: both show, the 0 in the subtle color. */
  hideZero?: boolean;
};

const numbers = new Intl.NumberFormat("en-US");

/** 1204 → "1,204". The counts in a diff stat, a totals line or a tab. */
export function formatCount(n: number) {
  return numbers.format(Math.max(0, Math.round(n)));
}

/** "12 lines added, 3 removed": what a screen reader hears for a diff stat. */
export function describeDiff(added: number, removed: number) {
  const lines = (n: number) => `${formatCount(n)} ${n === 1 ? "line" : "lines"}`;
  if (!added && !removed) return "No lines changed";
  if (!removed) return `${lines(added)} added`;
  if (!added) return `${lines(removed)} removed`;
  return `${lines(added)} added, ${formatCount(removed)} removed`;
}

/** Lines added and removed, "+12 −3": added in the success color, removed in danger. */
export function DiffStat({ added, removed, hideZero = false, className, ...props }: DiffStatProps) {
  const showAdded = !hideZero || added > 0;
  const showRemoved = !hideZero || removed > 0;
  return (
    <span className={className ? `${styles.stat} ${className}` : styles.stat} {...props}>
      <span className={styles.srOnly}>{describeDiff(added, removed)}</span>
      {showAdded && (
        <span className={styles.added} data-zero={added === 0 || undefined} aria-hidden="true">
          +{formatCount(added)}
        </span>
      )}
      {showRemoved && (
        <span className={styles.removed} data-zero={removed === 0 || undefined} aria-hidden="true">
          {"−"}
          {formatCount(removed)}
        </span>
      )}
    </span>
  );
}
