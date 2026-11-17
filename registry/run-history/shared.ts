import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ---------- Data ---------- */

export type RunStatus = "running" | "succeeded" | "failed" | "cancelled";
export type RunTrigger = "user" | "schedule" | "webhook";

/** One row of the table: what a list endpoint returns. */
export type RunSummary = {
  /** Shown in mono and copied as is: "run_8fK2c1". */
  id: string;
  /** Which agent ran: "Menu planner". */
  agent: string;
  /** What it was asked, in a line: "Draft Saturday’s harvest supper menu". */
  title: string;
  status: RunStatus;
  trigger: RunTrigger;
  /** Who or what started it: "Maya Chen", "Mondays at 09:00", "Stripe · checkout.session.completed". */
  triggeredBy?: string;
  /** ISO date-time. */
  startedAt: string;
  /** Leave out while running: the block counts up from `startedAt`. */
  durationMs?: number;
  /** Input and output tokens so far. */
  tokens: number;
  /** In currency units, so far. */
  cost: number;
  /** `failed`: one line on what went wrong, shown under the title. */
  error?: string;
};

export type RunStepKind = "llm" | "tool";
/** `retried`: this attempt failed and a later one took over. */
export type RunStepStatus = "running" | "succeeded" | "failed" | "retried" | "cancelled";

export type RunStep = {
  id: string;
  kind: RunStepKind;
  /** A model call names its job ("Plan the courses"); a tool call its function ("search_pantry"). */
  name: string;
  status: RunStepStatus;
  /** Ms from the run's start. */
  startMs: number;
  /** Leave out while running. */
  durationMs?: number;
  /** `llm`: the model. */
  model?: string;
  /** 2 for the first retry, and so on. */
  attempt?: number;
  /** The prompt or the tool's arguments. JSON is pretty-printed. */
  input?: string;
  /** The completion or the tool's result. */
  output?: string;
  /** What went wrong, in the service's words. */
  error?: string;
  tokens?: { input: number; output: number; cached?: number };
  cost?: number;
};

export type RunOutput = {
  /** What the run produced. */
  text: string;
  /** `json` shows it in a code block; `text` as wrapped prose. Default `text`. */
  format?: "text" | "json";
};

/** Everything the detail view needs, loaded when a run is opened. */
export type RunDetail = {
  /** The run's id; the detail shows only when it matches the selected run. */
  id: string;
  /** The run's row, for a run opened from a link that isn't on the current page. */
  run?: RunSummary;
  steps: RunStep[];
  output?: RunOutput;
  /** `cancelled`: who stopped it, as a sentence: "Cancelled by Maya Chen." */
  cancelNote?: string;
};

export type RunRange = "1h" | "24h" | "7d" | "30d" | "all" | "custom";

export type RunFilters = {
  query: string;
  status: RunStatus | "all";
  /** An agent name from `agents`, or "all". */
  agent: string;
  trigger: RunTrigger | "all";
  range: RunRange;
  /** `custom`: ISO dates, inclusive. */
  from?: string;
  to?: string;
};

export const DEFAULT_FILTERS: RunFilters = { query: "", status: "all", agent: "all", trigger: "all", range: "7d" };

/** A callback's result: return a promise to show busy until it settles; a rejection shows its message. */
export type Result = void | Promise<unknown>;

/* ---------- Helpers ---------- */

export function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

export function isPromise(value: unknown): value is Promise<unknown> {
  return !!value && typeof (value as Promise<unknown>).then === "function";
}

export function messageOf(reason: unknown, fallback: string) {
  if (typeof reason === "string" && reason) return reason;
  if (reason instanceof Error && reason.message) return reason.message;
  return fallback;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return n === 1 ? one : many;
}

/** The same string with every digit as an 8: the widest a number of that shape gets. */
export const widest = (s: string) => s.replace(/\d/g, "8");

export function isFiltered(f: RunFilters) {
  return (
    f.query.trim() !== "" ||
    f.status !== DEFAULT_FILTERS.status ||
    f.agent !== DEFAULT_FILTERS.agent ||
    f.trigger !== DEFAULT_FILTERS.trigger ||
    f.range !== DEFAULT_FILTERS.range
  );
}

