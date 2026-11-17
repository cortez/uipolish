"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type ReactNode, type Ref } from "react";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { FieldMessage } from "../field/field";
import { Icon } from "../icons/icons";
import { useHighlight } from "../listbox/use-highlight";
import styles from "./combobox.module.css";

export type ComboboxOption = {
  value: string;
  /** Plain text: shown once chosen, and matched. */
  label: string;
  /** A second line, such as an email. Also matched. */
  description?: string;
  disabled?: boolean;
};

type ComboboxProps = {
  label: string;
  /** Matched in the browser. Pass this or `loadOptions`. */
  options?: ComboboxOption[];
  /** Fetches matches once typing pauses; a newer query aborts the older one through `signal`. */
  loadOptions?: (query: string, signal: AbortSignal) => Promise<ComboboxOption[]>;
  value?: string | null;
  defaultValue?: string | null;
  /** Also passes the chosen option, so async results need no lookup. */
  onValueChange?: (value: string | null, option: ComboboxOption | null) => void;
  /** Offer to add unmatched text. Return the new option to choose it. */
  onCreate?: (text: string) => ComboboxOption | void | Promise<ComboboxOption | void>;
  /** Label for the add row. Defaults to `Add “text”`. */
  createLabel?: (text: string) => string;
  /** Empty-list text. Defaults to `No matches for “text”`. */
  emptyMessage?: (text: string) => string;
  placeholder?: string;
  hint?: string;
  /** Return a fix-it message, or null. Runs on blur. */
  validate?: (value: string | null) => string | null;
  /** An outside error, such as the server's. Wins over `validate`. */
  error?: string | null;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  ref?: Ref<HTMLInputElement>;
};

type Row =
  | { kind: "option"; option: ComboboxOption }
  | { kind: "create"; text: string }
  | { kind: "retry" };

const DEBOUNCE = 150;
const MAX_ROWS = 50;

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

// Matches are painted with the CSS Custom Highlight API; all comboboxes share one highlight.
const HIGHLIGHT = "uipolish-combobox-match";
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

