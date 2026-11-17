"use client";

import { useId, useState } from "react";
import { FieldMessage } from "@registry/field/field";
import { Icon } from "@registry/icons/icons";
import field from "@registry/field/field.module.css";
import base from "./preview.module.css";
import styles from "./field.module.css";

export function FieldPreview() {
  const id = useId();
  const [guests, setGuests] = useState("16");
  const n = Number(guests);
  const error = guests === "" ? "Enter how many guests are coming" : n > 12 ? "The table seats 12. Remove a guest or add a table." : null;
  const step = (d: number) => setGuests(String(Math.max(0, (Number(guests) || 0) + d)));

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>Label, shell, inset buttons and a message line</h2>
        <div className={base.form}>
          <div className={field.field}>
            <label className={field.label} htmlFor={id}>
              Guests
            </label>
            <div className={styles.shell} data-invalid={error ? "" : undefined}>
              <input
                id={id}
                className={styles.input}
                inputMode="numeric"
                value={guests}
                onChange={(e) => setGuests(e.target.value.replace(/\D/g, ""))}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${id}-message`}
              />
              <button type="button" className={styles.step} aria-label="One fewer guest" onClick={() => step(-1)}>
                <Icon name="minus" />
              </button>
              <button type="button" className={styles.step} aria-label="One more guest" onClick={() => step(1)}>
                <Icon name="plus" />
              </button>
            </div>
            <FieldMessage id={`${id}-message`} hint="The table seats 12." error={error} />
          </div>
        </div>
        <p className={base.note}>Go above 12: the hint and the error trade places and nothing below moves.</p>
      </section>
    </div>
  );
}
