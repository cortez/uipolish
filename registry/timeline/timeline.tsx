"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { Avatar } from "../avatar/avatar";
import { Button } from "../button/button";
import { Icon, type IconName } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import { Tooltip } from "../tooltip/tooltip";
import styles from "./timeline.module.css";

export type TimelineTone = "neutral" | "accent" | "success" | "warning" | "danger";

export type TimelineAttachment = { name: string; href?: string; size?: number };

export type TimelineItem = {
  id: string;
  /** When it happened: "YYYY-MM-DDTHH:mm" local wall-clock text, a Date, or text with a zone. */
  at: string | Date;
  /** Who did it: "Maya". Leave out for something the system did. */
  actor?: string;
  /** What they did: "confirmed", "changed the guest count on". */
  action: string;
  /** What they did it to: "Friday supper for 12". */
  object?: string;
  /** A photo for the actor's avatar; their initials show without one. */
  avatar?: string;
  /** An icon in a dot instead of an avatar, for system events. */
  icon?: IconName;
  /** The icon dot's hue. */
  tone?: TimelineTone;
  /** A message they wrote, shown quoted. */
  quote?: string;
  /** A field that changed: "Guests 10 → 12". Numbers roll when the item arrives. */
  change?: { field: string; from: string | number; to: string | number };
  attachments?: TimelineAttachment[];
};

type TimelineProps = Omit<ComponentProps<"div">, "children"> & {
  /** Newest first. */
  items: TimelineItem[];
  /** `day` (default): under "Today", "Yesterday", "Nov 14". `none`: one list. */
  groupBy?: "day" | "none";
  /** `compact`: small markers and tighter rows, for a side panel. */
  variant?: "default" | "compact";
  /** Shows "Load earlier" at the end. */
  onLoadMore?: () => void;
  /** Earlier items are on their way: the button is busy and the feed `aria-busy`. */
  loading?: boolean;
  /** False once there's nothing earlier, and the button goes. */
  hasMore?: boolean;
  locale?: string;
};

/* ---------- Time ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

/** A moment as a local time stamp, from wall-clock text, a Date, or text with a zone. */
function toDate(value: string | Date) {
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  return new Date(value);
}

const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayIndex = (d: Date) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);

/** Server and browser ICU differ on thin and no-break spaces; plain ones read the same. */
const plain = (s: string) => s.replace(/[   ]/g, " ");

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ---------- Pieces ---------- */

/** "Guests 10 → 12". A change that arrives while the feed is open counts up from the old value. */
function Change({ field, from, to, roll }: { field: string; from: string; to: string; roll: boolean }) {
  const [shown, setShown] = useState(roll ? from : to);
  useEffect(() => {
    if (shown === to) return;
    // Once the row has slid in, so the roll is seen and not lost in the arrival.
    const timer = window.setTimeout(() => setShown(to), 160);
    return () => window.clearTimeout(timer);
  }, [shown, to]);
  return (
    <p className={styles.change}>
      <span className={styles.field}>{field}</span>
      <span className={styles.from}>
        <del>{from}</del>
      </span>
      <Icon name="arrow-right" className={styles.arrow} aria-hidden="true" />
      <span className={styles.srOnly}>to</span>
      <span className={styles.to}>
        <TextMorph>{shown}</TextMorph>
      </span>
    </p>
  );
}

