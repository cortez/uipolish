"use client";

import { useId, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Alert } from "../alert/alert";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Dialog, DialogActions } from "../dialog/dialog";
import { EmptyState } from "../empty-state/empty-state";
import { Icon } from "../icons/icons";
import { RadioGroup } from "../radio-group/radio-group";
import { TextField } from "../text-field/text-field";
import { BillingDetails } from "./details";
import { Invoices } from "./invoices";
import { Plans } from "./plans";
import {
  dayOf,
  daysBetween,
  plural,
  priceOf,
  useAction,
  useAnnouncer,
  useFormatters,
  type BillingDetailsValue,
  type BillingInterval,
  type BillingInvoice,
  type BillingPaymentMethod,
  type BillingPlan,
  type BillingSubscription,
  type BillingUsage,
  type CancelReason,
  type Formatters,
  type Result,
} from "./shared";
import styles from "./billing.module.css";

export type {
  BillingAddress,
  BillingDetailsValue,
  BillingInterval,
  BillingInvoice,
  BillingPaymentMethod,
  BillingPlan,
  BillingStatus,
  BillingSubscription,
  BillingUsage,
  CancelReason,
  InvoiceStatus,
} from "./shared";

export type BillingProps = {
  subscription: BillingSubscription;
  /** Every plan on offer, cheapest first: the order decides what's an upgrade. */
  plans: BillingPlan[];
  /** Metered limits, each with its own bar. Leave out to drop the section. */
  usage?: BillingUsage[];
  /** `null`: no card on file yet. Leave out to drop the payment card. */
  paymentMethod?: BillingPaymentMethod | null;
  /** Newest first. Leave out to drop the section; `[]` shows its empty state. */
  invoices?: BillingInvoice[];
  /** Leave out to drop the section. */
  details?: BillingDetailsValue;

  /** Upgrades start now; downgrades wait for the period end. Resolve once `subscription` says so. */
  onChangePlan?: (planId: string, interval: BillingInterval) => Result;
  /** Open your processor's card form or portal. Resolve once `paymentMethod` is the new card. */
  onUpdatePayment?: () => Result;
  onSaveDetails?: (details: BillingDetailsValue) => Result;
  /** Cancel at the end of the period. `note` is what they typed, if anything. */
  onCancel?: (reason: CancelReason, note?: string) => Result;
  /** Undo a cancel before it takes effect, or resubscribe to the same plan after it has. */
  onResume?: () => Result;

  /** Show "Loading billing…" in the space the screen will take. */
  loading?: boolean;
  /** The screen couldn't load: what went wrong, in a sentence. */
  error?: string;
  onRetry?: () => void;
  /** The viewer can see billing but not change it: why, and who can. Hides every action but downloads. */
  readOnly?: string;
  /** What happens when the plan ends, one line each, for the cancel dialog. */
  cancelNotes?: string[];

  /** ISO 4217. Default "USD". */
  currency?: string;
  /** Fixed so server and browser format alike. Default "en-US". */
  locale?: string;
  /** ISO date treated as today, for days left and expiry. Default: now. */
  today?: string;
  /** Default "Billing". */
  title?: ReactNode;
  description?: ReactNode;
  /** The title's level; sections are one below. Default 1. */
  headingLevel?: 1 | 2 | 3 | 4;
  className?: string;
};

const REASONS: { value: CancelReason; label: string }[] = [
  { value: "price", label: "It costs too much" },
  { value: "unused", label: "We don’t use it enough" },
  { value: "features", label: "It’s missing something we need" },
  { value: "switching", label: "We’re moving to another tool" },
  { value: "seasonal", label: "We’re taking a break" },
  { value: "other", label: "Something else" },
];

function Heading({ level, ...props }: { level: number } & ComponentProps<"h2">) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as "h2";
  return <Tag {...props} />;
}

function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Months until the card stops working: 0 in its last month, negative once expired. */
function monthsLeft(pm: BillingPaymentMethod, today: string) {
  const [y, m] = today.split("-").map(Number);
  return (pm.expYear - y) * 12 + (pm.expMonth - m);
}

function cardName(pm: BillingPaymentMethod) {
  return `${pm.brand} •••• ${pm.last4}`;
}

