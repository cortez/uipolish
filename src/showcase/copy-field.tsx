"use client";

import { CopyField } from "@registry/copy-field/copy-field";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.stack}>
      <CopyField label="RSVP link" mono value="https://supperclub.example/rsvp/saturday-supper" />
    </div>
  );
}
