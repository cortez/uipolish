"use client";

import { useState, type CSSProperties } from "react";
import { FilterBar, type Filter, type FilterField } from "@registry/filter-bar/filter-bar";
import styles from "./showcase.module.css";

const FIELDS: FilterField[] = [
  {
    id: "status",
    label: "Status",
    icon: "check-circle",
    type: "enum",
    options: [
      { value: "going", label: "Going" },
      { value: "maybe", label: "Maybe" },
      { value: "declined", label: "Declined" },
    ],
  },
  { id: "added", label: "Added", icon: "calendar", type: "date" },
  { id: "party", label: "Party size", icon: "gauge", type: "number", min: 1 },
];

export default function Showcase() {
  const [filters, setFilters] = useState<Filter[]>([
    { field: "status", op: "is", value: ["going"] },
    { field: "added", op: "after", value: "2026-11-01" },
  ]);
  return (
    // Centered in its card, like the other rows of small things.
    <div className={styles.wide} style={{ "--filter-bar-justify": "center" } as CSSProperties}>
      <FilterBar aria-label="Guest filters" fields={FIELDS} value={filters} onValueChange={setFilters} />
    </div>
  );
}
