"use client";

import { Stat } from "@registry/stat/stat";

const dollars = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function Showcase() {
  return (
    <Stat
      label="Ticket sales this month"
      value={4820}
      format={dollars}
      delta={{ value: "12%", direction: "up", tone: "positive", label: "vs October" }}
    />
  );
}
