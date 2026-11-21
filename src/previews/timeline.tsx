"use client";

import { useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Timeline, type TimelineItem } from "@registry/timeline/timeline";
import base from "./preview.module.css";
import styles from "./timeline.module.css";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/* Ten-minute steps, so the server and the browser agree on every time. */
const start = () => Math.floor(Date.now() / (10 * MIN)) * 10 * MIN;
const ago = (t: number, by: number) => new Date(t - by);

function history(t: number): TimelineItem[] {
  return [
    { id: "confirm", at: ago(t, 8 * MIN), actor: "Maya Chen", action: "confirmed", object: "Friday supper for 12", change: { field: "Guests", from: 10, to: 12 } },
    {
      id: "menu",
      at: ago(t, 2 * HOUR),
      actor: "Leo Brandt",
      action: "uploaded the final menu to",
      object: "Friday supper",
      attachments: [
        { name: "Final menu.pdf", size: 248_000, href: "#" },
        { name: "Wine pairing, autumn list.pdf", size: 1_350_000, href: "#" },
      ],
    },
    { id: "deposit", at: ago(t, 3 * HOUR), action: "Deposit of $180 received", icon: "check-circle", tone: "success" },
    {
      id: "allergy",
      at: ago(t, DAY + 2 * HOUR),
      actor: "Priya Raman",
      action: "commented on",
      object: "the menu",
      quote: "Could we swap the tart for something nut-free? Two guests have allergies.",
    },
    { id: "time", at: ago(t, DAY + 5 * HOUR), actor: "Maya Chen", action: "moved the arrival on", object: "Friday supper", change: { field: "Arrival", from: "7:00 PM", to: "7:30 PM" } },
    { id: "reminder", at: ago(t, 4 * DAY), action: "Reminder sent to 10 guests", icon: "clock" },
    { id: "created", at: ago(t, 4 * DAY + HOUR), actor: "Maya Chen", action: "created", object: "Friday supper for 10" },
  ];
}

const EARLIER: ((t: number) => TimelineItem[])[] = [
  (t) => [
    { id: "venue", at: ago(t, 6 * DAY), actor: "Leo Brandt", action: "booked", object: "the supper room at Alder Lane" },
    { id: "quote", at: ago(t, 6 * DAY + 3 * HOUR), action: "Quote accepted: $1,240", icon: "check", tone: "accent" },
  ],
  (t) => [{ id: "enquiry", at: ago(t, 9 * DAY), actor: "Maya Chen", action: "sent an enquiry about", object: "a Friday supper" }],
];

/* What arrives while the page is open, one per press. */
const NEXT: Omit<TimelineItem, "id" | "at">[] = [
  { actor: "Sam Okafor", action: "added two vegetarians to", object: "Friday supper", change: { field: "Vegetarian", from: 3, to: 5 } },
  { actor: "Ines Laurent", action: "paid the balance on", object: "Friday supper", change: { field: "Paid", from: "$180", to: "$1,240" } },
  { action: "Kitchen confirmed a nut-free dessert", icon: "check-circle", tone: "success" },
  { actor: "Priya Raman", action: "replied", quote: "Perfect, thank you! The pear and ginger crumble sounds lovely." },
  { action: "Delivery window changed to 4–5 PM", icon: "warning", tone: "warning" },
];

export function TimelinePreview() {
  const [t] = useState(start);
  const [items, setItems] = useState(() => history(t));
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const next = useRef(0);

  function arrive() {
    const n = next.current++;
    setItems((list) => [{ ...NEXT[n % NEXT.length], id: `new-${n}`, at: new Date() }, ...list]);
  }

  function loadEarlier() {
    setLoading(true);
    window.setTimeout(() => {
      setItems((list) => [...list, ...EARLIER[pages](t)]);
      setPages((p) => p + 1);
      setLoading(false);
    }, 1200);
  }

  return (
    <div className={base.stack}>
      <div className={base.row}>
        <Button variant="secondary" onClick={arrive}>
          Add an update
        </Button>
      </div>
      <div className={styles.layout}>
        <div className={base.group}>
          <h2 className={base.label}>Booking history</h2>
          <Timeline
            aria-label="Booking history"
            items={items}
            onLoadMore={loadEarlier}
            loading={loading}
            hasMore={pages < EARLIER.length}
          />
        </div>
        <div className={base.group}>
          <h2 className={base.label}>In a side panel</h2>
          <Timeline aria-label="Recent activity" variant="compact" items={items} />
        </div>
      </div>
    </div>
  );
}
