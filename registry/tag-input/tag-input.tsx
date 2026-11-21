"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from "react";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Icon } from "../icons/icons";
import { useHighlight } from "../listbox/use-highlight";
import { TextMorph } from "../text-morph/text-morph";
import { useFlipList } from "./use-flip-list";
import styles from "./tag-input.module.css";

export type TagSuggestion = {
  /** What's added, and what the form submits. */
  value: string;
  /** Shown on the tag and in the list, when it isn't the value itself. */
  label?: string;
  /** A second line in the list, such as an email. Also matched. */
  description?: string;
};

type TagInputProps = {
  label: string;
  /** Hide the label from sight; screen readers still read it. */
  hideLabel?: boolean;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Offered as you type, filtered in the browser. Ones already added are left out. */
  suggestions?: (string | TagSuggestion)[];
  /** Return a message that says how to fix one tag, or null when it's fine.
   *  An invalid tag is still added, in the danger tone. */
  validate?: (tag: string) => string | null;
  /** The most tags it takes. Shows a count beside the label. */
  max?: number;
  placeholder?: string;
  /** Guidance under the field until there's something else to say. */
  hint?: string;
  /** An error from outside, such as the server. Wins over `validate`. */
  error?: string | null;
  /** Says a tag is already there. Defaults to `“Maya Chen” is already added`. */
  duplicateMessage?: (tag: string) => string;
  /** Says the field is full. Defaults to `You can add up to 10`. */
  maxMessage?: (max: number) => string;
  size?: "md" | "lg";
  disabled?: boolean;
  /** Each tag is submitted as its own hidden input under this name. */
  name?: string;
  id?: string;
  className?: string;
  ref?: Ref<HTMLInputElement>;
};

type Option = { value: string; label: string; description?: string };

/** What separates tags in typed or pasted text. */
const SEPARATORS = /[,;\n\t]+/;
const MAX_ROWS = 50;

const same = (a: string) => a.trim().toLowerCase();

/** Lowercased, accents off, with a map back to the original indexes. */
function fold(text: string) {
  let out = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const f = text[i].normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    for (let k = 0; k < f.length; k++) map.push(i);
    out += f;
  }
  map.push(text.length);
  return { out, map };
}

function findMatch(text: string, query: string): [number, number] | null {
  const q = fold(query.trim()).out;
  if (!q) return null;
  const { out, map } = fold(text);
  const at = out.indexOf(q);
  return at === -1 ? null : [map[at], map[at + q.length]];
}

function filter(options: Option[], query: string) {
  const q = fold(query.trim()).out;
  if (!q) return options;
  const starts: Option[] = [];
  const contains: Option[] = [];
  for (const o of options) {
    const l = fold(o.label).out;
    if (l.startsWith(q) || l.includes(` ${q}`)) starts.push(o);
    else if (l.includes(q) || fold(o.value).out.includes(q) || (o.description && fold(o.description).out.includes(q))) contains.push(o);
  }
  return [...starts, ...contains];
}

// Matches are painted with the CSS Custom Highlight API; every tag input shares one highlight.
const HIGHLIGHT = "uipolish-tag-input-match";
const ranges = new Map<string, Range[]>();
let styled = false;

