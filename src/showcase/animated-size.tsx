"use client";

import { useState } from "react";
import { AnimatedSize } from "@registry/animated-size/animated-size";
import { Button } from "@registry/button/button";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.stack}>
      <Button variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide the menu" : "Show the menu"}
      </Button>
      <AnimatedSize>
        {open ? (
          <ul>
            <li>Charred leeks, hazelnut</li>
            <li>Braised short rib, polenta</li>
            <li>Pear tarte tatin</li>
          </ul>
        ) : (
          <p>Three courses, Saturday at 7:30.</p>
        )}
      </AnimatedSize>
    </div>
  );
}
