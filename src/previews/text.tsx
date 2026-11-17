"use client";

import text from "@registry/text/text.module.css";
import base from "./preview.module.css";
import styles from "./text.module.css";

const FILES = [
  "guest-list.csv",
  "saturday-supper-at-14-alder-lane-final-menu-with-allergies-v3.pdf",
  "seating.png",
];

export function TextPreview() {
  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>One line that fades when it&rsquo;s cut</h2>
        <ul className={styles.files}>
          {FILES.map((f) => (
            <li key={f} className={styles.file}>
              <span className={text.truncate} title={f}>
                {f}
              </span>
              <span className={styles.size}>24 KB</span>
            </li>
          ))}
        </ul>
        <p className={base.note}>Short names are left alone; only the long one fades.</p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Several lines</h2>
        <p className={`${text.truncateLines} ${styles.excerpt}`}>
          Slow-roast a pork shoulder from late morning and serve it with smashed potatoes and a big green salad.
          Start with burrata and roasted grapes. Your sister&rsquo;s lemon tart covers dessert, and there&rsquo;s
          room in the oven for a second tray if two more friends can come.
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Work in progress</h2>
        <p className={`${text.sweep} ${styles.excerpt}`}>Reading the guest list</p>
      </section>
    </div>
  );
}