function paint(owner: string, next: Range[]) {
  if (typeof CSS === "undefined" || !("highlights" in CSS) || typeof Highlight === "undefined") return;
  // Added here because CSS modules can't parse ::highlight().
  if (!styled) {
    styled = true;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`::highlight(${HIGHLIGHT}) { color: var(--ui-foreground); }`);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
  if (next.length) ranges.set(owner, next);
  else ranges.delete(owner);
  const all = [...ranges.values()].flat();
  if (all.length) CSS.highlights.set(HIGHLIGHT, new Highlight(...all));
  else CSS.highlights.delete(HIGHLIGHT);
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/** Many values in one field: recipients, labels, guests. */
export function TagInput({
  label,
  hideLabel = false,
  value: controlledValue,
  defaultValue = [],
  onValueChange,
  suggestions,
  validate,
  max,
  placeholder,
  hint,
  error: externalError,
  duplicateMessage = (tag) => `“${tag}” is already added`,
  maxMessage = (n) => `You can add up to ${n}`,
  size = "md",
  disabled = false,
  name,
  id,
  className,
  ref,
}: TagInputProps) {
  const baseId = useId();
  const inputId = id ?? `${baseId}-input`;
  const messageId = `${baseId}-message`;
  const countId = `${baseId}-count`;

  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = controlledValue ?? uncontrolled;
  const valueRef = useRef(value);
  useLayoutEffect(() => {
    valueRef.current = value;
  });

  function commit(next: string[]) {
    valueRef.current = next;
    if (controlledValue === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  const options: Option[] | null = suggestions
    ? suggestions.map((s) => (typeof s === "string" ? { value: s, label: s } : { ...s, label: s.label ?? s.value }))
    : null;
  const labelOf = (tag: string) => options?.find((o) => o.value === tag)?.label ?? tag;

  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  // A gentle word under the field: a tag that's already there, or a full field.
  const [notice, setNotice] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [flash, setFlash] = useState<{ keys: string[]; n: number }>({ keys: [], n: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const highlighted = useRef<Option | null>(null);
  // Floating content portals into the nearest themed subtree, so it keeps its tokens.
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // Keyed by value; a repeat the parent passes in gets its own key.
  const keyOf = useCallback(
    (tag: string, index: number) => {
      const n = value.slice(0, index).filter((t) => t === tag).length;
      return n ? `${tag}\u241f${n}` : tag;
    },
    [value],
  );
  const { list, ref: tagsRef } = useFlipList(value, keyOf, { spring: "glide", sizeRef: controlRef });

  const problems = validate ? value.map((t) => validate(t)) : [];
  const invalid = problems.filter(Boolean) as string[];
  const tagError =
    invalid.length === 0 ? null : invalid.length === 1 ? invalid[0] : `${invalid[0]} (and ${invalid.length - 1} more)`;
  const error = externalError ?? tagError;
  // A notice answers what was just done, so it shows over a tag's error
  // until the next change; an error from outside always shows.
  const shownError = externalError ?? (notice ? null : tagError);
  const full = max !== undefined && value.length >= max;
  const message = shownError ?? notice ?? hint ?? null;

  const taken = new Set(value.map(same));
  const matches = options && !full ? filter(options.filter((o) => !taken.has(same(o.value))), text).slice(0, MAX_ROWS) : [];
  const showList = open && matches.length > 0;

  function announce(textToRead: string) {
    // The same words twice in a row are still read: the region changes first.
    setAnnouncement((prev) => (prev === textToRead ? `${textToRead} ` : textToRead));
  }

  /** Adds what was typed, pasted or picked. Returns what couldn't be added. */
  function add(raw: string[]): string[] {
    const current = valueRef.current;
    const seen = new Set(current.map(same));
    const added: string[] = [];
    const repeats: string[] = [];
    const leftOver: string[] = [];
    for (const part of raw) {
      const typed = part.replace(/\s+/g, " ").trim();
      if (!typed) continue;
      // A suggestion typed out in full ("Priya Patel") adds its value.
      const tag = options?.find((o) => same(o.label) === same(typed) || same(o.value) === same(typed))?.value ?? typed;
      if (seen.has(same(tag))) {
        repeats.push(tag);
        continue;
      }
      if (max !== undefined && current.length + added.length >= max) {
        leftOver.push(tag);
        continue;
      }
      seen.add(same(tag));
      added.push(tag);
    }
    if (added.length) {
      commit([...current, ...added]);
      announce(added.length === 1 ? `Added ${labelOf(added[0])}` : `Added ${added.length}`);
    }
    if (leftOver.length && max !== undefined) setNotice(maxMessage(max));
    else if (repeats.length) {
      setNotice(
        repeats.length === 1
          ? duplicateMessage(labelOf(current.find((t) => same(t) === same(repeats[0])) ?? repeats[0]))
          : `${repeats.length} were already added`,
      );
      const again = new Set(repeats.map(same));
      setFlash((f) => ({
        keys: current.flatMap((t, i) => (again.has(same(t)) ? [keyOf(t, i)] : [])),
        n: f.n + 1,
      }));
    } else setNotice(null);
    return leftOver;
  }

  function addText(textToAdd: string) {
    const left = add(textToAdd.split(SEPARATORS));
    setText(left.join(", "));
    setOpen(false);
  }

  function pick(option: Option) {
    add([option.value]);
    setText("");
    setOpen(false);
  }

  // The tags' focus targets are their remove buttons; arrows move between them.
  const buttons = () => Array.from(tagsRef.current?.querySelectorAll<HTMLButtonElement>("[data-tag]:not([data-leaving]) [data-remove]") ?? []);

  function focusInput(caret: "start" | "end" = "end") {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const at = caret === "start" ? 0 : input.value.length;
    input.setSelectionRange(at, at);
  }

  function remove(index: number, via: "pointer" | "back" | "forward") {
    const current = valueRef.current;
    const tag = current[index];
    if (tag === undefined) return;
    const all = buttons();
    const hadFocus = all[index] !== undefined && all[index] === document.activeElement;
    // Focus moves before the tag goes inert as it fades.
    if (hadFocus) {
      const last = index === current.length - 1;
      const next = via === "back" ? (last ? null : all[index - 1] ?? all[index + 1]) : all[index + 1];
      if (next) next.focus();
      else focusInput();
    }
    commit(current.filter((_, i) => i !== index));
    setNotice(null);
    announce(`Removed ${labelOf(tag)}`);
  }

  function onTagKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const all = buttons();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    switch (event.key) {
      case back:
        event.preventDefault();
        all[Math.max(0, index - 1)]?.focus();
        return;
      case forward:
        event.preventDefault();
        if (index + 1 < all.length) all[index + 1].focus();
        else focusInput("start");
        return;
      case "Home":
        event.preventDefault();
        all[0]?.focus();
        return;
      case "End":
      case "Escape":
      case "ArrowDown":
        event.preventDefault();
        focusInput();
        return;
      case "Backspace":
        event.preventDefault();
        remove(index, "back");
        return;
      case "Delete":
        event.preventDefault();
        remove(index, "forward");
        return;
      default:
        // Typing on a tag goes on in the field.
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== " ") focusInput();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement> & { preventBaseUIHandler?: () => void }) {
    if (event.nativeEvent.isComposing) return;
    const input = event.currentTarget;
    const rtl = getComputedStyle(input).direction === "rtl";
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const choice = showList ? highlighted.current : null;

    // Enter, Tab and a comma take the highlighted suggestion, or else add the
    // text as typed. Escape closes the list, so the text goes in as it is.
    if (event.key === "Enter" || event.key === "Tab" || event.key === "," || event.key === ";") {
      const separator = event.key === "," || event.key === ";";
      if (choice) {
        event.preventDefault();
        event.preventBaseUIHandler?.();
        pick(choice);
      } else if (text.trim()) {
        event.preventDefault();
        event.preventBaseUIHandler?.();
        addText(text);
      } else if (separator) event.preventDefault();
      return;
    }
    if ((event.key === "Backspace" && text === "") || (event.key === (rtl ? "ArrowRight" : "ArrowLeft") && atStart)) {
      const all = buttons();
      if (all.length === 0) return;
      event.preventDefault();
      event.preventBaseUIHandler?.();
      all[all.length - 1].focus();
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!SEPARATORS.test(pasted)) return;
    event.preventDefault();
    const input = event.currentTarget;
    const whole = text.slice(0, input.selectionStart ?? text.length) + pasted + text.slice(input.selectionEnd ?? text.length);
    addText(whole);
  }

  function onBlur(event: FocusEvent<HTMLInputElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && (popupRef.current?.contains(next) || controlRef.current?.contains(next))) return;
    // Text left in the field is a tag the person meant to add.
    if (text.trim()) addText(text);
    else setNotice(null);
    setOpen(false);
  }

  function onControlPointerDown(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (disabled || target === inputRef.current || target.closest("button")) return;
    // A press on a tag selects it; anywhere else in the field puts the caret in it.
    const tag = target.closest<HTMLElement>("[data-tag]:not([data-leaving])");
    event.preventDefault();
    if (tag) tag.querySelector<HTMLButtonElement>("[data-remove]")?.focus();
    else focusInput();
  }

  // A repeated tag lights up where it already is.
  useEffect(() => {
    if (!flash.n) return;
    const group = tagsRef.current;
    for (const key of flash.keys) {
      const el = group?.querySelector<HTMLElement>(`[data-flip="${CSS.escape(key)}"]`);
      if (!el) continue;
      el.removeAttribute("data-flash");
      void el.offsetWidth;
      el.setAttribute("data-flash", "");
    }
  }, [flash, tagsRef]);

  // The list's height eases to each new set of matches as you type.
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportMounted, setViewportMounted] = useState(false);
  const attachViewport = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    setViewportMounted(node !== null);
  }, []);
  const contentRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewportMounted || !viewport || !content) return;
    const fit = (instant: boolean) => {
      if (instant) viewport.dataset.instant = "";
      viewport.style.height = `${content.offsetHeight}px`;
      if (instant) {
        void viewport.offsetHeight;
        delete viewport.dataset.instant;
      }
    };
    fit(true);
    const observer = new ResizeObserver(() => fit(false));
    observer.observe(content);
    return () => observer.disconnect();
  }, [viewportMounted]);

  const { listRef, barRef, listNode } = useHighlight();
  useLayoutEffect(() => {
    const listEl = listNode.current;
    if (!listEl) return;
    const next: Range[] = [];
    if (typeof CSS !== "undefined" && "highlights" in CSS) listEl.setAttribute("data-highlights", "");
    if (showList) {
      for (const el of listEl.querySelectorAll<HTMLElement>("[data-match]")) {
        const node = el.firstChild;
        const [from, to] = (el.dataset.match ?? "").split(":").map(Number);
        if (!(node instanceof Text) || !(to > from) || to > node.length) continue;
        const range = new Range();
        range.setStart(node, from);
        range.setEnd(node, to);
        next.push(range);
      }
    }
    paint(baseId, next);
  });
  useEffect(() => () => paint(baseId, []), [baseId]);

  const match = (s: string) => {
    const m = findMatch(s, text);
    return m ? `${m[0]}:${m[1]}` : undefined;
  };

  const describedBy = [message ? messageId : null, max !== undefined ? countId : null].filter(Boolean).join(" ") || undefined;

  const inputProps = {
    id: inputId,
    className: styles.input,
    placeholder: value.length === 0 ? placeholder : undefined,
    disabled,
    autoComplete: "off",
    autoCorrect: "off",
    autoCapitalize: "off",
    spellCheck: false,
    enterKeyHint: "enter" as const,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    onKeyDown,
    onPaste,
    onBlur,
  };

  const setInput = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    setContainer(node?.closest<HTMLElement>("[data-theme]") ?? null);
    assignRef(ref, node);
  };

  const field = (
    <>
      <div className={styles.top}>
        <label className={hideLabel ? styles.srOnly : styles.label} htmlFor={inputId}>
          {label}
        </label>
        {max !== undefined && (
          <span id={countId} className={styles.count} data-full={full || undefined}>
            <TextMorph>{`${value.length} of ${max}`}</TextMorph>
          </span>
        )}
      </div>
      <div
        ref={controlRef}
        className={styles.control}
        data-invalid={error ? "" : undefined}
        data-disabled={disabled || undefined}
        data-open={showList || undefined}
        onMouseDown={onControlPointerDown}
      >
        <div
          ref={(node) => {
            tagsRef.current = node;
          }}
          className={styles.tags}
          role={value.length ? "toolbar" : undefined}
          aria-label={value.length ? label : undefined}
        >
          {list.map(({ key, item: tag, leaving }) => {
            const index = leaving ? -1 : value.indexOf(tag);
            const problem = index >= 0 ? problems[index] : null;
            const shown = labelOf(tag);
            return (
              <span
                key={key}
                data-flip={key}
                data-tag=""
                className={styles.tag}
                data-invalid={problem ? "" : undefined}
                data-leaving={leaving || undefined}
                aria-hidden={leaving || undefined}
                title={shown !== tag ? tag : undefined}
              >
                <span className={styles.tagLabel}>{shown}</span>
                <button
                  type="button"
                  data-remove=""
                  className={styles.remove}
                  tabIndex={-1}
                  disabled={disabled}
                  aria-label={`Remove ${shown}`}
                  aria-describedby={problem ? `${baseId}-problem-${index}` : undefined}
                  // A press removes it without taking focus from where it is.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    if (leaving) return;
                    remove(value.indexOf(tag), event.detail === 0 ? "forward" : "pointer");
                  }}
                  onKeyDown={(event) => !leaving && onTagKeyDown(event, value.indexOf(tag))}
                >
                  <Icon name="close" />
                </button>
                {problem && (
                  <span id={`${baseId}-problem-${index}`} hidden>
                    {problem}
                  </span>
                )}
              </span>
            );
          })}
          <span data-flip={"\u241finput"} className={styles.entry}>
            {options ? (
              <BaseCombobox.Input ref={setInput} {...inputProps} />
            ) : (
              <input ref={setInput} {...inputProps} value={text} onChange={(e) => onTextChange(e.currentTarget.value)} />
            )}
          </span>
        </div>
      </div>
      {name && value.map((tag, i) => <input key={keyOf(tag, i)} type="hidden" name={name} value={tag} />)}
      <TagMessage id={messageId} hint={hint ?? null} notice={notice} error={shownError} />
      <span className={styles.srOnly} role="status">
        {announcement}
      </span>
    </>
  );

  function onTextChange(next: string) {
    setText(next);
    if (notice) setNotice(null);
    setOpen(next.trim() !== "");
  }

  return (
    <div className={className ? `${styles.field} ${className}` : styles.field} data-size={size}>
      {options ? (
        <BaseCombobox.Root<Option>
          value={null}
          onValueChange={(next) => {
            if (next) pick(next);
          }}
          itemToStringLabel={(o) => o.label}
          isItemEqualToValue={(a, b) => a.value === b.value}
          inputValue={text}
          onInputValueChange={(next, details) => {
            // The text is ours: only typing changes it here.
            if (details.reason === "input-change") onTextChange(next);
          }}
          open={showList}
          onOpenChange={(next) => setOpen(next && !full)}
          onItemHighlighted={(item) => {
            highlighted.current = item ?? null;
          }}
          filter={null}
          autoHighlight={text.trim() !== ""}
          disabled={disabled}
        >
          {field}
          <BaseCombobox.Portal container={container ?? undefined}>
            <BaseCombobox.Positioner
              className={styles.popup}
              anchor={controlRef}
              side="bottom"
              align="start"
              sideOffset={8}
              collisionPadding={8}
            >
              <BaseCombobox.Popup ref={popupRef} className={styles.panel}>
                <div ref={attachViewport} className={styles.viewport}>
                  <div ref={contentRef} className={styles.content}>
                    <BaseCombobox.List ref={listRef} className={styles.list} aria-label={label}>
                      <span ref={barRef} className={styles.highlight} aria-hidden="true" />
                      {matches.map((option, i) => (
                        <BaseCombobox.Item key={option.value} index={i} value={option} className={styles.option}>
                          <span className={styles.text}>
                            <span className={styles.optionLabel} data-match={match(option.label)}>
                              {option.label}
                            </span>
                            {option.description && (
                              <span className={styles.description} data-match={match(option.description)}>
                                {option.description}
                              </span>
                            )}
                          </span>
                        </BaseCombobox.Item>
                      ))}
                    </BaseCombobox.List>
                  </div>
                </div>
              </BaseCombobox.Popup>
            </BaseCombobox.Positioner>
          </BaseCombobox.Portal>
        </BaseCombobox.Root>
      ) : (
        field
      )}
    </div>
  );
}

type TagMessageProps = { id: string; hint: string | null; notice: string | null; error: string | null };

/** Hint, notice or error, in one reserved line: they trade places with a
 *  crossfade, so none of them moves the page. */
function TagMessage({ id, hint, notice, error }: TagMessageProps) {
  const [lastError, setLastError] = useState(error);
  if (error && error !== lastError) setLastError(error);
  const [lastNotice, setLastNotice] = useState(notice);
  if (notice && notice !== lastNotice) setLastNotice(notice);

  return (
    <p id={id} className={styles.message} aria-live="polite">
      {hint && (
        <span className={styles.hint} data-shown={(!error && !notice) || undefined}>
          {hint}
        </span>
      )}
      {lastNotice && (
        <span className={styles.notice} data-shown={(!error && notice !== null) || undefined}>
          <span key={lastNotice} className={styles.swap}>
            {lastNotice}
          </span>
        </span>
      )}
      {lastError && (
        <span className={styles.error} data-shown={error ? true : undefined}>
          <Icon name="alert" className={styles.errorIcon} />
          <span key={lastError} className={styles.swap}>
            {lastError}
          </span>
        </span>
      )}
    </p>
  );
}
