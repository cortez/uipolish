"use client";

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Popover } from "@base-ui/react/popover";
import { FieldMessage } from "../field/field";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./date-picker.module.css";

/* ISO day strings, worked on as UTC midnights so no time zone or DST change moves a day. */

export type DateRange = { start: string; end: string };

type Common = {
  label: string;
  /** Earliest choosable day, as "YYYY-MM-DD". */
  min?: string;
  /** Latest choosable day, as "YYYY-MM-DD". */
  max?: string;
  /** Days that can't be chosen. */
  isDateDisabled?: (date: string) => boolean;
  /** 0 is Sunday, 1 is Monday. Defaults to Sunday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  locale?: string;
  placeholder?: string;
  hint?: string;
  /** An error from outside, such as the server. */
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
};

type SingleProps = Common & {
  mode?: "single";
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Return a fix-it message, or null. Runs when the field is left. */
  validate?: (value: string | null) => string | null;
  name?: string;
};

type RangeProps = Common & {
  mode: "range";
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (value: DateRange | null) => void;
  validate?: (value: DateRange | null) => string | null;
  /** Form names for the two ends. */
  name?: { start: string; end: string };
};

type DatePickerProps = SingleProps | RangeProps;

type Ymd = { y: number; m: number };
/** A month on its way out, starting from where the live one visibly was. */
type Leaving = { view: Ymd; dir: 1 | -1; key: number; opacity: number; x: number };

const DAY = 86_400_000;
const toTime = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);
const isIso = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const viewOf = (iso: string): Ymd => {
  const d = new Date(toTime(iso));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
};
const sameView = (a: Ymd, b: Ymd) => a.y === b.y && a.m === b.m;
const viewIndex = (v: Ymd) => v.y * 12 + v.m;

function addMonths(iso: string, by: number) {
  const d = new Date(toTime(iso));
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + by, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), last));
  return toIso(target.getTime());
}

const addDays = (iso: string, by: number) => toIso(toTime(iso) + by * DAY);

function todayIso() {
  const now = new Date();
  return toIso(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Always six weeks, so the grid never changes height. */
function weeks(view: Ymd, weekStart: number) {
  const first = Date.UTC(view.y, view.m, 1);
  const offset = (new Date(first).getUTCDay() - weekStart + 7) % 7;
  const start = first - offset * DAY;
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const t = start + (w * 7 + d) * DAY;
      return { iso: toIso(t), inMonth: new Date(t).getUTCMonth() === view.m, day: new Date(t).getUTCDate() };
    }),
  );
}

