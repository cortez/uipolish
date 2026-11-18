"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { PromptInput, type PromptInputHandle } from "@registry/prompt-input/prompt-input";
import { PromptSuggestions, type PromptSuggestion } from "@registry/prompt-suggestions/prompt-suggestions";
import base from "./preview.module.css";
import styles from "./prompt-suggestions.module.css";

const STARTERS: PromptSuggestion[] = [
  { icon: "list", title: "Plan the menu", detail: "Three courses for 14, two of them vegetarian", prompt: "Plan a three-course menu for 14 guests. Two are vegetarian." },
  { icon: "compose", title: "Write the invitation", detail: "Saturday at 7:30, with a link to RSVP", prompt: "Write the invitation for Saturday at 7:30 with a link to RSVP." },
  { icon: "check-circle", title: "Chase the RSVPs", detail: "Who hasn’t answered yet" },
  { icon: "clock", title: "Time the cooking", detail: "Work back from dinner at 8" },
];

type Turn = { reply: string; followUps: string[] };

const TURNS: Turn[] = [
  {
    reply:
      "Eleven of your 14 guests have said yes. Priya and Tom are still to answer, and Lena can’t make it. Two of the eleven are vegetarian and one doesn’t eat nuts.",
    followUps: ["Remind Priya and Tom", "Swap the lamb for a vegetarian main", "Make the shopping list for 11"],
  },
  {
    reply:
      "Done. Priya and Tom each have a reminder, and I’ll tell you when they answer. Want the shopping list now, or once the numbers are final?",
    followUps: ["Make it now", "Wait for the numbers"],
  },
];

export function PromptSuggestionsPreview() {
  return (
    <div className={base.stack}>
      <StartDemo />
      <FollowUpDemo />
      <section className={`${base.group} ${base.measure}`}>
        <h2 className={base.label}>Disabled while a reply streams</h2>
        <PromptSuggestions layout="follow-up" suggestions={TURNS[0].followUps} onSelect={() => {}} disabled />
      </section>
    </div>
  );
}

function StartDemo() {
  const [sent, setSent] = useState<string | null>(null);
  const input = useRef<PromptInputHandle>(null);

  function send(text: string) {
    setSent(text);
    input.current?.focus();
  }

  return (
    <section className={`${base.group} ${base.measure}`}>
      <h2 className={base.heading}>Dinner for 14</h2>
      <div className={styles.chat}>
        <div className={styles.thread}>
          {sent === null ? (
            <p className={styles.greeting}>What should Copper help with?</p>
          ) : (
            <>
              <p className={styles.user}>{sent}</p>
              <p className={styles.pending} role="status">
                Copper is replying…
              </p>
            </>
          )}
          <PromptSuggestions suggestions={sent === null ? STARTERS : []} onSelect={(s) => send(s.prompt)} />
        </div>
        <PromptInput
          ref={input}
          placeholder="Ask about the menu, the guests, the timing…"
          attachments={false}
          hint={false}
          onSubmit={({ text }) => send(text)}
        />
      </div>
      <div className={base.row}>
        <Button variant="secondary" onClick={() => setSent(null)} disabled={sent === null}>
          Start over
        </Button>
      </div>
    </section>
  );
}

function FollowUpDemo() {
  // Each entry: the reply shown, then the follow-up the person picked (if any).
  const [picked, setPicked] = useState<string[]>([]);
  const [replying, setReplying] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  function choose(text: string) {
    setPicked((p) => [...p, text]);
    setReplying(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setReplying(false), 1200);
  }

  function reset() {
    clearTimeout(timer.current);
    setPicked([]);
    setReplying(false);
  }

  const shownTurns = Math.min(TURNS.length, picked.length + (replying ? 0 : 1));

  return (
    <section className={`${base.group} ${base.measure}`}>
      <h2 className={base.label}>Under an answer</h2>
      <div className={styles.thread}>
        {TURNS.slice(0, Math.max(1, shownTurns)).map((turn, i) => {
          const last = i === shownTurns - 1;
          return (
            <div key={i} className={styles.turn}>
              <p className={styles.reply}>{turn.reply}</p>
              <PromptSuggestions
                layout="follow-up"
                suggestions={last && !replying && picked.length === i ? turn.followUps : []}
                onSelect={(s) => choose(s.prompt)}
              />
              {picked[i] && <p className={styles.user}>{picked[i]}</p>}
            </div>
          );
        })}
        {replying && (
          <p className={styles.pending} role="status">
            Copper is replying…
          </p>
        )}
        {!replying && picked.length >= TURNS.length && (
          <p className={styles.pending} role="status">
            Copper is on it.
          </p>
        )}
      </div>
      <div className={base.row}>
        <Button variant="secondary" onClick={reset} disabled={picked.length === 0}>
          Start over
        </Button>
      </div>
    </section>
  );
}
