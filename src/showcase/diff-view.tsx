"use client";

import { DiffView } from "@registry/diff-view/diff-view";
import styles from "./showcase.module.css";

const BEFORE = `export const menu = {
  starter: "Charred leeks, hazelnut",
  main: "Roast chicken, potatoes",
  dessert: "Lemon tart",
  seats: 8,
};`;

const AFTER = `export const menu = {
  starter: "Charred leeks, hazelnut",
  main: "Braised short rib, polenta",
  dessert: "Lemon tart",
  seats: 10,
  wine: true,
};`;

export default function Showcase() {
  return (
    <div className={styles.wide}>
      <DiffView name="supper/menu.ts" before={BEFORE} after={AFTER} />
    </div>
  );
}