export type Formatters = {
  /** 842 → "842ms", 4210 → "4.2s", 38000 → "38s", 134000 → "2m 14s". */
  duration: (ms: number) => string;
  /** 842 → "842", 12400 → "12.4k", 1200000 → "1.2M". */
  tokens: (n: number) => string;
  /** Every digit: 12,431. */
  number: (n: number) => string;
  /** Three decimals under 10: "$0.041". */
  cost: (n: number) => string;
  /** "Today, 14:02", "Yesterday, 18:40", "Oct 28, 09:00". */
  when: (iso: string) => string;
  /** "Nov 3, 2026, 14:02:11". */
  full: (iso: string) => string;
  /** "14:02:11". */
  clock: (iso: string) => string;
};

const DAY = 86_400_000;

export function useFormatters(locale: string, currency: string, timeZone: string, now: number): Formatters {
  return useMemo(() => {
    const cost3 = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 3, maximumFractionDigits: 3 });
    const cost2 = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const number = new Intl.NumberFormat(locale);
    const compact = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
    const seconds = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone });
    const day = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone });
    const full = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone });
    const ymd = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone });
    const dayKey = (t: number) => ymd.format(t);
    const today = dayKey(now);
    const yesterday = dayKey(now - DAY);
    return {
      duration: (ms) => {
        if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
        const s = ms / 1000;
        if (s < 10) return `${(Math.floor(s * 10) / 10).toFixed(1)}s`;
        const whole = Math.floor(s);
        if (whole < 60) return `${whole}s`;
        const m = Math.floor(whole / 60);
        if (m < 60) return `${m}m ${String(whole % 60).padStart(2, "0")}s`;
        return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
      },
      tokens: (n) => {
        if (n < 1000) return number.format(n);
        if (n < 1_000_000) return `${compact.format(n / 1000)}k`;
        return `${compact.format(n / 1_000_000)}M`;
      },
      number: (n) => number.format(n),
      cost: (n) => (n < 10 ? cost3 : cost2).format(n),
      when: (iso) => {
        const t = Date.parse(iso);
        const key = dayKey(t);
        const prefix = key === today ? "Today" : key === yesterday ? "Yesterday" : day.format(t);
        return `${prefix}, ${time.format(t)}`;
      },
      full: (iso) => full.format(Date.parse(iso)),
      clock: (iso) => seconds.format(Date.parse(iso)),
    };
  }, [locale, currency, timeZone, now]);
}

/** One polite region for the whole screen. */
export function useAnnouncer() {
  const [text, setText] = useState("");
  const said = useRef(0);
  const announce = useCallback((line: string) => {
    // A zero-width space on every other message, so saying the same thing twice is heard twice.
    setText(line + (said.current++ % 2 ? "​" : ""));
  }, []);
  return { text, announce };
}

/** Runs a callback that may return a promise: busy while it's pending, the message when it fails. */
export function useAction<T = unknown>() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => T | Promise<T> | void, fallback: string): Promise<{ ok: boolean; value?: T }> => {
    setError(null);
    let result: T | Promise<T> | void;
    try {
      result = fn();
    } catch (reason) {
      setError(messageOf(reason, fallback));
      return { ok: false };
    }
    if (!isPromise(result)) return { ok: true, value: result as T };
    setBusy(true);
    try {
      return { ok: true, value: await result };
    } catch (reason) {
      setError(messageOf(reason, fallback));
      return { ok: false };
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}

/** `Date.now()`, ticking every `ms` while `on`. Starts from `initial` so server and browser agree. */
export function useNow(on: boolean, initial: number, ms = 1000) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    if (!on) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, ms);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [on, ms]);
  return now;
}

/** A run's duration: final when it has one, counting while it runs. */
export function elapsedOf(run: Pick<RunSummary, "startedAt" | "durationMs">, now: number) {
  return run.durationMs ?? Math.max(0, now - Date.parse(run.startedAt));
}

/** Copies text; resolves false where the clipboard is blocked. */
export async function copyText(text: string) {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
