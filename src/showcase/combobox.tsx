"use client";

import { useState } from "react";
import { Combobox, type ComboboxOption } from "@registry/combobox/combobox";
import styles from "./showcase.module.css";

const GUESTS: ComboboxOption[] = [
  { value: "maya", label: "Maya Chen", description: "Going" },
  { value: "priya", label: "Priya Raman", description: "Going" },
  { value: "tomas", label: "Tomás Ortega", description: "Hasn’t replied" },
  { value: "ines", label: "Ines Laurent", description: "Waitlist" },
  { value: "sam", label: "Sam Okafor", description: "Going" },
];

export default function Showcase() {
  const [options, setOptions] = useState(GUESTS);
  const [guest, setGuest] = useState<string | null>(null);
  return (
    <div className={styles.stack}>
      <Combobox
        label="Seat next to"
        placeholder="Search guests"
        options={options}
        value={guest}
        onValueChange={setGuest}
        onCreate={(text) => {
          const option = { value: `new-${text}`, label: text, description: "New guest" };
          setOptions((o) => [...o, option]);
          return option;
        }}
        createLabel={(text) => `Add guest “${text}”`}
      />
    </div>
  );
}
