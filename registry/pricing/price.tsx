import type { CSSProperties, ReactNode } from "react";
import type { PricingInterval } from "./shared";
import styles from "./pricing.module.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * A price that rolls between its monthly and yearly figures. Both are always
 * rendered, character by character in one grid cell each, so the box holds
 * the wider of the two and nothing beside it moves. Only the characters that
 * differ roll: monthly ones sit above, yearly ones below, so going to yearly
 * rolls the figures up and coming back rolls them down. Nothing moves on
 * first paint. The text is read once, from `label`.
 */
export function RollingFigure({
  month,
  year,
  interval,
  label,
  className,
}: {
  month: string;
  year: string;
  interval: PricingInterval;
  /** What a screen reader hears for the shown value. */
  label: string;
  className?: string;
}) {
  const a = Array.from(month);
  const b = Array.from(year);
  const length = Math.max(a.length, b.length);
  const slots: ReactNode[] = [];
  let changed = 0;
  for (let i = 0; i < length; i++) {
    const m = a[i] ?? "";
    const y = b[i] ?? "";
    if (m === y) {
      slots.push(
        <span key={i} className={styles.rollSlot}>
          {m}
        </span>,
      );
      continue;
    }
    // A short stagger, left to right, across the characters that change.
    const style: Vars = { "--roll-i": changed++ };
    slots.push(
      <span key={i} className={styles.rollSlot} style={style}>
        <span className={styles.rollChar} data-side="month" data-on={interval === "month" || undefined}>
          {m}
        </span>
        <span className={styles.rollChar} data-side="year" data-on={interval === "year" || undefined}>
          {y}
        </span>
      </span>,
    );
  }
  return (
    <span className={className}>
      <span className={styles.roll} aria-hidden="true">
        {slots}
      </span>
      <span className={styles.srOnly}>{label}</span>
    </span>
  );
}

/**
 * A short line with a monthly and a yearly wording, crossfaded in one grid
 * cell so the box keeps the taller and wider of the two.
 */
export function IntervalSwap({
  month,
  year,
  interval,
  className,
}: {
  month: ReactNode;
  year: ReactNode;
  interval: PricingInterval;
  className?: string;
}) {
  if (month === year) return <span className={className}>{month}</span>;
  return (
    <span className={className ? `${styles.swap} ${className}` : styles.swap}>
      <span className={styles.swapItem} data-side="month" data-on={interval === "month" || undefined} aria-hidden={interval !== "month" || undefined}>
        {month}
      </span>
      <span className={styles.swapItem} data-side="year" data-on={interval === "year" || undefined} aria-hidden={interval !== "year" || undefined}>
        {year}
      </span>
    </span>
  );
}
