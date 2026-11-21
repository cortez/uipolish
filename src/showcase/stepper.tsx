"use client";

import { useState } from "react";
import { Button } from "@registry/button/button";
import { Stepper } from "@registry/stepper/stepper";
import styles from "./showcase.module.css";

const STEPS = [
  { id: "menu", title: "Menu" },
  { id: "guests", title: "Guests" },
  { id: "deposit", title: "Deposit" },
];

/** Next fills the line and draws the check; a finished step is a way back. */
export default function Showcase() {
  const [current, setCurrent] = useState(1);
  const done = current === STEPS.length;
  return (
    <div className={styles.stack}>
      <Stepper steps={STEPS} current={current} variant="full" onStepClick={setCurrent} label="Booking steps" />
      <div className={styles.row}>
        <Button variant="secondary" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
          Back
        </Button>
        <Button onClick={() => setCurrent(done ? 0 : current + 1)}>{done ? "Start over" : current === STEPS.length - 1 ? "Book" : "Next"}</Button>
      </div>
    </div>
  );
}
