"use client";

import { SkeletonCircle, SkeletonText } from "@registry/skeleton/skeleton";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.stack}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.row}>
          <SkeletonCircle size={36} />
          <SkeletonText lines={2} width="12em" />
        </div>
      ))}
    </div>
  );
}
