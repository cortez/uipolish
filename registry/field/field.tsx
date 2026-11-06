"use client";

import { useState } from "react";
import { Icon } from "../icons/icons";
import styles from "./field.module.css";

type FieldMessageProps = {
  id: string;
  hint?: string | null;
  error?: string | null;
};

/** Hint or error; the hidden one leaves the description and live region. */
export function FieldMessage({ id, hint, error }: FieldMessageProps) {
  const [lastError, setLastError] = useState(error);
  if (error && error !== lastError) setLastError(error);

  return (
    <p id={id} className={styles.message} aria-live="polite">
      {hint && (
        <span className={styles.hint} data-shown={!error || undefined}>
          {hint}
        </span>
      )}
      {lastError && (
        <span className={styles.error} data-shown={error ? true : undefined}>
          <Icon name="alert" className={styles.errorIcon} />
          <span key={lastError} className={styles.errorText}>
            {lastError}
          </span>
        </span>
      )}
    </p>
  );
}
