"use client";

import { useId, useLayoutEffect, useRef, useState, type ChangeEvent, type Ref } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { FieldMessage } from "../field/field";
import { Icon } from "../icons/icons";
import { useHighlight } from "../listbox/use-highlight";
import { TextMorph } from "../text-morph/text-morph";
import { COUNTRIES, flag, type Country } from "./countries";
import styles from "./phone-input.module.css";

type PhoneInputProps = {
  label: string;
  /** The number in E.164 form, such as "+442079460958". */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, country: Country) => void;
  /** ISO code of the initial country. */
  defaultCountry?: string;
  /** Replaces the built-in list. */
  countries?: Country[];
  hint?: string;
  /** Return a message, or null. Runs on blur after the built-in length check. */
  validate?: (value: string, country: Country) => string | null;
  error?: string | null;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  ref?: Ref<HTMLInputElement>;
};

const capacity = (pattern: string) => [...pattern].filter((c) => c === "#").length;

function format(digits: string, pattern: string) {
  let out = "";
  let i = 0;
  for (const c of pattern) {
    if (i >= digits.length) break;
    if (c === "#") out += digits[i++];
    else out += c;
  }
  return out + digits.slice(i);
}

/** Longest matching dial code wins; the current country is kept on a tie (+1). */
function detect(digits: string, list: Country[], current: Country) {
  let best: Country | null = null;
  for (const c of list) {
    if (!digits.startsWith(c.dial)) continue;
    if (!best || c.dial.length > best.dial.length) best = c;
  }
  if (best && current.dial === best.dial) return current;
  return best;
}