function filter(options: ComboboxOption[], query: string) {
  const q = fold(query.trim()).out;
  if (!q) return options;
  const starts: ComboboxOption[] = [];
  const contains: ComboboxOption[] = [];
  for (const o of options) {
    const l = fold(o.label).out;
    if (l.startsWith(q) || l.includes(` ${q}`)) starts.push(o);
    else if (l.includes(q) || (o.description && fold(o.description).out.includes(q))) contains.push(o);
  }
  return [...starts, ...contains];
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/** An editable combobox with list autocomplete (WAI-ARIA), on Base UI's Combobox. */
export function Combobox({
  label,
  options,
  loadOptions,
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  onCreate,
  createLabel = (text) => `Add “${text}”`,
  emptyMessage = (text) => `No matches for “${text}”`,
  placeholder,
  hint,
  validate,
  error: externalError,
  name,
  required,
  disabled = false,
  id,
  className,
  ref,
}: ComboboxProps) {
  const baseId = useId();
  const inputId = id ?? `${baseId}-input`;
  const messageId = `${baseId}-message`;

  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const [chosen, setChosen] = useState<ComboboxOption | null>(() =>
    value ? options?.find((o) => o.value === value) ?? null : null,
  );
  if ((chosen?.value ?? null) !== value) {
    const found = value ? options?.find((o) => o.value === value) ?? null : null;
    if (found || value === null) setChosen(found);
  }
  const chosenLabel = chosen?.label ?? "";

  const [text, setText] = useState(chosenLabel);
  const [query, setQuery] = useState<string | null>(null); // null: showing all, not filtering
  const [open, setOpen] = useState(false);

  const [shownLabel, setShownLabel] = useState(chosenLabel);
  if (chosenLabel !== shownLabel) {
    setShownLabel(chosenLabel);
    if (query === null) setText(chosenLabel);
  }

  const [remote, setRemote] = useState<{ query: string; options: ComboboxOption[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const q = query ?? "";

  useEffect(() => {
    if (!loadOptions || !open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        setFailed(false);
        loadOptions(q, controller.signal).then(
          (result) => {
            if (controller.signal.aborted) return;
            setRemote({ query: q, options: result });
            setLoading(false);
          },
          () => {
            if (controller.signal.aborted) return;
            setLoading(false);
            setFailed(true);
          },
        );
      },
      remote === null ? 0 : DEBOUNCE,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // `remote` only picks the first delay; re-running on it would refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open, loadOptions, attempt]);

  const matches = loadOptions ? remote?.options ?? [] : filter(options ?? [], q);
  const trimmed = q.trim();
  const exact = matches.some((o) => o.label.trim().toLowerCase() === trimmed.toLowerCase());
  const settled = !loadOptions || (remote?.query === q && !loading);
  const rows: Row[] = [
    ...(failed && loadOptions ? [{ kind: "retry" } as Row] : []),
    ...matches.slice(0, MAX_ROWS).map((option) => ({ kind: "option", option }) as Row),
    ...(onCreate && trimmed && !exact && settled && !failed ? [{ kind: "create", text: trimmed } as Row] : []),
  ];
  const empty = settled && !failed && rows.length === 0 && trimmed !== "";
  const searching = loadOptions && !settled && !failed;

  const [localError, setLocalError] = useState<string | null>(null);
  const error = externalError ?? localError;
  const hasMessage = Boolean(hint || validate || externalError !== undefined);

  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const creating = useRef(false);
  const { listRef, barRef, listNode } = useHighlight();
  // Floating content portals into the nearest themed subtree, so it keeps its tokens.
  const [container, setContainer] = useState<HTMLElement | null>(null);

  function close() {
    setOpen(false);
  }

  function openList() {
    if (disabled) return;
    setOpen(true);
  }

  function commit(option: ComboboxOption | null) {
    if (controlledValue === undefined) setUncontrolledValue(option?.value ?? null);
    setChosen(option);
    setShownLabel(option?.label ?? "");
    setText(option?.label ?? "");
    setQuery(null);
    if ((option?.value ?? null) !== value) onValueChange?.(option?.value ?? null, option);
    if (localError) setLocalError(validate?.(option?.value ?? null) ?? null);
  }

  async function activate(row: Row) {
    if (row.kind === "retry") {
      setFailed(false);
      setAttempt((n) => n + 1);
      return;
    }
    if (row.kind === "option") {
      if (row.option.disabled) return;
      commit(row.option);
      close();
      return;
    }
    if (!onCreate || creating.current) return;
    creating.current = true;
    close();
    try {
      const made = await onCreate(row.text);
      if (made) commit(made);
      else {
        setText(chosenLabel);
        setQuery(null);
      }
    } finally {
      creating.current = false;
    }
  }

  function onBlur(event: FocusEvent<HTMLInputElement>) {
    const next = event.relatedTarget as Node | null;
    if (creating.current || (next && (popupRef.current?.contains(next) || fieldRef.current?.contains(next)))) return;
    close();
    let current = value;
    if (text.trim() === "") {
      if (value !== null) commit(null);
      current = null;
    } else if (text !== chosenLabel) {
      setText(chosenLabel);
    }
    setQuery(null);
    if (validate) setLocalError(validate(current));
  }

  function clear() {
    commit(null);
    inputRef.current?.focus();
    openList();
  }

  const results = !open
    ? ""
    : failed
      ? "Couldn’t load results"
      : empty
        ? emptyMessage(trimmed)
        : settled
          ? `${matches.length} ${matches.length === 1 ? "result" : "results"}${rows.some((r) => r.kind === "create") ? `, or ${createLabel(trimmed)}` : ""}`
          : "";

  const match = (text: string) => {
    const m = findMatch(text, q);
    return m ? `${m[0]}:${m[1]}` : undefined;
  };

  useLayoutEffect(() => {
    const list = listNode.current;
    if (!list) return;
    const next: Range[] = [];
    if (typeof CSS !== "undefined" && "highlights" in CSS) list.setAttribute("data-highlights", "");
    if (open) {
      for (const el of list.querySelectorAll<HTMLElement>("[data-match]")) {
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

  // Keyed by position, so late results don't count as layout shift.
  const renderRow = (row: Row, i: number): ReactNode => {
    if (row.kind === "option") {
      return (
        <BaseCombobox.Item key={i} index={i} value={row} disabled={row.option.disabled} className={styles.option}>
          <span className={styles.text}>
            <span className={styles.optionLabel} data-match={match(row.option.label)}>
              {row.option.label}
            </span>
            {row.option.description && (
              <span className={styles.description} data-match={match(row.option.description)}>
                {row.option.description}
              </span>
            )}
          </span>
          <span className={styles.check} aria-hidden="true">
            <Icon name="check" />
          </span>
        </BaseCombobox.Item>
      );
    }
    // Add and retry are actions, not values: they run instead of being chosen.
    const act = {
      index: i,
      value: row,
      className: styles.option,
      "data-kind": row.kind,
      onClick: (event: { preventBaseUIHandler: () => void }) => {
        event.preventBaseUIHandler();
        void activate(row);
      },
    };
    if (row.kind === "create") {
      return (
        <BaseCombobox.Item key={i} {...act}>
          <span className={styles.lead} aria-hidden="true">
            <Icon name="plus" />
          </span>
          <span className={styles.optionLabel}>{createLabel(row.text)}</span>
        </BaseCombobox.Item>
      );
    }
    return (
      <BaseCombobox.Item key={i} {...act}>
        <span className={styles.lead} aria-hidden="true">
          <Icon name="retry" />
        </span>
        <span className={styles.text}>
          <span className={styles.optionLabel}>Try again</span>
          <span className={styles.description}>Couldn’t load results</span>
        </span>
      </BaseCombobox.Item>
    );
  };

  const showClear = !disabled && (text !== "" || value !== null);
  const selectedRow: Row | null = chosen ? { kind: "option", option: chosen } : null;

  return (
    <div className={className ? `${styles.field} ${className}` : styles.field}>
      <BaseCombobox.Root<Row>
        value={selectedRow}
        onValueChange={(next) => {
          if (next) void activate(next);
        }}
        isItemEqualToValue={(a, b) => a.kind === "option" && b.kind === "option" && a.option.value === b.option.value}
        itemToStringLabel={(row) => (row.kind === "option" ? row.option.label : "")}
        inputValue={text}
        onInputValueChange={(next, details) => {
          // The text is ours: only typing changes it here.
          if (details.reason !== "input-change") return;
          setText(next);
          setQuery(next);
          openList();
        }}
        open={open}
        onOpenChange={(next) => (next ? openList() : close())}
        filter={null}
        autoHighlight={trimmed !== ""}
        disabled={disabled}
      >
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        <BaseCombobox.InputGroup
          ref={fieldRef}
          className={styles.control}
          data-open={open || undefined}
          data-invalid={error ? "" : undefined}
          data-disabled={disabled || undefined}
        >
          <BaseCombobox.Input
            ref={(node: HTMLInputElement | null) => {
              inputRef.current = node;
              setContainer(node?.closest<HTMLElement>("[data-theme]") ?? null);
              assignRef(ref, node);
            }}
            id={inputId}
            className={styles.input}
            placeholder={placeholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-required={required || undefined}
            aria-describedby={hasMessage && (error || hint) ? messageId : undefined}
            onKeyDown={(event) => {
              // Escape on a closed list puts back the chosen label.
              if (event.key === "Escape" && !open && text !== chosenLabel) {
                event.preventDefault();
                setText(chosenLabel);
                setQuery(null);
              }
            }}
            onBlur={onBlur}
          />
          <div className={styles.adornments}>
            <button
              type="button"
              className={styles.adornment}
              data-hidden={showClear ? undefined : ""}
              tabIndex={-1}
              aria-label={`Clear ${label}`}
              aria-hidden={showClear ? undefined : true}
              disabled={!showClear}
              onPointerDown={(e) => e.preventDefault()}
              onClick={clear}
            >
              <Icon name="close" />
            </button>
            <BaseCombobox.Trigger className={styles.adornment} tabIndex={-1} aria-label={label}>
              <Icon name={open ? "chevron-up" : "chevron-down"} />
            </BaseCombobox.Trigger>
          </div>
        </BaseCombobox.InputGroup>
        {name && <input type="hidden" name={name} value={value ?? ""} />}
        {hasMessage && <FieldMessage id={messageId} hint={hint} error={error} />}
        <span className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {results}
        </span>
        <BaseCombobox.Portal container={container ?? undefined}>
          <BaseCombobox.Positioner
            className={styles.popup}
            anchor={fieldRef}
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={8}
          >
            <BaseCombobox.Popup
              ref={popupRef}
              className={styles.panel}
              data-waiting={searching && rows.length === 0 ? "" : undefined}
            >
              <BaseCombobox.List ref={listRef} className={styles.list} aria-label={label}>
                <span ref={barRef} className={styles.highlight} aria-hidden="true" />
                {rows.map(renderRow)}
              </BaseCombobox.List>
              {(empty || searching || (!trimmed && rows.length === 0 && settled)) && (
                <div className={styles.status} data-searching={searching || undefined}>
                  {searching ? (
                    <span className={styles.sweep}>Searching…</span>
                  ) : empty ? (
                    emptyMessage(trimmed)
                  ) : (
                    "Type to search"
                  )}
                </div>
              )}
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
      </BaseCombobox.Root>
    </div>
  );
}
