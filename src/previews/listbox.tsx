"use client";

import { Combobox, type ComboboxOption } from "@registry/combobox/combobox";
import { Select } from "@registry/select/select";
import base from "./preview.module.css";

const DEADLINES = [
  { value: "none", label: "No deadline" },
  { value: "2d", label: "2 days before", description: "Leaves time to shop" },
  { value: "1w", label: "1 week before", description: "Suits a set menu" },
  { value: "2w", label: "2 weeks before", description: "Suits a catered event" },
];

const GUESTS: ComboboxOption[] = [
  { value: "amara", label: "Amara Okafor" },
  { value: "bea", label: "Béatrice Laurent" },
  { value: "chen", label: "Chen Wei" },
  { value: "dmitri", label: "Dmitri Volkov" },
  { value: "elena", label: "Elena García" },
  { value: "grace", label: "Grace Kim" },
  { value: "hugo", label: "Hugo Lindqvist" },
];

export function ListboxPreview() {
  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>The panel, rows and sliding highlight under a select and a combobox</h2>
        <div className={base.form}>
          <Select label="RSVP deadline" name="deadline" options={DEADLINES} defaultValue="1w" />
          <Combobox label="Seat next to" name="guest" placeholder="Search guests" options={GUESTS} />
        </div>
        <p className={base.note}>Open either and move with the arrow keys: one highlight slides between rows.</p>
      </section>
    </div>
  );
}
