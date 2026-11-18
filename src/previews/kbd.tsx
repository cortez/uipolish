"use client";

import { Kbd } from "@registry/kbd/kbd";
import base from "./preview.module.css";
import styles from "./kbd.module.css";

const SHORTCUTS = [
  { label: "Find a guest", keys: ["mod", "K"] },
  { label: "New invitation", keys: ["mod", "shift", "N"] },
  { label: "Send the reminder", keys: ["mod", "enter"] },
  { label: "Next RSVP", keys: ["down"] },
  { label: "Close the seating plan", keys: ["esc"] },
];

export function KbdPreview() {
  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>Keyboard shortcuts</h2>
        <ul className={styles.list}>
          {SHORTCUTS.map((s) => (
            <li key={s.label} className={styles.row}>
              <span>{s.label}</span>
              <Kbd keys={s.keys} className={styles.keys} />
            </li>
          ))}
        </ul>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>In a sentence</h2>
        <p className={styles.prose}>
          Press <Kbd keys={["mod", "K"]} /> to find any guest by name, then <Kbd keys={["enter"]} /> to open their
          RSVP. Maya’s dietary notes are one <Kbd keys={["tab"]} /> away.
        </p>
        <p className={styles.small}>
          Hold <Kbd size="sm" keys={["shift"]} /> to pick several dishes at once, or <Kbd size="sm" keys={["mod", "A"]} />{" "}
          for the whole menu.
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Plain, in a menu and a tooltip</h2>
        <div className={styles.menu}>
          <span className={styles.item}>
            Duplicate menu
            <Kbd variant="plain" keys={["mod", "D"]} className={styles.hint} />
          </span>
          <span className={styles.item}>
            Print place cards
            <Kbd variant="plain" keys={["mod", "shift", "P"]} className={styles.hint} />
          </span>
        </div>
        <span className={styles.tooltip}>
          Copy invitation link <Kbd keys={["mod", "C"]} size="sm" />
        </span>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Both platforms</h2>
        <div className={base.row}>
          <Kbd platform="apple" keys={["mod", "alt", "shift", "S"]} />
          <Kbd platform="other" keys={["mod", "alt", "shift", "S"]} />
        </div>
      </section>
    </div>
  );
}
