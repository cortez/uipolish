"use client";

import { useState } from "react";
import { Button } from "@registry/button/button";
import { TextMorph } from "@registry/text-morph/text-morph";
import base from "./preview.module.css";
import styles from "./text-morph.module.css";

const STATUSES = ["Draft", "Sending", "Sent to 12 guests", "Delivered"];
const COUNTS = ["12 guests", "13 guests", "14 guests", "15 guests"];

export function TextMorphPreview() {
  const [status, setStatus] = useState(0);
  const [count, setCount] = useState(0);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>A status that changes in place</h2>
        <p className={styles.line}>
          <TextMorph>{STATUSES[status]}</TextMorph>
        </p>
        <div className={base.row}>
          <Button variant="secondary" onClick={() => setStatus((s) => (s + 1) % STATUSES.length)}>
            Next status
          </Button>
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Shared letters stay, the rest trade places</h2>
        <p className={`${styles.line} ${styles.count}`}>
          <TextMorph>{COUNTS[count]}</TextMorph>
        </p>
        <div className={base.row}>
          <Button variant="secondary" onClick={() => setCount((c) => (c + 1) % COUNTS.length)}>
            Add a guest
          </Button>
        </div>
        <p className={base.note}>Button labels use it too: Copy becomes Copied without the button jumping.</p>
      </section>
    </div>
  );
}
