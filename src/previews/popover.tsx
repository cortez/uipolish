"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@registry/button/button";
import { Popover } from "@registry/popover/popover";
import { TextField } from "@registry/text-field/text-field";
import styles from "./preview.module.css";
import local from "./popover.module.css";

const TOTAL = 9850;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function parseAmount(value: string) {
  const n = Number(value.replace(/[$,\s]/g, ""));
  return value.trim() && Number.isFinite(n) ? n : NaN;
}

function checkDeposit(value: string) {
  const n = parseAmount(value);
  if (Number.isNaN(n)) return "Enter an amount like 2,500";
  if (n <= 0) return "Enter an amount above $0";
  if (n > TOTAL) return `Enter a deposit up to the ${money.format(TOTAL)} total`;
  return null;
}

export function PopoverPreview() {
  const titleId = useId();
  const [deposit, setDeposit] = useState(2500);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("2,500");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  function openChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDraft(deposit.toLocaleString("en-US"));
      setError(null);
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const message = checkDeposit(draft);
    setError(message);
    if (message) return;
    setSaving(true);
    window.setTimeout(() => {
      const amount = parseAmount(draft);
      setDeposit(amount);
      setSaving(false);
      setOpen(false);
      setStatus(`Deposit updated to ${money.format(amount)}`);
    }, 700);
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <h2 className={styles.heading}>Booking for the family reunion</h2>
        <dl className={local.popoverSummary}>
          <div className={local.popoverLine}>
            <dt className={local.popoverTerm}>Total</dt>
            <dd className={local.popoverValue}>{money.format(TOTAL)}</dd>
          </div>
          <div className={local.popoverLine}>
            <dt className={local.popoverTerm}>Deposit due on booking</dt>
            <dd className={local.popoverValue}>
              {money.format(deposit)}
              <Popover
                open={open}
                onOpenChange={openChange}
                labelledBy={titleId}
                align="end"
                trigger={
                  <Button variant="secondary">
                    Edit
                  </Button>
                }
              >
                {({ close }) => (
                  <form className={local.popoverForm} noValidate onSubmit={save}>
                    <h3 id={titleId} className={local.popoverTitle}>
                      Edit deposit
                    </h3>
                    <TextField
                      label="Amount"
                      inputMode="decimal"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.currentTarget.value);
                        if (error) setError(checkDeposit(e.currentTarget.value));
                      }}
                      error={error}
                      hint={`Up to the ${money.format(TOTAL)} total.`}
                    />
                    <div className={local.popoverActions}>
                      <Button variant="ghost" onClick={close}>
                        Cancel
                      </Button>
                      <Button type="submit" busy={saving}>
                        Save deposit
                      </Button>
                    </div>
                  </form>
                )}
              </Popover>
            </dd>
          </div>
          <div className={local.popoverLine}>
            <dt className={local.popoverTerm}>
              Card processing fee
              <Popover
                focus="none"
                side="top"
                arrow
                trigger={
                  <Button variant="ghost" size="sm" className={local.popoverInfo} aria-label="About the card processing fee">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" style={{ strokeWidth: "var(--ui-icon-stroke)" }} strokeLinecap="round" aria-hidden="true">
                      <circle cx="8" cy="8" r="6.25" />
                      <path d="M8 7.25v3.5" />
                      <circle cx="8" cy="5" r="0.4" fill="currentColor" />
                    </svg>
                  </Button>
                }
              >
                <div className={local.popoverExplain}>
                  <strong>2.9% of the total</strong>
                  <p>Charged by the card network when you pay by card. A bank transfer has no fee.</p>
                </div>
              </Popover>
            </dt>
            <dd className={local.popoverValue}>{money.format(TOTAL * 0.029)}</dd>
          </div>
        </dl>
        <span role="status" className={styles.srOnly}>
          {status}
        </span>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Focus</h2>
        <p className={styles.note}>
          Edit moves focus into the form and returns it to the button on Escape, Cancel, Save or a press outside. The
          fee explanation has nothing to operate, so focus stays on the info button.
        </p>
      </section>
    </div>
  );
}
