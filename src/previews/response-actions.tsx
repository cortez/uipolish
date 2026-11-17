"use client";

import { useState } from "react";
import { ResponseActions, type Rating } from "@registry/response-actions/response-actions";
import base from "./preview.module.css";
import styles from "./response-actions.module.css";

const REPLY =
  "Your seats for Saturday supper are confirmed: a table for 4 at 14 Alder Lane, from 7:30 p.m. Maya sends the menu on Thursday, and you can change your party size until Friday at noon.";

const FOLLOW_UP = "Can I bring one more guest?";

export function ResponseActionsPreview() {
  const [rating, setRating] = useState<Rating>(null);
  const [log, setLog] = useState("Nothing sent yet.");

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>Under a reply</h2>
        <div className={styles.thread}>
          <article className={styles.reply}>
            <p className={styles.text}>{REPLY}</p>
            <ResponseActions
              text={REPLY}
              rating={rating}
              onRate={(next) => {
                setRating(next);
                setLog(next ? `Rated ${next === "up" ? "good" : "bad"}.` : "Rating cleared.");
              }}
              onComment={(comment) => setLog(`Rated bad, with “${comment}”.`)}
              onRetry={() => setLog("Asked for a new reply.")}
            />
          </article>
          <p className={styles.user}>{FOLLOW_UP}</p>
        </div>
        <p className={base.note}>
          <span className={styles.logLabel}>Sent to the server:</span> {log}
        </p>
      </section>
    </div>
  );
}
