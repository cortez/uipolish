"use client";

import { useId, useRef, useState, useSyncExternalStore, type FocusEvent, type ReactNode, type Ref } from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { Icon } from "../icons/icons";
import { useHighlight } from "../listbox/use-highlight";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./select.module.css";

export type SelectOption = {
  value: string;
  /** Plain text; the native picker shows it on touch screens. */
  label: string;
  /** Second line in the list; not shown by the native picker. */
  description?: string;
  /** A 16px mark before the label, in the list and on the trigger (a brand
   * mark, a flag). Give every option one or none, so the trigger doesn't
   * change shape. Not shown by the native picker. */
  icon?: ReactNode;
  disabled?: boolean;
};

export type SelectGroup = { label: string; options: SelectOption[] };

type Item = SelectOption | SelectGroup;

const isGroup = (item: Item): item is SelectGroup => "options" in item;

type SelectProps = {
  options: Item[];
  /** Visible label above the field. Without one, pass `aria-label`. */
  label?: string;
  "aria-label"?: string;
  /** Shown under the field when there's no error. */
  hint?: string;
  /** Return an error message, or null when valid. Runs on blur. */
  validate?: (value: string) => string | null;
  /** External error; wins over `validate`. */
  error?: string | null;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** `md` is a form field; `sm` is a compact pill. */
  size?: "sm" | "md";
  name?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
};

const COARSE = "(pointer: coarse)";

