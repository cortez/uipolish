"use client";

import { useState } from "react";
import { Select } from "@registry/select/select";
import base from "./preview.module.css";
import styles from "./select.module.css";

const TERMS = [
  { value: "receipt", label: "No deadline" },
  { value: "net15", label: "2 days before", description: "Leaves time to shop" },
  { value: "net30", label: "1 week before", description: "Suits a set menu" },
  { value: "net60", label: "2 weeks before", description: "Suits a catered event" },
];

const CURRENCIES = [
  { label: "Most used", options: [
    { value: "USD", label: "US dollar (USD)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "GBP", label: "British pound (GBP)" },
  ] },
  { label: "All currencies", options: [
    { value: "AUD", label: "Australian dollar (AUD)" },
    { value: "BRL", label: "Brazilian real (BRL)" },
    { value: "CAD", label: "Canadian dollar (CAD)" },
    { value: "CHF", label: "Swiss franc (CHF)" },
    { value: "DKK", label: "Danish krone (DKK)" },
    { value: "INR", label: "Indian rupee (INR)" },
    { value: "JPY", label: "Japanese yen (JPY)" },
    { value: "MXN", label: "Mexican peso (MXN)" },
    { value: "NOK", label: "Norwegian krone (NOK)" },
    { value: "NZD", label: "New Zealand dollar (NZD)" },
    { value: "SEK", label: "Swedish krona (SEK)" },
    { value: "SGD", label: "Singapore dollar (SGD)" },
  ] },
];

const REMINDERS = [
  { value: "none", label: "Don’t send reminders" },
  { value: "due", label: "On the deadline" },
  { value: "weekly", label: "Every week until the deadline" },
  { value: "custom", label: "Custom schedule", disabled: true, description: "Available on the Household plan" },
];

const SORTS = [
  { value: "due", label: "Date" },
  { value: "amount", label: "Guests" },
  { value: "client", label: "Host" },
];

export function SelectPreview() {
  const [sort, setSort] = useState("due");

  return (
    <div className={base.stack}>
      <form className={base.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={base.heading}>New event</h2>
        <Select label="RSVP deadline" name="terms" options={TERMS} defaultValue="net30" hint="Printed on the invitation." />
        <Select
          label="Currency"
          name="currency"
          options={CURRENCIES}
          defaultValue="USD"
          hint="Ticket prices and the payment link use it."
        />
        <Select
          label="Reminders"
          name="reminders"
          options={REMINDERS}
          placeholder="Choose when to remind"
          hint="Sent from hosts@example.com."
          validate={(v) => (v ? null : "Choose when to remind guests, or turn reminders off")}
        />
        <Select
          label="Tax region"
          options={[{ value: "ca-on", label: "Ontario, 13% HST" }]}
          defaultValue="ca-on"
          disabled
          hint="Set from your home address."
        />
      </form>

      <section className={base.group}>
        <h2 className={base.label}>Compact, in a toolbar</h2>
        <div className={styles.toolbar}>
          <span className={base.note}>23 upcoming events</span>
          <div className={styles.sort}>
            <span className={base.note} aria-hidden="true">
              Sort by
            </span>
            <Select size="sm" aria-label="Sort events by" options={SORTS} value={sort} onValueChange={setSort} />
          </div>
        </div>
      </section>
    </div>
  );
}
