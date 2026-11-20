"use client";

import { useState } from "react";
import { Textarea } from "@registry/textarea/textarea";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [note, setNote] = useState("Doors at 7:00, supper at 7:30. Tell me about any allergies by Wednesday.");
  return (
    <div className={styles.stack}>
      <Textarea
        label="Note to guests"
        minRows={2}
        maxRows={5}
        limit={120}
        hint="Sent with the invitation."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  );
}
