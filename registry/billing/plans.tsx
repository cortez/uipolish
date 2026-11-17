"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Dialog, DialogActions } from "../dialog/dialog";
import { Icon } from "../icons/icons";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import {
  daysBetween,
  priceOf,
  useAction,
  yearlySaving,
  type BillingInterval,
  type BillingPlan,
  type BillingSubscription,
  type Formatters,
  type Result,
} from "./shared";
import styles from "./billing.module.css";

/** What choosing a plan (at an interval) would do. */
export type PlanChangeKind = "current" | "scheduled" | "upgrade" | "downgrade" | "trial" | "restart";

/** Adds whole months to an ISO date, holding the day where the month allows. */
export function addMonths(iso: string, months: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

export function changeKind(
  sub: BillingSubscription,
  plans: BillingPlan[],
  planId: string,
  interval: BillingInterval,
  ended: boolean,
): PlanChangeKind {
  if (ended) return "restart";
  if (planId === sub.planId && interval === sub.interval) return "current";
  const s = sub.scheduledChange;
  if (s && s.planId === planId && s.interval === interval) return "scheduled";
  if (sub.status === "trialing") return "trial";
  const from = plans.findIndex((p) => p.id === sub.planId);
  const to = plans.findIndex((p) => p.id === planId);
  if (to !== from) return to > from ? "upgrade" : "downgrade";
  // The same plan: a year up front starts now, back to monthly waits for the year to end.
  return interval === "year" ? "upgrade" : "downgrade";
}

type Pending = { plan: BillingPlan; interval: BillingInterval; kind: PlanChangeKind };

type PlansProps = {
  plans: BillingPlan[];
  subscription: BillingSubscription;
  today: string;
  ended: boolean;
  f: Formatters;
  /** "Visa •••• 4242", for where an upgrade is charged. */
  chargeTo?: string;
  onChangePlan?: (planId: string, interval: BillingInterval) => Result;
  /** Why plans can't be changed right now, in place of the buttons. */
  blocked?: string;
  readOnly: boolean;
  announce: (line: string) => void;
  headingId: string;
  level: number;
};

export function Plans({
  plans,
  subscription: sub,
  today,
  ended,
  f,
  chargeTo,
  onChangePlan,
  blocked,
  readOnly,
  announce,
  headingId,
  level,
}: PlansProps) {
  const [interval, setShownInterval] = useState<BillingInterval>(sub.interval);
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const { busy, error, setError, run } = useAction();

  const current = plans.find((p) => p.id === sub.planId);
  const saving = Math.max(0, ...plans.map(yearlySaving));
  const Heading = `h${Math.min(level, 6)}` as "h2";

  function choose(plan: BillingPlan) {
    setError(null);
    setPending({ plan, interval, kind: changeKind(sub, plans, plan.id, interval, ended) });
    setOpen(true);
  }

  async function confirm() {
    if (!pending) return;
    const { plan, interval: to, kind } = pending;
    const ok = await run(() => onChangePlan?.(plan.id, to), "Your plan didn’t change. Try again.");
    if (!ok) return;
    setOpen(false);
    const when = kind === "downgrade" ? `on ${f.date(sub.periodEnd)}` : "now";
    announce(`${plan.name}, billed ${to === "year" ? "yearly" : "monthly"}, starts ${when}.`);
  }

  return (
    <div className={styles.plans}>
      <div className={styles.plansBar}>
        <SegmentedControl
          aria-label="Billing period"
          value={interval}
          widths="content"
          onValueChange={(v) => setShownInterval(v as BillingInterval)}
        >
          <Segment value="month">Monthly</Segment>
          <Segment value="year">
            Yearly
            {saving > 0.005 && <span className={styles.saving}>Save {f.percent(saving)}</span>}
          </Segment>
        </SegmentedControl>
        {blocked && <p className={styles.plansNote}>{blocked}</p>}
      </div>

      <ul className={styles.planGrid} aria-labelledby={headingId}>
        {plans.map((plan) => {
          const kind = changeKind(sub, plans, plan.id, interval, ended);
          const isCurrent = plan.id === sub.planId && !ended;
          const perSeat = plan.perSeat !== false;
          const monthly = interval === "year" ? plan.price.year / 12 : plan.price.month;
          const total = priceOf(plan, interval, sub.seats);
          const nameId = `${headingId}-${plan.id}`;
          return (
            <li key={plan.id} className={styles.planCard} data-current={isCurrent || undefined} aria-labelledby={nameId}>
              <div className={styles.planHead}>
                <Heading id={nameId} className={styles.planName}>
                  {plan.name}
                </Heading>
                {isCurrent && (
                  <Badge size="sm" tone="neutral">
                    {sub.interval === interval ? "Current plan" : `Current, ${sub.interval === "year" ? "yearly" : "monthly"}`}
                  </Badge>
                )}
              </div>
              {plan.description && <p className={styles.planDescription}>{plan.description}</p>}
              <p className={styles.planPrice}>
                <span className={styles.planAmount}>{f.money(Math.round(monthly * 100) / 100)}</span>
                <span className={styles.planPer}>
                  {perSeat ? "per seat / month" : "/ month"}
                </span>
              </p>
              <p className={styles.planTotal}>
                {interval === "year"
                  ? `${f.money(total)} billed yearly${perSeat ? ` for ${sub.seats} ${sub.seats === 1 ? "seat" : "seats"}` : ""}`
                  : `${f.money(total)} a month${perSeat ? ` for ${sub.seats} ${sub.seats === 1 ? "seat" : "seats"}` : ""}`}
              </p>
              <ul className={styles.features} aria-label={`${plan.name} includes`}>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Icon name="check" className={styles.featureIcon} />
                    {feature}
                  </li>
                ))}
              </ul>
              {!readOnly && (
                <div className={styles.planAction}>
                  {kind === "current" ? (
                    <p className={styles.planState}>Your plan</p>
                  ) : kind === "scheduled" ? (
                    <p className={styles.planState}>Starts {f.short(sub.scheduledChange!.at)}</p>
                  ) : (
                    <Button
                      variant={kind === "upgrade" || (kind === "restart" && plan.id === sub.planId) ? "primary" : "secondary"}
                      className={styles.planButton}
                      disabled={!!blocked || !onChangePlan}
                      onClick={() => choose(plan)}
                    >
                      {buttonLabel(kind, plan, current, interval, sub.interval)}
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        size="md"
        locked={busy}
        title={pending ? dialogTitle(pending, current, sub, f) : ""}
        description={pending ? <DialogLead pending={pending} sub={sub} f={f} /> : undefined}
        footer={
          <>
            <p className={styles.dialogError} role="alert">
              {error}
            </p>
            <DialogActions>
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
                {pending?.kind === "downgrade" ? "Keep plan" : "Cancel"}
              </Button>
              <Button variant="primary" busy={busy} busyLabel="Changing plan…" onClick={confirm}>
                {pending ? confirmLabel(pending, sub, f) : ""}
              </Button>
            </DialogActions>
          </>
        }
      >
        {pending && <DialogBody pending={pending} plans={plans} current={current} sub={sub} today={today} f={f} chargeTo={chargeTo} />}
      </Dialog>
    </div>
  );
}

function intervalWord(i: BillingInterval) {
  return i === "year" ? "yearly" : "monthly";
}

function buttonLabel(
  kind: PlanChangeKind,
  plan: BillingPlan,
  current: BillingPlan | undefined,
  interval: BillingInterval,
  currentInterval: BillingInterval,
) {
  if (kind === "restart") return `Choose ${plan.name}`;
  if (plan.id === current?.id && interval !== currentInterval) return `Switch to ${intervalWord(interval)}`;
  if (kind === "upgrade") return `Upgrade to ${plan.name}`;
  return `Switch to ${plan.name}`;
}

function dialogTitle(p: Pending, current: BillingPlan | undefined, sub: BillingSubscription, f: Formatters) {
  const samePlan = p.plan.id === current?.id;
  switch (p.kind) {
    case "restart":
      return `Subscribe to ${p.plan.name}`;
    case "upgrade":
      return samePlan ? "Switch to yearly billing" : `Upgrade to ${p.plan.name}`;
    case "downgrade":
      return samePlan
        ? `Switch to monthly on ${f.short(sub.periodEnd)}?`
        : `Switch to ${p.plan.name} on ${f.short(sub.periodEnd)}?`;
    default:
      return samePlan ? `Switch to ${intervalWord(p.interval)} billing` : `Switch to ${p.plan.name}`;
  }
}

function confirmLabel(p: Pending, sub: BillingSubscription, f: Formatters) {
  switch (p.kind) {
    case "restart":
      return "Subscribe";
    case "upgrade":
      return p.plan.id === sub.planId ? "Switch to yearly" : "Upgrade now";
    case "downgrade":
      return `Switch on ${f.short(sub.periodEnd)}`;
    default:
      return "Switch plan";
  }
}

function priceLine(plan: BillingPlan, interval: BillingInterval, seats: number, f: Formatters) {
  const total = f.money(priceOf(plan, interval, seats));
  const per = interval === "year" ? "a year" : "a month";
  return plan.perSeat === false ? `${total} ${per}` : `${total} ${per} for ${seats} ${seats === 1 ? "seat" : "seats"}`;
}

function DialogLead({ pending: p, sub, f }: { pending: Pending; sub: BillingSubscription; f: Formatters }) {
  const price = priceLine(p.plan, p.interval, sub.seats, f);
  switch (p.kind) {
    case "restart":
      return <>You pay {price}, starting today.</>;
    case "upgrade":
      return <>It starts now. After today you pay {price}.</>;
    case "downgrade":
      return (
        <>
          Nothing changes until {f.date(sub.periodEnd)}. From then you pay {price}.
        </>
      );
    default:
      return (
        <>
          It starts now, and your trial still ends on {f.date(sub.trialEnd ?? sub.periodEnd)}. From then you pay {price}.
        </>
      );
  }
}

function DialogBody({
  pending: p,
  plans,
  current,
  sub,
  today,
  f,
  chargeTo,
}: {
  pending: Pending;
  plans: BillingPlan[];
  current?: BillingPlan;
  sub: BillingSubscription;
  today: string;
  f: Formatters;
  chargeTo?: string;
}) {
  // Only a step down loses anything; an upgrade's changed lines ("Up to 15 hosts") are gains.
  const lower = !!current && plans.findIndex((x) => x.id === p.plan.id) < plans.findIndex((x) => x.id === current.id);
  const lost = current && (p.kind === "downgrade" || lower) ? current.features.filter((x) => !p.plan.features.includes(x)) : [];
  const gained = current ? p.plan.features.filter((x) => !current.features.includes(x)) : [];

  const rows: { label: string; value: ReactNode; note?: string }[] = [];
  if (p.kind === "upgrade" && current) {
    const periodDays = Math.max(1, daysBetween(sub.periodStart, sub.periodEnd));
    const left = Math.min(periodDays, Math.max(0, daysBetween(today, sub.periodEnd)));
    const unused = (priceOf(current, sub.interval, sub.seats) * left) / periodDays;
    const next = priceOf(p.plan, p.interval, sub.seats);
    const restarts = p.interval !== sub.interval;
    const due = Math.max(0, Math.round(((restarts ? next : (next * left) / periodDays) - unused) * 100) / 100);
    rows.push({
      label: "Due today",
      value: f.money(due),
      note: restarts
        ? `A full ${p.interval === "year" ? "year" : "month"} of ${p.plan.name}, less the ${left} unused ${left === 1 ? "day" : "days"} of your current period.`
        : `Prorated for the ${left} ${left === 1 ? "day" : "days"} left in this period, less what you’ve paid for ${current.name}.`,
    });
    rows.push({
      label: "Renews",
      value: `${f.date(restarts ? addMonths(today, p.interval === "year" ? 12 : 1) : sub.periodEnd)}`,
    });
  } else if (p.kind === "restart") {
    rows.push({ label: "Due today", value: f.money(priceOf(p.plan, p.interval, sub.seats)) });
    rows.push({ label: "Renews", value: f.date(addMonths(today, p.interval === "year" ? 12 : 1)) });
  }

  return (
    <div className={styles.dialogBody}>
      {rows.length > 0 && (
        <dl className={styles.summary}>
          {rows.map((row) => (
            <div key={row.label} className={styles.summaryRow}>
              <dt>{row.label}</dt>
              <dd>
                <span className={styles.summaryValue}>{row.value}</span>
                {row.note && <span className={styles.summaryNote}>{row.note}</span>}
              </dd>
            </div>
          ))}
          {chargeTo && (
            <div className={styles.summaryRow}>
              <dt>Charged to</dt>
              <dd>
                <span className={styles.summaryValue}>{chargeTo}</span>
              </dd>
            </div>
          )}
        </dl>
      )}
      {p.kind === "upgrade" && rows.length > 0 && (
        <p className={styles.fine}>An estimate. The invoice shows the exact amount, with tax.</p>
      )}
      {lost.length > 0 && (
        <div className={styles.lose}>
          <p className={styles.loseTitle}>
            <Icon name="warning" className={styles.loseIcon} />
            {p.kind === "downgrade"
              ? `On ${f.short(sub.periodEnd)} your team loses`
              : `Your team loses`}
          </p>
          <ul className={styles.loseList}>
            {lost.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {gained.length > 0 && p.kind !== "downgrade" && (
        <div className={styles.gain}>
          <p className={styles.gainTitle}>Adds</p>
          <ul className={styles.features}>
            {gained.map((x) => (
              <li key={x}>
                <Icon name="check" className={styles.featureIcon} />
                {x}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
