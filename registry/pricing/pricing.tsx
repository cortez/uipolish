"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Accordion, AccordionItem } from "../accordion/accordion";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { ButtonLink } from "../button/button-link";
import { Icon } from "../icons/icons";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import { Compare } from "./compare";
import { IntervalSwap, RollingFigure } from "./price";
import {
  ctaOf,
  isFree,
  monthlyOf,
  useFormatters,
  useSelect,
  yearlySaving,
  type Formatters,
  type Origin,
  type PricingEnterprise,
  type PricingFaq,
  type PricingFeatureGroup,
  type PricingInterval,
  type PricingPlan,
  type Result,
} from "./shared";
import styles from "./pricing.module.css";

export type {
  PricingEnterprise,
  PricingFaq,
  PricingFeatureGroup,
  PricingFeatureRow,
  PricingInterval,
  PricingPlan,
  PricingUsage,
  PricingValue,
} from "./shared";

export type PricingProps = {
  /** The plans on offer, cheapest first. Three read best; one may be `featured`. */
  plans: PricingPlan[];
  /** The comparison table, in groups. Leave out to drop it. */
  features?: PricingFeatureGroup[];
  /** Questions and answers under the table. Leave out to drop them. */
  faq?: PricingFaq[];
  /** A row under the plans for custom contracts. Its button links to `contactHref`. */
  enterprise?: PricingEnterprise;
  /** Where "Talk to us" goes: a contact form, a calendar link or a `mailto:`. */
  contactHref?: string;

  /** ISO 4217. Default "USD". */
  currency?: string;
  /** Fixed so server and browser format alike. Default "en-US". */
  locale?: string;
  /** The period shown first. Default "month". */
  defaultInterval?: PricingInterval;
  /** Control the period yourself, e.g. to keep it in the URL. */
  interval?: PricingInterval;
  onIntervalChange?: (interval: PricingInterval) => void;

  /** The signed-in workspace's plan: "Current plan" in place of its button. */
  currentPlanId?: string;
  /** A plan was chosen. Return a promise (start checkout, then navigate) to show busy on that button; a rejection shows its message. */
  onSelect?: (planId: string, interval: PricingInterval) => Result;

  /** Default "Pricing". */
  title?: ReactNode;
  description?: ReactNode;
  /** The title's level; plan names and sections are one below. Default 2. */
  headingLevel?: 1 | 2 | 3 | 4;
  className?: string;
};

function Heading({ level, ...props }: { level: number } & ComponentProps<"h2">) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as "h2";
  return <Tag {...props} />;
}

/** A public pricing section: plans with a monthly/yearly switch, a comparison table and questions. */
export function Pricing({
  plans,
  features,
  faq,
  enterprise,
  contactHref,
  currency = "USD",
  locale = "en-US",
  defaultInterval = "month",
  interval: controlledInterval,
  onIntervalChange,
  currentPlanId,
  onSelect,
  title = "Pricing",
  description,
  headingLevel = 2,
  className,
}: PricingProps) {
  const id = useId();
  const f = useFormatters(locale, currency);
  const [ownInterval, setOwnInterval] = useState<PricingInterval>(defaultInterval);
  const interval = controlledInterval ?? ownInterval;
  const { pending, error, select } = useSelect(onSelect);

  const saving = Math.max(0, ...plans.map(yearlySaving));
  const hasYearly = plans.some((p) => !isFree(p) && p.price.year !== p.price.month * 12) || saving > 0;
  const titleId = `${id}-title`;
  const plansLevel = headingLevel + 1;

  function changeInterval(next: string) {
    const value = next as PricingInterval;
    if (controlledInterval === undefined) setOwnInterval(value);
    onIntervalChange?.(value);
  }

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root} data-count={Math.min(plans.length, 4)}>
      <div className={styles.header}>
        <Heading level={headingLevel} id={titleId} className={styles.title}>
          {title}
        </Heading>
        {description && <p className={styles.lede}>{description}</p>}
        {hasYearly && (
          <SegmentedControl
            aria-label="Billing period"
            value={interval}
            widths="content"
            className={styles.switch}
            onValueChange={changeInterval}
          >
            <Segment value="month">Monthly</Segment>
            <Segment value="year">
              Yearly
              {saving > 0.005 && <span className={styles.saving}>Save {f.percent(saving)}</span>}
            </Segment>
          </SegmentedControl>
        )}
      </div>

      <ul className={styles.plans} aria-labelledby={titleId}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            plans={plans}
            interval={interval}
            f={f}
            level={plansLevel}
            idBase={id}
            isCurrent={plan.id === currentPlanId}
            busy={pending?.planId === plan.id && pending.origin === "card"}
            locked={!!pending}
            canSelect={!!onSelect}
            error={error?.planId === plan.id && error.origin === "card" ? error.message : null}
            onChoose={() => select(plan.id, interval, "card")}
          />
        ))}
      </ul>

      {enterprise && <EnterpriseRow enterprise={enterprise} contactHref={contactHref} level={plansLevel} idBase={id} />}

      {features && features.length > 0 && (
        <Compare
          plans={plans}
          groups={features}
          interval={interval}
          f={f}
          currentPlanId={currentPlanId}
          pending={pending}
          canSelect={!!onSelect}
          onSelect={(planId: string, origin: Origin) => select(planId, interval, origin)}
          headingId={`${id}-compare`}
          level={plansLevel}
        />
      )}

      {faq && faq.length > 0 && <Questions faq={faq} contactHref={contactHref} level={plansLevel} headingId={`${id}-faq`} />}
    </div>
  );
}

/* ---------- Plan card ---------- */

