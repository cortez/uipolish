"use client";

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "../button/button";
import { TextField } from "../text-field/text-field";
import { useAction, type BillingDetailsValue, type Result } from "./shared";
import styles from "./billing.module.css";

type Field = "name" | "email" | "taxId" | "line1" | "line2" | "city" | "region" | "postalCode" | "country";

type Draft = Record<Field, string>;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const CHECKS: Partial<Record<Field, (v: string) => string | null>> = {
  name: (v) => (v.trim() ? null : "Add the name invoices are made out to."),
  email: (v) =>
    !v.trim() ? "Add an email for invoices and receipts." : EMAIL.test(v.trim()) ? null : "Add the part after the @, like acme.example.com.",
  line1: (v) => (v.trim() ? null : "Add a street address."),
  city: (v) => (v.trim() ? null : "Add a city."),
  postalCode: (v) => (v.trim() ? null : "Add a postal code."),
  country: (v) => (v.trim() ? null : "Add a country."),
};

function toDraft(d: BillingDetailsValue): Draft {
  return {
    name: d.name,
    email: d.email,
    taxId: d.taxId ?? "",
    line1: d.address.line1,
    line2: d.address.line2 ?? "",
    city: d.address.city,
    region: d.address.region ?? "",
    postalCode: d.address.postalCode,
    country: d.address.country,
  };
}

function fromDraft(d: Draft): BillingDetailsValue {
  const opt = (v: string) => v.trim() || undefined;
  return {
    name: d.name.trim(),
    email: d.email.trim(),
    taxId: opt(d.taxId),
    address: {
      line1: d.line1.trim(),
      line2: opt(d.line2),
      city: d.city.trim(),
      region: opt(d.region),
      postalCode: d.postalCode.trim(),
      country: d.country.trim(),
    },
  };
}

/** "Saturday Supper Ltd, 14 Alder Lane, …" as lines. */
export function addressLines(d: BillingDetailsValue) {
  const a = d.address;
  return [a.line1, a.line2, [a.city, a.region, a.postalCode].filter(Boolean).join(", "), a.country].filter(Boolean) as string[];
}

type DetailsProps = {
  details: BillingDetailsValue;
  onSave?: (details: BillingDetailsValue) => Result;
  readOnly: boolean;
  announce: (line: string) => void;
};

export function BillingDetails({ details, onSave, readOnly, announce }: DetailsProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(details));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const { busy, error, setError, run } = useAction();
  const editRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const refocus = useRef<"form" | "edit" | null>(null);

  useLayoutEffect(() => {
    if (refocus.current === "form") firstRef.current?.focus();
    if (refocus.current === "edit") editRef.current?.focus();
    refocus.current = null;
  }, [editing]);

  function edit() {
    setDraft(toDraft(details));
    setErrors({});
    setError(null);
    refocus.current = "form";
    setEditing(true);
  }

  function close() {
    refocus.current = "edit";
    setEditing(false);
  }

  function set(field: Field, value: string) {
    setDraft((d) => ({ ...d, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const found: Partial<Record<Field, string>> = {};
    for (const [field, check] of Object.entries(CHECKS) as [Field, (v: string) => string | null][]) {
      const message = check(draft[field]);
      if (message) found[field] = message;
    }
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`billing-details-${first}`)?.focus();
      return;
    }
    const ok = await run(() => onSave?.(fromDraft(draft)), "Your details didn’t save. Try again.");
    if (!ok) return;
    announce("Billing details saved. New invoices use them.");
    close();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && !busy) {
      event.stopPropagation();
      close();
    }
  }

  const field = (name: Field, label: string, extra: Partial<Parameters<typeof TextField>[0]> = {}) => (
    <TextField
      id={`billing-details-${name}`}
      label={label}
      value={draft[name]}
      onChange={(e) => set(name, e.currentTarget.value)}
      validate={CHECKS[name]}
      error={errors[name]}
      disabled={busy}
      {...extra}
    />
  );

  if (editing) {
    return (
      <form className={styles.detailsForm} onSubmit={submit} onKeyDown={onKeyDown} noValidate aria-label="Billing details">
        <div className={styles.formGrid}>
          {field("name", "Name on invoices", { ref: firstRef, autoComplete: "organization" })}
          {field("email", "Billing email", { type: "email", autoComplete: "email", hint: "Invoices and receipts go here." })}
          {field("taxId", "Tax ID", { hint: "Optional. VAT, GST or EIN, shown on invoices.", autoComplete: "off" })}
        </div>
        <fieldset className={styles.addressSet} disabled={busy}>
          <legend className={styles.legend}>Address</legend>
          <div className={styles.formGrid}>
            {field("line1", "Street address", { autoComplete: "address-line1" })}
            {field("line2", "Apartment, suite, floor", { autoComplete: "address-line2", hint: "Optional." })}
            {field("city", "City", { autoComplete: "address-level2" })}
            {field("region", "State or region", { autoComplete: "address-level1", hint: "Optional." })}
            {field("postalCode", "Postal code", { autoComplete: "postal-code" })}
            {field("country", "Country", { autoComplete: "country-name" })}
          </div>
        </fieldset>
        <div className={styles.formFoot}>
          <p className={styles.formError} role="alert">
            {error}
          </p>
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" busy={busy} busyLabel="Saving…">
              Save details
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className={styles.detailsView}>
      <dl className={styles.detailsList}>
        <div className={styles.detailsItem}>
          <dt>Name on invoices</dt>
          <dd>{details.name}</dd>
        </div>
        <div className={styles.detailsItem}>
          <dt>Billing email</dt>
          <dd className={styles.breakAll}>{details.email}</dd>
        </div>
        <div className={styles.detailsItem}>
          <dt>Tax ID</dt>
          <dd>{details.taxId || <span className={styles.unset}>Not added</span>}</dd>
        </div>
        <div className={styles.detailsItem}>
          <dt>Address</dt>
          <dd>
            {addressLines(details).map((line, i) => (
              <span key={i} className={styles.addressLine}>
                {line}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      {!readOnly && onSave && (
        <Button ref={editRef} variant="secondary" className={styles.detailsEdit} onClick={edit}>
          Edit details
        </Button>
      )}
    </div>
  );
}
