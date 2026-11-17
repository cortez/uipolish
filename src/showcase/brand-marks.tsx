"use client";

import { BrandMark, brandTitle, type BrandName } from "@registry/brand-marks/brand-marks";
import styles from "./showcase.module.css";

const NAMES: BrandName[] = ["github", "stripe", "notion", "figma", "googlecalendar", "spotify", "linear", "vercel"];

export default function Showcase() {
  return (
    <div className={styles.row}>
      {NAMES.map((name) => (
        <span key={name} role="img" aria-label={brandTitle(name)} title={brandTitle(name)}>
          <BrandMark name={name} size={24} />
        </span>
      ))}
    </div>
  );
}
