"use client";

import { useState } from "react";
import { AnimatedSize } from "@registry/animated-size/animated-size";
import { MessageBranches, type MessageVersion } from "@registry/message-branches/message-branches";
import { ResponseActions, type Rating } from "@registry/response-actions/response-actions";
import base from "./preview.module.css";
import styles from "./message-branches.module.css";

const ASK = "Plan a menu for 8 on Saturday. Priya is vegetarian.";

const REPLIES = [
  {
    note: "Balanced",
    text: "A menu for 8 that suits Priya without a separate dish: burrata with roasted grapes to start, a mushroom and leek galette with crispy potatoes for the main, and olive oil cake for dessert. The galette and the cake can both be made on Friday.",
  },
  {
    note: "Regenerated · Balanced",
    text: "Keep it to one oven: a tray of roasted squash with whipped feta to start, then a big pot of white bean and tomato stew with grilled bread, which everyone eats and Priya doesn’t have to ask about. Finish with a lemon tart from the bakery on Alder Lane.",
  },
  {
    note: "Regenerated · Deep",
    text: "For 8, with Priya vegetarian, make the vegetarian dish the centre and the meat a side, so nobody is served the lesser plate.",
    steps: [
      "Starter: burrata, roasted grapes and grilled bread, plated before the doorbell.",
      "Main: two mushroom and leek galettes, cut at the table.",
      "On the side: a small porchetta for the six who want it, roasted on Friday and sliced cold.",
      "Dessert: olive oil cake with whipped crème fraîche, made the day before.",
    ],
  },
  {
    note: "Regenerated · Quick",
    text: "Burrata to start, a mushroom galette as the main for everyone, olive oil cake to finish. All three can be made or bought on Friday.",
  },
];

// Retry adds the last one.
const FIRST_COUNT = 3;

const PROMPTS = [
  { note: "Original", text: "Can Maya bring dessert?" },
  { note: "Edited prompt", text: "Can Maya bring dessert, and Theo the wine?" },
];

const ANSWERS = [
  "Yes. Maya’s olive oil cake travels well; ask her to bring it whole and the crème fraîche separately, and Copper will take dessert off your Friday list.",
  "Yes to both. Maya brings the olive oil cake, whole, with the crème fraîche on the side. Theo brings four bottles: two white for the burrata and two light reds for the galette. Copper has sent them each a note with the time.",
];

export function MessageBranchesPreview() {
  const [count, setCount] = useState(FIRST_COUNT);
  const [reply, setReply] = useState(FIRST_COUNT - 1);
  const [ratings, setRatings] = useState<Rating[]>(() => REPLIES.map(() => null));
  const [prompt, setPrompt] = useState(PROMPTS.length - 1);
  const [edited, setEdited] = useState(false);

  const replyVersions: MessageVersion[] = REPLIES.slice(0, count).map((r, i) => ({
    id: `reply-${i}`,
    note: r.note,
    content: (
      <div className={styles.reply}>
        <p className={styles.text}>{r.text}</p>
        {r.steps && (
          <ul className={styles.list}>
            {r.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    ),
  }));

  const promptVersions: MessageVersion[] = PROMPTS.map((p, i) => ({
    id: `prompt-${i}`,
    note: p.note,
    content: <p className={styles.bubble}>{p.text}</p>,
  }));

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>A regenerated reply</h2>
        <div className={`${base.measure} ${styles.thread}`}>
          <p className={styles.bubble}>{ASK}</p>
          <article className={styles.message} aria-label="Copper">
            <MessageBranches versions={replyVersions} index={reply} onIndexChange={setReply} />
            <ResponseActions
              text={REPLIES[reply].text}
              rating={ratings[reply]}
              onRate={(next) => setRatings((list) => list.map((r, i) => (i === reply ? next : r)))}
              onRetry={
                count < REPLIES.length
                  ? () => {
                      setCount(count + 1);
                      setReply(count);
                    }
                  : undefined
              }
            />
          </article>
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.heading}>An edited prompt</h2>
        <div className={`${base.measure} ${styles.thread}`}>
          <article aria-label="You">
            <MessageBranches
              versions={promptVersions}
              index={prompt}
              onIndexChange={(i) => {
                setPrompt(i);
                setEdited(true);
              }}
              align="end"
            />
          </article>
          {/* The reply belongs to the prompt above it, so it follows the version shown. */}
          <AnimatedSize>
            <article key={prompt} className={styles.answer} data-changed={edited || undefined} aria-label="Copper">
              <p className={styles.text}>{ANSWERS[prompt]}</p>
            </article>
          </AnimatedSize>
        </div>
      </section>
    </div>
  );
}
