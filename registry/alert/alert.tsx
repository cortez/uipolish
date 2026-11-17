"use client";

import { useId, useState, type ReactNode, type TransitionEvent } from "react";
import { Icon, type IconName } from "../icons/icons";
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

  const urgent = tone === "error" || tone === "warning";
  const mode = !controlled ? "static" : arrive;

  const content = (live: boolean) => (
    <div className={styles.alert} aria-labelledby={live ? titleId : undefined}>
      <span className={styles.icon}>
        <Icon name={ICON[tone]} />
      </span>
      <div className={styles.body}>
        <p id={live ? titleId : undefined} className={styles.title}>
          {title}
        </p>
        {children && <div className={styles.text}>{children}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
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
