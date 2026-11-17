"use client";

import { useState } from "react";
import { Slider } from "@registry/slider/slider";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [deposit, setDeposit] = useState(30);
  return (
    <div className={styles.stack}>
      <Slider
        label="Deposit"
        min={0}
        max={50}
        step={5}
        value={deposit}
        onValueChange={setDeposit}
        format={(v) => `${v}%`}
      />
    </div>
  );
}
