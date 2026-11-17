"use client";

import { useState } from "react";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import { toast } from "../toast/toast";
import { Tooltip } from "../tooltip/tooltip";
import { IntervalSwap } from "./price";
import {
  ctaOf,
  isFree,
  monthlyOf,
  type Formatters,
  type Origin,
  type PricingFeatureGroup,
  type PricingInterval,
  type PricingPlan,
  type PricingValue,
} from "./shared";
import styles from "./pricing.module.css";

type CompareProps = {
  plans: PricingPlan[];
  groups: PricingFeatureGroup[];
  interval: PricingInterval;
  f: Formatters;
  currentPlanId?: string;
  pending: { planId: string; origin: Origin } | null;
  canSelect: boolean;
  onSelect: (planId: string, origin: Origin) => Promise<string | null>;
  headingId: string;
  level: number;
};

/**
 * The full comparison: a real table with one column per plan and a header
 * that sticks while it scrolls past. In a narrow container it shows one plan
 * at a time, picked above the table, instead of scrolling sideways.
 */
export function Compare({
  plans,
  groups,
  interval,
  f,
  currentPlanId,
  pending,
  canSelect,
  onSelect,
  headingId,
  level,
}: CompareProps) {
  const featured = plans.find((p) => p.featured) ?? plans[0];
  const [picked, setPicked] = useState(featured?.id ?? "");
  const Heading = `h${Math.min(level, 6)}` as "h2";

  async function choose(planId: string) {
    const message = await onSelect(planId, "table");
    // The header is sticky and tight: a failure there goes to a toast, where it can be read in full.
    if (message) toast.error(message);
  }

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <Heading id={headingId} className={styles.sectionTitle}>
        Compare plans
      </Heading>

      <div className={styles.compare}>
        <div className={styles.picker}>
          <SegmentedControl aria-label="Plan to show" value={picked} onValueChange={setPicked} widths="equal">
            {plans.map((plan) => (
              <Segment key={plan.id} value={plan.id}>
                {plan.name}
              </Segment>
            ))}
          </SegmentedControl>
        </div>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Features of each plan</caption>
            <colgroup>
              <col className={styles.labelCol} />
              {plans.map((plan) => (
                <col key={plan.id} data-off={plan.id !== picked || undefined} />
              ))}
            </colgroup>
            <thead className={styles.thead}>
              <tr>
                <td className={styles.corner} />
                {plans.map((plan) => {
                  const isCurrent = plan.id === currentPlanId;
                  const busy = pending?.planId === plan.id && pending.origin === "table";
                  return (
                    <th key={plan.id} scope="col" className={styles.planHeadCell} data-off={plan.id !== picked || undefined}>
                      <span className={styles.headName}>{plan.name}</span>
                      <span className={styles.headPrice}>
                        {isFree(plan) ? (
                          `${f.money(0)}, free forever`
                        ) : (
                          <IntervalSwap
                            interval={interval}
                            month={`${f.money(monthlyOf(plan, "month"))} / month`}
                            year={`${f.money(monthlyOf(plan, "year"))} / month, yearly`}
                          />
                        )}
                      </span>
                      {isCurrent ? (
                        <span className={styles.headCurrent}>
                          <Icon name="check" className={styles.currentIcon} />
                          Current plan
                        </span>
                      ) : canSelect ? (
                        <Button
                          variant={plan.featured ? "primary" : "secondary"}
                          className={styles.headButton}
                          busy={busy}
                          disabled={!!pending && !busy}
                          onClick={() => choose(plan.id)}
                          aria-label={`${ctaOf(plan)}, billed ${interval === "year" ? "yearly" : "monthly"}`}
                        >
                          {ctaOf(plan)}
                        </Button>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.title} className={styles.group}>
                <tr>
                  <th scope="colgroup" colSpan={plans.length + 1} className={styles.groupTitle}>
                    {group.title}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className={styles.row}>
                    <th scope="row" className={styles.rowLabel}>
                      <RowLabel label={row.label} hint={row.hint} />
                    </th>
                    {plans.map((plan) => (
                      <td key={plan.id} className={styles.cell} data-off={plan.id !== picked || undefined}>
                        <Value value={row.values[plan.id]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </section>
  );
}

/** The hint's glyph stays on the line with the label's last word, never alone on a line. */
function RowLabel({ label, hint }: { label: string; hint?: string }) {
  if (!hint) return <span className={styles.rowLabelText}>{label}</span>;
  const cut = label.lastIndexOf(" ");
  const head = cut > 0 ? label.slice(0, cut + 1) : "";
  const last = cut > 0 ? label.slice(cut + 1) : label;
  return (
    <span className={styles.rowLabelText}>
      {head}
      <span className={styles.nowrap}>
        {last}
        <Tooltip content={hint}>
          <button type="button" className={styles.hint} aria-label={`About ${label}`}>
            <Icon name="info" />
          </button>
        </Tooltip>
      </span>
    </span>
  );
}

function Value({ value }: { value: PricingValue | undefined }) {
  if (value === true)
    return (
      <>
        <Icon name="check" className={styles.yes} />
        <span className={styles.srOnly}>Included</span>
      </>
    );
  if (value === false || value === undefined || value === "")
    return (
      <>
        <Icon name="minus" className={styles.no} />
        <span className={styles.srOnly}>Not included</span>
      </>
    );
  return <span className={styles.valueText}>{value}</span>;
}
