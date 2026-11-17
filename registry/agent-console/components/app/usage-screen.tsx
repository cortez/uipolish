"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table/data-table";
import { EmptyState } from "@/components/ui/empty-state/empty-state";
import { Stat } from "@/components/ui/stat/stat";
import { UsageBreakdown } from "@/components/ui/usage-meter/usage-meter";
import type { AgentUsage, UsageReport } from "@/lib/service";
import { useConsole } from "./console-context";
import { Page } from "./page-bar";
import { useResource } from "./use-live";
import styles from "./screens.module.css";

/* Usage: this month's spend against the workspace's limit (Settings →
   Models), split by agent, with the figures behind it and a row per agent.
   It refreshes every ten seconds while runs go on. Point it at your billing
   provider's metered usage once runs cost real money. */

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en-US");

const COLUMNS: DataTableColumn<AgentUsage>[] = [
  { key: "name", header: "Agent", width: 200, minWidth: 140, sortable: true },
  { key: "runs", header: "Runs", width: 96, align: "end", sortable: true, cell: (r) => whole.format(r.runs) },
  { key: "failed", header: "Failed", width: 96, align: "end", sortable: true, cell: (r) => whole.format(r.failed) },
  { key: "tokens", header: "Tokens", width: 112, align: "end", sortable: true, cell: (r) => compact.format(r.tokens) },
  { key: "cost", header: "Spend", width: 112, align: "end", sortable: true, cell: (r) => money.format(r.cost) },
];

export function UsageScreen({ initial }: { initial?: UsageReport }) {
  const { api, go } = useConsole();
  const fetch = useCallback(() => api.usage(), [api]);
  const { data: report, error, reload: load } = useResource(initial, fetch, 10_000, "Usage didn’t load.");

  const segments = useMemo(() => report?.byAgent.map((a) => ({ id: a.id, label: a.name, value: a.cost })) ?? [], [report]);
  const successRate = report && report.runs ? Math.round(((report.runs - report.failed) / report.runs) * 100) : null;

  return (
    <Page
      actions={
        <Button variant="secondary" onClick={() => go({ screen: "settings" })}>
          Change limit
        </Button>
      }
    >
      <header className={styles.head}>
        <h1 className={styles.title}>Usage</h1>
        <p className={styles.lede}>{report ? `${report.period}, so far. Every run’s model calls, priced per token.` : "This month, so far."}</p>
      </header>
      {!report ? (
        <div className={styles.state}>
          {error ? (
            <EmptyState art="unplugged" title="Usage didn’t load" description={error} action={<Button onClick={load}>Try again</Button>} />
          ) : (
            <p className={styles.loading}>Loading usage…</p>
          )}
        </div>
      ) : (
        <div className={styles.usage}>
          <div className={styles.stats}>
            <Stat label="Spend" value={report.spent} format={(n) => money.format(n)} hint={`Of ${money.format(report.limit)} this month.`} />
            <Stat label="Runs" value={report.runs} hint="From people and schedules." />
            <Stat label="Tokens" value={report.tokens} format={(n) => compact.format(n)} hint="In and out." />
            <Stat label="Succeeded" value={successRate === null ? "None yet" : `${successRate}%`} hint={`${whole.format(report.failed)} failed this month.`} />
          </div>

          <section className={styles.card} aria-label="Spend this month">
            <UsageBreakdown
              kind="money"
              label="Spend this month"
              used={report.spent}
              limit={report.limit}
              period="this month"
              segments={segments}
              thresholds={{ warning: report.alertAt / 100 }}
              messages={{
                warning: `Past the ${report.alertAt}% alert. Admins were told; runs go on until the limit.`,
                danger: "Close to the limit. At it, new runs wait until next month or a higher limit.",
              }}
            />
          </section>

          <section className={styles.section} aria-labelledby="usage-agents">
            <h2 id="usage-agents" className={styles.sectionTitle}>
              By agent
            </h2>
            <DataTable
              aria-labelledby="usage-agents"
              className={styles.table}
              columns={COLUMNS}
              rows={report.byAgent}
              getRowId={(r) => r.id}
              getRowLabel={(r) => r.name}
              defaultSort={{ key: "cost", direction: "descending" }}
              stickyFirstColumn
            />
          </section>
        </div>
      )}
    </Page>
  );
}
