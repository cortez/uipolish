"use client";

import { useState } from "react";
import { Badge } from "@registry/badge/badge";
import { Button } from "@registry/button/button";
import base from "./preview.module.css";
import styles from "./badge.module.css";

const GUESTS = [
  { name: "Maya Okafor", note: "Party of 2 · vegetarian", status: <Badge tone="positive" dot>Going</Badge> },
  { name: "Priya Raman", note: "Invited October 12", status: <Badge dot>Awaiting reply</Badge> },
  { name: "Tom Becker", note: "Seating closes Thursday", status: <Badge tone="warning" dot>Reply due tomorrow</Badge> },
  { name: "Lena Ruiz", note: "Deposit of $40", status: <Badge tone="danger" dot>Card declined</Badge> },
  { name: "Jonah Weiss", note: "Moved up from the waitlist", status: <Badge tone="accent">New</Badge> },
];

const TABS = [
  { label: "Replies", count: 3, tone: "accent", sr: "3 unread replies" },
  { label: "Waitlist", count: 12, tone: "neutral", sr: "12 on the waitlist" },
  { label: "Messages", count: 128, tone: "neutral", sr: "128 messages" },
] as const;

export function BadgePreview() {
  const [unread, setUnread] = useState(8);
  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>Friday supper club</h2>
        <ul className={styles.list}>
          {GUESTS.map((g) => (
            <li key={g.name} className={styles.row}>
              <span className={styles.who}>
                <span className={styles.name}>{g.name}</span>
                <span className={styles.note}>{g.note}</span>
              </span>
              {g.status}
            </li>
          ))}
        </ul>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Counts</h2>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <span key={t.label} className={styles.tab}>
              {t.label}
              <Badge size="sm" tone={t.tone} count={t.count} label={t.sr} />
            </span>
          ))}
        </div>
        <div className={base.row}>
          <Badge count={1} label="1 guest" />
          <Badge count={8} label="8 guests" />
          <Badge count={24} label="24 guests" />
          <Badge count={140} label="140 guests" />
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>A count that changes</h2>
        <div className={base.row}>
          <span className={styles.tab}>
            Replies
            <Badge size="sm" tone="accent" count={unread} label={`${unread} unread replies`} />
          </span>
          <Button variant="secondary" onClick={() => setUnread((n) => n + 1)}>
            A reply arrives
          </Button>
          <Button variant="ghost" onClick={() => setUnread((n) => Math.max(0, n - 1))} disabled={unread === 0}>
            Read one
          </Button>
        </div>
        <p className={base.note}>Only the digits that change roll: up as replies arrive, down as they&rsquo;re read.</p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>In a sentence</h2>
        <p className={styles.prose}>
          The tasting menu is <Badge tone="positive">Confirmed</Badge> for eight guests, and the wine pairing is
          still a <Badge>Draft</Badge> until Priya hears back from the shop. Allergy notes close on Friday, and
          two are still <Badge tone="warning">Missing</Badge> from the list.
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Tones, both sizes</h2>
        <div className={base.row}>
          <Badge>Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="positive">Positive</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
        </div>
        <div className={base.row}>
          <Badge size="sm" dot>
            Neutral
          </Badge>
          <Badge size="sm" tone="accent" dot>
            Accent
          </Badge>
          <Badge size="sm" tone="positive" dot>
            Positive
          </Badge>
          <Badge size="sm" tone="warning" dot>
            Warning
          </Badge>
          <Badge size="sm" tone="danger" dot>
            Danger
          </Badge>
        </div>
      </section>
    </div>
  );
}
