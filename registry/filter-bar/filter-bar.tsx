"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Button } from "../button/button";
import { Checkbox } from "../checkbox/checkbox";
import { DatePicker } from "../date-picker/date-picker";
import { DropdownMenu, MenuItem } from "../dropdown-menu/dropdown-menu";
import { Icon, type IconName } from "../icons/icons";
import { NumberInput } from "../number-input/number-input";
import { Popover } from "../popover/popover";
import { SearchField } from "../search-field/search-field";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import { TextField } from "../text-field/text-field";
import { TextMorph } from "../text-morph/text-morph";
import { useFlipList } from "../tag-input/use-flip-list";
import styles from "./filter-bar.module.css";

export type FilterOption = { value: string; label: string };

export type FilterField =
  | { id: string; label: string; icon?: IconName; type: "enum"; options: FilterOption[] }
  | { id: string; label: string; icon?: IconName; type: "date" }
  | { id: string; label: string; icon?: IconName; type: "number"; min?: number; max?: number; step?: number }
  | { id: string; label: string; icon?: IconName; type: "text"; placeholder?: string };

/** One filter in effect: plain data, safe to keep in a URL or send to a server. */
export type Filter =
  | { field: string; op: "is" | "is-not"; value: string[] }
  | { field: string; op: "before" | "on" | "after"; value: string }
  | { field: string; op: "lt" | "eq" | "gt"; value: number }
  | { field: string; op: "contains"; value: string };

type FilterBarProps = {
  /** What can be filtered on, in the order the Add filter menu lists them. */
  fields: FilterField[];
  value?: Filter[];
  defaultValue?: Filter[];
  onValueChange?: (filters: Filter[]) => void;
  /** Shows a search field at the start of the bar, named this. */
  searchLabel?: string;
  searchPlaceholder?: string;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /** Names the bar for screen readers. Defaults to "Filters". */
  "aria-label"?: string;
  className?: string;
};

