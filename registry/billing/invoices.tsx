"use client";

import { useState } from "react";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { EmptyState } from "../empty-state/empty-state";
import { Icon } from "../icons/icons";
import type { BillingInvoice, Formatters, InvoiceStatus } from "./shared";
import styles from "./billing.module.css";

const STATUS: Record<InvoiceStatus, { label: string; tone: "positive" | "neutral" | "warning" | "danger" }> = {
  paid: { label: "Paid", tone: "positive" },
  open: { label: "Open", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
};

/** Rows shown before "Show all". */
const FIRST = 6;

type InvoicesProps = {
  invoices: BillingInvoice[];
  f: Formatters;
  /** The line under "No invoices yet". */
  emptyNote: string;
  headingId: string;
};

export function Invoices({ invoices, f, emptyNote, headingId }: InvoicesProps) {
  const [all, setAll] = useState(false);

  if (invoices.length === 0) {
    return <EmptyState size="compact" art="folder" title="No invoices yet" description={emptyNote} titleAs="p" />;
  }

  const shown = all ? invoices : invoices.slice(0, FIRST);
  const more = invoices.length - FIRST;

  return (
    <div className={styles.invoices}>
      <table className={styles.table} aria-labelledby={headingId}>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Invoice</th>
            <th scope="col" className={styles.numeric}>
              Amount
            </th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className={styles.srOnly}>Download</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((inv) => {
            const status = STATUS[inv.status];
            return (
              <tr key={inv.id} data-status={inv.status}>
                <td className={styles.cellDate}>{f.date(inv.date)}</td>
                <td className={styles.cellNumber}>{inv.number}</td>
                <td className={`${styles.numeric} ${styles.cellAmount}`}>
                  <span data-struck={inv.status === "refunded" || undefined}>{f.money(inv.amount)}</span>
                </td>
                <td className={styles.cellStatus}>
                  <Badge size="sm" tone={status.tone} dot={status.tone === "danger" || status.tone === "warning"}>
                    {status.label}
                  </Badge>
                </td>
                <td className={styles.cellDownload}>
                  {inv.href ? (
                    <a
                      href={inv.href}
                      download
                      className={styles.download}
                      aria-label={`Download invoice ${inv.number}, ${f.date(inv.date)}, PDF`}
                    >
                      <Icon name="download" className={styles.downloadIcon} />
                      <span aria-hidden="true">PDF</span>
                    </a>
                  ) : (
                    <span className={styles.preparing}>Preparing…</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {more > 0 && (
        <Button variant="ghost" className={styles.showAll} aria-expanded={all} onClick={() => setAll((a) => !a)}>
          {all ? "Show fewer" : `Show ${more} older ${more === 1 ? "invoice" : "invoices"}`}
        </Button>
      )}
    </div>
  );
}
