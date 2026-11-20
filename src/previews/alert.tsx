"use client";

import { useRef, useState } from "react";
import { Alert } from "@registry/alert/alert";
import { Button } from "@registry/button/button";
import base from "./preview.module.css";
import styles from "./alert.module.css";

export function AlertPreview() {
  const [offline, setOffline] = useState(false);
  const [sent, setSent] = useState(false);
  const [tipOpen, setTipOpen] = useState(true);
  const showAgain = useRef<HTMLButtonElement>(null);

  // The dismiss button is gone once the alert closes; if it had focus, the
  // button that takes its place gets it, so a keyboard keeps its place.
  function dismissTip() {
    setTipOpen(false);
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) showAgain.current?.focus();
    });
  }

  return (
    <div className={base.stack}>
      <section className={styles.column}>
        <Alert tone="info" title="Invitations go out from hosts@example.com">
          Replies land in the same inbox. <a href="https://example.com/settings/email">Change the sender</a>
        </Alert>
        <Alert
          tone="warning"
          title="Two guests haven’t replied"
          actions={
            <Button variant="secondary">
              Send a reminder
            </Button>
          }
        >
          Priya and Tom were invited on October 12. Seating closes Thursday.
        </Alert>
        {/* The alert and the button that brings it back share one cell, so
            dismissing is a single collapse down to the button's height and
            the button is already in place when it appears. */}
        <div className={styles.slot}>
          {tipOpen && (
            <Alert tone="success" title="Menu shared with 8 guests" onDismiss={dismissTip}>
              They can leave allergy notes until Friday.
            </Alert>
          )}
          <div className={base.row} data-hidden={tipOpen || undefined} inert={tipOpen || undefined}>
            <Button ref={showAgain} variant="ghost" onClick={() => setTipOpen(true)}>
              Show the dismissed alert
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.column}>
        <h2 className={base.label}>Arrives later, space held</h2>
        <Alert
          tone="error"
          open={offline}
          title="Draft not saved"
          actions={
            <Button variant="secondary" onClick={() => setOffline(false)}>
              Try again
            </Button>
          }
        >
          The connection dropped at 6:42 PM. Your changes are kept on this device.
        </Alert>
        <p className={base.note}>Saturday supper, 8 guests. The menu is due Thursday.</p>
        <div className={base.row}>
          <Button variant="secondary" onClick={() => setOffline((v) => !v)}>
            {offline ? "Reconnect" : "Drop the connection"}
          </Button>
        </div>
      </section>

      <section className={styles.column}>
        <h2 className={base.label}>Answers a press, opens its height</h2>
        <div className={base.row}>
          <Button onClick={() => setSent(true)}>
            Send invitations
          </Button>
        </div>
        <Alert tone="success" open={sent} arrive="expand" title="Invitations sent to 8 guests" onDismiss={() => setSent(false)}>
          Anyone who hasn’t replied gets a reminder on November 14.
        </Alert>
        <p className={base.note}>Next: the harvest dinner on November 21.</p>
      </section>
    </div>
  );
}
