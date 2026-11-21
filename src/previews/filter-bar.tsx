"use client";

import { useState } from "react";
import { FilterBar, matchFilter, type Filter, type FilterField } from "@registry/filter-bar/filter-bar";
import { DataTable, type DataTableColumn } from "@registry/data-table/data-table";
import { Badge } from "@registry/badge/badge";
import { Button } from "@registry/button/button";
import { EmptyState } from "@registry/empty-state/empty-state";
import base from "./preview.module.css";
import styles from "./filter-bar.module.css";

type Status = "going" | "maybe" | "declined" | "waiting";

type Guest = {
  id: string;
  name: string;
  email: string;
  status: Status;
  party: number;
  dietary: string;
  added: string;
};

const STATUS: { value: Status; label: string; tone: "positive" | "warning" | "danger" | "neutral" }[] = [
  { value: "going", label: "Going", tone: "positive" },
  { value: "maybe", label: "Maybe", tone: "warning" },
  { value: "declined", label: "Declined", tone: "danger" },
  { value: "waiting", label: "Hasn’t replied", tone: "neutral" },
];

const DIETARY = ["None", "Vegetarian", "Vegan", "Gluten-free", "Nut allergy", "Dairy-free"];

const FIRST = ["Maya", "Priya", "Tomás", "Inès", "Sam", "Noor", "Kenji", "Lena", "Omar", "Ruth", "Ada", "Felix", "Hana", "Jonah", "Lucia", "Mateo", "Nia", "Owen", "Rosa", "Tariq", "Vera", "Wes", "Dana", "Theo"];
const LAST = ["Chen", "Patel", "Ortega", "Laurent", "Okafor", "Haddad", "Tanaka", "Novak", "Silva", "Brennan", "Ito", "Mensah", "Duarte", "Fischer", "Park", "Moreau"];

/* The same guests on the server and in the browser: a seeded generator. */
function makeGuests(count: number): Guest[] {
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  return Array.from({ length: count }, (_, i) => {
    const first = pick(FIRST);
    const last = pick(LAST);
    const r = rand();
    return {
      id: `g${i + 1}`,
      name: `${first} ${last}`,
      email: `${first}.${last}`.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase() + "@example.com",
      status: r < 0.5 ? "going" : r < 0.68 ? "maybe" : r < 0.8 ? "declined" : "waiting",
      party: 1 + Math.floor(rand() * rand() * 6),
      dietary: rand() < 0.55 ? "None" : pick(DIETARY.slice(1)),
      added: `2026-${rand() < 0.5 ? "10" : "11"}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
    };
  });
}

const GUESTS = makeGuests(64);

const FIELDS: FilterField[] = [
  { id: "status", label: "Status", icon: "check-circle", type: "enum", options: STATUS.map(({ value, label }) => ({ value, label })) },
  { id: "dietary", label: "Dietary", icon: "list", type: "enum", options: DIETARY.map((d) => ({ value: d, label: d })) },
  { id: "added", label: "Added", icon: "calendar", type: "date" },
  { id: "party", label: "Party size", icon: "gauge", type: "number", min: 1, max: 12 },
  { id: "email", label: "Email", icon: "at", type: "text", placeholder: "example.com" },
];

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const columns: DataTableColumn<Guest>[] = [
  { key: "name", header: "Guest", width: 168, minWidth: 120, sortable: true },
  {
    key: "status",
    header: "Status",
    width: 148,
    sortable: true,
    value: (g) => STATUS.findIndex((s) => s.value === g.status),
    cell: (g) => {
      const s = STATUS.find((x) => x.value === g.status)!;
      return (
        <Badge tone={s.tone} dot>
          {s.label}
        </Badge>
      );
    },
  },
  { key: "party", header: "Party", width: 88, align: "end", sortable: true },
  { key: "dietary", header: "Dietary", width: 136, sortable: true },
  {
    key: "added",
    header: "Added",
    width: 104,
    sortable: true,
    value: (g) => new Date(`${g.added}T00:00:00Z`),
    cell: (g) => day.format(new Date(`${g.added}T00:00:00Z`)),
  },
  { key: "email", header: "Email", width: 232 },
];

export function FilterBarPreview() {
  const [filters, setFilters] = useState<Filter[]>([
    { field: "status", op: "is", value: ["going"] },
    { field: "added", op: "after", value: "2026-11-01" },
  ]);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = GUESTS.filter(
    (g) =>
      (!q || g.name.toLowerCase().includes(q) || g.email.includes(q)) &&
      filters.every((f) => matchFilter(f, g[f.field as keyof Guest])),
  );
  const seats = rows.reduce((n, g) => n + g.party, 0);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.title}>
          <h2 id="filtered-guests" className={base.heading}>
            Friday supper guests
          </h2>
          <p className={base.note} aria-live="polite">
            {rows.length === GUESTS.length
              ? `${GUESTS.length} guests`
              : `${rows.length} of ${GUESTS.length} guests · ${seats} ${seats === 1 ? "seat" : "seats"}`}
          </p>
        </div>
        <FilterBar
          aria-label="Guest filters"
          fields={FIELDS}
          value={filters}
          onValueChange={setFilters}
          searchLabel="Search guests"
          query={query}
          onQueryChange={setQuery}
        />
        <DataTable
          aria-labelledby="filtered-guests"
          className={styles.table}
          columns={columns}
          rows={rows}
          getRowId={(g) => g.id}
          getRowLabel={(g) => g.name}
          stickyFirstColumn
          empty={
            <EmptyState
              icon="search"
              title="No guests match"
              description="Try fewer filters, or a shorter search."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFilters([]);
                    setQuery("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          }
        />
      </section>
    </div>
  );
}
