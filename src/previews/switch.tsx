"use client";

import { useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Switch } from "@registry/switch/switch";
import base from "./preview.module.css";
import styles from "./switch.module.css";

const ALERTS = [
  { id: "paid", label: "New RSVP", description: "Email me when a guest replies, with their answer and party size." },
  { id: "overdue", label: "RSVP deadline passed", description: "Email me the morning after the deadline, with who hasn’t replied." },
  { id: "viewed", label: "Invitation opened", description: "Email me the first time a guest opens an invitation." },
] as const;

export function SwitchPreview() {
  const [on, setOn] = useState<Record<string, boolean>>({ paid: true, overdue: true, viewed: false });
  const [digest, setDigest] = useState(true);
  const count = Object.values(on).filter(Boolean).length;
  const [waitlist, setWaitlist] = useState(false);
  const [saving, setSaving] = useState(false);
  const timer = useRef(0);

  // Flips at once and saves behind it; the switch ignores presses until the save lands.
  function saveWaitlist(next: boolean) {
    setWaitlist(next);
    setSaving(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaving(false), 1400);
  }

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.header}>
          <h2 className={base.heading}>Notifications</h2>
          <p className={base.note}>Sent to maya@example.com</p>
        </div>
        <ul className={styles.list}>
          {ALERTS.map((a) => (
            <li key={a.id} className={styles.row}>
              <Switch
                side="end"
                label={a.label}
                description={a.description}
                checked={on[a.id]}
                onChange={(e) => setOn((s) => ({ ...s, [a.id]: e.target.checked }))}
              />
            </li>
          ))}
          <li className={styles.row}>
            <Switch
              side="end"
              label="Text message alerts"
              description="Add a mobile number in Profile to turn these on."
              disabled
            />
          </li>
        </ul>
        <p className={base.note} aria-live="polite">
          {count === 0 ? "No RSVP emails." : `${count} of 3 RSVP emails on.`}
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Label only</h2>
        <Switch label="Weekly summary every Monday" checked={digest} onChange={(e) => setDigest(e.target.checked)} />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Saving</h2>
        <div className={styles.list}>
          <Switch
            side="end"
            label="Open the waitlist"
            description="Guests who reply after the table is full join a waitlist."
            checked={waitlist}
            busy={saving}
            onChange={(e) => saveWaitlist(e.target.checked)}
          />
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Beside a button, small and default</h2>
        <div className={base.row}>
          <Switch size="sm" aria-label="Show past suppers" defaultChecked />
          <Button variant="secondary">
            Past suppers
          </Button>
        </div>
        <div className={base.row}>
          <Switch aria-label="Show past suppers" defaultChecked />
          <Button variant="secondary">Past suppers</Button>
        </div>
      </section>
    </div>
  );
}
