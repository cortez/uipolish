"use client";

import { DiffStat } from "@registry/diff-stat/diff-stat";
import styles from "./preview.module.css";
import own from "./diff-stat.module.css";

/* The stat as it sits in three places: a pull request's heading, a list of
   files where the counts line up at their end, and a new file. */

const FILES = [
  { name: "checkout.spec.ts", added: 6, removed: 4 },
  { name: "use-cart-total.ts", added: 14, removed: 7 },
  { name: "rate-limit.ts", added: 41, removed: 0 },
  { name: "legacy-render.tsx", added: 0, removed: 142 },
];

export function DiffStatPreview() {
  return (
    <div className={styles.stack}>
      <div className={styles.group}>
        <span className={styles.label}>In a heading</span>
        <p className={own.title}>
          Rate limit the export API <DiffStat added={1204} removed={388} />
        </p>
      </div>
      <div className={styles.group}>
        <span className={styles.label}>In a list</span>
        <ul className={own.list}>
          {FILES.map((f) => (
            <li key={f.name} className={own.row}>
              <code className={own.name}>{f.name}</code>
              <DiffStat added={f.added} removed={f.removed} />
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.group}>
        <span className={styles.label}>A new file, zero left out</span>
        <p className={own.line}>
          slow-tax.ts <DiffStat added={22} removed={0} hideZero />
        </p>
      </div>
    </div>
  );
}
