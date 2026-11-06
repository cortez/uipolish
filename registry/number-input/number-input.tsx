"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { NumberField } from "@base-ui/react/number-field";
import { FieldMessage } from "../field/field";
import { Icon } from "../icons/icons";
import styles from "./number-input.module.css";

type NumberInputProps = {
  label: string;
  /** Keeps `label` as the field's name but doesn't show it, for a row whose own text already says it. */
  hideLabel?: boolean;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  /** One press or arrow key; Shift, PageUp and PageDown move ten. */
  step?: number;
  /** E.g. `{ style: "currency", currency: "USD" }`. */
  format?: Intl.NumberFormatOptions;
  locale?: string;
  hint?: string;
  error?: string | null;
  name?: string;
  disabled?: boolean;
  /** `false` hides the − and + buttons, e.g. for money. */
  steppers?: boolean;
  /** With `steppers={false}`, `false` also turns off the stepping keys. */
  arrowKeys?: boolean;
  id?: string;
  className?: string;
  ref?: Ref<HTMLInputElement>;
};

/** Changes that come from typing; the field commits them on blur or Enter. */
const TYPING = new Set(["input-change", "input-clear", "input-paste"]);
const STEP_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);

const decimals = (n: number) => {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  const e = s.indexOf("e-");
  if (e !== -1) return Number(s.slice(e + 2));
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
};

function affixes(parts: Intl.NumberFormatPart[]) {
  const digitsAt = parts.findIndex((p) => p.type === "integer" || p.type === "nan" || p.type === "infinity");
  let prefix = "";
  let suffix = "";
  parts.forEach((p, i) => {
    const affix = p.type === "currency" || p.type === "unit" || (p.type === "literal" && !p.value.trim());
    if (!affix) return;
    if (i < digitsAt) prefix += p.value;
    else suffix += p.value;
  });
  return { prefix, suffix };
}

/** Sets an input's text the way typing does, so Base UI sees it as a change. */
function setText(input: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, text);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * The shown number. Each character is keyed by its place from the right, so a
 * step remounts only the digits that changed, and those rise into place by a
 * few pixels. Nothing animates width or position: in tabular figures the kept
 * digits never move, and the field's box never changes.
 */
function Digits({ text, value }: { text: string; value: number }) {
  // Starts still: a remount (after typing, say) shows the number as it is.
  const [last, setLast] = useState({ text, value, previous: text, dir: 0 });
  if (last.text !== text) setLast({ text, value, previous: last.text, dir: Math.sign(value - last.value) || 1 });
  const chars = Array.from(text);
  const before = Array.from(last.previous);
  return (
    <span className={styles.digits} data-dir={last.dir > 0 ? "up" : "down"}>
      {chars.map((char, i) => {
        const place = chars.length - i;
        const changed = last.dir !== 0 && before[before.length - place] !== char;
        return (
          <span key={`${place}:${char}`} className={styles.digit} data-changed={changed || undefined}>
            {char}
          </span>
        );
      })}
    </span>
  );
}

