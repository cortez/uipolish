"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./stat.module.css";

type Delta = {
  /** Already formatted, without a sign: "8%", "$1,240". */
  value: string;
  direction: "up" | "down" | "flat";
  /** Whether the change is good news; up isn't always good. */
  tone?: "positive" | "negative" | "neutral";
  /** e.g. "vs last month". */
  label?: string;
};

type StatProps = Omit<ComponentProps<"dl">, "children"> & {
  label: string;
  /** A number or a word ("High"). */
  value: number | string;
  format?: (value: number) => string;
  delta?: Delta;
  hint?: string;
  /** Fixed so server and browser format numbers alike. */
  locale?: string;
};

/** One figure with its label, change and hint. */
export function Stat({ label, value, format, delta, hint, locale = "en-US", className, ...props }: StatProps) {
  const text = typeof value === "number" ? (format ? format(value) : new Intl.NumberFormat(locale).format(value)) : value;
  const word = !/\d/.test(text);
  const labelRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const els = [labelRef.current, hintRef.current].filter((el): el is HTMLElement => el !== null);
    const check = () => {
      for (const el of els) {
        const clipped = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
        if (clipped) el.dataset.clipped = "";
        else delete el.dataset.clipped;
      }
    };
    check();
    const observer = new ResizeObserver(check);
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [label, hint]);

  return (
    <dl className={className ? `${styles.root} ${className}` : styles.root} {...props}>
      <dt ref={labelRef} className={styles.label}>
        {label}
      </dt>
      <dd className={styles.figure} data-word={word || undefined}>
        <TextMorph className={styles.figureText}>{text}</TextMorph>
      </dd>
      {delta && (
        <dd className={styles.delta} data-tone={delta.tone ?? "neutral"}>
          <span className={styles.change}>
            <Icon
              name={delta.direction === "up" ? "arrow-up" : delta.direction === "down" ? "arrow-down" : "minus"}
              className={styles.arrow}
            />
            {/* The arrow is drawn; the direction is also said. */}
            <span className={styles.srOnly}>{delta.direction === "flat" ? "unchanged " : `${delta.direction} `}</span>
            <TextMorph>{delta.value}</TextMorph>
          </span>
          {delta.label && <span className={styles.compare}>{delta.label}</span>}
        </dd>
      )}
      {hint !== undefined && (
        <dd ref={hintRef} className={styles.hint}>
          {hint}
        </dd>
      )}
    </dl>
  );
}
