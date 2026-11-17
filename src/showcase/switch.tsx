"use client";

import { useState } from "react";
import { Switch } from "@registry/switch/switch";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [lateRsvps, setLateRsvps] = useState(true);
  return (
    <div className={styles.stack}>
      <Switch
        side="end"
        label="Late RSVPs"
        description="Email me after the deadline passes."
        checked={lateRsvps}
        onChange={(e) => setLateRsvps(e.target.checked)}
      />
    </div>
  );
}
