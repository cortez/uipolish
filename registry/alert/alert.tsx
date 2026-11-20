"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode, type TransitionEvent } from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { Icon, type IconName } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./alert.module.css";

type Tone = "info" | "success" | "warning" | "error";

const ICON: Record<Tone, IconName> = {
  info: "info",
  success: "check-circle",
  warning: "warning",
  error: "alert",
};

type AlertProps = {
  tone?: Tone;
  /** One line that says what happened. */
  title: string;
  /** What it means or what to do. */
  children?: ReactNode;
  /** Buttons or links under the text. */
  actions?: ReactNode;
  /** Whether it's showing. Omit for an alert that's there from the start. */
  open?: boolean;
  /** How a later alert makes room. Use `expand` only for one answering the user's own input. */
  arrive?: "reserve" | "expand";
  /** Shows a dismiss button; called once the alert has closed. */
  onDismiss?: () => void;
  /** Name for the dismiss button. */
  dismissLabel?: string;
  className?: string;
};

const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The title morphs when it changes, and a morphing label is one line. So it
 * morphs only while it fits on one: a title too long for a narrow alert is
 * plain text, which wraps. Plain until measured, so it is never cut off.
 */
function Title({ id, children }: { id?: string; children: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [wraps, setWraps] = useState(true);
  // The width at which the one-line label last overflowed: no going back to
  // it until there is more room, so the two modes can't trade places forever.
  const tooNarrow = useRef({ title: children, width: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    if (tooNarrow.current.title !== children) tooNarrow.current = { title: children, width: 0 };
    const check = () => {
      // Hidden (display: none above): nothing to measure.
      if (el.clientWidth === 0) return;
      if (wraps) {
        const oneLine = el.offsetHeight < parseFloat(getComputedStyle(el).lineHeight) * 1.5;
        if (oneLine && el.clientWidth > tooNarrow.current.width) setWraps(false);
      } else if (el.scrollWidth > el.clientWidth) {
        tooNarrow.current.width = el.clientWidth;
        setWraps(true);
      }
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    // The label's own width eases as it morphs; look again as it lands.
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [children, wraps]);

  return (
    <p ref={ref} id={id} className={styles.title}>
      {wraps ? children : <TextMorph>{children}</TextMorph>}
    </p>
  );
}

/** An inline status banner. Later errors and warnings use role="alert", info and success role="status". */
export function Alert({
  tone = "info",
  title,
  children,
  actions,
  open,
  arrive = "reserve",
  onDismiss,
  dismissLabel = "Dismiss",
  className,
}: AlertProps) {
  const titleId = useId();
  const controlled = open !== undefined;
  const [dismissed, setDismissed] = useState(false);

  // Each open resets dismissal and remounts, so the live region announces it again.
  const [lastOpen, setLastOpen] = useState(open);
  const [arrival, setArrival] = useState(0);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setDismissed(false);
      setArrival((n) => n + 1);
    }
  }

  const shown = (controlled ? open : true) && !dismissed;
  // Stays mounted once shown, so it can fade out.
  const [everShown, setEverShown] = useState(shown);
  if (shown && !everShown) setEverShown(true);

  // Once its content has changed in place, new text and actions fade in;
  // the first render doesn't.
  const [firstTitle] = useState(title);
  const changed = title !== firstTitle;

  const urgent = tone === "error" || tone === "warning";
  const mode = !controlled ? "static" : arrive;

  const content = (live: boolean) => (
    <div className={styles.alert} aria-labelledby={live ? titleId : undefined}>
      <span className={styles.icon}>
        <Icon name={ICON[tone]} />
      </span>
      {/* The body eases to its new height when its content changes; the
          title morphs letter by letter, and new text and actions fade in. */}
      <AnimatedSize className={styles.bodySize}>
        <div className={styles.body}>
          <Title id={live ? titleId : undefined}>{title}</Title>
          {children && (
            <div key={`text:${title}`} className={styles.text}>
              {children}
            </div>
          )}
          {actions && (
            <div key={`actions:${title}`} className={styles.actions}>
              {actions}
            </div>
          )}
        </div>
      </AnimatedSize>
      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          aria-label={dismissLabel}
          tabIndex={live ? undefined : -1}
          onClick={
            live
              ? () => {
                  setDismissed(true);
                  // Nothing will transition, so report it now.
                  if (reduced()) onDismiss();
                }
              : undefined
          }
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  );

  function finish(event: TransitionEvent<HTMLDivElement>) {
    if (dismissed && event.target === event.currentTarget && event.propertyName === "grid-template-rows") onDismiss?.();
  }

  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      data-tone={tone}
      data-mode={mode}
      data-shown={shown || undefined}
      data-dismissed={dismissed || undefined}
      data-changed={changed || undefined}
      onTransitionEnd={finish}
      onTransitionCancel={finish}
    >
      <div className={styles.clip}>
        <div className={styles.cell}>
          {mode === "reserve" && (
            <div className={styles.sizer} aria-hidden="true" inert>
              {content(false)}
            </div>
          )}
          {/* Always in the DOM, so content put into it is announced. */}
          <div role={controlled ? (urgent ? "alert" : "status") : undefined} className={styles.live}>
            {everShown && (
              <div key={arrival} className={styles.layer} data-on={shown || undefined} inert={!shown || undefined}>
                {content(true)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
