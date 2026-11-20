"use client";

import { Kbd } from "@registry/kbd/kbd";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.row}>
      <Kbd keys={["mod", "K"]} />
      <Kbd keys={["mod", "shift", "N"]} />
      <Kbd keys={["esc"]} />
    </div>
  );
}
