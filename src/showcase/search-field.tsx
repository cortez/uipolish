"use client";

import { useState } from "react";
import { SearchField } from "@registry/search-field/search-field";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [query, setQuery] = useState("");
  return (
    <div className={styles.stack}>
      <SearchField
        label="Search guests"
        placeholder="Search guests"
        shortcut="/"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  );
}
