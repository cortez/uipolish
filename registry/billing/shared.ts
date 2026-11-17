import { useCallback, useMemo, useRef, useState } from "react";

/* ---------- Data ---------- */

export type BillingInterval = "month" | "year";

export type BillingPlan = {
  id: string;
  /** "Team". The product name is yours to add in `description` or the title. */
  name: string;
  /** One line on who it's for: "For a supper club with a few hosts". */
  description?: string;
  /** In currency units, per seat unless `perSeat` is false. `year` is the price of a whole year. */
  price: { month: number; year: number };
  /** Default true: the price is multiplied by the subscription's seats. */
  perSeat?: boolean;
  /** What it includes, in the order to list them. A downgrade lists the ones the new plan doesn't have. */
  features: string[];
};

export type BillingStatus = "trialing" | "active" | "past_due" | "canceled";

export type BillingSubscription = {
  /** The id of a plan in `plans`. */
  planId: string;
  interval: BillingInterval;
  status: BillingStatus;
  /** Seats paid for. */
  seats: number;
  /** Seats taken by people. */
  seatsUsed?: number;
  /** The current period, as ISO dates ("2026-11-01"). It renews, or ends, on `periodEnd`. */
  periodStart: string;
  periodEnd: string;
  /** `trialing`: the day the trial ends and the first charge runs. */
  trialEnd?: string;
  /** `canceled`: the last day of access. Default `periodEnd`. */
  cancelAt?: string;
  /** `past_due`: what's owed, the next automatic retry and the day access pauses. */
  amountDue?: number;
  nextRetry?: string;
  graceUntil?: string;
  /** A downgrade or interval change waiting for the end of the period. */
  scheduledChange?: { planId: string; interval: BillingInterval; at: string };
};

export type BillingUsage = {
  id: string;
  /** "AI credits". */
  label: string;
  used: number;
  /** `null` for unlimited. */
  limit: number | null;
  /** In sentences: "credits". Default: the label in lower case. */
  unit?: string;
  /** ISO date the count starts again. */
  resetsAt?: string;
  /** What stops at the limit, as a sentence: "Copper pauses and new menus can’t be drafted." */
  atLimit?: string;
};

export type BillingPaymentMethod = {
  /** As the processor names it, in words: "Visa", "Mastercard", "Amex". */
  brand: string;
  last4: string;
  /** 1 to 12. */
  expMonth: number;
  /** Four digits. */
  expYear: number;
  /** Set when the last charge on it failed, with the processor's reason: "The bank declined the charge." */
  failure?: string;
};

export type BillingAddress = {
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
};

export type BillingDetailsValue = {
  /** The name on invoices: a company or a person. */
  name: string;
  /** Where invoices and receipts go. */
  email: string;
  taxId?: string;
  address: BillingAddress;
};

export type InvoiceStatus = "paid" | "open" | "failed" | "refunded";

export type BillingInvoice = {
  id: string;
  /** "LRD-2026-0112". */
  number: string;
  /** ISO date issued. */
  date: string;
  amount: number;
  status: InvoiceStatus;
  /** The PDF. Leave out while it's being generated. */
  href?: string;
};

export type CancelReason = "price" | "unused" | "features" | "switching" | "seasonal" | "other";

/** A callback's result: return a promise to show busy until it settles; a rejection shows its message. */
export type Result = void | Promise<unknown>;

/* ---------- Helpers ---------- */

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

const DAY = 86_400_000;

/** Midnight UTC of an ISO date or a Date, as a day number. */
export function dayOf(value: string | Date) {
  const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  return Math.floor(d.getTime() / DAY);
}

export function daysBetween(from: string | Date, to: string | Date) {
  return dayOf(to) - dayOf(from);
}

export function priceOf(plan: BillingPlan, interval: BillingInterval, seats: number) {
  return plan.price[interval] * (plan.perSeat === false ? 1 : seats);
}

/** How much cheaper a year is than twelve months, 0 to 1. */
export function yearlySaving(plan: BillingPlan) {
  const months = plan.price.month * 12;
  return months > 0 ? Math.max(0, 1 - plan.price.year / months) : 0;
}

export type Formatters = {
  money: (n: number) => string;
  number: (n: number) => string;
  date: (iso: string) => string;
  short: (iso: string) => string;
  percent: (fraction: number) => string;
};

export function useFormatters(locale: string, currency: string): Formatters {
  return useMemo(() => {
    const whole = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
    const cents = new Intl.NumberFormat(locale, { style: "currency", currency });
    const number = new Intl.NumberFormat(locale);
    const long = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
    const short = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
    const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
    const toDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
    return {
      // Whole amounts drop the cents: $96, but $96.50.
      money: (n) => (Number.isInteger(n) ? whole : cents).format(n),
      number: (n) => number.format(n),
      date: (iso) => long.format(toDate(iso)),
      short: (iso) => short.format(toDate(iso)),
      percent: (f) => percent.format(f),
    };
  }, [locale, currency]);
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
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => Result, fallback: string): Promise<boolean> => {
    setError(null);
    let result: Result;
    try {
      result = fn();
    } catch (reason) {
      setError(messageOf(reason, fallback));
      return false;
    }
    if (!isPromise(result)) return true;
    setBusy(true);
    try {
      await result;
      return true;
    } catch (reason) {
      setError(messageOf(reason, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}
