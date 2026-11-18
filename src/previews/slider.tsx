"use client";

import { useState } from "react";
import { Slider } from "@registry/slider/slider";
import base from "./preview.module.css";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function SliderPreview() {
  const [deposit, setDeposit] = useState(30);
  const total = 10842;

  return (
    <div className={base.stack}>
      <form className={base.form} onSubmit={(e) => e.preventDefault()}>
        <h2 className={base.heading}>Catering for the reunion</h2>
        <Slider
          label="Deposit"
          name="deposit"
          min={0}
          max={50}
          step={5}
          value={deposit}
          onValueChange={setDeposit}
          format={(v) => `${v}%`}
          valueText={(v) => `${v} percent, ${dollars.format((total * v) / 100)}`}
        />
        <p className={base.note}>
          Maya pays {dollars.format((total * deposit) / 100)} up front of the {dollars.format(total)} total.
        </p>
        <Slider label="Kitchen help" name="helpers" min={1} max={6} defaultValue={3} format={(v) => (v === 1 ? "1 person" : `${v} people`)} />
        <Slider
          label="Drinks budget"
          name="budget"
          min={0}
          max={60000}
          step={250}
          defaultValue={18500}
          morph={false}
          format={(v) => dollars.format(v)}
        />
      </form>

      <section className={base.group}>
        <h2 className={base.label}>At the ends, and disabled</h2>
        <div className={base.form}>
          <Slider label="Service charge" defaultValue={0} format={(v) => `${v}%`} />
          <Slider label="Tasting menu" min={1} max={10} defaultValue={10} format={(v) => (v === 1 ? "1 course" : `${v} courses`)} />
          <Slider label="Sales tax" defaultValue={8} format={(v) => `${v}%`} disabled />
        </div>
      </section>
    </div>
  );
}
