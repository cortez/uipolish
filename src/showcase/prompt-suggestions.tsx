"use client";

import { PromptSuggestions } from "@registry/prompt-suggestions/prompt-suggestions";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.wide}>
      <PromptSuggestions
        layout="follow-up"
        suggestions={["Remind Priya and Tom", "Make the shopping list"]}
        onSelect={() => {}}
      />
    </div>
  );
}
