"use client";

import { useState } from "react";
import { Checkbox } from "@registry/checkbox/checkbox";
import base from "./preview.module.css";
import styles from "./checkbox.module.css";

const STATUSES = [
  { id: "draft", label: "Not invited yet", count: 4 },
  { id: "sent", label: "Awaiting reply", count: 12 },
  { id: "overdue", label: "Declined", count: 3 },
  { id: "paid", label: "Going", count: 41 },
] as const;

export function CheckboxPreview() {
  const [shown, setShown] = useState<string[]>(["sent", "overdue"]);
  const [attach, setAttach] = useState(true);
  const all = shown.length === STATUSES.length;
  const some = shown.length > 0 && !all;
  const total = STATUSES.filter((s) => shown.includes(s.id)).reduce((n, s) => n + s.count, 0);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>Guest filters</h2>
        <fieldset className={styles.fieldset}>
          <legend className={base.label}>Status</legend>
          <Checkbox
            label="All statuses"
            checked={all}
            indeterminate={some}
            aria-controls={STATUSES.map((s) => `status-${s.id}`).join(" ")}
            // From mixed, a click checks everything; from all, it clears.
            onCheckedChange={() => setShown(all ? [] : STATUSES.map((s) => s.id))}
          />
          <div className={styles.children}>
            {STATUSES.map((s) => (
              <Checkbox
                key={s.id}
                id={`status-${s.id}`}
                name="status"
                value={s.id}
                label={
                  <span className={styles.option}>
                    {s.label}
                    <span className={styles.count}>{s.count}</span>
                  </span>
                }
                checked={shown.includes(s.id)}
                onCheckedChange={(on) => setShown((v) => (on ? [...v, s.id] : v.filter((x) => x !== s.id)))}
              />
            ))}
          </div>
        </fieldset>
        <p className={base.note} aria-live="polite">
          {total === 0 ? "Pick a status to see guests." : `Showing ${total} guests.`}
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>With a description</h2>
        <div className={styles.options}>
          <Checkbox
            label="Attach the menu to reminder emails"
            description="Guests can read it without signing in."
            checked={attach}
            onCheckedChange={setAttach}
          />
          <Checkbox
            label="Charge a fee for no-shows"
            description="Set a ticket price in Event settings first."
            disabled
          />
        </div>
      </section>
    </div>
  );
}
