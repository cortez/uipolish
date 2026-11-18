"use client";

import text from "@registry/text/text.module.css";
import styles from "./showcase.module.css";

const FILE = "saturday-supper-at-14-alder-lane-final-menu-with-allergies-v3.pdf";

export default function Showcase() {
  return (
    <div className={styles.stack}>
      <span className={text.truncate} title={FILE}>
        {FILE}
      </span>
      <span className={text.sweep}>Reading the guest list</span>
    </div>
  );
}
