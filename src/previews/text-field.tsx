"use client";

import { TextField } from "@registry/text-field/text-field";
import styles from "./preview.module.css";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function TextFieldPreview() {
  return (
    <div className={styles.stack}>
      <form className={styles.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={styles.heading}>Send the invitation</h2>
        <TextField
          label="Guest email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          hint="The invitation and a link to RSVP go here."
          validate={(v) => (isEmail(v) ? null : "Enter an email like name@example.com")}
        />
        <TextField
          label="Dinner address"
          defaultValue="14 Alder Lane"
          hint="Printed on the invitation."
          validate={(v) => (v.trim() ? null : "Add the address of the dinner")}
        />
        <TextField
          label="Venue deposit"
          inputMode="decimal"
          defaultValue="12,400"
          error="Enter a deposit up to the $9,850 total"
        />
        <TextField label="Event ID" defaultValue="EVT-0412" disabled hint="Set automatically." />
      </form>
      <form className={styles.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={styles.heading}>Protect the guest page</h2>
        <TextField
          label="Guest page password"
          type="password"
          autoComplete="new-password"
          defaultValue="alder-supper-1182"
          hint="Guests enter this to see the menu and RSVP."
          validate={(v) => (v.length >= 12 ? null : "Use at least 12 characters")}
        />
        <TextField
          label="Your account password"
          type="password"
          size="lg"
          autoComplete="current-password"
          placeholder="Confirm it’s you"
          hint="Needed to change who can see the event."
        />
      </form>
    </div>
  );
}
