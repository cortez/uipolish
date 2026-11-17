"use client";

import { useState } from "react";
import { Button } from "@registry/button/button";
import { TextMorph } from "@registry/text-morph/text-morph";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [guests, setGuests] = useState(12);
  return (
    <div className={styles.row}>
      <TextMorph>{`${guests} guests`}</TextMorph>
      <Button variant="secondary" onClick={() => setGuests((g) => (g >= 15 ? 12 : g + 1))}>
        Add a guest
      </Button>
    </div>
  );
}
