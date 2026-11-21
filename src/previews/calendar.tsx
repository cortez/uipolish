"use client";

import { useState } from "react";
import { Calendar, type CalendarEvent } from "@registry/calendar/calendar";
import base from "./preview.module.css";

/* A catering kitchen's November: tastings in the accent, the dinners they
   lead to in green, deliveries plain, deadlines in amber, and the two
   visits that stop the kitchen in red. */
const tuesdaysAndFridays = ["03", "06", "10", "13", "17", "20", "24", "27"];

const NOVEMBER: CalendarEvent[] = [
  ...tuesdaysAndFridays.map((d) => ({
    id: `produce-${d}`,
    title: "Produce delivery",
    start: `2026-11-${d}T07:00`,
    end: `2026-11-${d}T07:30`,
  })),
  { id: "t-hart", title: "Tasting: Hart wedding", start: "2026-11-03T14:00", end: "2026-11-03T15:30", tone: "accent" },
  { id: "t-okafor", title: "Tasting: Okafor 40th", start: "2026-11-10T11:00", end: "2026-11-10T12:00", tone: "accent" },
  { id: "wine", title: "Wine from Castello", start: "2026-11-12T10:00", end: "2026-11-12T10:30" },
  {
    id: "t-marchetti",
    title: "Tasting for the Marchetti–Abernathy anniversary dinner, with the sommelier",
    start: "2026-11-13T16:00",
    end: "2026-11-13T17:30",
    tone: "accent",
  },
  { id: "deposit", title: "Deposit due: Lindqvist", start: "2026-11-16", end: "2026-11-16", allDay: true, tone: "warning" },
  { id: "t-lindqvist", title: "Tasting: Lindqvist rehearsal", start: "2026-11-17T16:00", end: "2026-11-17T17:00", tone: "accent" },
  { id: "oven", title: "Oven service", start: "2026-11-18T09:00", end: "2026-11-18T11:00", tone: "danger" },
  { id: "inspection", title: "Health inspection", start: "2026-11-19T10:00", end: "2026-11-19T11:00", tone: "danger" },
  { id: "brightwater", title: "Brightwater holiday lunch", start: "2026-11-20T12:00", end: "2026-11-20T14:30", tone: "success" },
  { id: "prep-okafor", title: "Prep: Okafor 40th", start: "2026-11-21T13:00", end: "2026-11-21T17:00" },
  { id: "briefing", title: "Staff briefing", start: "2026-11-21T15:00", end: "2026-11-21T15:30" },
  { id: "florist", title: "Florist drop-off", start: "2026-11-21T15:15", end: "2026-11-21T16:00" },
  { id: "okafor", title: "Okafor 40th: supper for 24", start: "2026-11-21T19:00", end: "2026-11-21T23:00", tone: "success" },
  { id: "clean", title: "Kitchen deep clean", start: "2026-11-23", end: "2026-11-23", allDay: true },
  { id: "t-brightwater", title: "Menu tasting: Brightwater", start: "2026-11-24T13:00", end: "2026-11-24T14:30", tone: "accent" },
  { id: "thanksgiving", title: "Thanksgiving orders", start: "2026-11-25", end: "2026-11-27", allDay: true, tone: "success" },
  { id: "pies", title: "Pie pickup", start: "2026-11-25T15:00", end: "2026-11-25T18:00" },
  { id: "hart", title: "Hart wedding: dinner for 120", start: "2026-11-28T17:00", end: "2026-11-28T23:30", tone: "success" },
  { id: "rentals", title: "Rentals return", start: "2026-11-30T09:00", end: "2026-11-30T10:00" },
];

const when = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const wallTime = (s: string) => when.format(new Date(`${s}:00Z`)).replace(/[   ]/g, " ");

export function CalendarPreview() {
  const [events, setEvents] = useState(NOVEMBER);
  const [note, setNote] = useState("Click an event, a day, or an empty half hour in the week.");

  return (
    <div className={base.stack}>
      <div className={base.group}>
        <Calendar
          aria-label="Kitchen calendar"
          events={events}
          defaultDate="2026-11-21"
          onEventClick={(e) => setNote(`Opened “${e.title}”.`)}
          onDateClick={(d) => setNote(`Opened ${new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}.`)}
          onSlotClick={(start) => {
            const [day, time] = start.split("T");
            const [h, m] = time.split(":").map(Number);
            const endMin = Math.min(h * 60 + m + 60, 24 * 60 - 1);
            const end = `${day}T${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
            setEvents((list) => [...list, { id: `new-${start}`, title: "New booking", start, end, tone: "accent" }]);
            setNote(`Booked ${wallTime(start)}.`);
          }}
        />
        <p className={base.note} aria-live="polite">
          {note}
        </p>
      </div>
    </div>
  );
}
