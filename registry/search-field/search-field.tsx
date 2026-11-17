"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent,
  type Ref,
} from "react";
import { Icon } from "../icons/icons";
import styles from "./search-field.module.css";

type SearchFieldProps = Omit<ComponentProps<"input">, "type" | "size"> & {
  /** Hidden unless `showLabel` is set. */
  label: string;
  showLabel?: boolean;
  /** A single key, such as "/", that focuses the field from anywhere. */
  shortcut?: string;
  /** Results are on their way. */
  loading?: boolean;
  /** Called after a clear or Escape empties the field, after `onChange`. */
  onClear?: () => void;
};

// Native value setter, so a clear fires an input event React sees, controlled or not.
const setValue = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/** A search input with a clear button; Escape clears, then leaves. */
export function SearchField({
  label,
  showLabel = false,
  shortcut,
  loading = false,
  onClear,
  className,
  id,
  value,
  defaultValue,
  disabled,
  onChange,
  onKeyDown,
  ref,
  ...props
}: SearchFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const inputRef = useRef<HTMLInputElement>(null);

  const [typed, setTyped] = useState(() => String(defaultValue ?? "") !== "");
  const filled = value !== undefined ? String(value) !== "" : typed;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setTyped(event.currentTarget.value !== "");
    onChange?.(event);
  }

  function clear() {
    const input = inputRef.current;
    if (!input) return;
    setValue(input, "");
    onClear?.();
    // The clear button is about to hide, so focus must move off it.
    input.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Escape" || event.nativeEvent.isComposing) return;
    if (event.currentTarget.value !== "") {
      // Stopped here, so a dialog around the field doesn't also close.
      event.preventDefault();
      event.stopPropagation();
      clear();
    } else {
      event.currentTarget.blur();
    }
  }

  useEffect(() => {
    if (!shortcut || disabled) return;
    function onKey(event: globalThis.KeyboardEvent) {
      const input = inputRef.current;
      if (!input || event.defaultPrevented || event.isComposing) return;
      if (event.key !== shortcut || event.ctrlKey || event.metaKey || event.altKey || isEditable(event.target)) return;
      event.preventDefault();
      input.focus();
      input.select();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcut, disabled]);

  return (
    <div className={className ? `${styles.field} ${className}` : styles.field}>
      <label className={showLabel ? styles.label : styles.srOnly} htmlFor={inputId}>
        {label}
      </label>
      <div
        className={styles.control}
        data-filled={filled || undefined}
        data-loading={loading || undefined}
        data-disabled={disabled || undefined}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (disabled || target.closest("button") || target === inputRef.current) return;
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <span className={styles.icon} aria-hidden="true">
          <Icon name="search" />
        </span>
        <input
          ref={(node) => {
            inputRef.current = node;
            assignRef(ref, node);
          }}
          id={inputId}
          type="search"
          className={styles.input}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-keyshortcuts={shortcut}
          aria-busy={loading || undefined}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          {...props}
        />
        <span className={styles.end}>
          {shortcut && !disabled && (
            <kbd className={styles.key} aria-hidden="true">
              {shortcut}
            </kbd>
          )}
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            aria-controls={inputId}
            disabled={disabled}
            // Keep focus in the input, so the on-screen keyboard stays up.
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
          >
            <Icon name="close" />
          </button>
        </span>
      </div>
    </div>
  );
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}