function parseE164(value: string, list: Country[], fallback: Country) {
  const digits = value.replace(/\D/g, "");
  if (!value.trim().startsWith("+")) return { country: fallback, digits };
  const country = detect(digits, list, fallback) ?? fallback;
  return { country, digits: digits.slice(country.dial.length) };
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Matches a country's name, the start of its dial code (with or without +), or its ISO code. */
function matchesCountry(c: Country, query: string) {
  const q = fold(query.trim().replace(/^\+/, ""));
  return !q || fold(c.name).includes(q) || c.dial.startsWith(q) || c.code.toLowerCase() === q;
}

/** A phone number field with a country picker that formats as you type. */
export function PhoneInput({
  label,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  defaultCountry = "US",
  countries = COUNTRIES,
  hint,
  validate,
  error: externalError,
  name,
  required,
  disabled = false,
  id,
  className,
  ref,
}: PhoneInputProps) {
  const baseId = useId();
  const inputId = id ?? `${baseId}-input`;
  const messageId = `${baseId}-message`;

  const fallback = countries.find((c) => c.code === defaultCountry) ?? countries[0];
  const [state, setState] = useState(() => parseE164(controlledValue ?? defaultValue, countries, fallback));
  const [lastValue, setLastValue] = useState(controlledValue);
  if (controlledValue !== lastValue) {
    setLastValue(controlledValue);
    if (controlledValue !== undefined && controlledValue !== `+${state.country.dial}${state.digits}`) {
      setState(parseE164(controlledValue, countries, state.country));
    }
  }
  const { country, digits } = state;
  const e164 = digits ? `+${country.dial}${digits}` : "";
  const shown = format(digits, country.pattern);

  const [localError, setLocalError] = useState<string | null>(null);
  const error = externalError ?? localError;

  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  function check(nextDigits: string, nextCountry: Country) {
    if (!nextDigits) return required ? "Enter a phone number" : null;
    if (nextDigits.length < nextCountry.min) {
      return `Enter the full number: ${nextCountry.min} digits for ${nextCountry.name}`;
    }
    return validate?.(`+${nextCountry.dial}${nextDigits}`, nextCountry) ?? null;
  }

  function update(nextCountry: Country, nextDigits: string) {
    setState({ country: nextCountry, digits: nextDigits });
    const next = nextDigits ? `+${nextCountry.dial}${nextDigits}` : "";
    if (next !== e164 || nextCountry !== country) onValueChange?.(next, nextCountry);
    if (localError) setLocalError(check(nextDigits, nextCountry));
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const raw = input.value;
    const at = input.selectionStart ?? raw.length;
    let before = raw.slice(0, at).replace(/\D/g, "").length;
    let nextDigits = raw.replace(/\D/g, "");
    let nextCountry = country;

    if (raw.trim().startsWith("+")) {
      const found = detect(nextDigits, countries, country);
      if (found) {
        nextCountry = found;
        nextDigits = nextDigits.slice(found.dial.length);
        before = Math.max(0, before - found.dial.length);
      }
    } else if (raw.trim().startsWith("00") && nextDigits.length > 4) {
      const found = detect(nextDigits.slice(2), countries, country);
      if (found) {
        nextCountry = found;
        nextDigits = nextDigits.slice(2 + found.dial.length);
        before = Math.max(0, before - 2 - found.dial.length);
      }
    }

    // Backspace over punctuation deletes the digit before it instead.
    if (nextDigits === digits && raw.length < shown.length && nextCountry === country && before > 0) {
      nextDigits = nextDigits.slice(0, before - 1) + nextDigits.slice(before);
      before -= 1;
    }

    if (nextCountry.trunk && nextDigits.startsWith("0")) {
      nextDigits = nextDigits.slice(1);
      before = Math.max(0, before - 1);
    }

    nextDigits = nextDigits.slice(0, capacity(nextCountry.pattern) + 2);
    caret.current = Math.min(before, nextDigits.length);
    update(nextCountry, nextDigits);
  }

  useLayoutEffect(() => {
    const input = inputRef.current;
    const want = caret.current;
    if (!input || want === null || document.activeElement !== input) return;
    caret.current = null;
    let pos = 0;
    let seen = 0;
    while (pos < shown.length && seen < want) {
      if (/\d/.test(shown[pos])) seen++;
      pos++;
    }
    while (pos < shown.length && !/\d/.test(shown[pos]) && /\d/.test(shown.slice(pos))) pos++;
    input.setSelectionRange(pos, pos);
  });

  // ---------- Country picker: Base UI's Combobox, with its search input inside the popup ----------

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const closedBy = useRef<string>("none");
  const controlRef = useRef<HTMLDivElement>(null);
  const { listRef, barRef } = useHighlight({ centerSelected: true });
  // Floating content portals into the nearest themed subtree, so it keeps its tokens.
  const [container, setContainer] = useState<HTMLElement | null>(null);

  function choose(next: Country) {
    update(next, digits.slice(0, capacity(next.pattern) + 2));
  }

  return (
    <div className={className ? `${styles.field} ${className}` : styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <Combobox.Root<Country>
        items={countries}
        value={country}
        onValueChange={(next) => {
          if (next) choose(next);
        }}
        isItemEqualToValue={(a, b) => a.code === b.code}
        itemToStringLabel={(c) => c.name}
        filter={matchesCountry}
        autoHighlight
        inputValue={query}
        onInputValueChange={setQuery}
        open={open}
        onOpenChange={(next, details) => {
          if (next) setQuery("");
          else closedBy.current = details.reason;
          setOpen(next);
        }}
        disabled={disabled}
      >
        {/* Phone numbers are LTR in every language. */}
        <div
          dir="ltr"
          ref={controlRef}
          className={styles.control}
          data-invalid={error ? "" : undefined}
          data-disabled={disabled || undefined}
          data-open={open || undefined}
        >
          <Combobox.Trigger
            ref={(node: HTMLButtonElement | null) => setContainer(node?.closest<HTMLElement>("[data-theme]") ?? null)}
            className={styles.trigger}
            aria-label={`Country: ${country.name}, +${country.dial}`}
          >
            <span className={styles.flag} aria-hidden="true">
              {flag(country.code)}
            </span>
            <span className={styles.dial} aria-hidden="true">
              <TextMorph>{`+${country.dial}`}</TextMorph>
            </span>
            <Icon name={open ? "chevron-up" : "chevron-down"} className={styles.chevron} />
          </Combobox.Trigger>
          <input
            ref={(node) => {
              inputRef.current = node;
              assignRef(ref, node);
            }}
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            className={styles.input}
            value={shown}
            placeholder={format(country.example, country.pattern)}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-required={required || undefined}
            aria-describedby={error || hint ? messageId : undefined}
            onChange={onChange}
            onBlur={() => setLocalError(check(digits, country))}
          />
        </div>
        {name && <input type="hidden" name={name} value={e164} />}
        <FieldMessage id={messageId} hint={hint} error={error} />
        <Combobox.Portal container={container ?? undefined}>
          <Combobox.Positioner
            className={styles.popup}
            anchor={controlRef}
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={8}
          >
            <Combobox.Popup
              className={styles.panel}
              aria-label="Choose a country"
              // A chosen country sends you on to the number; Escape goes back to the trigger.
              finalFocus={() => (closedBy.current === "item-press" ? inputRef.current : true)}
            >
              <label className={styles.searchRow}>
                <Icon name="search" className={styles.searchIcon} />
                <Combobox.Input
                  className={styles.search}
                  placeholder="Search countries or codes"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Search countries"
                />
              </label>
              <Combobox.Empty>
                <p className={styles.status}>No country matches “{query.trim()}”</p>
              </Combobox.Empty>
              <Combobox.List ref={listRef} className={styles.list} aria-label="Countries">
                <span ref={barRef} className={styles.highlight} aria-hidden="true" />
                <Combobox.Collection>
                  {(c: Country) => (
                    <Combobox.Item key={c.code} value={c} className={styles.option}>
                      <span className={styles.flag} aria-hidden="true">
                        {flag(c.code)}
                      </span>
                      <span className={styles.name}>{c.name}</span>
                      <span className={styles.code}>+{c.dial}</span>
                    </Combobox.Item>
                  )}
                </Combobox.Collection>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
