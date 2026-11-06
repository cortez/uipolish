"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Align, Side } from "../popover/popover";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { Icon, type IconName } from "../icons/icons";
import { Popover } from "../popover/popover";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./usage-meter.module.css";

export type UsageKind = "tokens" | "money";
export type UsageTone = "calm" | "warning" | "danger";

export type UsageSegment = {
  id: string;
  /** What the usage is: "Files", "Conversation". */
  label: string;
  /** In the same unit as `used`. */
  value: number;
};

export type UsageThresholds = {
  /** Fraction of `limit` where the warning starts. Default 0.75. */
  warning: number;
  /** Fraction of `limit` where the danger tone starts. Default 0.95. */
  danger: number;
};

/** Controlled. Leave it undefined while nothing has been compacted. */
export type UsageCompaction =
  | { status: "running" }
  | { status: "done"; before: number; after: number }
  | { status: "failed"; error?: string };

export type UsageProps = {
  used: number;
  limit: number;
  /** `tokens` formats as 124k and 1.2M; `money` formats with `currency`. */
  kind?: UsageKind;
  /** What the usage is made of. Anything `used` has beyond their sum shows as "Other". */
  segments?: UsageSegment[];
  thresholds?: Partial<UsageThresholds>;
  /** Names the meter. Defaults to "Context window", or "Budget" for money. */
  label?: string;
  /** Who uses it, for the default messages: "Copper". */
  agent?: string;
  /** Said after the limit for money: "today", "this month". */
  period?: string;
  /** ISO 4217 code for money. Default "USD". */
  currency?: string;
  /** Fixed so server and browser format numbers alike. */
  locale?: string;
  /** Replaces the built-in number formatting. */
  format?: (value: number) => string;
  /** One line per tone, replacing the defaults. */
  messages?: Partial<Record<UsageTone, string>>;
  /** Shows an action from the warning tone up. */
  onCompact?: () => void;
  compactLabel?: string;
  compaction?: UsageCompaction;
};

type UsageMeterProps = UsageProps & {
  /** The small mark beside the percentage. */
  indicator?: "ring" | "bar";
  side?: Side;
  align?: Align;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

type UsageBreakdownProps = UsageProps & {
  className?: string;
  /** Off inside UsageMeter, which announces from outside the popover. */
  announce?: boolean;
  /** Set by UsageMeter so the popover is named by the title and figure. */
  titleId?: string;
  figureId?: string;
};

const DEFAULT_THRESHOLDS: UsageThresholds = { warning: 0.75, danger: 0.95 };
const RANK: Record<UsageTone, number> = { calm: 0, warning: 1, danger: 2 };
const TONE_ICON: Record<UsageTone, IconName> = { calm: "info", warning: "warning", danger: "alert" };
const OTHER = "\u0000other";

function tokens(value: number, locale: string) {
  const number = (v: number, digits: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(v);
  const size = Math.abs(value);
  if (size < 1000) return number(value, 0);
  // Rounded first, so 999,600 reads "1M", not "1,000k".
  let scaled = value / 1000;
  let suffix = "k";
  if (Math.round(Math.abs(scaled)) >= 1000) {
    scaled = value / 1_000_000;
    suffix = "M";
  }
  return number(scaled, Math.abs(scaled) < 10 ? 1 : 0) + suffix;
}

function useFormat(kind: UsageKind, locale: string, currency: string, format?: (value: number) => string) {
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency }), [locale, currency]);
  const exact = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  return {
    short: format ?? ((v: number) => (kind === "money" ? money.format(v) : tokens(v, locale))),
    /** For screen readers: 124,000, not 124k. */
    full: kind === "money" ? (v: number) => money.format(v) : (v: number) => exact.format(Math.round(v)),
  };
}

function read({ used, limit, thresholds }: Pick<UsageProps, "used" | "limit" | "thresholds">) {
  const safeUsed = Number.isFinite(used) ? Math.max(used, 0) : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 0;
  const fraction = safeLimit ? safeUsed / safeLimit : 0;
  const warning = thresholds?.warning ?? DEFAULT_THRESHOLDS.warning;
  const danger = Math.max(thresholds?.danger ?? DEFAULT_THRESHOLDS.danger, warning);
  const tone: UsageTone = fraction >= danger ? "danger" : fraction >= warning ? "warning" : "calm";
  // Floored, so it never says 100% before it is; any use at all shows at least 1%.
  const percent = safeUsed <= 0 ? 0 : fraction >= 1 ? 100 : Math.min(99, Math.max(1, Math.floor(fraction * 100)));
  return { used: safeUsed, limit: safeLimit, fraction: Math.min(fraction, 1), full: fraction >= 1, tone, percent };
}

