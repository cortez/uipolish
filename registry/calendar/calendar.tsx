"use client";

import { DAY, addDays, addMonths, toTime } from "../date-picker/dates";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { Popover } from "../popover/popover";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./calendar.module.css";

export type CalendarView = "month" | "week";
export type CalendarTone = "neutral" | "accent" | "success" | "warning" | "danger";

export type CalendarEvent = {
  id: string;
  title: string;
  /** "YYYY-MM-DDTHH:mm" in local wall-clock time, a Date, or "YYYY-MM-DD" for an all-day event. */
  start: string | Date;
  /** Exclusive for timed events; the last day, inclusive, for all-day ones. */
  end: string | Date;
  allDay?: boolean;
  tone?: CalendarTone;
};

type CalendarProps = Omit<ComponentProps<"div">, "children" | "onChange"> & {
  events: CalendarEvent[];
  view?: CalendarView;
  defaultView?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  /** The day in focus, "YYYY-MM-DD": it decides which month or week shows. */
  date?: string;
  defaultDate?: string;
  onDateChange?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  /** A day pressed, or Enter on a day: open it, or start a new event there. */
  onDateClick?: (date: string) => void;
  /** An empty half hour pressed in the week: "YYYY-MM-DDTHH:mm". */
  onSlotClick?: (start: string) => void;
  /** 0 is Sunday. Defaults to the locale's own first day. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  locale?: string;
  /** The hour the week scrolls to when it opens. */
  startHour?: number;
};

/* ---------- Days ---------- */

/* ISO day strings worked on as UTC midnights: the date picker's day math. */
const between = (a: string, b: string) => Math.round((toTime(b) - toTime(a)) / DAY);
const weekday = (iso: string) => new Date(toTime(iso)).getUTCDay();


const pad = (n: number) => String(n).padStart(2, "0");

/** A moment as its local day and minutes past that day's midnight. */
function wallClock(value: string | Date): { day: string; min: number } {
  if (typeof value === "string") {
    const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value);
    // Wall-clock text is read as written; one with a zone is a moment.
    if (m && !/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return { day: m[1], min: m[2] ? Number(m[2]) * 60 + Number(m[3]) : 0 };
    value = new Date(value);
  }
  return {
    day: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    min: value.getHours() * 60 + value.getMinutes(),
  };
}

function todayIso() {
  return wallClock(new Date()).day;
}

/** The locale's first day of the week, where the browser knows it. */
function localeWeekStart(locale?: string) {
  try {
    const tag = locale ?? new Intl.DateTimeFormat().resolvedOptions().locale;
    const info = new Intl.Locale(tag) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const first = (info.getWeekInfo?.() ?? info.weekInfo)?.firstDay;
    if (first) return first % 7;
  } catch {
    // An unknown tag: Sunday.
  }
  return 0;
}

/* ---------- Events ---------- */

type Placed = {
  event: CalendarEvent;
  /** First and last day it touches, inclusive. */
  first: string;
  last: string;
  /** Minutes past midnight on its first day and on its last. */
  from: number;
  to: number;
  /** All day, or timed across midnight: it rides in the all-day row. */
  banner: boolean;
};

function place(event: CalendarEvent): Placed {
  const a = wallClock(event.start);
  const b = wallClock(event.end);
  if (event.allDay) return { event, first: a.day, last: b.day < a.day ? a.day : b.day, from: 0, to: 1440, banner: true };
  // Ending at midnight is ending with the day before, not starting the next.
  const last = b.min === 0 && b.day > a.day ? addDays(b.day, -1) : b.day < a.day ? a.day : b.day;
  const to = b.min === 0 && b.day > a.day ? 1440 : last === a.day ? Math.max(b.min, a.min) : b.min;
  return { event, first: a.day, last, from: a.min, to, banner: last !== a.day };
}

const byTime = (x: Placed, y: Placed) =>
  Number(y.banner) - Number(x.banner) || x.first.localeCompare(y.first) || x.from - y.from || y.to - x.to || x.event.title.localeCompare(y.event.title);

