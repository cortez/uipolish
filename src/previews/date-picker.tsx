"use client";

import { DatePicker } from "@registry/date-picker/date-picker";
import base from "./preview.module.css";

/* The venue is closed on Mondays. */
const closedMondays = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay() === 1;

export function DatePickerPreview() {
  return (
    <div className={base.stack}>
      <form className={base.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={base.heading}>Book the supper room</h2>
        <DatePicker
          label="Dinner date"
          name="date"
          min="2026-10-01"
          max="2027-03-31"
          isDateDisabled={closedMondays}
          hint="Closed on Mondays. Bookings open to the end of March."
          required
        />
        <DatePicker
          label="Overnight stay"
          mode="range"
          name={{ start: "arrive", end: "leave" }}
          defaultValue={{ start: "2026-11-13", end: "2026-11-15" }}
          weekStartsOn={1}
          hint="The guest room sleeps two."
        />
        <DatePicker label="RSVP deadline" defaultValue="2026-10-23" disabled hint="Set by the host." />
      </form>
    </div>
  );
}
