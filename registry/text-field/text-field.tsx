"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FocusEvent,
  type Ref,
} from "react";
import { FieldMessage } from "../field/field";
import { Icon } from "../icons/icons";
import styles from "./text-field.module.css";

type TextFieldProps = Omit<ComponentProps<"input">, "size"> & {
  label: string;
  /** Hide the label from sight; screen readers still read it. Use only where
   *  the field's purpose is plain from what's around it. */
  hideLabel?: boolean;
  /** Guidance shown under the field until there's an error to show instead. */
  hint?: string;
  /** Return a message that says how to fix the value, or null when it's fine. */
  validate?: (value: string) => string | null;
  /** An error from outside, such as the server. Wins over `validate`. */
  error?: string | null;
  size?: "md" | "lg";
};

export function TextField({
  label,
  hideLabel = false,
  hint,
  validate,
  error: externalError,
  size = "md",
  className,
  onBlur,
  onChange,
  id,
  type,
  ref,
  ...props
}: TextFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const messageId = `${inputId}-message`;

  // Validate on blur, not mid-typing. Once an error shows, re-check on every
  // keystroke so it clears the moment the value is fixed.
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = externalError ?? localError;

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    setTouched(true);
    setLocalError(validate?.(event.currentTarget.value) ?? null);
    onBlur?.(event);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (touched && localError)
      setLocalError(validate?.(event.currentTarget.value) ?? null);
    onChange?.(event);
  }

  const message = error ?? hint;
  // A line is reserved only when something can show there (even a null error prop).
  const hasMessage = Boolean(hint || validate || externalError !== undefined);

  const password = type === "password";
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selection = useRef<[number | null, number | null] | null>(null);

  // Switching the type can drop the caret to the start in some browsers.
  useLayoutEffect(() => {
    const input = inputRef.current;
    const saved = selection.current;
    if (!input || !saved) return;
    selection.current = null;
    if (document.activeElement !== input) return;
    const restore = () => {
      if (document.activeElement === input)
        input.setSelectionRange(saved[0], saved[1]);
    };
    restore();
    // Chrome rebuilds the field's editor after the commit and can reset
    // the caret once more, so restore again on the next frame.
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [revealed]);

  function toggleReveal() {
    const input = inputRef.current;
    if (input) selection.current = [input.selectionStart, input.selectionEnd];
    setRevealed((r) => !r);
  }

  // A value wider than the field fades at the end while it isn't focused,
  // as cut text does elsewhere, instead of stopping hard at the edge.
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const measure = () => setOverflow(input.scrollWidth > input.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(input);
    input.addEventListener("input", measure);
    return () => {
      observer.disconnect();
      input.removeEventListener("input", measure);
    };
  }, []);
  // A value set from outside (a controlled field, a reset) is measured again too.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input) setOverflow(input.scrollWidth > input.clientWidth + 1);
  }, [props.value, props.defaultValue, revealed]);

  function setRefs(node: HTMLInputElement | null) {
    inputRef.current = node;
    assignRef(ref, node);
  }

  return (
    <div
      className={className ? `${styles.field} ${className}` : styles.field}
      data-size={size}
    >
      <label className={hideLabel ? styles.srOnly : styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.control} data-overflow={overflow || undefined}>
        <input
          ref={setRefs}
          id={inputId}
          type={password && revealed ? "text" : type}
          className={styles.input}
          data-reveal={password || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage && message ? messageId : undefined}
          spellCheck={password ? false : undefined}
          autoCapitalize={password ? "off" : undefined}
          autoCorrect={password ? "off" : undefined}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />
        {password && (
          <button
            type="button"
            className={styles.reveal}
            aria-label="Show password"
            aria-pressed={revealed}
            aria-controls={inputId}
            disabled={props.disabled}
            // Keep focus in the input, so the caret and on-screen keyboard stay put.
            onMouseDown={(event) => {
              if (document.activeElement === inputRef.current)
                event.preventDefault();
            }}
            onClick={toggleReveal}
          >
            <Icon name={revealed ? "eye-off" : "eye"} />
          </button>
        )}
      </div>
      {hasMessage && <FieldMessage id={messageId} hint={hint} error={error} />}
    </div>
  );
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}
