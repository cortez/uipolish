"use client";

import { useState } from "react";
import { AnimatedSize } from "@registry/animated-size/animated-size";
import { Button } from "@registry/button/button";
import styles from "./animated-size.module.css";
import base from "./preview.module.css";

const LINES = [
  ["Catering, 60 guests", "$4,368.00"],
  ["Tables, chairs and linens", "$2,730.00"],
  ["Flowers", "$294.00"],
  ["Staff, 46 h", "$3,450.00"],
];

const STATUSES = ["Draft", "Sent to dana.whitfield@example.com", "Confirmed"];

export function AnimatedSizePreview() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(0);
  const [shown, setShown] = useState(true);
  const [notes, setNotes] = useState(1);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>Height follows the content</h2>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.title}>Family reunion, June 14</p>
              <p className={base.note}>Booking #1182</p>
            </div>
            <Button variant="secondary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? "Hide breakdown" : "Show breakdown"}
            </Button>
          </div>
          <AnimatedSize>
            {open ? (
              <table className={styles.table}>
                <tbody>
                  {LINES.map(([item, amount]) => (
                    <tr key={item}>
                      <td>{item}</td>
                      <td>{amount}</td>
                    </tr>
                  ))}
                  <tr className={styles.total}>
                    <td>Total</td>
                    <td>$10,842.00</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className={styles.summary}>4 line items · $10,842.00</p>
            )}
          </AnimatedSize>
        </div>
        <p className={base.note}>The note below rides along with the card instead of jumping.</p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Width follows a label</h2>
        <div className={base.row}>
          <AnimatedSize axis="width" className={styles.chipBox}>
            <span className={styles.chip} data-status={status}>
              {STATUSES[status]}
            </span>
          </AnimatedSize>
          <Button variant="ghost" onClick={() => setStatus((s) => (s + 1) % STATUSES.length)}>
            Next status
          </Button>
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Changes while hidden don’t play when shown</h2>
        <div className={base.row}>
          <Button variant="secondary" onClick={() => setNotes((n) => (n % 4) + 1)}>
            {notes === 4 ? "Reset notes" : "Add a note"}
          </Button>
          <Button variant="ghost" aria-expanded={shown} onClick={() => setShown((s) => !s)}>
            {shown ? "Hide notes" : "Show notes"}
          </Button>
        </div>
        <div hidden={!shown} className={styles.notes}>
          <AnimatedSize>
            <ul className={styles.noteList}>
              {Array.from({ length: notes }, (_, i) => (
                <li key={i}>{NOTES[i]}</li>
              ))}
            </ul>
          </AnimatedSize>
        </div>
      </section>
    </div>
  );
}

const NOTES = [
  "Tables go under the oak; the tent covers the rest.",
  "Dessert moves to the patio, one extra table.",
  "Parking moves to the north lot.",
  "Rentals arrive Friday and leave Monday.",
];
