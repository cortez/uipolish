"use client";

import { Reasoning } from "@registry/reasoning/reasoning";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.wide}>
      <Reasoning streaming={false} duration={8} steps={["Reading the guest list", "Checking what's in season"]}>
        Eight guests, two vegetarian. Squash and chestnuts are in season, so a stuffed squash works as the second main.
        About 250 g of lamb each for the other six: 1.5 kg.
      </Reasoning>
    </div>
  );
}
