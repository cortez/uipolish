"use client";

import { useId, useState } from "react";
import { FieldMessage } from "@registry/field/field";
import field from "@registry/field/field.module.css";
import text from "@registry/text-field/text-field.module.css";
import styles from "./showcase.module.css";

export default function Showcase() {
  const id = useId();
  const [guests, setGuests] = useState("8");
  const error = guests === "" ? "Enter how many guests are coming" : Number(guests) > 12 ? "The table seats 12" : null;

  return (
    <div className={styles.stack}>
      <div className={field.field}>
        <label className={field.label} htmlFor={id}>
          Guests
        </label>
        <div className={text.control}>
          <input
            id={id}
            className={text.input}
            inputMode="numeric"
            value={guests}
            onChange={(e) => setGuests(e.target.value.replace(/\D/g, ""))}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-message`}
          />
        </div>
        <FieldMessage id={`${id}-message`} hint="The table seats 12." error={error} />
      </div>
    </div>
  );
}
