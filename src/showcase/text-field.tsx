"use client";

import { useState } from "react";
import { TextField } from "@registry/text-field/text-field";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [email, setEmail] = useState("");
  return (
    <div className={styles.stack}>
      <TextField
        label="Email"
        type="email"
        placeholder="dana@example.com"
        hint="We send the RSVP link here."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        validate={(v) => (v && !/^\S+@\S+\.\S+$/.test(v) ? "Enter an email like dana@example.com." : null)}
      />
    </div>
  );
}
