"use client";

import { useEffect, useState } from "react";
import { Button } from "@registry/button/button";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!sending) return;
    const t = window.setTimeout(() => setSending(false), 1500);
    return () => window.clearTimeout(t);
  }, [sending]);
  return (
    <div className={styles.row}>
      <Button busy={sending} busyLabel="Sending…" onClick={() => setSending(true)}>
        Send
      </Button>
      <Button variant="secondary">Preview</Button>
      <Button variant="ghost">Cancel</Button>
    </div>
  );
}