/** Whether one value passes one filter. Text matching ignores case and accents. */
export function matchFilter(filter: Filter, value: unknown): boolean {
  if (filter.op === "is" || filter.op === "is-not") {
    const have = (Array.isArray(value) ? value : [value]).map(String);
    const hit = filter.value.some((v) => have.includes(v));
    return filter.op === "is" ? hit : !hit;
  }
  if (filter.op === "before" || filter.op === "on" || filter.op === "after") {
    const day = typeof value === "string" ? value.slice(0, 10) : value instanceof Date ? value.toISOString().slice(0, 10) : "";
    if (!day) return false;
    return filter.op === "before" ? day < filter.value : filter.op === "after" ? day > filter.value : day === filter.value;
  }
  if (filter.op === "lt" || filter.op === "eq" || filter.op === "gt") {
    const n = typeof value === "number" ? value : Number(value);
    if (value === null || value === "" || Number.isNaN(n)) return false;
    return filter.op === "lt" ? n < filter.value : filter.op === "gt" ? n > filter.value : n === filter.value;
  }
  return fold(String(value ?? "")).includes(fold(String(filter.value)));
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

const OPS: Record<FilterField["type"], { value: Filter["op"]; label: string; phrase: string }[]> = {
  enum: [
    { value: "is", label: "Is", phrase: "is" },
    { value: "is-not", label: "Is not", phrase: "is not" },
  ],
  date: [
    { value: "before", label: "Before", phrase: "before" },
    { value: "on", label: "On", phrase: "on" },
    { value: "after", label: "After", phrase: "after" },
  ],
  number: [
    { value: "lt", label: "Less than", phrase: "less than" },
    { value: "eq", label: "Exactly", phrase: "is" },
    { value: "gt", label: "More than", phrase: "more than" },
  ],
  text: [{ value: "contains", label: "Contains", phrase: "contains" }],
};

function blank(field: FilterField): Filter {
  switch (field.type) {
    case "enum":
      return { field: field.id, op: "is", value: [] };
    case "date":
      return { field: field.id, op: "after", value: "" };
    case "number":
      // A number field always holds a number, so this one starts in effect.
      return { field: field.id, op: "gt", value: field.min ?? 0 };
    case "text":
      return { field: field.id, op: "contains", value: "" };
  }
}

function isEmpty(filter: Filter) {
  if (Array.isArray(filter.value)) return filter.value.length === 0;
  if (typeof filter.value === "number") return Number.isNaN(filter.value);
  return filter.value.trim() === "";
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** The words after the field's name: the condition, and the value it holds. */
function describe(field: FilterField, filter: Filter): { op: string; value: string | null } {
  const op = OPS[field.type].find((o) => o.value === filter.op)?.phrase ?? filter.op;
  if (isEmpty(filter)) return { op, value: null };
  if (field.type === "enum" && Array.isArray(filter.value)) {
    const names = filter.value.map((v) => field.options.find((o) => o.value === v)?.label ?? v);
    if (names.length <= 2) return { op, value: names.join(" or ") };
    return { op: filter.op === "is" ? "is any of" : "is none of", value: String(names.length) };
  }
  if (field.type === "date" && typeof filter.value === "string") {
    const t = Date.parse(`${filter.value}T00:00:00Z`);
    const thisYear = new Date(t).getUTCFullYear() === new Date().getUTCFullYear();
    return { op, value: (thisYear ? shortDate : longDate).format(t) };
  }
  if (typeof filter.value === "number") return { op, value: new Intl.NumberFormat("en-US").format(filter.value) };
  return { op, value: `“${String(filter.value).trim()}”` };
}

type Draft = { filter: Filter; index: number };

/** The row in front of a table or list: search, the filters in effect, Add filter and Clear. */
export function FilterBar({
  fields,
  value: controlledValue,
  defaultValue = [],
  onValueChange,
  searchLabel,
  searchPlaceholder,
  query,
  defaultQuery,
  onQueryChange,
  "aria-label": ariaLabel = "Filters",
  className,
}: FilterBarProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const committed = controlledValue ?? uncontrolled;
  // A filter with nothing chosen yet (just added, or emptied while editing)
  // stays in its place while its editor is open, but isn't in the value.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const addRef = useRef<HTMLSpanElement>(null);
  const pending = useRef<string | null>(null);
  const pendingTimer = useRef(0);
  const returnTo = useRef<string | null>(null);
  const fromMenu = useRef<string | null>(null);
  useEffect(() => () => window.clearTimeout(pendingTimer.current), []);

  const fieldOf = (id: string) => fields.find((f) => f.id === id);
  const shown: Filter[] = [...committed];
  if (draft && !committed.some((f) => f.field === draft.filter.field)) {
    shown.splice(Math.min(draft.index, shown.length), 0, draft.filter);
  }

  type Item = Filter | "clear";
  const items: Item[] = committed.length ? [...shown, "clear"] : shown;
  const { list, ref } = useFlipList<Item>(items, (item) => (item === "clear" ? "\u241fclear" : item.field));

  function commit(next: Filter[]) {
    if (controlledValue === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  function update(next: Filter) {
    const index = shown.findIndex((f) => f.field === next.field);
    const rest = committed.filter((f) => f.field !== next.field);
    if (isEmpty(next)) {
      setDraft({ filter: next, index });
      if (rest.length !== committed.length) commit(rest);
      return;
    }
    const merged = [...rest];
    merged.splice(Math.min(index, merged.length), 0, next);
    setDraft(null);
    commit(merged);
  }

  function chipLabel(filter: Filter) {
    const field = fieldOf(filter.field);
    if (!field) return filter.field;
    const { op, value } = describe(field, filter);
    return `${field.label} ${op}${value ? ` ${value}` : ""}`;
  }

  /** Focus moves to what took a removed chip's place: the next chip, or Add filter. */
  function focusAfter(index: number) {
    const bar = ref.current;
    requestAnimationFrame(() => {
      const bodies = Array.from(bar?.querySelectorAll<HTMLElement>("[data-chip]:not([data-leaving]) [data-body]") ?? []);
      (bodies[index] ?? addRef.current?.querySelector<HTMLElement>("button"))?.focus();
    });
  }

  function remove(filter: Filter) {
    const index = shown.findIndex((f) => f.field === filter.field);
    setAnnouncement(`Removed ${chipLabel(filter)}`);
    if (draft?.filter.field === filter.field) setDraft(null);
    if (editing === filter.field) setEditing(null);
    commit(committed.filter((f) => f.field !== filter.field));
    focusAfter(index);
  }

  function clearAll() {
    setDraft(null);
    setEditing(null);
    setAnnouncement("Cleared all filters");
    commit([]);
    focusAfter(Number.POSITIVE_INFINITY);
  }

  function addField(field: FilterField) {
    if (!shown.some((f) => f.field === field.id)) {
      const fresh = blank(field);
      if (isEmpty(fresh)) setDraft({ filter: fresh, index: shown.length });
      else commit([...committed, fresh]);
    }
    // The menu hands focus back to Add filter as it closes; the editor opens
    // once it has, so the two never fight over focus.
    pending.current = field.id;
    window.clearTimeout(pendingTimer.current);
    pendingTimer.current = window.setTimeout(openPending, 400);
  }

  function onAddFocus() {
    if (pending.current) {
      requestAnimationFrame(openPending);
      return;
    }
    const field = returnTo.current;
    returnTo.current = null;
    if (!field) return;
    const chip = ref.current?.querySelector<HTMLElement>(`[data-flip="${CSS.escape(field)}"]:not([data-leaving]) [data-body]`);
    chip?.focus();
  }

  function openPending() {
    window.clearTimeout(pendingTimer.current);
    const id = pending.current;
    pending.current = null;
    fromMenu.current = id;
    if (id) setEditing(id);
  }

  function closeEditor(filter: Filter) {
    setEditing(null);
    // An editor opened from the menu hands focus back to Add filter as it
    // closes; the chip it made is where focus belongs.
    if (fromMenu.current === filter.field) {
      returnTo.current = filter.field;
      window.setTimeout(() => (returnTo.current = null), 400);
    }
    fromMenu.current = null;
    // Closed with nothing chosen: the chip goes, and focus to Add filter.
    if (draft?.filter.field === filter.field && isEmpty(draft.filter)) {
      setDraft(null);
      focusAfter(Number.POSITIVE_INFINITY);
    }
  }

  const empty = list.length === 0;

  return (
    <div className={className ? `${styles.bar} ${className}` : styles.bar}>
      <div ref={ref as Ref<HTMLDivElement>} className={styles.row} role="group" aria-label={ariaLabel}>
        {searchLabel && (
          <SearchField
            className={styles.search}
            label={searchLabel}
            placeholder={searchPlaceholder ?? searchLabel}
            value={query}
            defaultValue={defaultQuery}
            onChange={(e) => onQueryChange?.(e.currentTarget.value)}
          />
        )}
        {list.map(({ key, item, leaving }) => {
          if (item === "clear") return null;
          const field = fieldOf(item.field);
          if (!field) return null;
          const { op, value } = describe(field, item);
          const name = chipLabel(item);
          return (
            <span
              key={key}
              data-flip={key}
              data-chip=""
              className={styles.chip}
              data-leaving={leaving || undefined}
              data-open={editing === item.field || undefined}
              inert={leaving || undefined}
            >
              <Popover
                label={`${field.label} filter`}
                align="start"
                className={styles.editor}
                open={!leaving && editing === item.field}
                onOpenChange={(next) => (next ? setEditing(item.field) : closeEditor(item))}
                trigger={
                  <button type="button" data-body="" className={styles.body} aria-label={`Edit filter: ${name}`}>
                    <span className={styles.phrase} aria-hidden="true">
                      <span className={styles.fieldName}>{field.label}</span> <span className={styles.op}>{op}</span>{" "}
                      {value === null ? (
                        <span className={styles.op}>…</span>
                      ) : value.length <= 28 ? (
                        <span className={styles.value}>
                          <TextMorph>{value}</TextMorph>
                        </span>
                      ) : (
                        <span className={styles.value}>{value}</span>
                      )}
                    </span>
                  </button>
                }
              >
                {({ close }) => <Editor field={field} filter={item} onChange={update} onDone={close} />}
              </Popover>
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove filter: ${name}`}
                onClick={() => remove(item)}
              >
                <Icon name="close" />
              </button>
            </span>
          );
        })}
        <span ref={addRef} data-flip={"\u241fadd"} className={styles.slot} onFocus={onAddFocus}>
          <DropdownMenu
            trigger={
              <Button variant={empty ? "secondary" : "ghost"}>
                <Icon name="plus" />
                Add filter
              </Button>
            }
          >
            {fields.map((field) => (
              <MenuItem key={field.id} icon={field.icon ? <Icon name={field.icon} /> : undefined} onSelect={() => addField(field)}>
                {field.label}
              </MenuItem>
            ))}
          </DropdownMenu>
        </span>
        {list.map(({ key, item, leaving }) =>
          item === "clear" ? (
            <span key={key} data-flip={key} className={styles.slot} data-leaving={leaving || undefined} inert={leaving || undefined}>
              <Button variant="ghost" onClick={clearAll}>
                Clear
              </Button>
            </span>
          ) : null,
        )}
      </div>
      <span className={styles.srOnly} role="status">
        {announcement}
      </span>
    </div>
  );
}

type EditorProps = { field: FilterField; filter: Filter; onChange: (filter: Filter) => void; onDone: () => void };

/** The small form in a chip's popover. Changes apply as they're made. */
function Editor({ field, filter, onChange, onDone }: EditorProps) {
  const ops = OPS[field.type];
  // The popover focuses the first [autofocus] inside it: the value, not the
  // condition above it, so typing goes straight in.
  const bodyRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const target = ['input:not([type="hidden"], [aria-hidden="true"], :disabled)', 'button[role="checkbox"]', "button:not(:disabled)"]
      .map((selector) => body?.querySelector<HTMLElement>(selector))
      .find(Boolean);
    target?.setAttribute("autofocus", "");
  }, []);
  const opControl =
    ops.length > 1 ? (
      <SegmentedControl
        size="sm"
        aria-label={`${field.label} condition`}
        value={filter.op}
        onValueChange={(op) => onChange({ ...filter, op } as Filter)}
      >
        {ops.map((o) => (
          <Segment key={o.value} value={o.value}>
            {o.label}
          </Segment>
        ))}
      </SegmentedControl>
    ) : null;

  let body: ReactNode = null;
  if (field.type === "enum" && Array.isArray(filter.value)) {
    const chosen = filter.value;
    body = (
      <div className={styles.options} role="group" aria-label={field.label}>
        {field.options.map((o) => (
          <Checkbox
            key={o.value}
            label={o.label}
            checked={chosen.includes(o.value)}
            onCheckedChange={(on) =>
              onChange({
                ...filter,
                value: on ? field.options.map((x) => x.value).filter((v) => v === o.value || chosen.includes(v)) : chosen.filter((v) => v !== o.value),
              } as Filter)
            }
          />
        ))}
      </div>
    );
  } else if (field.type === "date" && typeof filter.value === "string") {
    body = (
      <DatePicker
        label="Date"
        value={filter.value || null}
        onValueChange={(next) => onChange({ ...filter, value: next ?? "" } as Filter)}
      />
    );
  } else if (field.type === "number" && typeof filter.value === "number") {
    body = (
      <NumberInput
        label={field.label}
        hideLabel
        min={field.min}
        max={field.max}
        step={field.step}
        value={Number.isNaN(filter.value) ? undefined : filter.value}
        onValueChange={(n) => onChange({ ...filter, value: n } as Filter)}
      />
    );
  } else if (field.type === "text" && typeof filter.value === "string") {
    body = (
      <TextField
        label={field.label}
        hideLabel
        autoFocus
        placeholder={field.placeholder ?? `${field.label} contains…`}
        value={filter.value}
        onChange={(e) => onChange({ ...filter, value: e.currentTarget.value } as Filter)}
        onKeyDown={(e) => {
          // Enter is done: the popover closes and focus goes back to the chip.
          if (e.key === "Enter") {
            e.preventDefault();
            onDone();
          }
        }}
      />
    );
  }

  return (
    <div className={styles.form}>
      {opControl}
      <div ref={bodyRef} className={styles.fill}>
        {body}
      </div>
    </div>
  );
}