function defaultMessage(tone: UsageTone, full: boolean, kind: UsageKind, agent: string, limitText: string, leftText: string, period?: string) {
  if (kind === "money") {
    if (tone === "calm") return `${leftText} left${period ? ` ${period}` : ""}.`;
    if (full) return `Budget reached. ${agent} is paused until it resets or you raise it.`;
    return `${tone === "danger" ? "Only " : ""}${leftText} left. ${agent} pauses when it reaches ${limitText}.`;
  }
  if (tone === "calm") return `${agent} can see the whole conversation.`;
  if (full) return `Full. ${agent} is forgetting the oldest messages.`;
  return `${tone === "danger" ? "Nearly full. " : ""}${agent} will start forgetting the oldest messages at ${limitText}.`;
}

function useUsage(props: UsageProps) {
  const { kind = "tokens", locale = "en-US", currency = "USD", agent = "The agent", period, messages, format } = props;
  const state = read(props);
  const fmt = useFormat(kind, locale, currency, format);
  const label = props.label ?? (kind === "money" ? "Budget" : "Context window");
  const limitText = fmt.short(state.limit);
  const left = Math.max(state.limit - state.used, 0);
  const unit = kind === "money" ? (period ?? "") : "tokens";
  const message =
    messages?.[state.tone] ?? defaultMessage(state.tone, state.full, kind, agent, limitText, fmt.short(left), period);
  const valueText = `${fmt.full(state.used)} of ${fmt.full(state.limit)}${unit ? ` ${unit}` : ""}, ${state.percent}%`;
  return { ...state, kind, fmt, label, limitText, left, unit, message, valueText };
}

