"use client";

import { useState } from "react";
import { TagInput } from "@registry/tag-input/tag-input";
import styles from "./showcase.module.css";

const CONTACTS = [
  { value: "maya@example.com", label: "Maya Chen", description: "maya@example.com" },
  { value: "priya@example.com", label: "Priya Patel", description: "priya@example.com" },
  { value: "tomas@example.org", label: "Tomás Ortega", description: "tomas@example.org" },
  { value: "sam@example.com", label: "Sam Okafor", description: "sam@example.com" },
  { value: "noor@example.org", label: "Noor Haddad", description: "noor@example.org" },
];

export default function Showcase() {
  const [guests, setGuests] = useState(["maya@example.com", "priya@example.com", "tomas@example.org"]);
  return (
    <div className={styles.stack}>
      <TagInput
        label="Invite"
        placeholder="Name or email"
        suggestions={CONTACTS}
        value={guests}
        onValueChange={setGuests}
        max={8}
      />
    </div>
  );
}
