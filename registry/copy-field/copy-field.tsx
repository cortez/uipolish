"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { FieldMessage } from "../field/field";
import { Icon } from "../icons/icons";
import { Tooltip } from "../tooltip/tooltip";
import styles from "./copy-field.module.css";

type CopyFieldProps = {
  label: string;
  value: string;
  mono?: boolean;
  /** Control height: 32, 40 (default) or 48px. Match the `action` beside it. */
  size?: "sm" | "md" | "lg";
  /** Mask the value behind dots, with a Show button. Copy still copies the value. */
  secret?: boolean;
  /** Controlled reveal for a secret. */
  revealed?: boolean;
  defaultRevealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  /** Guidance under the field; a failed copy replaces it. */
  hint?: string;
  onCopied?: () => void;
  /** A control beside the field, such as a "Regenerate" button. */
  action?: ReactNode;
  id?: string;
  className?: string;
};

type CopyState = "idle" | "copied" | "failed";

const COPIED_MS = 2000;
const FAILED_MS = 4000;
/* Fixed length, so the mask doesn't give away the secret's length. */
const MASK = "•".repeat(16);

/** A read-only value with a Copy button; a secret stays masked until shown. */
export function CopyField({
  label,
  value,
  mono = false,
  size = "md",
  secret = false,
  revealed: controlledRevealed,
  defaultRevealed = false,
  onRevealedChange,
  hint,
  onCopied,
  action,
  id,
  className,
}: CopyFieldProps) {
  const fallbackId = useId();
  const baseId = id ?? fallbackId;
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;
  const messageId = `${baseId}-message`;

  const [innerRevealed, setInnerRevealed] = useState(defaultRevealed);
  const revealed = !secret || (controlledRevealed ?? innerRevealed);
  const [copy, setCopy] = useState<CopyState>("idle");
  const timer = useRef(0);
  const valueRef = useRef<HTMLElement>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function toggleReveal() {
    const next = !revealed;
    if (controlledRevealed === undefined) setInnerRevealed(next);
    onRevealedChange?.(next);
  }

  async function handleCopy() {
    window.clearTimeout(timer.current);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setCopy("copied");
      onCopied?.();
      timer.current = window.setTimeout(() => setCopy("idle"), COPIED_MS);
    } catch {
      setCopy("failed");
      // Select a shown value so the copy shortcut works on it; a masked one stays masked.
      const node = valueRef.current;
      const selection = window.getSelection();
      if (node && revealed && selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      timer.current = window.setTimeout(() => setCopy("idle"), FAILED_MS);
    }
  }

  const failure = revealed
    ? "Couldn’t copy. It’s selected: press ⌘C or Ctrl+C."
    : "Couldn’t copy. Show it, then select it and copy.";
  const Value = mono ? "code" : "span";

  return (
    <div className={className ? `${styles.field} ${className}` : styles.field} data-size={size}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <div className={styles.row} data-action={action ? "" : undefined}>
        <div
          className={styles.control}
          role="group"
          aria-labelledby={labelId}
          aria-describedby={hint ? messageId : undefined}
        >
          <span className={styles.cell}>
            <Value
              ref={valueRef}
              id={valueId}
              className={styles.value}
              data-mono={mono || undefined}
              data-shown={revealed || undefined}
              title={revealed ? value : undefined}
            >
              {value}
            </Value>
            {secret && (
              <span className={styles.mask} data-shown={!revealed || undefined}>
                <span aria-hidden="true">{MASK}</span>
                <span className={styles.srOnly}>Hidden</span>
              </span>
            )}
          </span>
          <span className={styles.actions}>
            {secret && (
              <Tooltip content={revealed ? "Hide" : "Show"} describe={false}>
                <button
                  type="button"
                  className={styles.button}
                  aria-label={`Show ${label}`}
                  aria-pressed={revealed}
                  aria-controls={valueId}
                  onClick={toggleReveal}
                >
                  <Icon name={revealed ? "eye-off" : "eye"} />
                </button>
              </Tooltip>
            )}
            <Tooltip content={copy === "copied" ? "Copied" : copy === "failed" ? "Couldn’t copy" : "Copy"} describe={false}>
              <button
                type="button"
                className={styles.button}
                data-state={copy}
                aria-label={`Copy ${label}`}
                onClick={handleCopy}
              >
                <Icon name={copy === "copied" ? "check" : copy === "failed" ? "alert" : "copy"} />
              </button>
            </Tooltip>
          </span>
        </div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
      {hint && <FieldMessage id={messageId} hint={hint} error={copy === "failed" ? failure : null} />}
      <span role="status" className={styles.srOnly}>
        {copy === "copied" ? "Copied" : copy === "failed" && !hint ? failure : ""}
      </span>
    </div>
  );
}
