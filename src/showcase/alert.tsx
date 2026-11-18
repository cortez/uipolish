"use client";

import { useEffect, useState } from "react";
import { Alert } from "@registry/alert/alert";
import { Button } from "@registry/button/button";
import styles from "./showcase.module.css";

/** One alert whose content changes in place: the title morphs, the tone
 *  cross-fades, the height eases. It goes back on its own after a moment. */
export default function Showcase() {
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(false), 2800);
    return () => clearTimeout(t);
  }, [sent]);

  return (
    <div className={styles.wide}>
      <Alert
        tone={sent ? "success" : "warning"}
        title={sent ? "Reminder sent" : "Two guests haven’t replied"}
        actions={sent ? undefined : <Button variant="secondary" onClick={() => setSent(true)}>Send a reminder</Button>}
      >
        {sent ? "We’ll tell you when they RSVP." : "Seating closes Thursday."}
      </Alert>
    </div>
  );
}