/** An activity feed: who did what, when, grouped by day, newest first. */
export function Timeline({
  items,
  groupBy = "day",
  variant = "default",
  onLoadMore,
  loading = false,
  hasMore = true,
  locale,
  className,
  "aria-label": ariaLabel = "Activity",
  ...props
}: TimelineProps) {
  // The clock moves relative times on; read at render, then every 30 seconds.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const fmt = useMemo(
    () => ({
      relative: new Intl.RelativeTimeFormat(locale, { numeric: "auto" }),
      time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }),
      full: new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
      day: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
      dayYear: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }),
    }),
    [locale],
  );

  /** "Just now", "12 minutes ago", "3 hours ago" today; the clock time on earlier days, whose heading says the day. */
  function relative(d: Date) {
    const minutes = Math.round((now - d.getTime()) / 60_000);
    const sameDay = dayKey(d) === dayKey(new Date(now));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return plain(fmt.relative.format(-minutes, "minute"));
    if (sameDay || minutes < 6 * 60) return plain(fmt.relative.format(-Math.round(minutes / 60), "hour"));
    return plain(fmt.time.format(d));
  }

  function heading(d: Date) {
    const ago = dayIndex(new Date(now)) - dayIndex(d);
    if (ago === 0 || ago === 1) {
      const word = fmt.relative.format(-ago, "day");
      return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
    }
    return plain((d.getFullYear() === new Date(now).getFullYear() ? fmt.day : fmt.dayYear).format(d));
  }

  const rows = useMemo(() => items.map((item) => ({ item, date: toDate(item.at) })), [items]);
  const groups = useMemo(() => {
    const out: { key: string; date: Date; rows: typeof rows }[] = [];
    for (const row of rows) {
      const key = groupBy === "day" ? dayKey(row.date) : "all";
      const last = out.at(-1);
      if (last && last.key === key) last.rows.push(row);
      else out.push({ key, date: row.date, rows: [row] });
    }
    return out;
  }, [rows, groupBy]);

  /* ---------- Arrivals ---------- */

  // Items there on the first render are old news: they don't animate in.
  // One that arrives above an item already shown is new news: it slides in
  // and rolls its numbers. One that arrives below is earlier history: it
  // only fades in. Kept per item, so a later render doesn't change it.
  const [known, setKnown] = useState(() => ({ ids: new Set(items.map((i) => i.id)), kinds: new Map<string, "top" | "end">() }));
  if (items.some((i) => !known.ids.has(i.id))) {
    const firstOld = items.findIndex((i) => known.ids.has(i.id));
    const ids = new Set(known.ids);
    const kinds = new Map(known.kinds);
    items.forEach((i, at) => {
      if (ids.has(i.id)) return;
      kinds.set(i.id, firstOld !== -1 && at < firstOld ? "top" : "end");
      ids.add(i.id);
    });
    setKnown({ ids, kinds });
  }

  const [announce, setAnnounce] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const tops = useRef(new Map<string, number>());
  const signature = items.map((i) => i.id).join("|") + groupBy + variant;

  // FLIP: whatever an arrival pushes down starts where it was and moves to
  // its place on the move spring, interrupted or not, from where it visibly is.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const feed = feedRef.current;
    if (!root || !feed) return;
    // Page coordinates, not the feed's: a feed that's centred in its box
    // moves as it grows, and what it carries should glide, not jump.
    const base = -window.scrollY;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const style = getComputedStyle(feed);
    const ms = (name: string, fallback: number) => {
      const v = style.getPropertyValue(name).trim();
      const n = parseFloat(v);
      return Number.isNaN(n) ? fallback : v.endsWith("ms") ? n : n * 1000;
    };
    const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    const move = { duration: ms("--ui-dur-move", 380), easing: token("--ui-ease-move", "ease-out") };
    const enter = token("--ui-ease-enter", "ease-out");
    const first = tops.current.size === 0;
    const next = new Map<string, number>();
    let arrivals = 0;
    let latest = "";
    for (const el of root.querySelectorAll<HTMLElement>("[data-flip]")) {
      const key = el.dataset.flip!;
      const rect = el.getBoundingClientRect();
      // Where an earlier move still has it, so a new one starts from there.
      const offset = parseFloat(getComputedStyle(el).translate.split(" ")[1] ?? "0") || 0;
      const top = rect.top - base - offset;
      next.set(key, top);
      const was = tops.current.get(key);
      if (was === undefined) {
        if (first) continue;
        // New news slides down into place as it fades in, on the base step;
        // earlier history and a new day's heading only fade, on the fast one.
        const top = el.dataset.arriving === "top";
        if (top && arrivals++ === 0) latest = el.querySelector("p")?.textContent ?? "";
        const slide = top && !reduce;
        el.animate(
          slide ? { opacity: [0, 1], translate: ["0 -6px", "0 0"] } : { opacity: [0, 1] },
          { duration: ms(top ? "--ui-dur-base" : "--ui-dur-fast", 200), easing: enter, id: "enter", fill: "backwards" },
        );
        continue;
      }
      const delta = was + offset - top;
      if (Math.abs(delta) < 0.5 || reduce) {
        if (reduce) el.getAnimations().forEach((a) => a.id === "flip" && a.cancel());
        continue;
      }
      el.getAnimations().forEach((a) => a.id === "flip" && a.cancel());
      el.animate({ translate: [`0 ${delta}px`, "0 0"] }, { ...move, id: "flip" });
    }
    tops.current = next;
    // Says what arrived, so a second update in a row is read too.
    if (arrivals > 0) setAnnounce(arrivals === 1 ? `New: ${latest}` : `${arrivals} new updates. Latest: ${latest}`);
    // Only when the list itself changed, not as the clock ticks.
  }, [signature]);

  /** ARIA feed keys: PageDown and PageUp move between items. */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "PageDown" && event.key !== "PageUp") return;
    const articles = [...(feedRef.current?.querySelectorAll<HTMLElement>("article") ?? [])];
    const at = articles.findIndex((a) => a.contains(document.activeElement));
    if (at === -1) return;
    const to = articles[at + (event.key === "PageDown" ? 1 : -1)];
    if (!to) return;
    event.preventDefault();
    to.focus();
  }

  const compact = variant === "compact";
  let index = -1;

  return (
    <div ref={rootRef} className={className ? `${styles.root} ${className}` : styles.root} data-variant={variant} {...props}>
      <div ref={feedRef} role="feed" aria-label={ariaLabel} aria-busy={loading || undefined} className={styles.feed} onKeyDown={onKeyDown}>
        {groups.map((group) => (
          <div key={group.key} className={styles.group}>
            {groupBy === "day" && (
              <h3 className={styles.heading} data-flip={`h:${group.key}`} suppressHydrationWarning>
                {heading(group.date)}
              </h3>
            )}
            {group.rows.map(({ item, date }) => {
              index++;
              const arrival = known.kinds.get(item.id);
              const textId = `${item.id}-text`;
              return (
                <article
                  key={item.id}
                  className={styles.item}
                  data-flip={`i:${item.id}`}
                  data-arriving={arrival}
                  tabIndex={0}
                  aria-posinset={index + 1}
                  aria-setsize={hasMore && onLoadMore ? -1 : items.length}
                  aria-labelledby={textId}
                >
                  <span className={styles.marker} aria-hidden="true">
                    {item.icon ? (
                      <span className={styles.dot} data-tone={item.tone ?? "neutral"}>
                        <Icon name={item.icon} />
                      </span>
                    ) : (
                      <Avatar name={item.actor} src={item.avatar} size={compact ? 20 : 32} initials={compact ? 1 : 2} decorative />
                    )}
                  </span>
                  <div className={styles.content}>
                    <div className={styles.line}>
                      <p id={textId} className={styles.text}>
                        {item.actor && <span className={styles.actor}>{item.actor}</span>} <span className={styles.action}>{item.action}</span>
                        {item.object && (
                          <>
                            {" "}
                            <span className={styles.object}>{item.object}</span>
                          </>
                        )}
                      </p>
                      <Tooltip content={plain(fmt.full.format(date))} side="top" align="end">
                        <time className={styles.time} dateTime={date.toISOString()} suppressHydrationWarning>
                          {relative(date)}
                        </time>
                      </Tooltip>
                    </div>
                    {item.quote && <blockquote className={styles.quote}>{item.quote}</blockquote>}
                    {item.change && (
                      <Change
                        field={item.change.field}
                        from={String(item.change.from)}
                        to={String(item.change.to)}
                        roll={arrival === "top"}
                      />
                    )}
                    {item.attachments && item.attachments.length > 0 && (
                      <ul className={styles.attachments} aria-label="Attachments">
                        {item.attachments.map((file) => {
                          const body = (
                            <>
                              <Icon name="file" className={styles.fileIcon} />
                              <span className={styles.fileName}>{file.name}</span>
                              {file.size !== undefined && <span className={styles.fileSize}>{formatSize(file.size)}</span>}
                            </>
                          );
                          return (
                            <li key={file.name}>
                              {file.href ? (
                                <a className={styles.file} href={file.href} target="_blank" rel="noreferrer">
                                  {body}
                                </a>
                              ) : (
                                <span className={styles.file}>{body}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>
      {onLoadMore && hasMore && (
        <div className={styles.more} data-flip="more">
          <Button variant="secondary" busy={loading} busyLabel="Loading earlier…" onClick={onLoadMore}>
            Load earlier
          </Button>
        </div>
      )}
      <span role="status" className={styles.srOnly}>
        {announce}
      </span>
    </div>
  );
}
