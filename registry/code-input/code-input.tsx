"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./code-input.module.css";

type CodeInputProps = {
  /** Visible label for the whole code, e.g. "Verification code". */
  label: string;
  /** Number of boxes, 6 by default. */
  length?: number;
  /** Groups the boxes as the code is read aloud: `3` for 123 456, `[3, 4]` for 123 4567. */
  group?: number | number[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called when a change leaves every box filled: the last digit typed, a paste, or a digit fixed in a full code. */
  onComplete?: (value: string) => void;
  /** Digits only (the default), or letters and digits. */
  characters?: "digits" | "alphanumeric";
  /** Guidance under the boxes, until there's an error to show instead. */
  hint?: string;
  /** Says what went wrong and what to do. Turns every box's edge to danger. */
  error?: string | null;
  /** Submitted with the form under this name. */
  name?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  /**
   * Where checking the code has got to, set by the app. `verifying` locks the
   * boxes and, once it has lasted 300ms, folds them into one pill; `success`
   * draws a check and says "Verified"; `error` opens the boxes back up.
   */
  status?: CodeInputStatus;
  /** Words for the pill and the default error. */
  labels?: { verifying?: string; success?: string; error?: string };
  /** After `status="error"`: select the first digit so typing writes over the code (default), or clear it. */
  retry?: "select" | "clear";
};

export type CodeInputStatus = "idle" | "verifying" | "success" | "error";

type Phase = "cells" | "verifying" | "success";

const defaultLabels = {
  verifying: "Verifying",
  success: "Verified",
  error: "That code didn’t work. Check it and try again.",
};

/** A one-time code as N boxes. The value is always contiguous: no box past the first empty one takes focus. */
export function CodeInput({
  label,
  length = 6,
  group,
  value: controlled,
  defaultValue = "",
  onValueChange,
  onComplete,
  characters = "digits",
  hint,
  error,
  name,
  disabled,
  autoFocus,
  className,
  status,
  labels: labelsProp,
  retry = "select",
}: CodeInputProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const statusId = `${id}-status`;
  const labels = { ...defaultLabels, ...labelsProp };
  const [uncontrolled, setUncontrolled] = useState(() =>
    clean(defaultValue, characters).slice(0, length),
  );
  const value =
    controlled !== undefined
      ? clean(controlled, characters).slice(0, length)
      : uncontrolled;
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const phase = usePhase(status);
  const collapsed = phase !== "cells";
  // A fresh label each time the boxes fold, so it morphs only within one fold.
  const [folds, setFolds] = useState(0);
  const [wasCollapsed, setWasCollapsed] = useState(collapsed);
  const [pillText, setPillText] = useState(
    phase === "success" ? labels.success : labels.verifying,
  );
  if (collapsed !== wasCollapsed) {
    setWasCollapsed(collapsed);
    if (collapsed) setFolds((n) => n + 1);
  }
  const nextPillText =
    phase === "success" ? labels.success : phase === "verifying" ? labels.verifying : pillText;
  if (nextPillText !== pillText) setPillText(nextPillText);
  // Checking or checked: the code can't change under the check.
  const locked = status === "verifying" || status === "success";
  // Applied after the new value renders, so the target box is judged against it.
  const pendingFocus = useRef<number | null>(null);

  const complete = value.length === length;
  const errorText = error || (status === "error" ? labels.error : null);
  const invalid = Boolean(errorText);
  const message = errorText || hint;
  // A line is reserved only when something can show there (even a null error prop).
  const hasMessage = Boolean(hint || error !== undefined || status !== undefined);
  // The last error stays in its slot, faded out, so the slot keeps its height.
  const [lastError, setLastError] = useState(errorText);
  if (errorText && errorText !== lastError) setLastError(errorText);

  // Each time the boxes stand open on an error: a nudge (two names, so it
  // replays) and, once, the retry. Late when the boxes are still opening.
  const failed = status === "error" && !collapsed;
  const [wasFailed, setWasFailed] = useState(failed);
  const [lastPhase, setLastPhase] = useState(phase);
  const [nudge, setNudge] = useState(0);
  const [nudgeLate, setNudgeLate] = useState(false);
  // After a failed code with retry="select": every digit stays, selected, and the next one typed starts over.
  const [replacing, setReplacing] = useState(false);
  const retried = useRef(0);
  // Whether the group holds focus for the boxes while it's a pill.
  const held = useRef(false);
  if (failed !== wasFailed || phase !== lastPhase) {
    setWasFailed(failed);
    setLastPhase(phase);
    if (failed && !wasFailed) {
      setNudge((n) => n + 1);
      setNudgeLate(lastPhase !== "cells");
      if (retry === "clear" && controlled === undefined) setUncontrolled("");
      if (retry === "select") setReplacing(true);
    }
  }

  function focus(index: number) {
    const box = boxes.current[Math.max(0, Math.min(index, length - 1))];
    box?.focus();
    box?.select();
  }

  function commit(next: string, focusIndex?: number) {
    if (locked) return;
    next = next.slice(0, length);
    if (next === value) {
      if (focusIndex !== undefined) focus(Math.min(focusIndex, value.length));
      return;
    }
    pendingFocus.current = focusIndex ?? null;
    if (controlled === undefined) setUncontrolled(next);
    onValueChange?.(next);
    setReplacing(false);
    if (next.length === length) onComplete?.(next);
  }

  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    const index = pendingFocus.current;
    pendingFocus.current = null;
    focus(index);
  });

  // The pill's width, and where each box drifts as it merges into it.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const pill = pillRef.current;
    const row = rowRef.current;
    if (!stage || !pill || !row) return;
    const measure = () => {
      const width = pill.offsetWidth;
      stage.style.setProperty("--code-pill-width", `${width}px`);
      // The pill folds toward the middle of the row.
      const center = stage.clientWidth / 2;
      for (const box of boxes.current) {
        if (!box) continue;
        const drift = (center - (box.offsetLeft + box.offsetWidth / 2)) * 0.6;
        box.style.setProperty("--code-drift", `${Math.round(drift)}px`);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pill);
    observer.observe(row);
    return () => observer.disconnect();
  }, [length]);

  /** The box focus may land on: none past the first empty one. */
  const reachable = (index: number) =>
    Math.min(index, value.length, length - 1);

  // Focus follows the shape: the group while it's a pill, the boxes when they return.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const row = rowRef.current;
    if (!root || !row) return;
    const active = document.activeElement;
    if (collapsed) {
      if (row.contains(active)) root.focus();
      held.current = document.activeElement === root;
      row.inert = true;
      return;
    }
    row.inert = false;
    // The group stops being focusable as the boxes return, which drops its focus to the body.
    const hadFocus =
      row.contains(active) ||
      (held.current && (active === root || active === document.body));
    held.current = false;
    if (retried.current === nudge) {
      if (hadFocus && !row.contains(active)) focus(reachable(length - 1));
      return;
    }
    retried.current = nudge;
    // An uncontrolled value was cleared as the failure rendered.
    if (retry === "clear" && controlled !== undefined && value) onValueChange?.("");
    if (hadFocus) focus(0);
    // Runs on a change of shape or a new failure, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, nudge]);

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const typed = clean(input.value, characters);
    const current = value[index] ?? "";

    if (replacing) {
      // Over a selected code: start again from what was typed, or take a whole new code.
      if (typed.length >= length) fill(0, typed);
      else commit(typed.slice(-1), typed ? 1 : 0);
      return;
    }

    if (typed === "") {
      // Cleared by the platform (some keyboards send no Backspace key).
      commit(value.slice(0, index) + value.slice(index + 1), index);
      return;
    }

    if (typed.length === 2 && current && typed.includes(current)) {
      // The caret was beside the digit rather than over it: keep the one typed.
      const caret = input.selectionStart ?? 2;
      const char = typed[caret - 1] ?? typed.replace(current, "");
      commit(value.slice(0, index) + char + value.slice(index + 1), index + 1);
      return;
    }

    if (typed.length > 1) {
      // A paste, or the one-time code filled in by the platform.
      fill(index, typed);
      return;
    }

    commit(value.slice(0, index) + typed + value.slice(index + 1), index + 1);
  }

  function fill(index: number, chars: string) {
    const next =
      chars.length >= length || replacing ? chars : value.slice(0, index) + chars;
    commit(next, Math.min(next.length, length - 1));
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const chars = clean(event.clipboardData.getData("text"), characters);
    event.preventDefault();
    if (chars) fill(index, chars);
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (replacing && (event.key === "Backspace" || event.key === "Delete")) {
      event.preventDefault();
      commit("", 0);
      return;
    }
    if (
      replacing &&
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      clean(event.key, characters)
    ) {
      event.preventDefault();
      commit(clean(event.key, characters), 1);
      return;
    }
    switch (event.key) {
      case "Backspace": {
        event.preventDefault();
        if (value[index])
          commit(value.slice(0, index) + value.slice(index + 1), index);
        else if (index > 0)
          commit(value.slice(0, index - 1) + value.slice(index), index - 1);
        break;
      }
      case "Delete": {
        event.preventDefault();
        commit(value.slice(0, index) + value.slice(index + 1), index);
        break;
      }
      case "ArrowLeft":
      case "ArrowRight": {
        event.preventDefault();
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        const back = (event.key === "ArrowLeft") !== rtl;
        setReplacing(false);
        focus(back ? Math.max(0, index - 1) : reachable(index + 1));
        break;
      }
      case "Home":
        event.preventDefault();
        setReplacing(false);
        focus(0);
        break;
      case "End":
        event.preventDefault();
        setReplacing(false);
        focus(reachable(length - 1));
        break;
      default:
        // Typing the digit that's already there still moves on.
        if (
          event.key.length === 1 &&
          event.key === value[index] &&
          !event.metaKey &&
          !event.ctrlKey
        ) {
          event.preventDefault();
          focus(index + 1);
        }
    }
  }

  function handleFocus(index: number) {
    const target = reachable(index);
    if (target !== index) focus(target);
    else boxes.current[index]?.select();
  }

  // Stops the browser placing a caret in the box that was hit first.
  function handleMouseDown(index: number, event: MouseEvent<HTMLInputElement>) {
    if (disabled) return;
    event.preventDefault();
    // Clicking a digit means fixing that one, not starting over.
    setReplacing(false);
    focus(reachable(index));
  }

  const groupStarts = groupBoundaries(length, group);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={
        [collapsed && statusId, hasMessage && message && messageId]
          .filter(Boolean)
          .join(" ") || undefined
      }
      aria-busy={status === "verifying" || undefined}
      tabIndex={collapsed ? -1 : undefined}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-complete={complete || undefined}
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled || undefined}
      data-phase={phase}
    >
      <label
        id={labelId}
        className={styles.label}
        htmlFor={`${id}-${reachable(length - 1)}`}
      >
        {label}
      </label>
      <div ref={stageRef} className={styles.stage}>
      <div
        ref={rowRef}
        className={styles.boxes}
        data-nudge={nudge ? nudge % 2 : undefined}
        data-nudge-late={nudgeLate || undefined}
      >
        {Array.from({ length }, (_, i) => [
          groupStarts.has(i) && (
            <span key={`dot-${i}`} className={styles.separator} aria-hidden="true" />
          ),
          <input
            key={i}
            ref={(node) => {
              boxes.current[i] = node;
            }}
            id={`${id}-${i}`}
            className={styles.box}
            data-filled={value[i] ? "" : undefined}
            data-replacing={(replacing && value[i]) || undefined}
            value={value[i] ?? ""}
            aria-label={`${characters === "digits" ? "Digit" : "Character"} ${i + 1} of ${length}`}
            aria-invalid={invalid || undefined}
            readOnly={locked}
            inputMode={characters === "digits" ? "numeric" : "text"}
            pattern={characters === "digits" ? "[0-9]*" : undefined}
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoCapitalize={characters === "digits" ? undefined : "characters"}
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint={i === length - 1 ? "done" : "next"}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            onChange={(e) => handleChange(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={() => handleFocus(i)}
            onMouseDown={(e) => handleMouseDown(i, e)}
          />,
        ])}
      </div>
      <div className={styles.pill} aria-hidden="true">
        <div ref={pillRef} className={styles.pillContent}>
          <svg className={styles.glyph} viewBox="0 0 16 16">
            <circle className={styles.ring} cx="8" cy="8" r="6.25" />
            <circle className={styles.dot} cx="8" cy="8" r="2.75" />
            <path
              className={styles.check}
              d="M5.4 8.2l1.8 1.8 3.4-3.8"
              pathLength={1}
            />
          </svg>
          {/* The morph eases its own width; the pill follows it and stays centered. */}
          <TextMorph key={folds} className={styles.pillText}>
            {pillText}
          </TextMorph>
        </div>
      </div>
      </div>
      <span id={statusId} className={styles.srOnly} role="status">
        {phase === "verifying"
          ? labels.verifying
          : phase === "success"
            ? labels.success
            : ""}
      </span>
      {name && <input type="hidden" name={name} value={value} />}
      {hasMessage && (
        <p id={messageId} className={styles.message} aria-live="polite">
          {hint && (
            <span className={styles.hint} data-shown={!invalid || undefined}>
              {hint}
            </span>
          )}
          {lastError && (
            <span
              className={styles.error}
              data-shown={invalid || undefined}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle
                  cx="8"
                  cy="8"
                  r="6.25"
                  fill="none"
                  stroke="currentColor"
                />
                <path
                  d="M8 4.75v3.75"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="11" r="0.9" fill="currentColor" />
              </svg>
              <span key={lastError} className={styles.errorText}>
                {lastError}
              </span>
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * The shape to show for a status. Fast checks never fold the boxes: the pill
 * appears once `verifying` has lasted 300ms, and then holds 400ms at least.
 */
function usePhase(status: CodeInputStatus | undefined): Phase {
  const target: Phase =
    status === "verifying" ? "verifying" : status === "success" ? "success" : "cells";
  const [phase, setPhase] = useState<Phase>(target === "verifying" ? "cells" : target);
  const since = useRef(0);

  useEffect(() => {
    if (target === phase) return;
    let wait = 0;
    if (target === "verifying" && phase === "cells") wait = 300;
    else if (phase === "verifying")
      wait = Math.max(0, 400 - (performance.now() - since.current));
    const timer = window.setTimeout(() => {
      if (target === "verifying") since.current = performance.now();
      setPhase(target);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [target, phase]);

  return phase;
}

/** Indexes of the boxes that open a new group, after the first. */
function groupBoundaries(length: number, group: number | number[] | undefined) {
  const starts = new Set<number>();
  if (group === undefined) return starts;
  const sizes = typeof group === "number" ? [group] : group;
  if (!sizes.length || sizes.some((n) => !Number.isInteger(n) || n < 1))
    return starts;
  // A single size repeats; a list is used in order and its last size repeats.
  let at = 0;
  for (let g = 0; ; g++) {
    at += sizes[Math.min(g, sizes.length - 1)];
    if (at >= length) break;
    starts.add(at);
  }
  return starts;
}

function clean(text: string, characters: "digits" | "alphanumeric") {
  return characters === "digits"
    ? text.replace(/\D/g, "")
    : text.replace(/[^0-9a-z]/gi, "").toUpperCase();
}