/** The screen's sections, with an anchor each. */
function Section({
  id,
  level,
  title,
  intro,
  aside,
  headingRef,
  children,
}: {
  id: string;
  level: number;
  title: string;
  intro?: ReactNode;
  aside?: ReactNode;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionText}>
          <Heading level={level} id={`${id}-title`} ref={headingRef} tabIndex={-1} className={styles.sectionTitle}>
            {title}
          </Heading>
          {intro && <p className={styles.intro}>{intro}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ---------- Usage ---------- */

function Meter({
  item,
  f,
  onCompare,
}: {
  item: BillingUsage;
  f: Formatters;
  onCompare?: () => void;
}) {
  const id = useId();
  const unit = item.unit ?? item.label.toLocaleLowerCase();
  const limit = item.limit;
  const fraction = limit ? item.used / limit : 0;
  const tone = limit === null ? "calm" : fraction >= 1 ? "blocked" : fraction >= 0.8 ? "warning" : "calm";
  const left = limit === null ? 0 : Math.max(0, limit - item.used);
  const resets = item.resetsAt ? f.short(item.resetsAt) : null;

  let line: ReactNode;
  if (limit === null) line = "Unlimited on your plan.";
  else if (tone === "blocked")
    line = (
      <>
        <strong>All {f.number(limit)} {unit} used.</strong> {item.atLimit ?? "This stops until the limit resets."}
        {resets && ` Resets ${resets}.`}
      </>
    );
  else if (tone === "warning")
    line = `${f.number(left)} ${unit} left${resets ? ` until ${resets}` : ""}. ${item.atLimit ? `At the limit, ${item.atLimit.charAt(0).toLocaleLowerCase()}${item.atLimit.slice(1)}` : ""}`.trim();
  else line = `${f.number(left)} left${resets ? `. Resets ${resets}` : ""}.`;

  const value = limit === null ? `${f.number(item.used)} ${unit}` : `${f.number(item.used)} of ${f.number(limit)}`;

  return (
    <div className={styles.meter} data-tone={tone}>
      <div className={styles.meterHead}>
        <span id={`${id}-label`} className={styles.meterLabel}>
          {item.label}
        </span>
        <span className={styles.meterValue}>{value}</span>
      </div>
      {limit !== null && (
        <div
          role="meter"
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-line`}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(item.used, limit)}
          aria-valuetext={`${f.number(item.used)} of ${f.number(limit)} ${unit} used`}
          className={styles.meterTrack}
        >
          <span className={styles.meterFill} style={{ "--meter": Math.min(fraction, 1) } as CSSProperties} />
        </div>
      )}
      <div className={styles.meterFoot}>
        <p id={`${id}-line`} className={styles.meterLine}>
          {tone !== "calm" && <Icon name={tone === "blocked" ? "alert" : "warning"} className={styles.meterIcon} />}
          <span>{line}</span>
        </p>
        {tone === "blocked" && onCompare && (
          <Button variant="secondary" className={styles.meterAction} onClick={onCompare}>
            Compare plans
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- Cancel ---------- */

function CancelDialog({
  open,
  onOpenChange,
  plan,
  until,
  seats,
  notes,
  f,
  onCancel,
  announce,
  finalFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: string;
  until: string;
  seats: number;
  notes?: string[];
  f: Formatters;
  onCancel: (reason: CancelReason, note?: string) => Result;
  announce: (line: string) => void;
  finalFocus: RefObject<HTMLElement | null>;
}) {
  const [reason, setReason] = useState<CancelReason | "">("");
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const { busy, error, setError, run } = useAction();

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setReason("");
      setNote("");
      setMissing(false);
      setError(null);
    }
  }

  async function confirm() {
    if (!reason) {
      setMissing(true);
      return;
    }
    const ok = await run(() => onCancel(reason, note.trim() || undefined), "Your subscription is still on. Try again.");
    if (!ok) return;
    onOpenChange(false);
    announce(`Subscription canceled. You keep ${plan} until ${f.date(until)}.`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      role="alertdialog"
      size="md"
      locked={busy}
      initialFocus={keepRef}
      finalFocus={finalFocus}
      dirty={() => !!note.trim()}
      title={`Cancel ${plan}?`}
      description={`You keep everything until ${f.date(until)}, and you won’t be charged again.`}
      footer={
        <>
          <p className={styles.dialogError} role="alert">
            {error}
          </p>
          <DialogActions>
            <Button ref={keepRef} variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
              Keep subscription
            </Button>
            <Button variant="danger" busy={busy} busyLabel="Canceling…" onClick={confirm}>
              Cancel subscription
            </Button>
          </DialogActions>
        </>
      }
    >
      <div className={styles.dialogBody}>
        <div className={styles.lose}>
          <p className={styles.loseTitle}>
            <Icon name="warning" className={styles.loseIcon} />
            On {f.short(until)}
          </p>
          <ul className={styles.loseList}>
            <li>
              {seats === 1 ? "Your seat loses" : `All ${seats} seats lose`} access to {plan}.
            </li>
            {notes?.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
        <RadioGroup
          label="Why are you canceling?"
          options={REASONS}
          value={reason}
          onValueChange={(v) => {
            setReason(v as CancelReason);
            setMissing(false);
          }}
          error={missing ? "Choose the closest one. It goes straight to the team." : null}
          disabled={busy}
          required
        />
        <TextField
          label="Anything we could have done better?"
          hint="Optional."
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          disabled={busy}
          autoComplete="off"
        />
      </div>
    </Dialog>
  );
}

/* ---------- Screen ---------- */

/** A SaaS billing settings screen: plan, usage, plan changes, payment, details, invoices and cancel. */
export function Billing({
  subscription: sub,
  plans,
  usage,
  paymentMethod,
  invoices,
  details,
  onChangePlan,
  onUpdatePayment,
  onSaveDetails,
  onCancel,
  onResume,
  loading = false,
  error,
  onRetry,
  readOnly,
  cancelNotes,
  currency = "USD",
  locale = "en-US",
  today: todayProp,
  title = "Billing",
  description,
  headingLevel = 1,
  className,
}: BillingProps) {
  const f = useFormatters(locale, currency);
  const { text: announcement, announce } = useAnnouncer();
  const [today] = useState(() => todayProp ?? todayIso());
  const now = todayProp ?? today;
  const baseId = useId().replace(/:/g, "");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const plansRef = useRef<HTMLHeadingElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [canceling, setCanceling] = useState(false);
  const payment = useAction();
  const resume = useAction();
  const keep = useAction();

  const level = headingLevel;
  const locked = !!readOnly;
  const plan = plans.find((p) => p.id === sub.planId);
  const planName = plan?.name ?? sub.planId;
  const scheduled = sub.scheduledChange ? plans.find((p) => p.id === sub.scheduledChange!.planId) : undefined;

  const accessUntil =
    sub.status === "canceled"
      ? (sub.cancelAt ?? sub.periodEnd)
      : sub.status === "trialing"
        ? (sub.trialEnd ?? sub.periodEnd)
        : sub.periodEnd;
  const ended = sub.status === "canceled" && dayOf(accessUntil) < dayOf(now);
  const trialDays = sub.status === "trialing" && sub.trialEnd ? Math.max(0, daysBetween(now, sub.trialEnd)) : 0;
  const pmMonths = paymentMethod ? monthsLeft(paymentMethod, now) : null;
  const expired = pmMonths !== null && pmMonths < 0;
  const expiringSoon = pmMonths !== null && pmMonths >= 0 && pmMonths <= 1;
  const cardFailed = !!paymentMethod?.failure || sub.status === "past_due";
  const ids = {
    usage: `${baseId}-usage`,
    plans: `${baseId}-plans`,
    payment: `${baseId}-payment`,
    details: `${baseId}-details`,
    invoices: `${baseId}-invoices`,
    cancel: `${baseId}-cancel`,
  };

  function comparePlans() {
    const el = document.getElementById(ids.plans);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    plansRef.current?.focus({ preventScroll: true });
  }

  async function updatePayment() {
    const ok = await payment.run(() => onUpdatePayment?.(), "The card form didn’t open. Try again.");
    if (ok) announce("Payment method updated.");
  }

  async function resumePlan() {
    const ok = await resume.run(() => onResume?.(), ended ? "Couldn’t resubscribe. Try again." : "Your plan is still set to end. Try again.");
    if (ok) announce(ended ? `Resubscribed to ${planName}.` : `${planName} renews on ${f.date(sub.periodEnd)} as usual.`);
  }

  async function keepPlan() {
    const ok = await keep.run(() => onChangePlan?.(sub.planId, sub.interval), "The switch is still scheduled. Try again.");
    if (ok) announce(`Staying on ${planName}. The scheduled switch is off.`);
  }

  /* ----- Loading and error take the whole screen ----- */

  const header = (
    <header className={styles.header}>
      <Heading level={level} ref={titleRef} tabIndex={-1} className={styles.title}>
        {title}
      </Heading>
      {description && <p className={styles.lede}>{description}</p>}
    </header>
  );

  if (loading || error) {
    return (
      <div className={cx(styles.root, className)} aria-busy={loading || undefined}>
        {header}
        <div className={styles.placeholder}>
          {loading ? (
            <p className={styles.loadingLine}>
              <span className={styles.sweep}>Loading billing…</span>
            </p>
          ) : (
            <EmptyState
              art="unplugged"
              title="Billing didn’t load"
              description={error}
              titleAs="p"
              action={
                onRetry && (
                  <Button variant="secondary" onClick={onRetry}>
                    Try again
                  </Button>
                )
              }
            />
          )}
        </div>
      </div>
    );
  }

  /* ----- The banner: the one thing that needs doing ----- */

  const updateButton = (variant: "primary" | "secondary", label = paymentMethod ? "Update payment method" : "Add payment method") =>
    onUpdatePayment && !locked ? (
      <Button variant={variant} busy={payment.busy} busyLabel="Opening…" onClick={updatePayment}>
        {label}
      </Button>
    ) : null;

  let banner: ReactNode = null;
  if (sub.status === "past_due") {
    const owed = sub.amountDue !== undefined ? `${f.money(sub.amountDue)} ` : "";
    banner = (
      <Alert
        tone="error"
        title={`Your ${owed}payment didn’t go through`}
        actions={updateButton("primary")}
      >
        <p>
          {paymentMethod?.failure ? `${paymentMethod.failure} ` : ""}
          {sub.nextRetry ? `We’ll try ${paymentMethod ? cardName(paymentMethod) : "again"} on ${f.short(sub.nextRetry)}. ` : ""}
          {sub.graceUntil
            ? `Update your card by ${f.date(sub.graceUntil)} to keep ${planName}. After that the workspace pauses until it’s paid.`
            : `Update your card to keep ${planName}.`}
        </p>
        {payment.error && <p className={styles.bannerError}>{payment.error}</p>}
      </Alert>
    );
  } else if (sub.status === "canceled") {
    banner = (
      <Alert
        tone={ended ? "info" : "warning"}
        title={ended ? `${planName} ended on ${f.date(accessUntil)}` : `${planName} ends on ${f.date(accessUntil)}`}
        actions={
          onResume && !locked ? (
            <Button variant="primary" busy={resume.busy} busyLabel={ended ? "Resubscribing…" : "Keeping…"} onClick={resumePlan}>
              {ended ? `Resubscribe to ${planName}` : "Keep subscription"}
            </Button>
          ) : null
        }
      >
        <p>
          {ended
            ? "Your workspace is read-only. Resubscribe to pick up where you left off; nothing was deleted."
            : `You canceled, so you won’t be charged again. Everyone keeps access until then.`}
        </p>
        {resume.error && <p className={styles.bannerError}>{resume.error}</p>}
      </Alert>
    );
  } else if (sub.status === "trialing") {
    const noCard = paymentMethod === null;
    banner = (
      <Alert
        tone={noCard && trialDays <= 3 ? "warning" : "info"}
        title={
          trialDays === 0
            ? "Your trial ends today"
            : `${trialDays} ${plural(trialDays, "day")} left in your ${planName} trial`
        }
        actions={noCard ? updateButton("primary") : null}
      >
        <p>
          {noCard
            ? `Add a card before ${f.date(accessUntil)} to keep ${planName}. Without one, the workspace goes read-only.`
            : `Your first charge, ${plan ? f.money(priceOf(plan, sub.interval, sub.seats)) : ""}, runs on ${f.date(accessUntil)} on ${paymentMethod ? cardName(paymentMethod) : "your card"}.`}
        </p>
        {payment.error && <p className={styles.bannerError}>{payment.error}</p>}
      </Alert>
    );
  }

  /* ----- Plan card ----- */

  const price = plan ? priceOf(plan, sub.interval, sub.seats) : null;
  const perSeat = plan?.perSeat !== false;
  let planBadge: ReactNode = null;
  if (sub.status === "trialing") planBadge = <Badge size="sm" tone="accent">Trial</Badge>;
  else if (sub.status === "past_due") planBadge = <Badge size="sm" tone="danger" dot>Past due</Badge>;
  else if (sub.status === "canceled") planBadge = <Badge size="sm" tone={ended ? "neutral" : "warning"} dot={!ended}>{ended ? "Ended" : "Canceled"}</Badge>;

  const dateFact: [string, string] =
    sub.status === "trialing"
      ? ["Trial ends", f.date(accessUntil)]
      : sub.status === "canceled"
        ? [ended ? "Ended" : "Access until", f.date(accessUntil)]
        : sub.status === "past_due" && sub.graceUntil
          ? ["Pay by", f.date(sub.graceUntil)]
          : ["Renews", f.date(sub.periodEnd)];

  const planCard = (
    <div className={styles.card}>
      <p className={styles.eyebrow}>Current plan</p>
      <div className={styles.planLine}>
        <span className={styles.currentName}>{planName}</span>
        {planBadge}
      </div>
      {price !== null && (
        <p className={styles.currentPrice}>
          <span className={styles.currentAmount}>{f.money(price)}</span>
          <span className={styles.currentPer}>{sub.interval === "year" ? "per year" : "per month"}</span>
        </p>
      )}
      <dl className={styles.facts}>
        <div>
          <dt>{dateFact[0]}</dt>
          <dd>{dateFact[1]}</dd>
        </div>
        <div>
          <dt>Billed</dt>
          <dd>{sub.interval === "year" ? "Yearly" : "Monthly"}</dd>
        </div>
        <div>
          <dt>Seats</dt>
          <dd>
            {sub.seatsUsed !== undefined ? `${sub.seatsUsed} of ${sub.seats} used` : sub.seats}
            {plan && perSeat && (
              <span className={styles.factNote}>
                {f.money(plan.price[sub.interval])} each
              </span>
            )}
          </dd>
        </div>
      </dl>
      {sub.scheduledChange && (
        <div className={styles.scheduled}>
          <p>
            Switches to <strong>{scheduled?.name ?? sub.scheduledChange.planId}</strong>
            {sub.scheduledChange.interval !== sub.interval ? `, billed ${sub.scheduledChange.interval === "year" ? "yearly" : "monthly"},` : ""} on{" "}
            {f.date(sub.scheduledChange.at)}.
          </p>
          {onChangePlan && !locked && (
            <Button variant="secondary" busy={keep.busy} busyLabel="Keeping…" onClick={keepPlan}>
              Keep {planName}
            </Button>
          )}
          {keep.error && <p className={styles.inlineError}>{keep.error}</p>}
        </div>
      )}
      {!locked && onChangePlan && !ended && (
        <Button variant="ghost" className={styles.cardLink} onClick={comparePlans}>
          Change plan
          <Icon name="arrow-down" className={styles.cardLinkIcon} />
        </Button>
      )}
    </div>
  );

  /* ----- Payment card ----- */

  let cardBadge: ReactNode = null;
  if (expired) cardBadge = <Badge size="sm" tone="danger" dot>Expired</Badge>;
  else if (cardFailed && paymentMethod) cardBadge = <Badge size="sm" tone="danger" dot>Payment failed</Badge>;
  else if (expiringSoon) cardBadge = <Badge size="sm" tone="warning" dot>Expires soon</Badge>;

  const exp = paymentMethod ? `${String(paymentMethod.expMonth).padStart(2, "0")}/${paymentMethod.expYear}` : "";
  let cardLine: ReactNode = null;
  if (paymentMethod) {
    if (paymentMethod.failure) cardLine = <span className={styles.cardProblem}>{paymentMethod.failure}</span>;
    else if (expired) cardLine = <span className={styles.cardProblem}>This card expired. Add a new one so {f.date(sub.periodEnd)}’s charge goes through.</span>;
    else if (expiringSoon) cardLine = <span className={styles.cardWarn}>Update it before {f.date(sub.periodEnd)}, when the next charge runs.</span>;
    else if (sub.status !== "canceled") cardLine = `Charged on ${f.date(sub.status === "trialing" ? accessUntil : sub.periodEnd)}.`;
  }

  const paymentCard =
    paymentMethod === undefined ? null : (
      <div className={styles.card} id={ids.payment}>
        <p className={styles.eyebrow}>Payment method</p>
        {paymentMethod ? (
          <>
            <div className={styles.cardRow}>
              <span className={styles.brand}>{paymentMethod.brand}</span>
              <span className={styles.cardNumber}>
                <span aria-hidden="true">•••• </span>
                <span className={styles.srOnly}>ending in </span>
                {paymentMethod.last4}
              </span>
              {cardBadge}
            </div>
            <p className={styles.cardMeta}>
              {expired ? "Expired" : "Expires"} {exp}
            </p>
            {cardLine && <p className={styles.cardLine}>{cardLine}</p>}
          </>
        ) : (
          <>
            <p className={styles.cardEmpty}>No card on file</p>
            <p className={styles.cardLine}>
              {sub.status === "trialing"
                ? `Add one before ${f.date(accessUntil)} to keep ${planName} after the trial.`
                : "Add one so renewals go through."}
            </p>
          </>
        )}
        {payment.error && (
          <p className={styles.inlineError} role="alert">
            {payment.error}
          </p>
        )}
        {updateButton(cardFailed || expired || paymentMethod === null ? "primary" : "secondary") && (
          <div className={styles.cardAction}>{updateButton(cardFailed || expired || paymentMethod === null ? "primary" : "secondary")}</div>
        )}
      </div>
    );

  /* ----- Screen ----- */

  const canCancel = !locked && !!onCancel && sub.status !== "canceled";

  return (
    <div className={cx(styles.root, className)}>
      {header}

      <div className={styles.content}>
        {(banner || readOnly) && (
          <div className={styles.banners}>
            {readOnly && (
              <Alert tone="info" title="You can view billing, not change it">
                <p>{readOnly}</p>
              </Alert>
            )}
            {banner}
          </div>
        )}

        <div className={styles.overview} data-single={paymentCard ? undefined : ""}>
          {planCard}
          {paymentCard}
        </div>

        {usage && usage.length > 0 && (
          <Section
            id={ids.usage}
            level={level + 1}
            title="Usage"
            intro={
              usage.some((u) => u.resetsAt)
                ? `This period’s use, against what ${planName} includes.`
                : `Against what ${planName} includes.`
            }
          >
            <div className={styles.meters}>
              {usage.map((item) => (
                <Meter key={item.id} item={item} f={f} onCompare={!locked && onChangePlan && !ended ? comparePlans : undefined} />
              ))}
            </div>
          </Section>
        )}

        {plans.length > 0 && (
          <Section
            id={ids.plans}
            level={level + 1}
            title={ended ? "Choose a plan" : "Plans"}
            headingRef={plansRef}
            intro={
              ended
                ? "Pick up where you left off. Nothing was deleted."
                : "Upgrades start now and are prorated. Downgrades wait for the end of the period, so nothing is lost mid-month."
            }
          >
            <Plans
              plans={plans}
              subscription={sub}
              today={now}
              ended={ended}
              f={f}
              chargeTo={paymentMethod ? cardName(paymentMethod) : undefined}
              onChangePlan={onChangePlan}
              blocked={
                sub.status === "past_due"
                  ? "Plans can change once the open invoice is paid."
                  : sub.status === "canceled" && !ended
                    ? "Keep your subscription to change plans."
                    : undefined
              }
              readOnly={locked}
              announce={announce}
              headingId={`${ids.plans}-title`}
              level={level + 2}
            />
          </Section>
        )}

        {details && (
          <Section id={ids.details} level={level + 1} title="Billing details" intro="Printed on every invoice. Changes apply to the next one.">
            <BillingDetails details={details} onSave={onSaveDetails} readOnly={locked} announce={announce} />
          </Section>
        )}

        {invoices && (
          <Section id={ids.invoices} level={level + 1} title="Invoices">
            <Invoices
              invoices={invoices}
              f={f}
              headingId={`${ids.invoices}-title`}
              emptyNote={
                sub.status === "trialing"
                  ? `Your first one arrives on ${f.date(accessUntil)}, when the trial ends.`
                  : `Your first one arrives on ${f.date(sub.periodEnd)}.`
              }
            />
          </Section>
        )}

        {canCancel && (
          <section className={styles.cancelRow} aria-labelledby={`${ids.cancel}-title`}>
            <div className={styles.sectionText}>
              <Heading level={level + 1} id={`${ids.cancel}-title`} className={styles.cancelTitle}>
                Cancel subscription
              </Heading>
              <p className={styles.intro}>
                {planName} stays on until {f.date(accessUntil)}. You can resubscribe any time, and nothing is deleted.
              </p>
            </div>
            <Button ref={cancelRef} variant="secondary" className={styles.cancelButton} onClick={() => setCanceling(true)}>
              Cancel subscription
            </Button>
          </section>
        )}
      </div>

      {onCancel && (
        <CancelDialog
          open={canceling}
          onOpenChange={setCanceling}
          plan={planName}
          until={accessUntil}
          seats={sub.seats}
          notes={cancelNotes}
          f={f}
          onCancel={onCancel}
          announce={announce}
          finalFocus={titleRef}
        />
      )}

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}
