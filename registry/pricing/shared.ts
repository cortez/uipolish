import { useCallback, useMemo, useState, type ReactNode } from "react";

/* ---------- Data ---------- */

export type PricingInterval = "month" | "year";

export type PricingPlan = {
  id: string;
  /** "Pro". */
  name: string;
  /** One line on who it's for: "For one person shipping every day." */
  description?: string;
  /** In currency units. `month` is one month; `year` is a whole year, paid up front. Per seat when `perSeat`. */
  price: { month: number; year: number };
  /** The price is per seat. Default false. */
  perSeat?: boolean;
  /** Credits (or any metered unit) included each month, and what more costs. */
  usage?: PricingUsage;
  /** The plan id whose features this one builds on: the list opens with "Everything in Pro, plus". */
  includes?: string;
  /** What it includes, in the order to list them. Five or six lines read best. */
  features: string[];
  /** Marks the plan to steer people to: a badge and the raised edge. One plan at most. */
  featured?: boolean;
  /** The featured plan's badge. Default "Most popular". */
  badge?: string;
  /** The button's label. Default "Get {name}", or "Start for free" on a free plan. */
  cta?: string;
};

export type PricingUsage = {
  /** How many come with the plan each month. */
  included: number;
  /** Plural, in lower case: "credits". */
  unit: string;
  /** Pay as you go past `included`: `price` for every `per` units. Leave out when usage stops at the limit. */
  overage?: { price: number; per: number };
  /** Without `overage`: what happens at the limit, short. "Pauses until next month." */
  atLimit?: string;
};

/** A cell in the comparison table: `true` a check, `false` or missing a dash, a string as written. */
export type PricingValue = boolean | string;

export type PricingFeatureRow = {
  /** "Context window". */
  label: string;
  /** One sentence on what the term means, shown in a tooltip beside it. */
  hint?: string;
  /** By plan id. */
  values: Record<string, PricingValue | undefined>;
};

export type PricingFeatureGroup = {
  /** "Usage", "Models", "Security". */
  title: string;
  rows: PricingFeatureRow[];
};

export type PricingFaq = {
  question: string;
  answer: ReactNode;
};

export type PricingEnterprise = {
  /** Default "Enterprise". */
  name?: string;
  /** One or two lines on what changes at that size. */
  description: string;
  /** A few lines, shown inline with checks. */
  features?: string[];
  /** Default "Talk to us". Links to `contactHref`. */
  cta?: string;
};

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

export function isFree(plan: PricingPlan) {
  return plan.price.month === 0 && plan.price.year === 0;
}

/** How much cheaper a year is than twelve months, 0 to 1. */
export function yearlySaving(plan: PricingPlan) {
  const months = plan.price.month * 12;
  return months > 0 ? Math.max(0, 1 - plan.price.year / months) : 0;
}

/** The figure shown big: what a month costs on that interval. */
export function monthlyOf(plan: PricingPlan, interval: PricingInterval) {
  const n = interval === "year" ? plan.price.year / 12 : plan.price.month;
  return Math.round(n * 100) / 100;
}

export function ctaOf(plan: PricingPlan) {
  return plan.cta ?? (isFree(plan) ? "Start for free" : `Get ${plan.name}`);
}

export type Formatters = {
  money: (n: number) => string;
  number: (n: number) => string;
  percent: (fraction: number) => string;
};

export function useFormatters(locale: string, currency: string): Formatters {
  return useMemo(() => {
    const whole = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
    const cents = new Intl.NumberFormat(locale, { style: "currency", currency });
    const number = new Intl.NumberFormat(locale);
    const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
    return {
      // Whole amounts drop the cents: $16, but $16.50.
      money: (n) => (Number.isInteger(n) ? whole : cents).format(n),
      number: (n) => number.format(n),
      percent: (f) => percent.format(f),
    };
  }, [locale, currency]);
}

/** Where a button was pressed: a plan's card, or its column in the comparison table. */
export type Origin = "card" | "table";

type Pending = { planId: string; origin: Origin };

/**
 * One choice in flight at a time. Busy shows on the button that was pressed;
 * a rejection's message is kept with the plan and where it was pressed.
 */
export function useSelect(onSelect: ((planId: string, interval: PricingInterval) => Result) | undefined) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<(Pending & { message: string }) | null>(null);

  const select = useCallback(
    async (planId: string, interval: PricingInterval, origin: Origin): Promise<string | null> => {
      if (!onSelect) return null;
      setError(null);
      const fallback = "That didn’t go through. Try again.";
      let result: Result;
      try {
        result = onSelect(planId, interval);
      } catch (reason) {
        const message = messageOf(reason, fallback);
        setError({ planId, origin, message });
        return message;
      }
      if (!isPromise(result)) return null;
      setPending({ planId, origin });
      try {
        await result;
        return null;
      } catch (reason) {
        const message = messageOf(reason, fallback);
        setError({ planId, origin, message });
        return message;
      } finally {
        setPending(null);
      }
    },
    [onSelect],
  );

  return { pending, error, select };
}
