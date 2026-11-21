"use client";

import { useEffect, useState } from "react";
import { Timeline, type TimelineItem } from "@registry/timeline/timeline";
import styles from "./showcase.module.css";

const MIN = 60_000;

/* What arrives, one every few seconds; the oldest drops off past the card's edge. */
const UPDATES: Omit<TimelineItem, "id" | "at">[] = [
  { actor: "Maya Chen", action: "confirmed", object: "Friday supper", change: { field: "Guests", from: 10, to: 12 } },
  { action: "Deposit of $180 received", icon: "check-circle", tone: "success" },
  { actor: "Priya Raman", action: "commented", quote: "Could the tart be nut-free?" },
  { actor: "Leo Brandt", action: "moved the arrival to", object: "7:30 PM" },
  { actor: "Sam Okafor", action: "added", object: "two vegetarians", change: { field: "Vegetarian", from: 3, to: 5 } },
];

function initial(now: number): TimelineItem[] {
  return [1, 2, 3, 4].map((n) => ({ ...UPDATES[n], id: `u${n}`, at: new Date(now - n * 17 * MIN) }));
}

export default function Showcase() {
  const [items, setItems] = useState(() => initial(Math.floor(Date.now() / (10 * MIN)) * 10 * MIN));
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = 0;
    const timer = setInterval(() => {
      const next = UPDATES[n % UPDATES.length];
      setItems((list) => [{ ...next, id: `live${n++}`, at: new Date() }, ...list].slice(0, 5));
    }, 3600);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className={styles.stack}>
      <Timeline aria-label="Booking activity" variant="compact" groupBy="none" items={items} />
    </div>
  );
}
