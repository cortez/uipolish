"use client";

import { useRef, useState } from "react";
import {
  AgentQuestion,
  type AgentQuestionAnswer,
  type AgentQuestionChoice,
  type AgentQuestionStatus,
} from "@registry/agent-question/agent-question";
import { Button } from "@registry/button/button";
import styles from "./preview.module.css";
import own from "./agent-question.module.css";

const RSVP: AgentQuestionChoice[] = [
  { value: "link", title: "Private RSVP link", description: "Guests reply on a page only they can open." },
  { value: "list", title: "Shared guest list", description: "Everyone sees who else is coming." },
  { value: "email", title: "Reply by email", description: "I collect the answers from your inbox." },
];

const MENUS: AgentQuestionChoice[] = [
  { value: "veg", title: "Vegetarian", description: "Priya, Sam and Lou asked for it." },
  { value: "gluten", title: "Gluten-free", description: "Tom’s note on his RSVP." },
  { value: "nut", title: "Nut-free", description: "For Ben’s daughter, Ada." },
  { value: "dairy", title: "Dairy-free", description: "Nobody has asked yet." },
];

const SEATING: AgentQuestionChoice[] = [
  { value: "long", title: "One long table", description: "Everyone together, 12 seats." },
  { value: "two", title: "Two tables of six", description: "Quieter, easier to talk across." },
];

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function AgentQuestionPreview() {
  const [run, setRun] = useState(0);

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={own.head}>
          <h2 className={styles.label}>Copper sending the invites for Saturday supper</h2>
          <Button variant="secondary" onClick={() => setRun((r) => r + 1)}>
            Start over
          </Button>
        </div>
        <RsvpThread key={run} />
        <p className={styles.note}>
          The invite service takes a moment and the first send fails on purpose, so you can see the busy button and
          the error.
        </p>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Several answers, or one of your own</h2>
        <MenuThread key={run} />
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Answered, from earlier in the conversation</h2>
        <div className={own.thread}>
          <AgentQuestion
            agent="Copper"
            question="How should guests RSVP?"
            choices={RSVP}
            recommended={{ value: "link", reason: "keeps the guest list private" }}
            status="answered"
            answer={{ values: ["link"] }}
            onAnswer={() => {}}
          />
          <AgentQuestion
            agent="Copper"
            question="Which menus should I plan for?"
            choices={MENUS}
            multiple
            allowOther
            status="answered"
            answer={{ values: ["veg", "nut"], other: "Ask Tom before ruling out gluten" }}
            onAnswer={() => {}}
          />
        </div>
      </section>
    </div>
  );
}

function RsvpThread() {
  const [status, setStatus] = useState<AgentQuestionStatus>("waiting");
  const [answer, setAnswer] = useState<AgentQuestionAnswer>();
  const failedOnce = useRef(false);

  // The invite service answers after a moment, and the first send fails.
  function send(a: AgentQuestionAnswer) {
    return wait(900).then(() => {
      if (!failedOnce.current) {
        failedOnce.current = true;
        throw new Error("Invite service timed out");
      }
      setAnswer(a);
      setStatus("answered");
    });
  }

  const choice = answer?.values[0];
  return (
    <div className={own.thread}>
      <p className={own.prompt}>Send the invites for Saturday supper. 12 people, 7:30 at 14 Alder Lane.</p>
      <p className={own.reply}>The invite is written. One thing before I send it.</p>
      <AgentQuestion
        agent="Copper"
        question="How should guests RSVP?"
        choices={RSVP}
        recommended={{ value: "link", reason: "keeps the guest list private" }}
        allowOther
        otherPlaceholder="Text me and I’ll add them"
        status={status}
        answer={answer}
        onAnswer={send}
      />
      <p className={own.reply}>
        {status === "waiting"
          ? "Waiting for you."
          : choice === "link"
            ? "Sent to all 12 with a private link. I’ll tell you as replies come in."
            : choice
              ? "Sent to all 12. I’ll tell you as replies come in."
              : "Sent to all 12, with your note on how to reply."}
      </p>
    </div>
  );
}

function MenuThread() {
  const [status, setStatus] = useState<AgentQuestionStatus>("waiting");
  const [answer, setAnswer] = useState<AgentQuestionAnswer>();

  return (
    <div className={own.thread}>
      <p className={own.reply}>Five guests mentioned what they can’t eat.</p>
      <AgentQuestion
        agent="Copper"
        question="Which menus should I plan for?"
        choices={MENUS}
        multiple
        allowOther
        otherPlaceholder="Ask Tom first"
        status={status}
        answer={answer}
        onAnswer={(a) => {
          setAnswer(a);
          setStatus("answered");
        }}
      />
      <Seating />
    </div>
  );
}

function Seating() {
  const [answer, setAnswer] = useState<AgentQuestionAnswer>();
  return (
    <AgentQuestion
      agent="Copper"
      question="How should I seat everyone?"
      choices={SEATING}
      recommended={{ value: "two", reason: "Ben and Lou haven’t met the others" }}
      status={answer ? "answered" : "waiting"}
      answer={answer}
      onAnswer={setAnswer}
    />
  );
}
