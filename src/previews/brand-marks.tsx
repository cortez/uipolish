"use client";

import { BRAND_NAMES, BrandMark, brandTitle } from "@registry/brand-marks/brand-marks";
import base from "./preview.module.css";
import styles from "./brand-marks.module.css";

export function BrandMarksPreview() {
  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>In each brand&rsquo;s color</h2>
        <ul className={styles.grid}>
          {BRAND_NAMES.map((name) => (
            <li key={name} className={styles.cell}>
              <BrandMark name={name} size={20} />
              <span className={styles.name}>{brandTitle(name)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>In the text color</h2>
        <div className={base.row}>
          {BRAND_NAMES.slice(0, 12).map((name) => (
            <BrandMark key={name} name={name} size={20} mono />
          ))}
        </div>
      </section>
    </div>
  );
}
