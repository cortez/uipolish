"use client";

import { useEffect, useRef, useState } from "react";
import {
  Billing,
  type BillingDetailsValue,
  type BillingInvoice,
  type BillingPaymentMethod,
  type BillingPlan,
  type BillingSubscription,
  type BillingUsage,
} from "@registry/billing/billing";
import { Button } from "@registry/button/button";
import { Checkbox } from "@registry/checkbox/checkbox";
import { Select } from "@registry/select/select";
import styles from "./preview.module.css";

const TODAY = "2026-11-03";

const PLANS: BillingPlan[] = [
  {
    id: "starter",
    name: "Acme Starter",
    description: "For one host running a supper now and then.",
    price: { month: 8, year: 80 },
    features: ["Up to 3 hosts", "2,000 AI credits a month", "100 guest texts a month", "Event pages and RSVPs", "Email support"],
  },
  {
    id: "team",
    name: "Acme Team",
    description: "For a supper club with a few hosts and a regular table.",
    price: { month: 15, year: 150 },
    features: [
      "Up to 15 hosts",
      "10,000 AI credits a month",
      "500 guest texts a month",
      "Event pages and RSVPs",
      "Copper drafts menus and guest messages",
      "Shared shopping lists",
      "Priority email support",
    ],
  },
  {
    id: "business",
    name: "Acme Business",
    description: "For venues and clubs that sell tickets every week.",
    price: { month: 24, year: 240 },
    features: [
      "Unlimited hosts",
      "50,000 AI credits a month",
      "2,500 guest texts a month",
      "Event pages and RSVPs",
      "Copper drafts menus and guest messages",
      "Shared shopping lists",
      "Ticketing and payouts",
      "SSO and an audit log",
      "A named contact",
    ],
  },
];

const ACTIVE: BillingSubscription = {
  planId: "team",
  interval: "month",
  status: "active",
  seats: 8,
  seatsUsed: 7,
  periodStart: "2026-10-14",
  periodEnd: "2026-11-14",
};

const VISA: BillingPaymentMethod = { brand: "Visa", last4: "4242", expMonth: 8, expYear: 2028 };

const USAGE: BillingUsage[] = [
  {
    id: "credits",
    label: "AI credits",
    used: 7420,
    limit: 10000,
    unit: "credits",
    resetsAt: "2026-11-14",
    atLimit: "Copper stops drafting menus and replies until then.",
  },
  {
    id: "texts",
    label: "Guest texts",
    used: 412,
    limit: 500,
    unit: "texts",
    resetsAt: "2026-11-14",
    atLimit: "Reminders go by email only.",
  },
  { id: "events", label: "Event pages", used: 18, limit: null, unit: "pages" },
];

const DETAILS: BillingDetailsValue = {
  name: "Saturday Supper Club Ltd",
  email: "accounts@saturdaysupper.example.com",
  taxId: "GB 284 7719 06",
  address: { line1: "14 Alder Lane", line2: "Unit 3", city: "Bristol", postalCode: "BS6 5QT", country: "United Kingdom" },
};

/** Monthly invoices, newest first. Team went from 6 to 8 seats in May; March was refunded after a double charge. */
function invoices(): BillingInvoice[] {
  const list: BillingInvoice[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.UTC(2026, 9 - i, 14));
    const date = d.toISOString().slice(0, 10);
    const seats = d < new Date(Date.UTC(2026, 4, 1)) ? 6 : 8;
    list.push({
      id: `inv-${i}`,
      number: `LRD-${d.getUTCFullYear()}-${String(140 - i).padStart(4, "0")}`,
      date,
      amount: seats * 15,
      status: "paid",
      href: `#invoice-${date}`,
    });
  }
  list.splice(7, 0, { id: "inv-dup", number: "LRD-2026-0133-R", date: "2026-03-15", amount: 90, status: "refunded", href: "#refund" });
  return list;
}

const INVOICES = invoices();

