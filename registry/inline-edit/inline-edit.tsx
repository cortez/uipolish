"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Icon } from "../icons/icons";
import styles from "./inline-edit.module.css";

type TextTag = "span" | "strong" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type InlineEditProps = {
  /** Accessible name of the input, such as "Event name". */
  label: string;
  /** Controlled text. Update it in `onCommit`, before any promise it returns settles. */
  value?: string;
  defaultValue?: string;
  /** Called with the trimmed text when it changed; return a promise to show saving, reject to show an error. */
  onCommit?: (value: string) => void | Promise<unknown>;
  onCancel?: () => void;
  /** Return an error message, or null when valid. Empty text is always refused. */
  validate?: (value: string) => string | null;
  /** Element to render the text as; it inherits its look from the parent or `className`. */
  as?: TextTag;
  /** Verb prefixed to the button's accessible name. */
  verb?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
};

const BLOCK = new Set<TextTag>(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"]);
const EMPTY = "Enter a name";

function offsetAt(node: Node | null, x: number, y: number) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const length = node.textContent?.length ?? 0;
  if (length > 500) return null;
  const range = document.createRange();
  let best = length;
  let bestScore = Infinity;
  for (let i = 0; i <= length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i);
    const rect = range.getBoundingClientRect();
    const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    const score = dy * 1000 + Math.abs(x - rect.left);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function messageOf(reason: unknown) {
  if (typeof reason === "string" && reason) return reason;
  if (reason instanceof Error && reason.message) return reason.message;
  return "Couldn’t save. Try again.";
}

/** Text that becomes an input in place, for renaming. */
export function InlineEdit({
  label,
  value,
  defaultValue = "",
  onCommit,
  onCancel,
  validate,
  as: Tag = "span",
  verb = "Rename",
  placeholder,
  maxLength,
  disabled = false,
  className,
}: InlineEditProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Kept after the error clears so it can fade out.
  const [lastError, setLastError] = useState(error);
  if (error && error !== lastError) setLastError(error);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const entry = useRef<number | "all">("all");
  const returnFocus = useRef(false);
  // Updated synchronously: a blur during teardown must not commit twice.
  const live = useRef({ editing: false, saving: false });

  useLayoutEffect(() => {
    if (editing) {
      const input = inputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      const at = entry.current;
      if (at === "all") input.select();
      else input.setSelectionRange(at, at);
    } else if (returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [editing]);

  function start(at: number | "all") {
    if (disabled) return;
    entry.current = at;
    live.current.editing = true;
    setDraft(current);
    setError(null);
    setEditing(true);
  }

  function finish(refocus: boolean) {
    returnFocus.current = refocus;
    live.current = { editing: false, saving: false };
    setError(null);
    setSaving(false);
    setEditing(false);
  }

  function check(text: string) {
    return validate?.(text) ?? (text ? null : EMPTY);
  }

  async function commit(fromKeyboard: boolean) {
    if (live.current.saving) return;
    const next = draft.trim();
    const problem = check(next);
    if (problem) {
      setError(problem);
      return;
    }
    if (next === current) {
      finish(fromKeyboard);
      return;
    }
    let result: void | Promise<unknown>;
    try {
      result = onCommit?.(next);
    } catch (reason) {
      setError(messageOf(reason));
      return;
    }
    if (result && typeof result.then === "function") {
      setError(null);
      setSaving(true);
      live.current.saving = true;
      try {
        await result;
      } catch (reason) {
        live.current.saving = false;
        setSaving(false);
        setError(messageOf(reason));
        return;
      }
    }
    if (value === undefined) setInner(next);
    finish(document.activeElement === inputRef.current);
  }

  function cancel() {
    finish(true);
    onCancel?.();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      void commit(true);
    } else if (event.key === "Escape") {
      // Stopped so an enclosing dialog doesn't also close.
      event.preventDefault();
      event.stopPropagation();
      if (!saving) cancel();
    }
  }

  function onChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const next = event.currentTarget.value.replace(/\s*[\r\n]+\s*/g, " ");
    setDraft(next);
    if (error) setError(check(next.trim()));
  }

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    const text = event.currentTarget.previousElementSibling?.firstChild ?? null;
    start(event.detail === 0 ? "all" : (offsetAt(text, event.clientX, event.clientY) ?? "all"));
  }

  const Root = BLOCK.has(Tag) ? "div" : "span";
  const shown = editing ? draft || placeholder || current : current || placeholder;
  const invalid = Boolean(error);

  return (
    <Root
      className={className ? `${styles.root} ${className}` : styles.root}
      data-block={Root === "div" || undefined}
      data-editing={editing || undefined}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
    >
      {/* While editing, holds the hidden draft so the box sizes the textarea. */}
      <Tag className={styles.text} data-placeholder={(!current && !editing) || undefined} aria-hidden={editing || undefined}>
        {shown || "\u00a0"}
      </Tag>
      {!editing && !disabled && (
        <button
          ref={triggerRef}
          type="button"
          className={styles.trigger}
          aria-label={`${verb} ${current || label}`}
          onClick={onClick}
          onKeyDown={(event) => {
            if (event.key === "F2") {
              event.preventDefault();
              start("all");
            }
          }}
        />
      )}
      {editing && (
        <textarea
          ref={inputRef}
          className={styles.input}
          value={draft}
          rows={1}
          placeholder={placeholder}
          maxLength={maxLength}
          readOnly={saving}
          aria-label={label}
          aria-busy={saving || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          enterKeyHint="done"
          spellCheck
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (live.current.editing && !live.current.saving) void commit(false);
          }}
        />
      )}
      <span className={styles.message} aria-live="polite">
        {lastError && (
          <span id={errorId} className={styles.error} data-shown={editing && error ? "" : undefined}>
            <Icon name="alert" className={styles.errorIcon} />
            <span key={lastError} className={styles.errorText}>
              {lastError}
            </span>
          </span>
        )}
      </span>
    </Root>
  );
}
