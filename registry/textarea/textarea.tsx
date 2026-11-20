"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type CSSProperties,
  type FocusEvent,
  type Ref,
} from "react";
import { FieldMessage } from "../field/field";
import styles from "./textarea.module.css";

type TextareaProps = Omit<ComponentProps<"textarea">, "rows"> & {
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
  /** Rows it shows when empty. */
  minRows?: number;
  /** Rows it grows to before it scrolls. */
  maxRows?: number;
  /** A soft limit: typing past it is allowed, the count turns to danger and
   *  the field is invalid. For a hard stop use the native `maxLength`. */
  limit?: number;
  /** Show a character count under the field. On by default with `limit`. */
  count?: boolean;
};

/** How long typing rests before a screen reader hears the count. */
const ANNOUNCE_AFTER = 1000;

export function Textarea({
  label,
  hideLabel = false,
  hint,
  validate,
  error: externalError,
  size = "md",
  minRows = 3,
  maxRows = 8,
  limit,
  count = limit !== undefined,
  className,
  onBlur,
  onChange,
  id,
  ref,
  ...props
}: TextareaProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const messageId = `${inputId}-message`;
  const countId = `${inputId}-count`;

  // Validate on blur, not mid-typing. Once an error shows, re-check on every
  // keystroke so it clears the moment the value is fixed.
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = externalError ?? localError;

  // The count: read from `value` when it's controlled, kept here when it isn't.
  const [ownLength, setOwnLength] = useState(() => String(props.defaultValue ?? "").length);
  const length = props.value == null ? ownLength : String(props.value).length;

  function handleBlur(event: FocusEvent<HTMLTextAreaElement>) {
    setTouched(true);
    setLocalError(validate?.(event.currentTarget.value) ?? null);
    onBlur?.(event);
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    if (touched && localError)
      setLocalError(validate?.(event.currentTarget.value) ?? null);
    setOwnLength(event.currentTarget.value.length);
    onChange?.(event);
  }

  const message = error ?? hint;
  // A line is reserved only when something can show there (even a null error prop).
  const hasMessage = Boolean(hint || validate || externalError !== undefined);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  /** Measures the text and sets both heights; kept in a ref so the observer and the input listener share it. */
  const fitRef = useRef<() => void>(() => {});

  // The textarea takes its content's height at once, so the browser never
  // has to scroll it to keep the caret in view; the box around it eases to
  // the same height and clips the difference on the way.
  useLayoutEffect(() => {
    const input = inputRef.current;
    const control = controlRef.current;
    if (!input || !control) return;
    const cssFades = CSS.supports("animation-timeline: scroll()");
    let width = -1;
    let frame = 0;
    let pending = 0;

    const fades = () => {
      const max = input.scrollHeight - input.clientHeight;
      input.toggleAttribute("data-fits", max <= 1);
      if (!cssFades) {
        input.style.setProperty("--textarea-start", input.scrollTop > 1 ? "0" : "1");
        input.style.setProperty("--textarea-end", input.scrollTop < max - 1 ? "0" : "1");
      }
    };

    const fit = () => {
      // display: none somewhere above: nothing to measure, and nothing should animate when it comes back.
      if (input.getClientRects().length === 0) {
        cancelAnimationFrame(frame);
        delete control.dataset.armed;
        width = -1;
        return;
      }
      // A new width rewraps the text: that height applies at once.
      if (input.clientWidth !== width) {
        width = input.clientWidth;
        cancelAnimationFrame(frame);
        delete control.dataset.armed;
        // A frame later, so arming doesn't itself ease the height just set.
        frame = requestAnimationFrame(() => {
          control.dataset.armed = "";
        });
      }
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight}px`;
      // Its laid-out height: the CSS min and max rows have clamped it.
      control.style.height = `${input.offsetHeight}px`;
      // Typing at the very end: the browser brings the caret's line into view
      // but stops short of the padding under it, which would leave the last
      // line in the fade.
      if (document.activeElement === input && input.selectionStart === input.value.length)
        input.scrollTop = input.scrollHeight;
      fades();
    };
    fitRef.current = fit;

    const onScroll = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        fades();
      });
    };
    // A form reset changes the value without an input event; it lands after this one.
    const onReset = () =>
      requestAnimationFrame(() => {
        fit();
        setOwnLength(input.value.length);
      });

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(input);
    input.addEventListener("input", fit);
    input.addEventListener("scroll", onScroll, { passive: true });
    const form = input.form;
    form?.addEventListener("reset", onReset);
    return () => {
      observer.disconnect();
      input.removeEventListener("input", fit);
      input.removeEventListener("scroll", onScroll);
      form?.removeEventListener("reset", onReset);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pending);
      input.style.height = "";
      control.style.height = "";
      delete control.dataset.armed;
    };
  }, []);
  // A value set from outside (a controlled field, a template dropped in) is measured again too.
  useLayoutEffect(() => {
    fitRef.current();
  }, [props.value, minRows, maxRows, size]);

  const max = limit ?? props.maxLength;
  const left = max === undefined ? null : max - length;
  const over = left !== null && left < 0;
  // Only worth saying near the end: the last tenth, or the last 20 characters.
  const near = left !== null && max !== undefined && left <= Math.min(20, Math.ceil(max / 10));
  const status = left === null || !near ? "" : over ? `${plural(-left)} over the limit` : `${plural(left)} left`;

  // The spoken count waits for a pause in typing, so it's heard once, not per key.
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(status), status ? ANNOUNCE_AFTER : 0);
    return () => window.clearTimeout(timer);
  }, [status]);

  const invalid = Boolean(error) || (limit !== undefined && over);
  const describedBy = [hasMessage && message ? messageId : null, count ? countId : null].filter(Boolean).join(" ") || undefined;

  function setRefs(node: HTMLTextAreaElement | null) {
    inputRef.current = node;
    assignRef(ref, node);
  }

  return (
    <div
      className={className ? `${styles.field} ${className}` : styles.field}
      data-size={size}
      style={{ "--textarea-min": minRows, "--textarea-max": Math.max(minRows, maxRows) } as CSSProperties}
    >
      <label className={hideLabel ? styles.srOnly : styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div ref={controlRef} className={styles.control}>
        <textarea
          ref={setRefs}
          id={inputId}
          className={styles.input}
          rows={1}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />
      </div>
      {(hasMessage || count) && (
        <div className={styles.below}>
          {hasMessage && <FieldMessage id={messageId} hint={hint} error={error} />}
          {count && (
            <span className={styles.count} data-over={over || undefined}>
              {/* What a screen reader hears on focus; the figures beside it are for the eye. */}
              <span id={countId} className={styles.srOnly}>
                {max === undefined ? plural(length) : `${length} of ${plural(max)}`}
              </span>
              <span aria-hidden="true">
                <span className={styles.figure} style={max === undefined ? undefined : { minWidth: `${String(max).length}ch` }}>
                  {length}
                </span>
                {max !== undefined && (
                  <>
                    {" / "}
                    <span className={styles.figure}>{max}</span>
                  </>
                )}
              </span>
              <span className={styles.srOnly} role="status">
                {announced}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const plural = (n: number) => `${n} ${n === 1 ? "character" : "characters"}`;

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}
