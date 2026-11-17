"use client";

import { ThemeSelect, ThemeToggle } from "@registry/theme-toggle/theme-toggle";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.row}>
      <ThemeToggle />
      <ThemeSelect aria-label="Theme" />
    </div>
  );
}