function subscribeCoarse(onChange: () => void) {
  const query = matchMedia(COARSE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/** A select-only combobox on Base UI's Select; on touch screens the native picker takes over. */
export function Select({
  options,
  label,
  "aria-label": ariaLabel,
  hint,
  validate,
  error: externalError,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  placeholder = "Choose…",
  size = "md",
  name,
  required,
  disabled = false,
  id,
  className,
  ref,
}: SelectProps) {
  const baseId = useId();
  const triggerId = id ?? `${baseId}-trigger`;
  const nativeId = `${baseId}-native`;
  const messageId = `${baseId}-message`;

  const flat = options.flatMap((item) => (isGroup(item) ? item.options : [item]));
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = controlledValue ?? uncontrolledValue;
  const selected = flat.find((o) => o.value === value) ?? null;

  const native = useSyncExternalStore(subscribeCoarse, () => matchMedia(COARSE).matches, () => false);

  const [localError, setLocalError] = useState<string | null>(null);
  const error = externalError ?? localError;
  const message = error ?? hint;
  const hasMessage = Boolean(hint || validate || externalError !== undefined);

  const [open, setOpen] = useState(false);
  // Floating content portals into the nearest themed subtree, so it keeps its tokens.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const { listRef, barRef } = useHighlight({ centerSelected: true });

  function commit(next: string) {
    if (controlledValue === undefined) setUncontrolledValue(next);
    if (next !== value) onValueChange?.(next);
    if (localError) setLocalError(validate?.(next) ?? null);
  }

  function runValidate(current: string) {
    setLocalError(validate?.(current) ?? null);
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    // Moving into the list isn't leaving the field.
    const next = event.relatedTarget as Node | null;
    if (next && popupRef.current?.contains(next)) return;
    runValidate(event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : value);
  }

  function setRefs(node: HTMLButtonElement | null) {
    setContainer(node?.closest<HTMLElement>("[data-theme]") ?? null);
    assignRef(ref, node);
  }

  const renderOption = (option: SelectOption) => (
    <BaseSelect.Item
      key={option.value}
      value={option.value}
      label={option.label}
      disabled={option.disabled}
      className={styles.option}
    >
      {option.icon && (
        <span className={styles.icon} aria-hidden="true">
          {option.icon}
        </span>
      )}
      <span className={styles.text}>
        <BaseSelect.ItemText className={styles.optionLabel}>{option.label}</BaseSelect.ItemText>
        {option.description && <span className={styles.description}>{option.description}</span>}
      </span>
      <span className={styles.check} aria-hidden="true">
        <Icon name="check" />
      </span>
    </BaseSelect.Item>
  );

  return (
    <div
      className={className ? `${styles.field} ${className}` : styles.field}
      data-size={size}
      data-native={native || undefined}
    >
      <BaseSelect.Root<string>
        value={selected ? value : null}
        onValueChange={(next) => commit(next ?? "")}
        open={open && !native}
        onOpenChange={(next, details) => {
          setOpen(next);
          // Leaving the field by pressing elsewhere or tabbing away validates, like blur.
          if (!next && (details.reason === "outside-press" || details.reason === "focus-out")) runValidate(value);
        }}
        modal={false}
        name={native ? undefined : name}
        required={native ? undefined : required}
        disabled={disabled}
      >
        {label &&
          (native ? (
            <label htmlFor={nativeId} className={styles.label}>
              {label}
            </label>
          ) : (
            <BaseSelect.Label className={styles.label}>{label}</BaseSelect.Label>
          ))}
        <div className={styles.control}>
          <BaseSelect.Trigger
            ref={setRefs}
            id={triggerId}
            className={styles.trigger}
            inert={native || undefined}
            aria-label={label ? undefined : ariaLabel}
            aria-invalid={error ? true : undefined}
            aria-describedby={hasMessage && message ? messageId : undefined}
            onBlur={native ? undefined : onBlur}
          >
            {selected?.icon && (
              <span className={styles.icon} aria-hidden="true">
                {selected.icon}
              </span>
            )}
            <TextMorph className={styles.value}>{selected?.label ?? placeholder}</TextMorph>
            <Icon name={open ? "chevron-up" : "chevron-down"} className={styles.chevron} />
          </BaseSelect.Trigger>
          {/* On touch screens the system picker is the control, over the same trigger. */}
          {native && (
            <select
              id={nativeId}
              className={styles.native}
              name={name}
              value={value}
              disabled={disabled}
              required={required}
              aria-label={label ? undefined : ariaLabel}
              aria-invalid={error ? true : undefined}
              aria-describedby={hasMessage && message ? messageId : undefined}
              onChange={(event) => commit(event.currentTarget.value)}
              onBlur={onBlur}
            >
              {!selected && (
                <option value="" disabled hidden>
                  {placeholder}
                </option>
              )}
              {options.map((item) =>
                isGroup(item) ? (
                  <optgroup key={item.label} label={item.label}>
                    {item.options.map((o) => (
                      <option key={o.value} value={o.value} disabled={o.disabled}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={item.value} value={item.value} disabled={item.disabled}>
                    {item.label}
                  </option>
                ),
              )}
            </select>
          )}
        </div>
        {hasMessage && (
          <p id={messageId} className={styles.message} aria-live="polite">
            {error ? (
              <span key={error} className={styles.error}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" />
                  <path d="M8 4.75v3.75" stroke="currentColor" strokeLinecap="round" />
                  <circle cx="8" cy="11" r="0.9" fill="currentColor" />
                </svg>
                {error}
              </span>
            ) : (
              hint && <span className={styles.hint}>{hint}</span>
            )}
          </p>
        )}
        {!native && (
          <BaseSelect.Portal container={container ?? undefined}>
            <BaseSelect.Positioner
              className={styles.popup}
              data-size={size}
              alignItemWithTrigger={false}
              side="bottom"
              align="start"
              sideOffset={8}
              collisionPadding={8}
            >
              <BaseSelect.Popup ref={popupRef} className={styles.panel}>
                <BaseSelect.List ref={listRef} className={styles.list}>
                  <span ref={barRef} className={styles.highlight} aria-hidden="true" />
                  {options.map((item) =>
                    isGroup(item) ? (
                      <BaseSelect.Group key={item.label} className={styles.group}>
                        <BaseSelect.GroupLabel className={styles.groupLabel}>{item.label}</BaseSelect.GroupLabel>
                        {item.options.map(renderOption)}
                      </BaseSelect.Group>
                    ) : (
                      renderOption(item)
                    ),
                  )}
                </BaseSelect.List>
              </BaseSelect.Popup>
            </BaseSelect.Positioner>
          </BaseSelect.Portal>
        )}
      </BaseSelect.Root>
    </div>
  );
}
