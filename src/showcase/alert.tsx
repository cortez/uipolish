"use client";

import { useEffect, useState } from "react";
import { Alert } from "@registry/alert/alert";
import { Button } from "@registry/button/button";
import styles from "./showcase.module.css";

/** The warning hands off to a success note, which goes again on its own
 *  after a moment, so the card always comes back to where it started. */
export default function Showcase() {
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(false), 3200);
    return () => clearTimeout(t);
  }, [sent]);

  return (
    <div className={styles.wide}>
      <Alert
        open={!sent}
        arrive="expand"
        tone="warning"
        title="Two guests haven’t replied"
        actions={<Button variant="secondary" onClick={() => setSent(true)}>Send a reminder</Button>}
      >
        Seating closes Thursday.
      </Alert>
      <Alert open={sent} arrive="expand" tone="success" title="Reminder sent" onDismiss={() => setSent(false)}>
        We’ll let you know when they RSVP.
      </Alert>
    </div>
  );
}