function Weeks({ dir, children }: { dir?: 1 | -1; children: ReactNode }) {
  return (
    <tbody className={styles.weeks} data-dir={dir}>
      {children}
    </tbody>
  );
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/** A date field that opens a WAI-ARIA date picker dialog, with an optional range mode. */
export function DatePicker(props: DatePickerProps) {
  const {
    label,
    min,
    max,
    isDateDisabled,
    weekStartsOn = 0,
    locale,
    placeholder = props.mode === "range" ? "Choose dates" : "Choose a date",
    hint,
    error: externalError,
    required,
    disabled = false,
    id,
    className,
    ref,
  } = props;
  const range = props.mode === "range";

  const baseId = useId();
  const triggerId = id ?? `${baseId}-trigger`;
  const labelId = `${baseId}-label`;
  const dialogId = `${baseId}-dialog`;
  const titleId = `${baseId}-title`;
  const messageId = `${baseId}-message`;

  const [uncontrolled, setUncontrolled] = useState<string | DateRange | null>(props.defaultValue ?? null);
  const value = (props.value !== undefined ? props.value : uncontrolled) as string | DateRange | null;
  const single = !range && isIso(value) ? value : null;
  const rangeValue = range && value && typeof value === "object" && isIso(value.start) && isIso(value.end) ? value : null;

  function commit(next: string | DateRange | null) {
    if (props.value === undefined) setUncontrolled(next);
    (props.onValueChange as ((v: unknown) => void) | undefined)?.(next);
    if (localError) setLocalError((props.validate as ((v: unknown) => string | null) | undefined)?.(next) ?? null);
  }

  const fmt = useMemo(
    () => ({
      field: new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
      rangeField: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
      title: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
      full: new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
      weekdayLong: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }),
      day: new Intl.NumberFormat(locale),
    }),
    [locale],
  );

  // Server and browser ICU differ on thin and no-break spaces; plain ones hydrate cleanly.
  const display = (
    single
      ? fmt.field.format(toTime(single))
      : rangeValue
        ? fmt.rangeField.formatRange(toTime(rangeValue.start), toTime(rangeValue.end))
        : placeholder
  ).replace(/[\u2009\u202f\u00a0]/g, " ");

  const [localError, setLocalError] = useState<string | null>(null);
  const error = externalError ?? localError;
  const hasMessage = Boolean(hint || props.validate || required || externalError !== undefined);

  function runValidate(next: string | DateRange | null) {
    if (props.validate) return (props.validate as (v: unknown) => string | null)(next);
    if (required && !next) return range ? "Choose a start and end date" : "Choose a date";
    return null;
  }

  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState<string>("2000-01-01");
  const [view, setView] = useState<Ymd>({ y: 2000, m: 0 });
  const [today, setToday] = useState<string | null>(null);
  // Range: the first day pressed, waiting for the second.
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  // Months on their way out. More than one only when months are paged faster than they fade.
  const [leaving, setLeaving] = useState<Leaving[]>([]);
  // 0 until the month first changes, so the grid doesn't slide in as the calendar opens.
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  const [slides, setSlides] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  // Floating content portals into the nearest themed subtree, so it keeps its tokens.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const moveFocus = useRef(false);

  const inRange = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const choosable = (iso: string) => inRange(iso) && !isDateDisabled?.(iso);

  function clampToBounds(iso: string) {
    if (min && iso < min) return min;
    if (max && iso > max) return max;
    return iso;
  }

  function showView(next: Ymd) {
    if (sameView(next, view)) return;
    const d = viewIndex(next) > viewIndex(view) ? 1 : -1;
    // Paged again mid-slide: the month leaves from where it is, not from rest.
    const live = gridRef.current?.tBodies[0];
    const style = live ? getComputedStyle(live) : null;
    const opacity = style ? parseFloat(style.opacity) : 1;
    const x = style && style.translate !== "none" ? parseFloat(style.translate) || 0 : 0;
    const key = slides + 1;
    setLeaving((list) => [...list.slice(-1), { view, dir: d, key, opacity, x }]);
    setSlides(key);
    setDir(d);
    setView(next);
  }

  function focusDate(iso: string, keyboard: boolean) {
    const next = clampToBounds(iso);
    setFocused(next);
    showView(viewOf(next));
    if (keyboard) moveFocus.current = true;
  }

  function openCalendar() {
    if (disabled) return;
    const now = todayIso();
    setToday(now);
    const start = single ?? rangeValue?.start ?? clampToBounds(now);
    setFocused(start);
    setView(viewOf(start));
    setLeaving([]);
    setDir(0);
    setAnchor(null);
    setHovered(null);
    moveFocus.current = true;
    setOpen(true);
  }

  // Base UI's Popover returns focus to the trigger when focus was inside the calendar.
  function close() {
    setOpen(false);
    setAnchor(null);
    setHovered(null);
  }

  function choose(iso: string) {
    if (!choosable(iso)) return;
    if (!range) {
      commit(iso);
      close();
      return;
    }
    if (!anchor) {
      setAnchor(iso);
      setFocused(iso);
      return;
    }
    const [start, end] = anchor <= iso ? [anchor, iso] : [iso, anchor];
    // A range can't run across a day that can't be chosen.
    for (let t = toTime(start); t <= toTime(end); t += DAY) {
      if (!choosable(toIso(t))) {
        setAnchor(iso);
        setFocused(iso);
        return;
      }
    }
    commit({ start, end });
    close();
  }

  useLayoutEffect(() => {
    if (!open || !moveFocus.current) return;
    const button = gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focused}"]`);
    if (!button) return;
    moveFocus.current = false;
    button.focus({ preventScroll: true });
  });

  function onGridKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const weekPos = (new Date(toTime(focused)).getUTCDay() - weekStartsOn + 7) % 7;
    let next: string | null = null;
    switch (event.key) {
      case "ArrowRight":
        next = addDays(focused, rtl ? -1 : 1);
        break;
      case "ArrowLeft":
        next = addDays(focused, rtl ? 1 : -1);
        break;
      case "ArrowDown":
        next = addDays(focused, 7);
        break;
      case "ArrowUp":
        next = addDays(focused, -7);
        break;
      case "Home":
        next = addDays(focused, -weekPos);
        break;
      case "End":
        next = addDays(focused, 6 - weekPos);
        break;
      case "PageDown":
        next = addMonths(focused, event.shiftKey ? 12 : 1);
        break;
      case "PageUp":
        next = addMonths(focused, event.shiftKey ? -12 : -1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(focused);
        return;
      default:
        return;
    }
    event.preventDefault();
    focusDate(next, true);
    if (range && anchor) setHovered(clampToBounds(next));
  }

  // Month buttons at a limit use aria-disabled, so they keep focus and Escape still works.
  // Tab cycles inside the calendar; Base UI closes it on Escape.
  function onDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const stops = [...(popupRef.current?.querySelectorAll<HTMLElement>("button[tabindex='0'], button:not([tabindex], [aria-disabled])") ?? [])];
    if (stops.length === 0) return;
    const at = stops.indexOf(document.activeElement as HTMLElement);
    const to = event.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : at === stops.length - 1 ? 0 : at + 1;
    event.preventDefault();
    stops[to].focus();
  }

  const weekdayNames = Array.from({ length: 7 }, (_, i) => {
    // 2023-01-01 was a Sunday.
    const t = Date.UTC(2023, 0, 1 + ((weekStartsOn + i) % 7));
    return { short: fmt.weekday.format(t), long: fmt.weekdayLong.format(t) };
  });

  const nextMonth = addMonths(`${view.y}-${String(view.m + 1).padStart(2, "0")}-01`, 1);
  const lastOfPrev = addDays(`${view.y}-${String(view.m + 1).padStart(2, "0")}-01`, -1);
  const canPrev = !min || lastOfPrev >= min;
  const canNext = !max || nextMonth <= max;

  const band = (() => {
    if (range && anchor) {
      const other = hovered ?? anchor;
      return anchor <= other ? { start: anchor, end: other } : { start: other, end: anchor };
    }
    return rangeValue;
  })();

  function renderGrid(v: Ymd, live: boolean) {
    return (
      <>
        {weeks(v, weekStartsOn).map((week) => (
          <tr key={week[0].iso}>
            {week.map((cell) => {
              if (!cell.inMonth) return <td key={cell.iso} className={styles.cell} />;
              const can = choosable(cell.iso);
              const selected = single === cell.iso || (band !== null && (cell.iso === band.start || cell.iso === band.end));
              const between = band !== null && cell.iso > band.start && cell.iso < band.end;
              const edge = band && band.start !== band.end ? (cell.iso === band.start ? "start" : cell.iso === band.end ? "end" : undefined) : undefined;
              return (
                <td
                  key={cell.iso}
                  role="gridcell"
                  className={styles.cell}
                  aria-selected={live ? selected || between || undefined : undefined}
                  data-between={between || undefined}
                  data-edge={edge}
                >
                  <button
                    type="button"
                    className={styles.day}
                    data-iso={live ? cell.iso : undefined}
                    data-selected={selected || undefined}
                    data-today={cell.iso === today || undefined}
                    tabIndex={live && cell.iso === focused ? 0 : -1}
                    aria-label={fmt.full.format(toTime(cell.iso))}
                    aria-current={cell.iso === today ? "date" : undefined}
                    aria-disabled={!can || undefined}
                    onClick={live ? () => choose(cell.iso) : undefined}
                    onPointerEnter={live && range && anchor ? () => setHovered(cell.iso) : undefined}
                    onFocus={live ? () => setFocused(cell.iso) : undefined}
                  >
                    <span>{fmt.day.format(cell.day)}</span>
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </>
    );
  }

  const title = (v: Ymd) => fmt.title.format(Date.UTC(v.y, v.m, 1));

  const formValue = (
    <>
      {!range && typeof props.name === "string" && <input type="hidden" name={props.name} value={single ?? ""} />}
      {range && props.name && typeof props.name === "object" && (
        <>
          <input type="hidden" name={props.name.start} value={rangeValue?.start ?? ""} />
          <input type="hidden" name={props.name.end} value={rangeValue?.end ?? ""} />
        </>
      )}
    </>
  );

  return (
    <div className={className ? `${styles.field} ${className}` : styles.field}>
      <label
        id={labelId}
        className={styles.label}
        // Like a native control, the label focuses the field.
        onClick={() => triggerRef.current?.focus()}
      >
        {label}
      </label>
      <Popover.Root
        open={open}
        onOpenChange={(next) => (next ? openCalendar() : close())}
        triggerId={triggerId}
      >
        <Popover.Trigger
          ref={(node: HTMLButtonElement | null) => {
            triggerRef.current = node;
            setContainer(node?.closest<HTMLElement>("[data-theme]") ?? null);
            assignRef(ref, node);
          }}
          id={triggerId}
          className={styles.trigger}
          disabled={disabled}
          aria-labelledby={`${labelId} ${triggerId}`}
          // A button can't be aria-invalid; the error is read from the message.
          aria-describedby={hasMessage && (error || hint) ? messageId : undefined}
          data-invalid={error ? "" : undefined}
          data-placeholder={single || rangeValue ? undefined : ""}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && !open) {
              event.preventDefault();
              openCalendar();
            }
          }}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null;
            if (next && popupRef.current?.contains(next)) return;
            if (!open) setLocalError(runValidate(value));
          }}
        >
          <TextMorph className={styles.value}>{display}</TextMorph>
          <Icon name="calendar" className={styles.icon} />
        </Popover.Trigger>
        {formValue}
        {hasMessage && <FieldMessage id={messageId} hint={hint} error={error} />}
        <Popover.Portal container={container ?? undefined}>
          <Popover.Positioner className={styles.popup} side="bottom" align="start" sideOffset={8} collisionPadding={8}>
            <Popover.Popup
              ref={popupRef}
              id={dialogId}
              className={styles.panel}
              // The day to start on, not the first button in the header.
              initialFocus={() => gridRef.current?.querySelector<HTMLElement>(`[data-iso="${focused}"]`) ?? true}
              onKeyDown={onDialogKeyDown}
            >
              <div className={styles.header}>
                <button
                  type="button"
                  className={styles.nav}
                  aria-label="Previous month"
                  aria-disabled={!canPrev || undefined}
                  onClick={() => canPrev && focusDate(addMonths(focused, -1), false)}
                >
                  <Icon name="chevron-left" />
                </button>
                <Popover.Title id={titleId} className={styles.title} aria-live="polite">
                  <TextMorph className={styles.titleText}>{title(view)}</TextMorph>
                </Popover.Title>
                <button
                  type="button"
                  className={styles.nav}
                  aria-label="Next month"
                  aria-disabled={!canNext || undefined}
                  onClick={() => canNext && focusDate(addMonths(focused, 1), false)}
                >
                  <Icon name="chevron-right" />
                </button>
              </div>
              <div className={styles.stage}>
                <table
                  ref={gridRef}
                  role="grid"
                  aria-labelledby={titleId}
                  className={styles.grid}
                  onKeyDown={onGridKeyDown}
                  onPointerLeave={() => setHovered(null)}
                >
                  <thead>
                    <tr>
                      {weekdayNames.map((w) => (
                        <th key={w.long} scope="col" abbr={w.long} className={styles.weekday}>
                          {w.short}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <Weeks key={`w${slides}`} dir={dir || undefined}>
                    {renderGrid(view, true)}
                  </Weeks>
                </table>
                {leaving.map((out) => (
                  <table
                    key={`leaving${out.key}`}
                    className={`${styles.grid} ${styles.leaving}`}
                    data-leaving={out.dir}
                    style={{ "--from-opacity": out.opacity, "--from-x": `${out.x}px` } as CSSProperties}
                    aria-hidden="true"
                    inert
                    // Gone once it has faded; its slide has nothing left to show.
                    onAnimationEnd={(e) => {
                      if (e.target === e.currentTarget) setLeaving((list) => list.filter((l) => l.key !== out.key));
                    }}
                  >
                    <tbody>{renderGrid(out.view, false)}</tbody>
                  </table>
                ))}
              </div>
              {range && (
                <p className={styles.status} aria-live="polite">
                  {anchor ? "Now choose the last day" : "Choose the first day"}
                </p>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
