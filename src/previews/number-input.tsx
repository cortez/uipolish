"use client";

import { useState } from "react";
import { NumberInput } from "@registry/number-input/number-input";
import { TextField } from "@registry/text-field/text-field";
import base from "./preview.module.css";
import styles from "./number-input.module.css";

const USD = { style: "currency", currency: "USD" } as const;
const EUR = { style: "currency", currency: "EUR" } as const;
const HOURS = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;

export function NumberInputPreview() {
  const [hours, setHours] = useState(6.5);
  const [rate, setRate] = useState(85);
  const [deposit, setDeposit] = useState(40);

  return (
    <div className={base.stack}>
      <form className={base.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={base.heading}>Saturday supper</h2>
        <NumberInput label="Guests" name="guests" defaultValue={6} min={1} max={12} hint="The long table seats 12." />
      </form>
      <section className={base.group}>
        <h2 className={base.label}>Server for the evening</h2>
        <div className={styles.line}>
          <NumberInput label="Hours" value={hours} onValueChange={setHours} min={0} max={80} step={0.25} format={HOURS} />
          <NumberInput label="Rate" value={rate} onValueChange={setRate} min={0} step={5} format={USD} className={styles.wide} />
          <p className={styles.total}>
            <span className={base.note}>Line total</span>
            <span className={styles.amount}>{new Intl.NumberFormat(undefined, USD).format(hours * rate)}</span>
          </p>
        </div>
        <NumberInput label="Printed menus" defaultValue={2} min={1} max={5} disabled hint="Printing opens once the menu is final." />
      </section>
      <form className={base.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={base.label}>Money, without steppers</h2>
        <TextField label="Paid by" defaultValue="Priya Natarajan" />
        <NumberInput
          label="Deposit per guest"
          value={deposit}
          onValueChange={setDeposit}
          min={0}
          max={500}
          format={USD}
          steppers={false}
          hint="Arrow keys still step by a dollar."
          className={styles.full}
        />
        <NumberInput
          label="Wine for the table"
          defaultValue={86.5}
          min={0}
          format={EUR}
          locale="de-DE"
          steppers={false}
          arrowKeys={false}
          hint="Typed only. The euro sign stays at the end."
          className={styles.full}
        />
      </form>
    </div>
  );
}
