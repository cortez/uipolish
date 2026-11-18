import type { ComponentProps, ReactNode } from "react";
import styles from "./badge.module.css";

// No "use client": stateless, so it renders on the server.

type Tone = "neutral" | "accent" | "positive" | "warning" | "danger";

type BadgeProps = Omit<ComponentProps<"span">, "children"> & {
  /** Status tone. `positive` and `danger` mean only done and failed. */
  tone?: Tone;
  /** A small mark in the tone's color before the label. */
  dot?: boolean;
  /** `md` fits a 15px line, `sm` a 13px one. */
  size?: "sm" | "md";
  /** The label, always in words. */
  children?: ReactNode;
  /** Show a number instead of a label. Over `max` it reads `99+`. */
  count?: number;
  max?: number;
  /** What the count means, for screen readers ("3 new replies"). */
  label?: string;
};

/** A small static label for a status or a count. */
export function Badge({
  tone = "neutral",
  dot = false,
  size = "md",
  count,
  max = 99,
  label,
  className,
  children,
  ...props
}: BadgeProps) {
  const isCount = count !== undefined;
  const shown = isCount ? (count > max ? `${max}+` : String(count)) : children;

  return (
    <span
      className={className ? `${styles.badge} ${className}` : styles.badge}
      data-tone={tone}
      data-size={size}
      data-count={isCount || undefined}
      {...props}
    >
      {dot && !isCount && <span className={styles.dot} aria-hidden="true" />}
      {isCount && label ? (
        <>
          <span className={styles.label} aria-hidden="true">
            {shown}
          </span>
          <span className={styles.srOnly}>{label}</span>
        </>
      ) : (
        <span className={styles.label}>{shown}</span>
      )}
    </span>
  );
}
