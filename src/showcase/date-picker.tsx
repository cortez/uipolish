"use client";

import { useState } from "react";
import { DatePicker } from "@registry/date-picker/date-picker";

const closedMondays = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() === 1;

export default function Showcase() {
  const [date, setDate] = useState<string | null>("2026-11-28");
  return (
    <DatePicker
      label="Dinner date"
      value={date}
      onValueChange={setDate}
      min="2026-11-01"
      max="2027-03-31"
      isDateDisabled={closedMondays}
    />
  );
}