/** The shortest an event is drawn, in minutes, so its title fits: packing counts it at this length. */
const SHORTEST = 30;

/**
 * Side by side where times overlap. Each event gets a column in its cluster
 * and spreads right across free ones; one with a neighbour still to its
 * right reaches 1.7 times its share under it, so a long event beside two
 * short ones keeps room for its title. Later columns sit on top.
 */
function pack(items: Placed[]) {
  const out = new Map<string, { col: number; left: number; width: number }>();
  const sorted = [...items].sort((x, y) => x.from - y.from || y.to - x.to);
  let cluster: { item: Placed; col: number }[] = [];
  let ends: number[] = [];
  let clusterEnd = -1;
  const end = (p: Placed) => Math.max(p.to, p.from + SHORTEST);
  const flush = () => {
    for (const { item, col } of cluster) {
      let span = 1;
      // Spread right while the next column is free for its whole time.
      while (
        col + span < ends.length &&
        !cluster.some((o) => o.col === col + span && o.item.from < end(item) && end(o.item) > item.from)
      ) span++;
      const cols = ends.length;
      const share = span / cols;
      const left = col / cols;
      out.set(item.event.id, { col, left, width: col + span === cols ? share : Math.min(1 - left, share * 1.7) });
    }
    cluster = [];
    ends = [];
  };
  for (const item of sorted) {
    if (item.from >= clusterEnd) flush();
    let col = ends.findIndex((e) => e <= item.from);
    if (col === -1) col = ends.push(0) - 1;
    ends[col] = end(item);
    cluster.push({ item, col });
    clusterEnd = Math.max(clusterEnd, end(item));
  }
  flush();
  return out;
}

/* ---------- Pages ---------- */

type Page = { view: CalendarView; start: string; days: number; month: string };
const pageKey = (p: Page) => `${p.view}:${p.start}:${p.days}`;

/** A page on its way out, starting from where the live one visibly was. */
type Leaving = { page: Page; dir: 1 | -1; key: number; opacity: number; x: number };
/** The other view, fading out over the one that replaced it. */
type ViewLeaving = { page: Page; key: number; scroll: number };

/** Below this the month shows dots and a day list, and the week three days. */
const COMPACT = 560;

function readSlide(el: Element | null | undefined) {
  const style = el ? getComputedStyle(el) : null;
  return {
    opacity: style ? parseFloat(style.opacity) : 1,
    x: style && style.translate !== "none" ? parseFloat(style.translate) || 0 : 0,
  };
}

