"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { Tooltip } from "@registry/tooltip/tooltip";
import styles from "./preview.module.css";
import local from "./tooltip.module.css";

function PathIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" style={{ strokeWidth: "var(--ui-icon-stroke)" }} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  print: "M4.5 6V2.5h7V6M4.5 11.5h-1a1 1 0 0 1-1-1v-3.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1h-1M4.5 9.5h7v4h-7z",
};

export function TooltipPreview() {
  const [status, setStatus] = useState("");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function announce(message: string) {
    setStatus(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus(""), 2000);
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <h2 className={styles.heading}>Invitation for Saturday supper</h2>
        <p className={styles.note}>
          Hover a button and wait, then slide along the row: after the first one, the rest open at once. Tab
          to them and the tooltip opens without the delay.
        </p>
        <div className={local.tooltipToolbar}>
          <Tooltip content="Copy link" kbd="⌘C" describe={false}>
            <Button variant="ghost" aria-label="Copy link" aria-keyshortcuts="Meta+C" onClick={() => announce("Link copied")}>
              <Icon name="link" />
            </Button>
          </Tooltip>
          <Tooltip content="Download PDF" kbd="⌘D" describe={false}>
            <Button variant="ghost" aria-label="Download PDF" aria-keyshortcuts="Meta+D" onClick={() => announce("Downloading saturday-supper.pdf")}>
              <Icon name="download" />
            </Button>
          </Tooltip>
          <Tooltip content="Print" kbd="⌘P" describe={false}>
            <Button variant="ghost" aria-label="Print" aria-keyshortcuts="Meta+P" onClick={() => announce("Opening print dialog")}>
              <PathIcon d={ICONS.print} />
            </Button>
          </Tooltip>
          <span className={local.tooltipDivider} aria-hidden="true" />
          <Tooltip content="Delete event" describe={false}>
            <Button variant="ghost" aria-label="Delete event" onClick={() => announce("Nothing deleted in the preview")}>
              <Icon name="trash" />
            </Button>
          </Tooltip>
        </div>
        <span role="status" className={styles.srOnly}>
          {status}
        </span>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Description, linked with aria-describedby</h2>
        <div className={styles.row}>
          <Tooltip content="Emails the invitation and an RSVP link to Dana Whitfield." side="bottom" arrow>
            <Button onClick={() => announce("Invitation sent")}>Send invitation</Button>
          </Tooltip>
          <Tooltip content="Keeps your changes without notifying guests." side="bottom" arrow>
            <Button variant="secondary">Save draft</Button>
          </Tooltip>
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Placement and arrow</h2>
        <div className={styles.row}>
          <Tooltip content="Above, flips below near the top edge" side="top" arrow>
            <Button variant="secondary">Above</Button>
          </Tooltip>
          <Tooltip content="To the right" side="right" arrow>
            <Button variant="secondary">Right</Button>
          </Tooltip>
          <Tooltip content="Below, starting at the trigger’s edge" side="bottom" align="start" arrow>
            <Button variant="secondary">Below, start</Button>
          </Tooltip>
          <Tooltip content="To the left" side="left" arrow>
            <Button variant="secondary">Left</Button>
          </Tooltip>
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Disabled control, wrapped</h2>
        <div className={styles.row}>
          <Tooltip content="Needs a reply from every guest first." arrow>
            <span className={local.tooltipWrap} tabIndex={0} aria-describedby="seating-reason">
              <Button variant="secondary" disabled>
                Lock the seating
              </Button>
            </span>
          </Tooltip>
        </div>
        <p id="seating-reason" className={styles.note}>
          Seating locks once every guest has replied.
        </p>
      </section>
    </div>
  );
}
