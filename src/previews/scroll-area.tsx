"use client";

import { useState } from "react";
import { ScrollArea } from "@registry/scroll-area/scroll-area";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import styles from "./scroll-area.module.css";
import base from "./preview.module.css";

const ACTIVITY = [
  ["Dana Whitfield", "replied yes, for 2", "9:14 AM"],
  ["You", "sent a reminder to dana.whitfield@example.com", "8:30 AM"],
  ["Dana Whitfield", "opened the invitation", "Yesterday"],
  ["You", "moved dessert to the patio", "Yesterday"],
  ["You", "added 6 bottles of sparkling water", "Oct 21"],
  ["Marco Ruiz", "uploaded 4 photos of the table", "Oct 21"],
  ["You", "sent the invitations", "Oct 20"],
  ["You", "set the RSVP deadline to Thursday", "Oct 20"],
  ["Marco Ruiz", "measured the table: it seats 12", "Oct 19"],
  ["You", "created the event", "Oct 19"],
  ["Dana Whitfield", "asked to join on example.com", "Oct 18"],
];

const FILTERS = ["All events", "Dinners", "Brunches", "Birthdays", "Picnics", "Potlucks", "Holidays", "Book club", "Game nights", "Tastings"];

export function ScrollAreaPreview() {
  const [filter, setFilter] = useState(FILTERS[0]);
  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>Vertical, nothing focusable inside: the area is a tab stop</h2>
        <ScrollArea label="Event activity" className={styles.list}>
          <ol className={styles.activity}>
            {ACTIVITY.map(([who, what, when], i) => (
              <li key={i}>
                <span>
                  <strong>{who}</strong> {what}
                </span>
                <span className={styles.when}>{when}</span>
              </li>
            ))}
          </ol>
        </ScrollArea>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Horizontal, with a control inside</h2>
        <ScrollArea label="Event type" orientation="horizontal" className={styles.row}>
          <SegmentedControl size="sm" aria-label="Event type" widths="content" value={filter} onValueChange={setFilter}>
            {FILTERS.map((f) => (
              <Segment key={f} value={f}>
                {f}
              </Segment>
            ))}
          </SegmentedControl>
        </ScrollArea>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Fades off</h2>
        <ScrollArea label="Host notes" fade={false} className={styles.short}>
          <div className={styles.notes}>
            <p>The long table seats 12 with both leaves in. Two chairs at the south end need cushions.</p>
            <p>Dessert moves to the patio if the weather holds, which frees the dining room by nine.</p>
            <p>The side gate opens at 7 p.m. Guests park on Alder Lane.</p>
            <p>Dietary notes are due by Thursday. Maya shops on Friday morning.</p>
          </div>
        </ScrollArea>
      </section>
    </div>
  );
}
