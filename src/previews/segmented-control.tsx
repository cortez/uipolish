"use client";

import { useState } from "react";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import base from "./preview.module.css";
import styles from "./segmented-control.module.css";

const REVENUE = {
  week: { total: "$248.40", note: "Oct 17 to Oct 23" },
  month: { total: "$912.55", note: "Oct 1 to Oct 23" },
  quarter: { total: "$2,806.10", note: "Jul 1 to Oct 23" },
  year: { total: "$9,744.00", note: "Jan 1 to Oct 23" },
} as const;

type Range = keyof typeof REVENUE;

export function SegmentedControlPreview() {
  const [range, setRange] = useState<Range>("month");
  const [billing, setBilling] = useState("yearly");

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.toolbar}>
          <h2 className={base.heading}>Household spending</h2>
          <SegmentedControl aria-label="Date range" value={range} onValueChange={(v) => setRange(v as Range)}>
            <Segment value="week">Week</Segment>
            <Segment value="month">Month</Segment>
            <Segment value="quarter">Quarter</Segment>
            <Segment value="year">Year</Segment>
          </SegmentedControl>
        </div>
        <div className={styles.stat}>
          <span className={styles.total}>{REVENUE[range].total}</span>
          <span className={base.note}>Shared groceries, {REVENUE[range].note}</span>
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Content widths, in a form</h2>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <SegmentedControl
            aria-label="Billing period"
            name="billing"
            widths="content"
            value={billing}
            onValueChange={setBilling}
          >
            <Segment value="monthly">Monthly</Segment>
            <Segment value="yearly">Yearly, save 15%</Segment>
            <Segment value="custom" disabled>
              Custom
            </Segment>
          </SegmentedControl>
          <p className={base.note}>
            {billing === "yearly" ? "$228 billed once a year." : "$22 billed every month."} Custom terms come with
            the Household plan.
          </p>
        </form>
      </section>
    </div>
  );
}