type Scenario =
  | "active"
  | "trial"
  | "expiring"
  | "past-due"
  | "limit"
  | "canceled"
  | "ended"
  | "read-only"
  | "loading"
  | "error";

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial, no card" },
  { value: "expiring", label: "Card expiring" },
  { value: "past-due", label: "Past due" },
  { value: "limit", label: "Credits used up" },
  { value: "canceled", label: "Canceled, access left" },
  { value: "ended", label: "Canceled, ended" },
  { value: "read-only", label: "Read only" },
  { value: "loading", label: "Loading" },
  { value: "error", label: "Didn’t load" },
];

type World = {
  subscription: BillingSubscription;
  paymentMethod: BillingPaymentMethod | null;
  usage: BillingUsage[];
  invoices: BillingInvoice[];
};

function world(s: Scenario): World {
  const base: World = { subscription: ACTIVE, paymentMethod: VISA, usage: USAGE, invoices: INVOICES };
  switch (s) {
    case "trial":
      return {
        subscription: { ...ACTIVE, status: "trialing", periodStart: "2026-10-29", periodEnd: "2026-11-12", trialEnd: "2026-11-12", seatsUsed: 4 },
        paymentMethod: null,
        usage: USAGE.map((u) => (u.limit === null ? u : { ...u, used: Math.round(u.used / 6), resetsAt: "2026-11-12" })),
        invoices: [],
      };
    case "expiring":
      return { ...base, paymentMethod: { ...VISA, last4: "0019", expMonth: 11, expYear: 2026 } };
    case "past-due":
      return {
        ...base,
        subscription: { ...ACTIVE, status: "past_due", amountDue: 120, nextRetry: "2026-11-06", graceUntil: "2026-11-10" },
        paymentMethod: { ...VISA, failure: "The bank declined the charge for insufficient funds." },
        invoices: [
          { id: "inv-open", number: "LRD-2026-0141", date: "2026-10-31", amount: 120, status: "failed", href: "#open" },
          ...INVOICES,
        ],
      };
    case "limit":
      return {
        ...base,
        usage: USAGE.map((u) => (u.id === "credits" ? { ...u, used: 10000 } : u)),
      };
    case "canceled":
      return { ...base, subscription: { ...ACTIVE, status: "canceled", cancelAt: "2026-11-14" } };
    case "ended":
      return {
        ...base,
        subscription: { ...ACTIVE, status: "canceled", periodStart: "2026-09-14", periodEnd: "2026-10-14", cancelAt: "2026-10-14" },
        usage: [],
        invoices: INVOICES.slice(1),
      };
    default:
      return base;
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function BillingPreview() {
  const [scenario, setScenario] = useState<Scenario>("active");
  const [state, setState] = useState<World>(() => world("active"));
  const [details, setDetails] = useState(DETAILS);
  const [failNext, setFailNext] = useState(false);
  const [run, setRun] = useState(0);
  const failRef = useRef(failNext);
  useEffect(() => {
    failRef.current = failNext;
  }, [failNext]);

  function pick(next: Scenario) {
    setScenario(next);
    setState(world(next));
    setDetails(DETAILS);
    setRun((r) => r + 1);
  }

  /** A server call: a realistic wait, and the failure you asked for. */
  async function call(ms: number, failure: string) {
    await wait(ms);
    if (failRef.current) {
      setFailNext(false);
      throw new Error(failure);
    }
  }

  const sub = (patch: Partial<BillingSubscription>) =>
    setState((w) => ({ ...w, subscription: { ...w.subscription, ...patch } }));

  return (
    <div className={styles.stack}>
      <div className={styles.row} data-demo-controls="">
        <Select
          aria-label="State"
          options={SCENARIOS}
          value={scenario}
          onValueChange={(v) => pick(v as Scenario)}
        />
        <Checkbox label="Fail the next request" checked={failNext} onCheckedChange={setFailNext} />
        <Button variant="secondary" onClick={() => pick(scenario)} data-demo-controls="">
          Start over
        </Button>
      </div>

      <Billing
        key={run}
        headingLevel={2}
        description="Saturday Supper Club’s Acme workspace. Owners see everything here; hosts see their own usage."
        today={TODAY}
        currency="USD"
        loading={scenario === "loading"}
        error={scenario === "error" ? "Acme couldn’t reach the billing service. Nothing has changed with your plan." : undefined}
        onRetry={() => pick("active")}
        readOnly={
          scenario === "read-only"
            ? "Only workspace owners can change the plan or payment details. Ask Mara Okafor."
            : undefined
        }
        subscription={state.subscription}
        plans={PLANS}
        usage={state.usage}
        paymentMethod={state.paymentMethod}
        invoices={state.invoices}
        details={details}
        cancelNotes={[
          "Copper stops drafting menus and guest messages.",
          "Menus, guest lists and past suppers stay, read-only, for 90 days.",
        ]}
        onChangePlan={async (planId, interval) => {
          await call(1100, "The card was declined for the upgrade. Your plan hasn’t changed.");
          setState((w) => {
            const s = w.subscription;
            const from = PLANS.findIndex((p) => p.id === s.planId);
            const to = PLANS.findIndex((p) => p.id === planId);
            if (planId === s.planId && interval === s.interval) return { ...w, subscription: { ...s, scheduledChange: undefined } };
            if (s.status === "canceled" && s.cancelAt && s.cancelAt < TODAY) {
              return {
                ...w,
                subscription: { ...s, planId, interval, status: "active", cancelAt: undefined, periodStart: TODAY, periodEnd: interval === "year" ? "2027-11-03" : "2026-12-03" },
              };
            }
            const down = to < from || (to === from && interval === "month");
            if (down && s.status !== "trialing")
              return { ...w, subscription: { ...s, scheduledChange: { planId, interval, at: s.periodEnd } } };
            const periodEnd = interval !== s.interval && s.status !== "trialing" ? (interval === "year" ? "2027-11-03" : "2026-12-03") : s.periodEnd;
            return {
              ...w,
              subscription: { ...s, planId, interval, periodEnd, periodStart: periodEnd === s.periodEnd ? s.periodStart : TODAY, scheduledChange: undefined },
            };
          });
        }}
        onUpdatePayment={async () => {
          // Stands in for the processor's card form.
          await call(1400, "The card form didn’t load. Check your connection and try again.");
          setState((w) => ({
            ...w,
            paymentMethod: { brand: "Mastercard", last4: "5100", expMonth: 9, expYear: 2029 },
            subscription: w.subscription.status === "past_due" ? { ...w.subscription, status: "active", amountDue: undefined } : w.subscription,
            invoices: w.invoices.map((inv) => (inv.status === "failed" ? { ...inv, status: "paid" } : inv)),
          }));
        }}
        onSaveDetails={async (next) => {
          await call(800, "The tax ID didn’t validate. Check it against your registration and try again.");
          setDetails(next);
        }}
        onCancel={async () => {
          await call(1000, "Your subscription is still on. Try again in a minute.");
          sub({ status: "canceled", cancelAt: state.subscription.status === "trialing" ? state.subscription.trialEnd : state.subscription.periodEnd, scheduledChange: undefined });
        }}
        onResume={async () => {
          await call(900, "Couldn’t restart the subscription. Try again.");
          const s = state.subscription;
          if (s.cancelAt && s.cancelAt < TODAY) sub({ status: "active", cancelAt: undefined, periodStart: TODAY, periodEnd: "2026-12-03" });
          else sub({ status: "active", cancelAt: undefined });
        }}
      />

      <p className={styles.note}>
        Requests take about a second, like a real billing API. Tick “Fail the next request” to see how each action
        recovers. Today is November 3, 2026 in this demo.
      </p>
    </div>
  );
}
