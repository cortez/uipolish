"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@registry/icons/icons";
import styles from "./showcase.module.css";

/** Pairs that morph into each other, stroke for stroke. */
const PAIRS: [IconName, IconName][] = [
  ["play", "pause"],
  ["copy", "check"],
  ["eye", "eye-off"],
  ["menu", "close"],
  ["plus", "minus"],
];

/** The icons on their own, swapping every 1.4s so the morph is the demo.
 *  Held still under reduced motion. */
export default function Showcase() {
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setFlip((f) => !f), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={`${styles.row} ${styles.icons}`} aria-hidden="true">
      {PAIRS.map(([a, b], i) => (
        <Icon key={a} name={flip !== (i % 2 === 1) ? b : a} />
      ))}
    </div>
  );
}
