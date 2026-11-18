"use client";

import { RadioGroup } from "@registry/radio-group/radio-group";
import base from "./preview.module.css";

const MAINS = [
  { value: "lamb", label: "Slow-roast lamb", description: "With white beans and salsa verde" },
  { value: "fish", label: "Grilled bream" },
  { value: "squash", label: "Stuffed squash", description: "Vegan, and free of the big allergens" },
  { value: "kids", label: "Kids’ plate", disabled: true, description: "Full for Saturday" },
];

const SCHEDULES = [
  { value: "full", label: "Pay in full", meta: "$1,240.00", description: "Due 14 days after booking" },
  { value: "split", label: "Two payments", meta: "2 × $620.00", description: "Half now, half in 30 days" },
  { value: "monthly", label: "Monthly", meta: "4 × $310.00", description: "On the 1st, starting next month" },
];

export function RadioGroupPreview() {
  return (
    <div className={base.stack}>
      <form className={base.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={base.heading}>Saturday supper</h2>
        <RadioGroup
          label="Your main"
          name="main"
          options={MAINS}
          hint="Tell Maya by Thursday so she can shop."
          validate={(v) => (v ? null : "Choose a main. The squash suits most diets.")}
        />
      </form>
      <section className={base.group}>
        <RadioGroup
          label="Payment schedule"
          name="schedule"
          variant="cards"
          options={SCHEDULES}
          defaultValue="full"
        />
      </section>
    </div>
  );
}
