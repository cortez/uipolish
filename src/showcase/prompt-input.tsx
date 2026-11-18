"use client";

import { PromptInput } from "@registry/prompt-input/prompt-input";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.wide}>
      <PromptInput
        placeholder="Ask about the menu, the shopping, the timing…"
        accept="image/*,.pdf,.csv"
        onSubmit={() => {}}
      />
    </div>
  );
}