function PlanCard({
  plan,
  plans,
  interval,
  f,
  level,
  idBase,
  isCurrent,
  busy,
  locked,
  canSelect,
  error,
  onChoose,
}: {
  plan: PricingPlan;
  plans: PricingPlan[];
  interval: PricingInterval;
  f: Formatters;
  level: number;
  idBase: string;
  isCurrent: boolean;
  busy: boolean;
  locked: boolean;
  canSelect: boolean;
  error: string | null;
  onChoose: () => void;
}) {
  const nameId = `${idBase}-${plan.id}`;
  const errorId = `${nameId}-error`;
  const free = isFree(plan);
  const month = f.money(monthlyOf(plan, "month"));
  const year = f.money(monthlyOf(plan, "year"));
  const shown = interval === "year" ? year : month;
  const per = plan.perSeat ? "per seat / month" : "/ month";
  const base = plan.includes ? plans.find((p) => p.id === plan.includes) : undefined;
  const yearTotal = f.money(plan.price.year);

  return (
    <li className={styles.plan} data-featured={plan.featured || undefined} data-current={isCurrent || undefined} aria-labelledby={nameId}>
      <div className={styles.planHead}>
        <Heading level={level} id={nameId} className={styles.planName}>
          {plan.name}
        </Heading>
        {plan.featured && (
          <Badge size="sm" tone="accent">
            {plan.badge ?? "Most popular"}
          </Badge>
        )}
      </div>
      {plan.description ? <p className={styles.planDescription}>{plan.description}</p> : <span />}

      <div className={styles.priceBlock}>
        <p className={styles.price}>
          <RollingFigure
            className={styles.amount}
            month={month}
            year={year}
            interval={interval}
            label={`${shown} ${plan.perSeat ? "per seat per month" : "a month"}`}
          />
          <span className={styles.per} aria-hidden="true">
            {per}
          </span>
        </p>
        <p className={styles.billed}>
          <IntervalSwap
            interval={interval}
            month={free ? "Free forever" : "Billed monthly"}
            year={free ? "Free forever" : `${yearTotal}${plan.perSeat ? " per seat" : ""}, billed yearly`}
          />
        </p>
      </div>

      <div className={styles.action}>
        {isCurrent ? (
          <p className={styles.current}>
            <Icon name="check" className={styles.currentIcon} />
            Current plan
          </p>
        ) : canSelect ? (
          <Button
            variant={plan.featured ? "primary" : "secondary"}
            block
            busy={busy}
            disabled={locked && !busy}
            aria-describedby={error ? errorId : undefined}
            onClick={onChoose}
          >
            {ctaOf(plan)}
          </Button>
        ) : null}
        {error && (
          <p id={errorId} className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>

      {plan.usage ? (
        <p className={styles.usage}>
          <span className={styles.usageIncluded}>
            <strong className={styles.usageAmount}>{f.number(plan.usage.included)}</strong> {plan.usage.unit} a month
          </span>
          <span className={styles.usageMore}>
            {plan.usage.overage
              ? `then ${f.money(plan.usage.overage.price)} per ${f.number(plan.usage.overage.per)} ${plan.usage.unit}`
              : (plan.usage.atLimit ?? "Pauses at the limit until next month")}
          </span>
        </p>
      ) : (
        <span className={styles.usage} data-empty="" />
      )}

      <div className={styles.features}>
        {base && <p className={styles.featuresLead}>Everything in {base.name}, plus</p>}
        <ul className={styles.featureList} aria-label={`${plan.name} includes`}>
          {plan.features.map((feature) => (
            <li key={feature}>
              <Icon name="check" className={styles.featureIcon} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

/* ---------- Enterprise ---------- */

function EnterpriseRow({
  enterprise,
  contactHref,
  level,
  idBase,
}: {
  enterprise: PricingEnterprise;
  contactHref?: string;
  level: number;
  idBase: string;
}) {
  const nameId = `${idBase}-enterprise`;
  return (
    <section className={styles.enterprise} aria-labelledby={nameId}>
      <div className={styles.enterpriseText}>
        <Heading level={level} id={nameId} className={styles.planName}>
          {enterprise.name ?? "Enterprise"}
        </Heading>
        <p className={styles.planDescription}>{enterprise.description}</p>
        {contactHref && (
          <ButtonLink href={contactHref} variant="secondary" className={styles.enterpriseButton}>
            {enterprise.cta ?? "Talk to us"}
          </ButtonLink>
        )}
      </div>
      {enterprise.features && enterprise.features.length > 0 && (
        <ul className={styles.enterpriseList} aria-label={`${enterprise.name ?? "Enterprise"} includes`}>
          {enterprise.features.map((feature) => (
            <li key={feature}>
              <Icon name="check" className={styles.featureIcon} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Questions ---------- */

function Questions({
  faq,
  contactHref,
  level,
  headingId,
}: {
  faq: PricingFaq[];
  contactHref?: string;
  level: number;
  headingId: string;
}) {
  const itemLevel = Math.min(Math.max(level + 1, 2), 6) as 2 | 3 | 4 | 5 | 6;
  return (
    <section className={styles.faq} aria-labelledby={headingId}>
      <div className={styles.faqIntro}>
        <Heading level={level} id={headingId} className={styles.sectionTitle}>
          Questions
        </Heading>
        {contactHref && (
          <p className={styles.faqLede}>
            Something else?{" "}
            <a className={styles.link} href={contactHref}>
              Talk to us
            </a>
            .
          </p>
        )}
      </div>
      <div className={styles.faqCard}>
        <Accordion type="single" collapsible headingLevel={itemLevel} className={styles.faqList}>
          {faq.map((item, i) => (
            <AccordionItem key={item.question} value={`q${i}`} title={item.question}>
              {item.answer}
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
