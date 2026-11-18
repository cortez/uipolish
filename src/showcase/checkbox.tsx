"use client";

import { useState } from "react";
import { Checkbox } from "@registry/checkbox/checkbox";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [attach, setAttach] = useState(true);
  const [plusOnes, setPlusOnes] = useState(false);
  return (
    <div className={styles.stack}>
      <Checkbox
        label="Attach the menu to reminders"
        description="Guests see each course before they arrive."
        checked={attach}
        onCheckedChange={setAttach}
      />
      <Checkbox label="Allow plus-ones" checked={plusOnes} onCheckedChange={setPlusOnes} />
    </div>
  );
}
