"use client";

import { useState } from "react";
import { Stat } from "@registry/stat/stat";
import { Button } from "@registry/button/button";
import styles from "./stat.module.css";
import base from "./preview.module.css";

const dollars = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const MONTHS = [
  { open: 12, approved: 48210, approvedDelta: "12%", reply: "2.4 h", replyDelta: "18%", risk: "Low" },
  { open: 11, approved: 59052, approvedDelta: "37%", reply: "2.6 h", replyDelta: "11%", risk: "High" },
];

export function StatPreview() {
  const [i, setI] = useState(0);
  const m = MONTHS[i];

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.head}>
          <h2 className={base.label}>October, all events</h2>
          <Button variant="secondary" onClick={() => setI((n) => (n + 1) % MONTHS.length)}>
            {i === 0 ? "Confirm booking #1182" : "Undo confirmation"}
          </Button>
        </div>
        <div className={styles.grid}>
          <Stat
            label="Open invitations"
            value={m.open}
            delta={{ value: i === 0 ? "3" : "1", direction: i === 0 ? "up" : "down", tone: "neutral", label: "vs last week" }}
            hint="Sent and waiting on a reply."
          />
          <Stat
            label="Booked this month"
            value={m.approved}
            format={dollars}
            delta={{ value: m.approvedDelta, direction: "up", tone: "positive", label: "vs September" }}
            hint="Confirmed bookings, before refunds."
          />
          <Stat
            label="Average RSVP time"
            value={m.reply}
            delta={{ value: m.replyDelta, direction: i === 0 ? "down" : "up", tone: i === 0 ? "positive" : "negative" }}
            hint="From the invitation to the guest’s first reply, across every event, weekdays only."
          />
          <Stat label="Clash risk" value={m.risk} hint={i === 0 ? "" : "Two dinners fall on the same night."} />
        </div>
      </section>
    </div>
  );
}
