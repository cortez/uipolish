"use client";

import { useState } from "react";
import { AgentQuestion, type AgentQuestionAnswer } from "@registry/agent-question/agent-question";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [answer, setAnswer] = useState<AgentQuestionAnswer | null>(null);
  return (
    <div className={styles.wide}>
      <AgentQuestion
        agent="Copper"
        question="How should guests RSVP?"
        choices={[
          { value: "link", title: "Private RSVP link" },
          { value: "list", title: "Shared guest list" },
        ]}
        recommended={{ value: "link", reason: "keeps the list private" }}
        status={answer ? "answered" : "waiting"}
        answer={answer ?? undefined}
        onAnswer={setAnswer}
      />
    </div>
  );
}
