"use client";

import type { CSSProperties } from "react";
import { Calendar, type CalendarEvent } from "@registry/calendar/calendar";
import styles from "./showcase.module.css";

const EVENTS: CalendarEvent[] = [
  { id: "1", title: "Prep: Okafor 40th", start: "2026-11-21T14:00", end: "2026-11-21T17:00" },
  { id: "2", title: "Staff briefing", start: "2026-11-21T15:00", end: "2026-11-21T15:45", tone: "warning" },
  { id: "3", title: "Tasting: Brightwater", start: "2026-11-22T14:15", end: "2026-11-22T15:45", tone: "accent" },
  { id: "4", title: "Linen pickup", start: "2026-11-23T15:00", end: "2026-11-23T15:30" },
  { id: "5", title: "Okafor 40th: supper", start: "2026-11-21T19:00", end: "2026-11-21T23:00", tone: "success" },
];

/* The card's narrow week, opened on an afternoon where two bookings overlap,
   with the box short enough to fit the card. */
export default function Showcase() {
  return (
    <div className={styles.wide}>
      <Calendar
        aria-label="Kitchen calendar"
        events={EVENTS}
        defaultView="week"
        defaultDate="2026-11-21"
        startHour={14}
        style={{ "--compact-row": "20px" } as CSSProperties}
      />
    </div>
  );
}
