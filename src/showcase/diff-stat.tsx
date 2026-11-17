"use client";

import { DiffStat } from "@registry/diff-stat/diff-stat";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.row}>
      <DiffStat added={12} removed={3} />
      <DiffStat added={1240} removed={386} />
      <DiffStat added={22} removed={0} hideZero />
      <DiffStat added={0} removed={7} hideZero />
    </div>
  );
}
