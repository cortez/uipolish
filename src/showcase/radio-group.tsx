"use client";

import { useState } from "react";
import { RadioGroup } from "@registry/radio-group/radio-group";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [main, setMain] = useState("lamb");

  return (
    <div className={styles.stack}>
      <RadioGroup
        label="Your main"
        name="main"
        value={main}
        onValueChange={setMain}
        options={[
          { value: "lamb", label: "Slow-roast lamb", description: "With white beans" },
          { value: "squash", label: "Stuffed squash", description: "Vegetarian" },
          { value: "bream", label: "Grilled sea bream" },
        ]}
      />
    </div>
  );
}
