"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import own from "./button.module.css";
import styles from "./preview.module.css";

export function ButtonPreview() {
  const [sendState, setSendState] = useState<"idle" | "busy" | "sent">("idle");
  const [copied, setCopied] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function send() {
    setSendState("busy");
    later(() => setSendState("sent"), 1400);
    later(() => setSendState("idle"), 3600);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText("https://example.com/d/saturday-supper");
    } catch {
      // Clipboard can be blocked in previews; the label still shows the flow.
    }
    setCopied(true);
    later(() => setCopied(false), 1600);
  }

  return (
    <div className={styles.stack}>
      <section className={`${styles.group} ${own.hero}`}>
        <h2 className={styles.heading}>Saturday supper at 14 Alder Lane</h2>
        <div className={styles.row}>
          <Button busy={sendState === "busy"} onClick={send}>
            {sendState === "sent" ? "Invitations sent" : "Send invitations"}
          </Button>
          <Button variant="secondary" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button variant="ghost" className={own.heroGhost}>
            Preview invitation
          </Button>
          <span role="status" className={styles.srOnly}>
            {sendState === "sent" ? "Invitations sent" : copied ? "Link copied" : ""}
          </span>
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Variants</h2>
        <div className={styles.row}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Delete event</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Sizes</h2>
        <div className={styles.row}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>With an icon, and icon only</h2>
        <div className={styles.row}>
          <Button>
            <Icon name="plus" />
            Add a guest
          </Button>
          <Button variant="secondary">
            <Icon name="calendar" />
            Add to calendar
          </Button>
          <Button variant="secondary" aria-label="Share the event">
            <Icon name="share" />
          </Button>
          <Button variant="ghost" aria-label="More actions">
            <Icon name="more" />
          </Button>
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Busy and disabled</h2>
        <div className={styles.row}>
          <Button busy>Send invitations</Button>
          <Button variant="secondary" busy>
            Save draft
          </Button>
          <Button disabled aria-describedby="send-reason">
            Send invitations
          </Button>
        </div>
        <p id="send-reason" className={styles.note}>
          Add at least one guest to send.
        </p>
      </section>
    </div>
  );
}
