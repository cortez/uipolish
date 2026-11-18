"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { CodeBlock } from "@registry/code-block/code-block";
import styles from "./code-block.module.css";
import base from "./preview.module.css";

const TS = `import type { Expense } from "./types";

/**
 * Totals a dinner's shared costs. Tax applies to groceries
 * only; rental fees are exempt in this county.
 */
export function dinnerTotal(items: Expense[], taxRate = 0.0725) {
  let groceries = 0;
  let fees = 0;

  for (const item of items) {
    const amount = item.quantity * item.unitPrice;
    if (item.kind === "fee") fees += amount;
    else groceries += amount;
  }

  const tax = Math.round(groceries * taxRate * 100) / 100;
  return { groceries, fees, tax, total: groceries + fees + tax };
}`;

const TSX = `import { useState } from "react";
import { Button } from "@/components/button";

type Props = { guests: number; onSend?: (count: number) => void };

export function InviteButton({ guests, onSend }: Props) {
  const [sent, setSent] = useState(false);
  // Plural label, so one guest doesn't read "1 guests".
  const label = \`Send \${guests} invite\${guests === 1 ? "" : "s"}\`;
  return (
    <Button variant="primary" disabled={sent} onClick={() => {
      setSent(true);
      onSend?.(guests);
    }}>
      {sent ? "Sent" : label}
    </Button>
  );
}`;

const CSS = `/* The card lifts on hover; the press settles it back. */
.card[data-state="open"] > .title:hover {
  padding: var(--ui-space-3) calc(var(--ui-space-4) - 1px);
  border-radius: 12px;
  color: color-mix(in oklch, var(--ui-accent) 80%, black);
  box-shadow: 0 1px 2px #0000000f, var(--ui-shadow-raised);
  transition: translate 240ms var(--ui-ease-snap) !important;
}

@media (prefers-reduced-motion: reduce) {
  .card { transition: none; }
}`;

const SHELL = `curl -X POST https://api.example.com/v1/events/1182/invitations -H "Authorization: Bearer $EVENTS_TOKEN" -H "Content-Type: application/json" -d '{"to":"dana.whitfield@example.com","message":"Supper is at 7:30 on Saturday at 14 Alder Lane. Bring a coat for the patio."}'`;

const JSON_TEXT = `{
  "id": 1182,
  "event": "Saturday supper",
  "address": "14 Alder Lane",
  "host": { "name": "Maya Chen", "email": "maya@example.com" },
  "items": [
    { "kind": "grocery", "name": "Lamb shoulder, bone-in", "quantity": 2, "unitPrice": 38 },
    { "kind": "fee", "name": "Table and chair rental", "quantity": 1, "unitPrice": 75 }
  ],
  "taxRate": 0.0725,
  "sent": true,
  "paidAt": null
}`;

/** Feeds TS in uneven chunks, the way a model's tokens arrive. */
function useStream(text: string) {
  const [length, setLength] = useState(0);
  const [run, setRun] = useState(0);
  const timer = useRef(0);

  useEffect(() => {
    let at = 0;
    function tick() {
      at = Math.min(text.length, at + 1 + Math.floor(Math.random() * 6));
      setLength(at);
      if (at < text.length) timer.current = window.setTimeout(tick, 24 + Math.random() * 40);
    }
    timer.current = window.setTimeout(tick, 400);
    return () => clearTimeout(timer.current);
  }, [text, run]);

  return {
    code: text.slice(0, length),
    streaming: length < text.length,
    replay: () => {
      setLength(0);
      setRun((r) => r + 1);
    },
  };
}

export function CodeBlockPreview() {
  const stream = useStream(TS);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.header}>
          <h2 className={base.heading}>Streaming</h2>
          <Button variant="secondary" onClick={stream.replay} data-demo-controls="">
            Replay
          </Button>
        </div>
        <p className={styles.prompt}>
          Here’s a helper that totals the dinner costs and taxes only the groceries:
        </p>
        {/* The finished block sits invisibly in the same cell, so the space the
            answer will take is held from the start and nothing below moves
            while it streams. */}
        <div className={styles.reserve}>
          <div className={styles.ghost} aria-hidden="true" inert>
            <CodeBlock code={TS} language="ts" title="dinner-total.ts" lineNumbers />
          </div>
          <CodeBlock code={stream.code} language="ts" title="dinner-total.ts" streaming={stream.streaming} lineNumbers />
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>TSX</h2>
        <CodeBlock code={TSX} language="tsx" title="invite-button.tsx" />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>CSS</h2>
        <CodeBlock code={CSS} language="css" title="card.module.css" />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Long line, scrolls sideways (focus it and use the arrow keys)</h2>
        <CodeBlock code={SHELL} language="sh" />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>JSON with line numbers</h2>
        <CodeBlock code={JSON_TEXT} language="json" lineNumbers />
      </section>
    </div>
  );
}
