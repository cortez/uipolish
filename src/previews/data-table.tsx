"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@registry/data-table/data-table";
import { Button } from "@registry/button/button";
import { EmptyState } from "@registry/empty-state/empty-state";
import { Icon } from "@registry/icons/icons";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import base from "./preview.module.css";
import styles from "./data-table.module.css";

type Guest = {
  id: string;
  name: string;
  email: string;
  party: number;
  dietary: string;
  rsvp: string;
  paid: number | null;
};

const FIRST = ["Maya", "Priya", "Dana", "Marco", "Noor", "Theo", "Ines", "Kenji", "Lena", "Omar", "Ruth", "Sami", "Ada", "Felix", "Hana", "Jonah", "Lucia", "Mateo", "Nia", "Owen", "Rosa", "Tariq", "Vera", "Wes"];
const LAST = ["Chen", "Patel", "Whitfield", "Ruiz", "Haddad", "Park", "Okafor", "Lindqvist", "Moreau", "Tanaka", "Silva", "Novak", "Brennan", "Ito", "Kowalski", "Mensah", "Duarte", "Fischer"];
const DIETARY = ["None", "None", "None", "Vegetarian", "Vegan", "Gluten-free", "Pescatarian", "Nut allergy", "Dairy-free"];
const PRICE = 45;

/* A few hundred guests, the same on the server and in the browser: a small
   seeded generator rather than Math.random. */
function makeGuests(count: number): Guest[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  return Array.from({ length: count }, (_, i) => {
    const first = i === 0 ? "Maya" : i === 1 ? "Priya" : pick(FIRST);
    const last = i === 0 ? "Chen" : i === 1 ? "Patel" : pick(LAST);
    const party = 1 + Math.floor(rand() * rand() * 5);
    const day = 1 + Math.floor(rand() * 28);
    const paid = rand() < 0.22 ? null : party * PRICE;
    return {
      id: `g${i + 1}`,
      name: `${first} ${last}`,
      email: `${first}.${last}${i > 40 ? i : ""}@example.com`.toLowerCase(),
      party,
      dietary: pick(DIETARY),
      rsvp: `2026-10-${String(day).padStart(2, "0")}`,
      paid,
    };
  });
}

const GUESTS = makeGuests(320);
// Two rows to review: an email cut short, and a party over the cap.
GUESTS[1].email = "priya.patel@";
GUESTS[6].party = 12;
GUESTS[6].paid = 12 * PRICE;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

type View = "guests" | "loading" | "empty";

export function DataTablePreview() {
  const [view, setView] = useState<View>("guests");
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(["g3", "g4"]));
  const [reminded, setReminded] = useState<ReadonlySet<string>>(() => new Set());

  const columns: DataTableColumn<Guest>[] = [
    { key: "name", header: "Guest", width: 176, minWidth: 120, sortable: true },
    {
      key: "email",
      header: "Email",
      width: 232,
      sortable: true,
      validate: (g) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email) ? null : "Add the part after the @, like example.com."),
    },
    {
      key: "party",
      header: "Party",
      width: 96,
      align: "end",
      sortable: true,
      validate: (g) => (g.party > 8 ? "Parties are capped at 8. Check with Maya before confirming." : null),
    },
    { key: "dietary", header: "Dietary", width: 148, sortable: true },
    {
      key: "rsvp",
      header: "RSVP’d",
      width: 112,
      sortable: true,
      value: (g) => new Date(`${g.rsvp}T00:00:00Z`),
      cell: (g) => day.format(new Date(`${g.rsvp}T00:00:00Z`)),
    },
    {
      key: "paid",
      header: "Paid",
      width: 112,
      align: "end",
      sortable: true,
      cell: (g) => (g.paid === null ? <span className={styles.unpaid}>Not yet</span> : money.format(g.paid)),
    },
    {
      key: "reminder",
      header: "Reminder",
      width: 128,
      resizable: false,
      cell: (g) =>
        g.paid === null ? (
          <Button
            variant="secondary"
            onClick={() => setReminded((r) => new Set(r).add(g.id))}
            aria-label={reminded.has(g.id) ? `Reminder sent to ${g.name}` : `Remind ${g.name}`}
          >
            {reminded.has(g.id) ? "Sent" : "Remind"}
          </Button>
        ) : null,
    },
  ];

  const count = GUESTS.filter((g) => selected.has(g.id)).length;
  const seats = GUESTS.filter((g) => selected.has(g.id)).reduce((n, g) => n + g.party, 0);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.toolbar}>
          <div className={styles.title}>
            <h2 id="guest-list" className={base.heading}>
              Guest list
            </h2>
            <p className={base.note} aria-live="polite">
              {view !== "guests"
                ? "Friday supper"
                : count === 0
                  ? `${GUESTS.length} guests`
                  : `${count} selected · ${seats} ${seats === 1 ? "seat" : "seats"}`}
            </p>
          </div>
          <SegmentedControl size="sm" aria-label="Table state" widths="content" value={view} onValueChange={(v) => setView(v as View)}>
            <Segment value="guests">Guests</Segment>
            <Segment value="loading">Loading</Segment>
            <Segment value="empty">Empty</Segment>
          </SegmentedControl>
        </div>

        <DataTable
          aria-labelledby="guest-list"
          className={styles.table}
          columns={columns}
          rows={view === "guests" ? GUESTS : []}
          getRowId={(g) => g.id}
          getRowLabel={(g) => g.name}
          loading={view === "loading"}
          loadingLabel="Loading guests…"
          selectable
          selectedIds={selected}
          onSelectedIdsChange={setSelected}
          stickyFirstColumn
          empty={
            <EmptyState
              icon="list"
              title="No guests yet"
              description="Replies to the invitation land here as they come in."
              action={
                <Button variant="secondary">
                  <Icon name="link" />
                  Copy invitation link
                </Button>
              }
            />
          }
        />
        <p className={base.note}>
          Arrow keys move between cells; Enter presses what’s in one. Shift-click a box to select a range, and drag a
          column’s edge to resize it.
        </p>
      </section>
    </div>
  );
}
