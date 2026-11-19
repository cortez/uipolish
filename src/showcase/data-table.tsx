"use client";

import { DataTable } from "@registry/data-table/data-table";
import styles from "./showcase.module.css";

type Guest = { id: string; name: string; diet: string; paid: number };

const GUESTS: Guest[] = [
  { id: "1", name: "Maya Chen", diet: "Vegetarian", paid: 65 },
  { id: "2", name: "Priya Raman", diet: "None", paid: 65 },
  { id: "3", name: "Tomás Ortega", diet: "Gluten-free", paid: 0 },
  { id: "4", name: "Ines Laurent", diet: "Vegan", paid: 65 },
  { id: "5", name: "Sam Okafor", diet: "None", paid: 32.5 },
  { id: "6", name: "Leo Brandt", diet: "Nut allergy", paid: 65 },
  { id: "7", name: "Hana Sato", diet: "Pescatarian", paid: 0 },
  { id: "8", name: "Ada Mensah", diet: "None", paid: 65 },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function Showcase() {
  return (
    <div className={styles.wide}>
      <DataTable
        aria-label="Guests"
        columns={[
          // The three columns fit the card beside a scrollbar, so nothing is cut at its edge.
          { key: "name", header: "Guest", width: 120, sortable: true },
          { key: "diet", header: "Diet", width: 104, sortable: true },
          { key: "paid", header: "Paid", width: 78, align: "end", sortable: true, cell: (g) => money.format(g.paid) },
        ]}
        // The card's own height: the table is the card, and scrolls inside it.
        style={{ height: 320 }}
        rows={GUESTS}
        getRowId={(g) => g.id}
        getRowLabel={(g) => g.name}
        selectable
      />
    </div>
  );
}