/** A month or week calendar of events, with Base UI's popover for a day's overflow. */
export function Calendar({
  events,
  view: controlledView,
  defaultView = "month",
  onViewChange,
  date,
  defaultDate,
  onDateChange,
  onEventClick,
  onDateClick,
  onSlotClick,
  weekStartsOn,
  locale,
  startHour = 8,
  className,
  "aria-label": ariaLabel = "Calendar",
  ...props
}: CalendarProps) {
  const weekStart = weekStartsOn ?? localeWeekStart(locale);

  const [uncontrolledView, setUncontrolledView] = useState<CalendarView>(defaultView);
  const view = controlledView ?? uncontrolledView;
  const [uncontrolledDate, setUncontrolledDate] = useState(() => defaultDate ?? todayIso());
  const focused = date ?? uncontrolledDate;

  // Today and the time are read after mount, so server and browser render the same page.
  const [now, setNow] = useState<{ day: string; min: number } | null>(null);
  useEffect(() => {
    const tick = () => setNow(wallClock(new Date()));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const today = now?.day ?? null;

  const [compact, setCompact] = useState(false);
  // The first of the three days a narrow week shows.
  const [stripStart, setStripStart] = useState(focused);
  const [leaving, setLeaving] = useState<Leaving[]>([]);
  const [viewLeaving, setViewLeaving] = useState<ViewLeaving | null>(null);
  // 0 until the page first changes, so nothing slides in on mount.
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  const [slides, setSlides] = useState(0);
  // How many chips fit in a month day before "+N more".
  const [fit, setFit] = useState(3);

  const rootRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  const fmt = useMemo(
    () => ({
      month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
      range: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
      full: new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
      dayTitle: new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
      weekdayLong: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }),
      time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }),
      days: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }),
      dayTime: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }),
      hour: new Intl.DateTimeFormat(locale, { hour: "numeric", timeZone: "UTC" }),
      day: new Intl.NumberFormat(locale),
    }),
    [locale],
  );
  // Server and browser ICU differ on thin and no-break spaces; plain ones hydrate cleanly.
  const plain = (s: string) => s.replace(/[\u2009\u202f\u00a0]/g, " ");
  const at = (min: number) => Date.UTC(2023, 0, 1, 0, min);
  const clock = (min: number) => plain(min % 60 ? fmt.time.format(at(min)) : fmt.hour.format(at(min)));

  const placed = useMemo(() => events.map(place).sort(byTime), [events]);
  const onDay = (iso: string) => placed.filter((p) => p.first <= iso && p.last >= iso);
  const hasBanners = placed.some((p) => p.banner);

  /* ---------- Paging ---------- */

  function pageOf(v: CalendarView, day: string, strip: string): Page {
    const month = day.slice(0, 7);
    if (v === "month") {
      const first = `${month}-01`;
      return { view: v, start: addDays(first, -((weekday(first) - weekStart + 7) % 7)), days: 42, month };
    }
    if (compact) return { view: v, start: strip, days: 3, month };
    return { view: v, start: addDays(day, -((weekday(day) - weekStart + 7) % 7)), days: 7, month };
  }
  const page = pageOf(view, focused, stripStart);

  /** The narrow week's first day once `day` has focus: it moves by whole pages of three. */
  function stripFor(day: string, from: string) {
    const d = between(from, day);
    if (d < 0) return addDays(from, Math.floor(d / 3) * 3);
    if (d > 2) return addDays(from, Math.floor(d / 3) * 3);
    return from;
  }

  function commitDate(next: string) {
    if (date === undefined) setUncontrolledDate(next);
    onDateChange?.(next);
  }

  function go(next: string, keyboard: boolean, strip = stripFor(next, stripStart)) {
    const from = pageOf(view, focused, stripStart);
    const to = pageOf(view, next, strip);
    if (pageKey(from) !== pageKey(to)) {
      const d = to.start > from.start ? 1 : -1;
      // Paged again mid-slide: the page leaves from where it is, not from rest.
      const { opacity, x } = readSlide(liveRef.current);
      const key = slides + 1;
      setLeaving((list) => [...list.slice(-1), { page: from, dir: d, key, opacity, x }]);
      setSlides(key);
      setDir(d);
    }
    setStripStart(strip);
    if (next !== focused) commitDate(next);
    if (keyboard) moveFocus.current = true;
  }

  function step(by: 1 | -1) {
    if (view === "month") go(addMonths(focused, by), false);
    else if (compact) go(addDays(focused, by * 3), false, addDays(stripStart, by * 3));
    else go(addDays(focused, by * 7), false);
  }

  function changeView(next: CalendarView) {
    if (next === view) return;
    setViewLeaving({ page, key: slides + 1, scroll: scrollRef.current?.scrollTop ?? 0 });
    setSlides((s) => s + 1);
    setLeaving([]);
    setDir(0);
    setStripStart(focused);
    if (controlledView === undefined) setUncontrolledView(next);
    onViewChange?.(next);
  }

  const focusedRef = useRef(focused);
  useLayoutEffect(() => {
    focusedRef.current = focused;
  });

  // Narrow: the month shows dots and a day list, the week three days from the one in focus.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let was = false;
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width < COMPACT;
      if (next === was) return;
      was = next;
      setCompact(next);
      setStripStart(focusedRef.current);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // How many chips a month day holds, from the room its first day has.
  useLayoutEffect(() => {
    if (view !== "month") return;
    const stage = liveRef.current?.parentElement;
    if (!stage) return;
    const measure = () => {
      const box = stage.querySelector<HTMLElement>("[data-chips]");
      if (!box) return;
      const style = getComputedStyle(box);
      const chip = parseFloat(style.getPropertyValue("--chip-h")) || 20;
      const gap = parseFloat(style.rowGap) || 0;
      setFit(Math.max(1, Math.floor((box.clientHeight + gap) / (chip + gap))));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [view]);

  // The week opens on the morning, not at midnight.
  useLayoutEffect(() => {
    if (view !== "week" || !scrollRef.current) return;
    const scroller = scrollRef.current;
    const hour = parseFloat(getComputedStyle(scroller).getPropertyValue("--calendar-hour")) || 48;
    scroller.scrollTop = Math.max(0, startHour * hour - hour / 4);
  }, [view, startHour]);

  // After a key moves the focus, the new day takes it (its page may just have mounted).
  useLayoutEffect(() => {
    if (!moveFocus.current) return;
    const button = liveRef.current?.querySelector<HTMLElement>(`[data-iso="${focused}"]`);
    if (!button) return;
    moveFocus.current = false;
    button.focus({ preventScroll: true });
  });

  function onDaysKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!(event.target as HTMLElement).dataset.iso) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const pos = (weekday(focused) - weekStart + 7) % 7;
    let next: string;
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
        next = view === "week" && compact ? stripStart : addDays(focused, -pos);
        break;
      case "End":
        next = view === "week" && compact ? addDays(stripStart, 2) : addDays(focused, 6 - pos);
        break;
      case "PageDown":
      case "PageUp": {
        const by = event.key === "PageDown" ? 1 : -1;
        event.preventDefault();
        if (view === "month") go(addMonths(focused, by * (event.shiftKey ? 12 : 1)), true);
        else if (compact) go(addDays(focused, by * 3), true, addDays(stripStart, by * 3));
        else go(addDays(focused, by * 7), true);
        return;
      }
      default:
        return;
    }
    event.preventDefault();
    go(next, true);
  }

  /* ---------- Pieces ---------- */

  const title = (p: Page) =>
    p.view === "month"
      ? plain(fmt.month.format(toTime(`${p.month}-01`)))
      : plain(fmt.range.formatRange(toTime(p.start), toTime(addDays(p.start, p.days - 1))));

  const weekdayNames = Array.from({ length: 7 }, (_, i) => {
    // 2023-01-01 was a Sunday.
    const t = Date.UTC(2023, 0, 1 + ((weekStart + i) % 7));
    return { short: fmt.weekday.format(t), long: fmt.weekdayLong.format(t) };
  });

  /** When it happens, in words: "All day", "6:30 – 8:00 PM", "Nov 14 – 16". */
  function when(p: Placed) {
    if (p.event.allDay) return p.first === p.last ? "All day" : plain(fmt.days.formatRange(toTime(p.first), toTime(p.last)));
    if (p.first === p.last) return plain(fmt.time.formatRange(at(p.from), at(Math.max(p.to, p.from + 1))));
    return plain(fmt.dayTime.formatRange(toTime(p.first) + p.from * 60_000, toTime(p.last) + p.to * 60_000));
  }

  const eventLabel = (p: Placed) =>
    p.first === p.last ? `${p.event.title}, ${fmt.dayTitle.format(toTime(p.first))}, ${when(p)}` : `${p.event.title}, ${when(p)}`;

  function chip(p: Placed, day: string, live: boolean, tabbable: boolean) {
    const timed = !p.event.allDay && p.first === day;
    const content = (
      <>
        {timed && <span className={styles.chipTime}>{clock(p.from)}</span>}
        <span className={styles.chipTitle}>{p.event.title}</span>
      </>
    );
    const common = {
      className: styles.chip,
      "data-tone": p.event.tone ?? "neutral",
      "data-banner": p.event.allDay || p.first !== p.last || undefined,
    };
    if (!onEventClick || !live) {
      return (
        <span key={p.event.id} {...common}>
          {content}
        </span>
      );
    }
    return (
      <button
        key={p.event.id}
        type="button"
        {...common}
        tabIndex={tabbable ? 0 : -1}
        aria-label={eventLabel(p)}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick(p.event);
        }}
      >
        {content}
      </button>
    );
  }

  function agenda(items: Placed[], close?: () => void) {
    if (items.length === 0) return <p className={styles.agendaEmpty}>Nothing planned</p>;
    return (
      <ul className={styles.agenda} role="list">
        {items.map((p) => {
          const body = (
            <>
              <span className={styles.agendaDot} data-tone={p.event.tone ?? "neutral"} aria-hidden="true" />
              <span className={styles.agendaTitle}>{p.event.title}</span>
              <span className={styles.agendaTime}>{when(p)}</span>
            </>
          );
          return (
            <li key={p.event.id}>
              {onEventClick ? (
                <button
                  type="button"
                  className={styles.agendaRow}
                  aria-label={eventLabel(p)}
                  onClick={() => {
                    close?.();
                    onEventClick(p.event);
                  }}
                >
                  {body}
                </button>
              ) : (
                <div className={styles.agendaRow}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  function dayNumber(iso: string, live: boolean, count: number) {
    return (
      <button
        type="button"
        className={styles.dayNumber}
        data-iso={live ? iso : undefined}
        data-today={iso === today || undefined}
        data-focused={iso === focused || undefined}
        tabIndex={live && iso === focused ? 0 : -1}
        aria-label={`${fmt.full.format(toTime(iso))}${count === 0 ? "" : count === 1 ? ", 1 event" : `, ${count} events`}`}
        aria-current={iso === today ? "date" : undefined}
        onFocus={live ? () => iso !== focused && go(iso, false) : undefined}
        onClick={
          live
            ? (e) => {
                e.stopPropagation();
                go(iso, false);
                // A narrow month picks the day for its list; elsewhere the day opens.
                if (!(compact && view === "month")) onDateClick?.(iso);
              }
            : undefined
        }
      >
        {fmt.day.format(Number(iso.slice(8)))}
      </button>
    );
  }

  /** "+2 more": the whole day in a popover. */
  function more(iso: string, items: Placed[], hidden: number, live: boolean, tabbable: boolean) {
    if (!live) return <span className={styles.more}>+{hidden} more</span>;
    const name = fmt.dayTitle.format(toTime(iso));
    return (
      <Popover
        label={name}
        side="bottom"
        align="start"
        className={styles.dayPopover}
        trigger={
          <button
            type="button"
            className={styles.more}
            tabIndex={tabbable ? 0 : -1}
            aria-label={`${hidden} more on ${name}`}
            onClick={(e) => e.stopPropagation()}
          >
            +{hidden} more
          </button>
        }
      >
        {({ close }) => (
          <div className={styles.popoverBody}>
            <p className={styles.popoverTitle}>{name}</p>
            {agenda(items, close)}
          </div>
        )}
      </Popover>
    );
  }

  /* ---------- Month ---------- */

  function monthGrid(p: Page, live: boolean, extra?: { className?: string; style?: CSSProperties; key?: string; leaving?: 1 | -1; onAnimationEnd?: () => void }) {
    const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(p.start, w * 7 + d)));
    return (
      <div
        key={extra?.key}
        ref={live ? liveRef : undefined}
        role={live ? "grid" : undefined}
        aria-label={live ? title(p) : undefined}
        aria-hidden={live ? undefined : true}
        inert={!live || undefined}
        className={`${styles.monthGrid} ${extra?.className ?? ""}`}
        data-dir={live && dir ? dir : undefined}
        data-leaving={extra?.leaving}
        style={extra?.style}
        onKeyDown={live ? onDaysKeyDown : undefined}
        onAnimationEnd={
          extra?.onAnimationEnd
            ? (e) => {
                if (e.target === e.currentTarget && e.animationName.includes("fade")) extra.onAnimationEnd?.();
              }
            : undefined
        }
      >
        {weeks.map((week) => (
          <div key={week[0]} role={live ? "row" : undefined} className={styles.week}>
            {week.map((iso) => {
              const items = onDay(iso);
              const over = items.length > fit;
              const shown = over ? items.slice(0, Math.max(0, fit - 1)) : items;
              const hidden = items.length - shown.length;
              const mine = live && iso === focused;
              return (
                <div
                  key={iso}
                  role={live ? "gridcell" : undefined}
                  className={styles.cell}
                  data-outside={iso.slice(0, 7) !== p.month || undefined}
                  data-clickable={(live && (Boolean(onDateClick) || compact)) || undefined}
                  onClick={
                    live
                      ? () => {
                          go(iso, false);
                          if (!compact) onDateClick?.(iso);
                        }
                      : undefined
                  }
                >
                  {dayNumber(iso, live, items.length)}
                  <div className={styles.chips} data-chips="">
                    {shown.map((it) => chip(it, iso, live, mine))}
                    {hidden > 0 && more(iso, items, hidden, live, mine)}
                  </div>
                  <span className={styles.dots} aria-hidden="true">
                    {items.slice(0, 3).map((it) => (
                      <span key={it.event.id} className={styles.dot} data-tone={it.event.tone ?? "neutral"} />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  function monthView(p: Page, live: boolean) {
    return (
      <div className={styles.month}>
        <div className={styles.weekdays} aria-hidden={live ? undefined : true}>
          {weekdayNames.map((w) => (
            <span key={w.long} className={styles.weekday}>
              <abbr title={w.long}>{w.short}</abbr>
            </span>
          ))}
        </div>
        <div className={styles.stage}>
          {/* The lines hold still while the days slide over them. */}
          <div className={styles.lines} aria-hidden="true">
            {Array.from({ length: 42 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
          <div className={styles.clip}>
          {monthGrid(p, live, live ? { key: `m${slides}` } : undefined)}
          {live &&
            leaving
              .filter((l) => l.page.view === "month")
              .map((out) =>
                monthGrid(out.page, false, {
                  key: `leaving${out.key}`,
                  className: styles.leaving,
                  leaving: out.dir,
                  style: { "--from-opacity": out.opacity, "--from-x": `${out.x}px` } as CSSProperties,
                  onAnimationEnd: () => setLeaving((list) => list.filter((l) => l.key !== out.key)),
                }),
              )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Week ---------- */

  const [slot, setSlot] = useState<{ day: string; half: number } | null>(null);

  function slotAt(event: { currentTarget: HTMLElement; clientY: number }) {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.min(47, Math.max(0, Math.floor(((event.clientY - box.top) / box.height) * 48)));
  }

  function weekDays(p: Page, live: boolean, extra?: { className?: string; style?: CSSProperties; key?: string; leaving?: 1 | -1; onAnimationEnd?: () => void }) {
    const days = Array.from({ length: p.days }, (_, i) => addDays(p.start, i));
    return (
      <div
        key={extra?.key}
        ref={live ? liveRef : undefined}
        aria-hidden={live ? undefined : true}
        inert={!live || undefined}
        className={`${styles.weekDays} ${extra?.className ?? ""}`}
        data-dir={live && dir ? dir : undefined}
        data-leaving={extra?.leaving}
        style={extra?.style}
        onAnimationEnd={
          extra?.onAnimationEnd
            ? (e) => {
                if (e.target === e.currentTarget && e.animationName.includes("fade")) extra.onAnimationEnd?.();
              }
            : undefined
        }
      >
        <div className={styles.weekHead} role={live ? "grid" : undefined} aria-label={live ? title(p) : undefined} onKeyDown={live ? onDaysKeyDown : undefined}>
          <div role={live ? "row" : undefined} className={styles.headRow}>
            {days.map((iso) => (
              <div key={iso} role={live ? "gridcell" : undefined} className={styles.dayHead}>
                <span className={styles.dayHeadName} aria-hidden="true">
                  {fmt.weekday.format(toTime(iso))}
                </span>
                {dayNumber(iso, live, onDay(iso).length)}
              </div>
            ))}
          </div>
          {hasBanners && (
            <div className={styles.allDayRow}>
              {days.map((iso) => {
                const items = onDay(iso).filter((it) => it.banner);
                const shown = items.length > 2 ? items.slice(0, 1) : items;
                const hidden = items.length - shown.length;
                return (
                  <div key={iso} className={styles.allDayCell}>
                    {shown.map((it) => chip(it, iso, live, live && iso === focused))}
                    {hidden > 0 && more(iso, items, hidden, live, live && iso === focused)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className={styles.columns}>
          {days.map((iso) => {
            const items = onDay(iso).filter((it) => !it.banner);
            const layout = pack(items);
            const mine = live && iso === focused;
            return (
              <div
                key={iso}
                className={styles.column}
                data-today={iso === today || undefined}
                data-slots={(live && Boolean(onSlotClick)) || undefined}
                onPointerMove={
                  live && onSlotClick
                    ? (e) => {
                        if (e.pointerType !== "mouse" || e.target !== e.currentTarget) return setSlot(null);
                        const half = slotAt(e);
                        if (slot?.day !== iso || slot.half !== half) setSlot({ day: iso, half });
                      }
                    : undefined
                }
                onPointerLeave={live && onSlotClick ? () => setSlot(null) : undefined}
                onClick={
                  live && onSlotClick
                    ? (e) => {
                        if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.slot) return;
                        const half = slotAt(e);
                        onSlotClick(`${iso}T${pad(Math.floor(half / 2))}:${half % 2 ? "30" : "00"}`);
                      }
                    : undefined
                }
              >
                {live && slot?.day === iso && (
                  <span className={styles.slot} data-slot="" style={{ "--start": slot.half * 30 } as CSSProperties} aria-hidden="true">
                    {clock(slot.half * 30)}
                  </span>
                )}
                {items.map((it) => {
                  const pos = layout.get(it.event.id) ?? { col: 0, left: 0, width: 1 };
                  const length = it.to - it.from;
                  const style = {
                    "--start": it.from,
                    "--length": length,
                    "--left": pos.left,
                    "--width": pos.width,
                    zIndex: pos.col || undefined,
                  } as CSSProperties;
                  const body = (
                    <>
                      <span className={length < 45 ? `${styles.eventTitle} ${styles.oneLine}` : styles.eventTitle}>{it.event.title}</span>
                      <span className={styles.eventTime}>{length >= 45 ? when(it) : clock(it.from)}</span>
                    </>
                  );
                  const common = {
                    className: styles.event,
                    "data-tone": it.event.tone ?? "neutral",
                    "data-short": length < 45 || undefined,
                    style,
                  };
                  return onEventClick && live ? (
                    <button
                      key={it.event.id}
                      type="button"
                      {...common}
                      tabIndex={mine ? 0 : -1}
                      aria-label={eventLabel(it)}
                      onClick={() => onEventClick(it.event)}
                    >
                      {body}
                    </button>
                  ) : (
                    <div key={it.event.id} {...common}>
                      {body}
                    </div>
                  );
                })}
                {iso === today && now && (
                  <span className={styles.now} style={{ "--start": now.min } as CSSProperties} aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function weekView(p: Page, live: boolean, scroll?: number) {
    const hours = Array.from({ length: 23 }, (_, i) => i + 1);
    return (
      <div
        ref={(node) => {
          if (live) scrollRef.current = node;
          else if (node && scroll !== undefined) node.scrollTop = scroll;
        }}
        className={styles.weekScroll}
        data-days={p.days}
        data-banners={hasBanners || undefined}
        style={{ "--days": p.days } as CSSProperties}
      >
        <div className={styles.weekGrid}>
          <div className={styles.gutterHead} data-banners={hasBanners || undefined}>
            {hasBanners && <span className={styles.allDayLabel}>All day</span>}
          </div>
          <div className={styles.hours} aria-hidden="true">
            {hours.map((h) => (
              <span key={h} className={styles.hour} style={{ "--start": h * 60 } as CSSProperties}>
                {clock(h * 60)}
              </span>
            ))}
          </div>
          <div className={styles.weekStage}>
            <div className={styles.weekLines} aria-hidden="true" data-banners={hasBanners || undefined}>
              {Array.from({ length: p.days }, (_, i) => (
                <span key={i} />
              ))}
            </div>
            <div className={styles.weekClip}>
            {weekDays(p, live, live ? { key: `w${slides}` } : undefined)}
            {live &&
              leaving
                .filter((l) => l.page.view === "week")
                .map((out) =>
                  weekDays(out.page, false, {
                    key: `leaving${out.key}`,
                    className: styles.leaving,
                    leaving: out.dir,
                    style: { "--from-opacity": out.opacity, "--from-x": `${out.x}px` } as CSSProperties,
                    onAnimationEnd: () => setLeaving((list) => list.filter((l) => l.key !== out.key)),
                  }),
                )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Day list (narrow month) ---------- */

  // The list crossfades when the day changes: the old one stays until it has faded.
  const [listDay, setListDay] = useState(focused);
  const [listLeaving, setListLeaving] = useState<{ day: string; key: number } | null>(null);
  if (listDay !== focused) {
    setListLeaving({ day: listDay, key: (listLeaving?.key ?? 0) + 1 });
    setListDay(focused);
  }

  const render = (p: Page, live: boolean, scroll?: number) => (p.view === "month" ? monthView(p, live) : weekView(p, live, scroll));

  return (
    <div
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-view={view}
      data-compact={compact || undefined}
      role="group"
      aria-label={ariaLabel}
      {...props}
    >
      <div className={styles.header}>
        <h2 className={styles.title} aria-live="polite">
          <TextMorph>{title(page)}</TextMorph>
        </h2>
        <div className={styles.controls}>
          <Button variant="secondary" onClick={() => go(today ?? todayIso(), false, today ?? todayIso())}>
            Today
          </Button>
          <div className={styles.nav}>
            <Button variant="ghost" aria-label={view === "month" ? "Previous month" : compact ? "Previous days" : "Previous week"} onClick={() => step(-1)}>
              <Icon name="chevron-left" className={styles.navIcon} />
            </Button>
            <Button variant="ghost" aria-label={view === "month" ? "Next month" : compact ? "Next days" : "Next week"} onClick={() => step(1)}>
              <Icon name="chevron-right" className={styles.navIcon} />
            </Button>
          </div>
          <SegmentedControl aria-label="View" value={view} onValueChange={(v) => changeView(v as CalendarView)} className={styles.views}>
            <Segment value="month">Month</Segment>
            <Segment value="week">Week</Segment>
          </SegmentedControl>
        </div>
      </div>
      <div className={styles.box}>
        <div key={`v${view}`} className={styles.view} data-entering={viewLeaving ? "" : undefined}>
          {render(page, true)}
        </div>
        {viewLeaving && (
          <div
            key={`vl${viewLeaving.key}`}
            className={styles.viewLeaving}
            aria-hidden="true"
            inert
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget) setViewLeaving(null);
            }}
          >
            {render(viewLeaving.page, false, viewLeaving.scroll)}
          </div>
        )}
      </div>
      <div className={styles.dayFold} data-folded={view !== "month" || undefined} inert={view !== "month" || undefined}>
        <AnimatedSize className={styles.dayList}>
          <section className={styles.dayListStack} aria-label={fmt.dayTitle.format(toTime(focused))}>
            <div key={focused} className={styles.dayListPage} data-entering={listLeaving ? "" : undefined}>
              <h3 className={styles.dayListTitle}>{fmt.dayTitle.format(toTime(focused))}</h3>
              {agenda(onDay(focused))}
            </div>
            {listLeaving && (
              <div
                key={`l${listLeaving.key}`}
                className={styles.dayListLeaving}
                aria-hidden="true"
                inert
                onAnimationEnd={(e) => {
                  if (e.target === e.currentTarget) setListLeaving(null);
                }}
              >
                <h3 className={styles.dayListTitle}>{fmt.dayTitle.format(toTime(listLeaving.day))}</h3>
                {agenda(onDay(listLeaving.day))}
              </div>
            )}
          </section>
        </AnimatedSize>
      </div>
    </div>
  );
}

