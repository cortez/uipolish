"use client";

import { useState } from "react";
import { Select } from "@registry/select/select";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [seating, setSeating] = useState("open");
  return (
    <div className={styles.stack}>
      <Select
        label="Seating"
        name="seating"
        options={[
          { value: "assigned", label: "Assigned seats" },
          { value: "open", label: "Open seating", description: "Guests sit wherever they like" },
        ]}
        value={seating}
        onValueChange={setSeating}
      />
    </div>
  );
}
