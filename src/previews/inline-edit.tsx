"use client";

import { useState } from "react";
import { InlineEdit } from "@registry/inline-edit/inline-edit";
import base from "./preview.module.css";
import styles from "./inline-edit.module.css";

const COURSES = [
  { course: "To start", dish: "Charred leeks, hazelnut romesco" },
  { course: "Main", dish: "Slow-roast lamb shoulder, white beans" },
  { course: "Dessert", dish: "Lemon tart with burnt meringue" },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function InlineEditPreview() {
  const [title, setTitle] = useState("Saturday supper");
  const [log, setLog] = useState("Click the title, or Tab to it and press Enter.");

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <InlineEdit
          as="h1"
          className={styles.title}
          label="Event name"
          value={title}
          placeholder="Name the evening"
          maxLength={60}
          validate={(v) => (v.length > 40 ? "Keep it under 40 characters, so it fits the invitation" : null)}
          onCommit={async (next) => {
            // Saved on the server; "brunch" is already taken that weekend.
            await wait(900);
            if (/brunch/i.test(next)) throw new Error("The garden is booked for a brunch that weekend. Pick another name.");
            setTitle(next);
            setLog(`Saved as “${next}”.`);
          }}
          onCancel={() => setLog("Left as it was.")}
        />
        <p className={base.note} aria-live="polite">
          {log}
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.heading}>Menu</h2>
        <dl className={styles.menu}>
          {COURSES.map((c) => (
            <div key={c.course} className={styles.course}>
              <dt className={base.note}>{c.course}</dt>
              <dd className={styles.dish}>
                <InlineEdit label={`${c.course} dish`} defaultValue={c.dish} placeholder="Add a dish" />
              </dd>
            </div>
          ))}
          <div className={styles.course}>
            <dt className={base.note}>Cheese</dt>
            <dd className={styles.dish}>
              <InlineEdit label="Cheese course" defaultValue="Comté, 24 months" disabled />
            </dd>
          </div>
        </dl>
        <p className={base.note}>The cheese is locked: it’s already ordered.</p>
      </section>
    </div>
  );
}