/** Says threshold crossings and compaction results, nothing else, so streaming stays quiet. */
function useAnnouncement(usage: ReturnType<typeof useUsage>, compaction: UsageCompaction | undefined) {
  const [text, setText] = useState("");
  const said = useRef(0);
  const last = useRef({ rank: RANK[usage.tone], status: compaction?.status });
  const rank = RANK[usage.tone];
  const status = compaction?.status;
  const { label, percent, message, fmt, unit } = usage;
  const before = compaction?.status === "done" ? compaction.before : 0;
  const after = compaction?.status === "done" ? compaction.after : 0;
  const error = compaction?.status === "failed" ? compaction.error : undefined;

  useEffect(() => {
    const prev = last.current;
    last.current = { rank, status };
    let next: string | null = null;
    if (status !== prev.status && status === "done") {
      next = `Compacted from ${fmt.short(before)} to ${fmt.short(after)} ${unit}.`;
    } else if (status !== prev.status && status === "failed") {
      next = error ?? "Couldn’t compact the conversation. Nothing was lost.";
    } else if (rank > prev.rank) {
      next = `${label} ${percent}% used. ${message}`;
    }
    if (next === null) return;
    // A zero-width space on every other message, so saying the same thing twice is heard twice.
    const line = next + (said.current++ % 2 ? "\u200b" : "");
    // Set a frame later, outside the commit, so the change lands in a region that already exists.
    const frame = requestAnimationFrame(() => setText(line));
    return () => cancelAnimationFrame(frame);
    // Only a crossing or a new result speaks; the figures it quotes don't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank, status]);

  return text;
}

/** Fixed width for a changing figure: the widest text it shows sits underneath, hidden. */
function Reserve({ widest, children, className }: { widest: string; children: ReactNode; className?: string }) {
  return (
    <span className={className ? `${styles.reserve} ${className}` : styles.reserve}>
      <span className={styles.sizer} aria-hidden="true">
        {widest}
      </span>
      <span className={styles.reserved}>{children}</span>
    </span>
  );
}

function springPoints(el: Element) {
  const raw = getComputedStyle(el).getPropertyValue("--ui-ease-glide").trim();
  const points = raw.startsWith("linear(") ? raw.slice(7, -1).split(",").map((p) => parseFloat(p)) : [];
  return points.length > 1 && points.every(Number.isFinite) ? points : null;
}

function ease(points: number[] | null, t: number) {
  if (!points) return 1 - Math.pow(1 - t, 5);
  const at = t * (points.length - 1);
  const i = Math.min(Math.floor(at), points.length - 2);
  return points[i] + (points[i + 1] - points[i]) * (at - i);
}

/** The compacted figure counts down from where it was, on the same spring as the bar. */
function CountDown({ from, to, format }: { from: number; to: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const formatRef = useRef(format);
  useLayoutEffect(() => {
    formatRef.current = format;
  });

  useLayoutEffect(() => {
    const el = ref.current;
    const node = el?.firstChild;
    if (!el || !node || node.nodeType !== Node.TEXT_NODE || from === to) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Writes the text node React rendered, so React's own updates still land on it.
    const write = (v: number) => (node.nodeValue = formatRef.current(v));
    const raw = getComputedStyle(el).getPropertyValue("--ui-dur-glide").trim();
    const duration = (raw.endsWith("ms") ? parseFloat(raw) : parseFloat(raw) * 1000) || 320;
    const points = springPoints(el);
    const start = performance.now();
    let frame = 0;
    write(from);
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      write(from + (to - from) * ease(points, t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      write(to);
    };
  }, [from, to]);

  return (
    <span ref={ref} className={styles.count}>
      {format(to)}
    </span>
  );
}

/** The breakdown: figure, segmented bar, legend, what happens next and what to do. */
export function UsageBreakdown({ className, announce = true, titleId, figureId, ...props }: UsageBreakdownProps) {
  const { segments = [], onCompact, compactLabel = "Compact conversation", compaction } = props;
  const usage = useUsage(props);
  const { fmt, tone, unit } = usage;
  const ownId = useId();
  const title = titleId ?? `${ownId}-title`;
  const figure = figureId ?? `${ownId}-figure`;
  const resultRef = useRef<HTMLParagraphElement>(null);
  const announcement = useAnnouncement(usage, compaction);

  // The bar's scale: the limit, or what's used once it's gone over.
  const scale = Math.max(usage.limit, usage.used) || 1;
  const listed = segments.length > 0;
  const parts = segments.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const counted = parts.reduce((sum, s) => sum + s.value, 0);
  const rest = usage.used - counted;
  const other = { id: OTHER, label: listed ? "Other" : "Used", value: rest };
  const shown = rest >= scale / 1000 ? [...parts, other] : parts;
  const bars = shown.map((s, i) => {
    const start = Math.min(shown.slice(0, i).reduce((sum, p) => sum + p.value, 0) / scale, 1);
    return { ...s, start, end: Math.min(start + s.value / scale, 1) };
  });
  // Where the free track starts.
  const usedEnd = bars.length ? bars[bars.length - 1].end : 0;

  const status = compaction?.status;
  const running = status === "running";
  const failed = status === "failed";
  const done = compaction?.status === "done" && tone === "calm" ? compaction : null;
  const showAction = !!onCompact && !done && (tone !== "calm" || running || failed);

  // The button that had focus is replaced by the result; focus follows it.
  const wasRunning = useRef(running);
  useLayoutEffect(() => {
    const active = document.activeElement;
    const lost = !active || active === document.body;
    if (wasRunning.current && done && lost) resultRef.current?.focus({ preventScroll: true });
    wasRunning.current = running;
  }, [running, done]);

  return (
    <section
      className={className ? `${styles.breakdown} ${className}` : styles.breakdown}
      data-tone={tone}
      aria-labelledby={title}
    >
      <div className={styles.head}>
        <span id={title} className={styles.title}>
          {usage.label}
        </span>
        <p id={figure} className={styles.figure}>
          <span className={styles.srOnly}>{usage.valueText}</span>
          <span className={styles.figureLine} aria-hidden="true">
            {/* Not reserved: the words after it ride the morph's width spring instead of a gap. */}
            <span className={styles.used}>
              <TextMorph>{fmt.short(usage.used)}</TextMorph>
            </span>
            <span className={styles.of}>
              of {usage.limitText}
              {unit ? ` ${unit}` : ""}
            </span>
            <Reserve widest="100%" className={styles.percent}>
              <TextMorph>{`${usage.percent}%`}</TextMorph>
            </Reserve>
          </span>
        </p>
      </div>

      <div
        role="meter"
        aria-labelledby={title}
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={Math.min(usage.used, usage.limit)}
        aria-valuetext={usage.valueText}
        className={styles.bar}
        style={{ "--used": usedEnd } as CSSProperties}
      >
        {bars.map((b, i) => (
          <span
            key={b.id}
            className={styles.segment}
            data-index={!listed ? "used" : b.id === OTHER ? "other" : i}
            data-last={i === bars.length - 1 || undefined}
            data-full={usedEnd >= 1 || undefined}
            style={{ "--start": b.start, "--end": b.end } as CSSProperties}
          />
        ))}
      </div>

      {listed && (
        <ul className={styles.legend} aria-label={`What’s using the ${usage.label.toLocaleLowerCase()}`}>
          {bars.map((b, i) => (
            <li key={b.id} className={styles.item}>
              <span className={styles.swatch} data-index={b.id === OTHER ? "other" : i} aria-hidden="true" />
              <span className={styles.name}>{b.label}</span>
              <span className={styles.amount}>
                <TextMorph>{fmt.short(b.value)}</TextMorph>
              </span>
            </li>
          ))}
          <li className={styles.item} data-free>
            <span className={styles.swatch} data-free aria-hidden="true" />
            <span className={styles.name}>{usage.kind === "money" ? "Left" : "Free"}</span>
            <span className={styles.amount}>
              <TextMorph>{fmt.short(usage.left)}</TextMorph>
            </span>
          </li>
        </ul>
      )}

      <AnimatedSize>
        <div className={styles.status}>
          {done ? (
            <p key="result" ref={resultRef} tabIndex={-1} className={styles.result} data-enter>
              <Icon name="check-circle" />
              <span>
                Compacted:{" "}
                <span className={styles.figures}>
                  {fmt.short(done.before)} →{" "}
                  <Reserve widest={fmt.short(done.before)} className={styles.countBox}>
                    <CountDown from={done.before} to={done.after} format={fmt.short} />
                  </Reserve>
                </span>
              </span>
            </p>
          ) : (
            <p key={tone} className={styles.message} data-enter={tone !== "calm" || undefined}>
              <Icon name={TONE_ICON[tone]} />
              <span>{usage.message}</span>
            </p>
          )}

          {compaction?.status === "failed" && (
            <p className={styles.error}>
              {compaction.error ?? "Couldn’t compact the conversation. Nothing was lost; try again."}
            </p>
          )}

          {showAction && (
            <Button
              className={styles.action}
              variant={tone === "danger" && !running ? "primary" : "secondary"}
              busy={running}
              busyLabel="Compacting…"
              onClick={onCompact}
            >
              {failed ? "Try again" : compactLabel}
            </Button>
          )}
        </div>
      </AnimatedSize>

      {announce && (
        <span role="status" className={styles.srOnly}>
          {announcement}
        </span>
      )}
    </section>
  );
}

/** A small ring and percentage for a toolbar; opens to the breakdown. */
export function UsageMeter({
  indicator = "ring",
  side = "top",
  align = "start",
  open,
  defaultOpen,
  onOpenChange,
  className,
  ...props
}: UsageMeterProps) {
  const usage = useUsage(props);
  const id = useId();
  const titleId = `${id}-title`;
  const figureId = `${id}-figure`;
  const announcement = useAnnouncement(usage, props.compaction);
  const state = usage.tone === "danger" ? (usage.full ? ", full" : ", nearly full") : usage.tone === "warning" ? ", running low" : "";

  return (
    <span className={className ? `${styles.root} ${className}` : styles.root}>
      <Popover
        labelledBy={`${titleId} ${figureId}`}
        side={side}
        align={align}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        className={styles.panel}
        trigger={
          <button
            type="button"
            className={styles.trigger}
            data-tone={usage.tone}
            aria-label={`${usage.label}: ${usage.percent}% used${state}`}
          >
            {indicator === "ring" ? (
              <svg className={styles.ring} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                <circle className={styles.ringTrack} cx="8" cy="8" r="6" />
                <circle
                  className={styles.ringArc}
                  cx="8"
                  cy="8"
                  r="6"
                  pathLength={100}
                  data-empty={usage.used <= 0 || undefined}
                  style={{ strokeDashoffset: 100 - usage.fraction * 100 }}
                />
              </svg>
            ) : (
              <span
                className={styles.miniBar}
                aria-hidden="true"
                style={{ "--usage": usage.fraction } as CSSProperties}
              />
            )}
            <Reserve widest="100%" className={styles.triggerPercent}>
              <TextMorph>{`${usage.percent}%`}</TextMorph>
            </Reserve>
          </button>
        }
      >
        <UsageBreakdown {...props} announce={false} titleId={titleId} figureId={figureId} />
      </Popover>
      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </span>
  );
}
