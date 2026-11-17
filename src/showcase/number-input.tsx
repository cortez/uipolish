"use client";

import { useState } from "react";
import { NumberInput } from "@registry/number-input/number-input";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [deposit, setDeposit] = useState(25);

  return (
    <div className={styles.stack}>
      <NumberInput label="Guests" name="guests" defaultValue={6} min={1} max={12} hint="The long table seats 12." />
      <NumberInput
        label="Deposit per guest"
        value={deposit}
        onValueChange={setDeposit}
        step={5}
        min={0}
        format={{ style: "currency", currency: "USD" }}
      />
    </div>
  );
}