/** Base UI's NumberField with − and + buttons, a rolling value, and a note when typing is pulled into range. */
export function NumberInput({
  label,
  hideLabel = false,
  value: controlledValue,
  defaultValue,
  onValueChange,
  min,
  max,
  step = 1,
  format,
  locale,
  hint,
  error,
  name,
  disabled = false,
  steppers = true,
  arrowKeys = true,
  id,
  className,
  ref,
}: NumberInputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const messageId = `${inputId}-message`;
  const affixId = `${inputId}-affix`;
  const stepKeys = steppers || arrowKeys;

  const lo = min ?? -Infinity;
  const hi = max ?? Infinity;
  const clamp = (n: number) => Math.min(Math.max(n, lo), hi);

  const [uncontrolledValue, setUncontrolledValue] = useState(() => clamp(defaultValue ?? (Number.isFinite(lo) ? lo : 0)));
  const value = controlledValue ?? uncontrolledValue;

  const full = useMemo(() => new Intl.NumberFormat(locale, format), [locale, format]);
  // Values keep as many decimals as the step, the minimum or the format shows, so typed cents survive a step of 1.
  const precision = Math.min(
    20,
    Math.max(decimals(step), decimals(Number.isFinite(lo) ? lo : 0), full.resolvedOptions().minimumFractionDigits ?? 0),
  );
  // Without steppers, a currency symbol or unit sits outside the input, so the input formats the digits alone.
  const pinned = !steppers && (format?.style === "currency" || format?.style === "unit");
  const fieldFormat = useMemo<Intl.NumberFormatOptions>(() => {
    if (pinned) {
      const r = full.resolvedOptions();
      return {
        minimumFractionDigits: r.minimumFractionDigits,
        maximumFractionDigits: r.maximumFractionDigits,
        useGrouping: r.useGrouping as Intl.NumberFormatOptions["useGrouping"],
      };
    }
    return { maximumFractionDigits: precision, ...format };
  }, [pinned, full, precision, format]);
  const formatter = useMemo(() => new Intl.NumberFormat(locale, fieldFormat), [locale, fieldFormat]);
  const decimalMark = useMemo(
    () => new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === "decimal")?.value ?? ".",
    [locale],
  );

  const number = formatter.format(value);
  const { prefix, suffix } = useMemo(
    () => (pinned ? affixes(full.formatToParts(value)) : { prefix: "", suffix: "" }),
    [pinned, full, value],
  );

  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typed = useRef<number | null>(null);

  const round = (n: number) => Number(n.toFixed(precision));

  function commit(next: number) {
    if (controlledValue === undefined) setUncontrolledValue(next);
    if (next !== value) onValueChange?.(next);
  }

  function parse(text: string) {
    const cleaned = text
      .split(decimalMark)
      .map((part) => part.replace(/[^\d-]/g, ""))
      .join(".");
    if (!/\d/.test(cleaned)) return null;
    const n = Number(cleaned.replace(/(?!^)-/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function noteFor(clamped: number, raw: number | null) {
    if (raw === null) return null;
    if (clamped > raw) return `At least ${full.format(clamped)}`;
    if (clamped < raw) return `Up to ${full.format(clamped)}`;
    return null;
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement> & { preventBaseUIHandler?: () => void }) {
    const input = event.currentTarget;
    if (!stepKeys && STEP_KEYS.has(event.key)) {
      // A plain text box: the keys move the caret, nothing steps.
      event.preventBaseUIHandler?.();
      return;
    }
    switch (event.key) {
      case "PageUp":
      case "PageDown": {
        // Base UI leaves these to the browser; they move ten steps, as Shift+Arrow does.
        event.preventDefault();
        const key = event.key === "PageUp" ? "ArrowUp" : "ArrowDown";
        input.dispatchEvent(new globalThis.KeyboardEvent("keydown", { key, shiftKey: true, bubbles: true, cancelable: true }));
        return;
      }
      case "Enter": {
        if (!editing) return;
        const raw = parse(input.value);
        const next = raw === null ? value : clamp(round(raw));
        setText(input, formatter.format(next));
        setEditing(false);
        setNote(noteFor(next, raw));
        commit(next);
        return;
      }
      case "Escape":
        if (!editing) return;
        event.preventDefault();
        setText(input, number);
        setEditing(false);
        setNote(null);
        return;
    }
  }

  const message = error ?? note ?? hint;
  const hasMessage = Boolean(hint || error !== undefined || Number.isFinite(lo) || Number.isFinite(hi));

  return (
    <NumberField.Root
      id={inputId}
      className={className ? `${styles.field} ${className}` : styles.field}
      value={value}
      min={min}
      max={max}
      step={step}
      smallStep={step}
      largeStep={step * 10}
      format={fieldFormat}
      locale={locale}
      name={name}
      disabled={disabled}
      inputRef={ref}
      onValueChange={(next, details) => {
        if (TYPING.has(details.reason)) return;
        setEditing(false);
        if (next === null) return;
        setNote(details.reason === "input-blur" ? noteFor(next, typed.current) : null);
        typed.current = null;
        commit(next);
      }}
    >
      <label className={hideLabel ? styles.srOnly : styles.label} htmlFor={inputId}>
        {label}
      </label>
      <NumberField.Group
        className={styles.control}
        data-invalid={error ? "" : undefined}
        data-steppers={steppers || undefined}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (disabled || target.closest("button") || target === inputRef.current) return;
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        {steppers ? (
          <NumberField.Decrement
            className={styles.step}
            aria-label={`Decrease ${label}`}
            // Base UI writes aria-disabled="false"; the shared inset style reads the attribute's presence.
            aria-disabled={disabled || value <= lo || undefined}
          >
            <Icon name="minus" />
          </NumberField.Decrement>
        ) : (
          <span className={styles.affix} aria-hidden="true">
            {prefix}
          </span>
        )}
        <div className={styles.value}>
          <NumberField.Input
            ref={inputRef}
            className={styles.input}
            data-editing={editing || undefined}
            aria-invalid={error ? true : undefined}
            // The affix is aria-hidden, so it is read as a description after the digits.
            aria-describedby={
              [pinned && (prefix || suffix) ? affixId : "", hasMessage && message ? messageId : ""].filter(Boolean).join(" ") ||
              undefined
            }
            onChange={(event) => {
              setEditing(true);
              setNote(null);
              typed.current = parse(event.currentTarget.value);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setEditing(false)}
          />
          {!editing && (
            <span className={styles.morph} aria-hidden="true">
              <Digits text={number} value={value} />
            </span>
          )}
        </div>
        {steppers ? (
          <NumberField.Increment
            className={styles.step}
            aria-label={`Increase ${label}`}
            aria-disabled={disabled || value >= hi || undefined}
          >
            <Icon name="plus" />
          </NumberField.Increment>
        ) : (
          <span className={styles.affix} aria-hidden="true">
            {suffix}
          </span>
        )}
        {pinned && (prefix || suffix) && (
          <span id={affixId} hidden>
            {`${prefix}${suffix}`.trim()}
          </span>
        )}
      </NumberField.Group>
      {hasMessage && <FieldMessage id={messageId} hint={note ?? hint} error={error} />}
    </NumberField.Root>
  );
}
