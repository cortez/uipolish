"use client";

import { useState } from "react";
import { Alert } from "@registry/alert/alert";
import { Button } from "@registry/button/button";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [sent, setSent] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <div className={styles.wide}>
      <Alert
        key={round}
        tone={sent ? "success" : "warning"}
        title={sent ? "Reminder sent" : "Two guests haven’t replied"}
        actions={sent ? undefined : <Button variant="secondary" onClick={() => setSent(true)}>Send a reminder</Button>}
        onDismiss={sent ? () => { setSent(false); setRound((r) => r + 1); } : undefined}
      >
        {sent ? "We’ll let you know when they RSVP." : "Seating closes Thursday."}
      </Alert>
    </div>
  );
}
