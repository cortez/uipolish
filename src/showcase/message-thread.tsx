"use client";

import { useState } from "react";
import { Message, MessageThread, type Feedback } from "@registry/message-thread/message-thread";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [feedback, setFeedback] = useState<Feedback>(null);

  return (
    <div className={styles.wide}>
      <MessageThread label="Dinner planning conversation">
        <Message from="user" text="How much lamb for 8 guests?" />
        <Message
          from="assistant"
          text="About **2 kg** bone-in, or 1.4 kg boned. Two guests are vegetarian, so 1.5 kg bone-in is plenty."
          feedback={feedback}
          onFeedback={setFeedback}
        />
      </MessageThread>
    </div>
  );
}
