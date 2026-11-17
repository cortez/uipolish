"use client";

import { useRef, useState } from "react";
import type { PromptInputHandle } from "@/components/ui/prompt-input/prompt-input";
import { GREETING, STARTERS } from "@/lib/coding/config";
import { relativeTime } from "@/lib/coding/format";
import { Composer } from "./session-composer";
import { useWorkspace } from "./workspace-context";
import frame from "./workspace.module.css";
import styles from "./session.module.css";

/* Home and New session: a greeting, the composer, a few starters that fill
   it (they never send), and the sessions moving now. Sending starts the
   session and opens it as a tab. */

export function NewSession() {
  const { api, route, go, workspace, sessions, refreshSessions } = useWorkspace();
  const composer = useRef<PromptInputHandle>(null);
  const draft = route.draft;
  // A new draft (New session, a teammate's row) remounts the composer with it.
  const [draftKey, setDraftKey] = useState(0);
  const [lastDraft, setLastDraft] = useState(draft);
  if (draft !== lastDraft) {
    setLastDraft(draft);
    setDraftKey((k) => k + 1);
  }
  const moving = sessions.filter((s) => s.working).slice(0, 3);

  return (
    <div className={styles.home}>
      <div className={styles.homeInner}>
        <h1 className={styles.greeting}>{GREETING}</h1>
        <p className={styles.homeLead}>
          The agent works on a branch of <code>{workspace.repo}</code> and opens a pull request you can review here.
        </p>
        <Composer
          key={draftKey}
          handleRef={composer}
          autoFocus
          defaultText={draft?.text ?? ""}
          defaultMentions={draft?.mentions ?? []}
          onSend={async (prompt) => {
            const { id } = await api.create(prompt);
            refreshSessions();
            go({ session: id });
          }}
        />
        <ul className={styles.starters} aria-label="Starters">
          {STARTERS.map((s) => (
            <li key={s.title}>
              <button type="button" className={styles.starter} onClick={() => composer.current?.setText(s.prompt)}>
                <span className={styles.starterTitle}>{s.title}</span>
                <span className={styles.starterPrompt}>{s.prompt}</span>
              </button>
            </li>
          ))}
        </ul>
        {moving.length > 0 && (
          <section className={styles.moving} aria-labelledby="moving-title">
            <h2 id="moving-title" className={styles.movingTitle}>
              Working now
            </h2>
            <ul className={styles.movingList}>
              {moving.map((s) => (
                <li key={s.id}>
                  <button type="button" className={styles.movingRow} onClick={() => go({ session: s.id })}>
                    <span className={frame.working} aria-hidden="true" />
                    <span className={styles.movingName}>{s.title}</span>
                    <span className={styles.movingTime}>{relativeTime(s.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
