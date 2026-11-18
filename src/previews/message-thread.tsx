"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Checkbox } from "@registry/checkbox/checkbox";
import {
  Message,
  MessageThread,
  type Feedback,
  type MessageAttachment,
  type MessageStatus,
} from "@registry/message-thread/message-thread";
import { PromptInput, type PromptMessage } from "@registry/prompt-input/prompt-input";
import { ModePicker } from "./prompt-input";
import styles from "./message-thread.module.css";

type Topic = "plan" | "shopping" | "timeline" | "dietary" | "files" | "general";

type ChatMessage = {
  id: string;
  from: "user" | "assistant";
  text: string;
  status: MessageStatus;
  topic?: Topic;
  variant?: number;
  attachments?: MessageAttachment[];
  feedback?: Feedback;
  error?: string;
};

const SUGGESTIONS = [
  "Plan a dinner for 14 guests",
  "Make the shopping list",
  "Build a timeline for Saturday",
  "Two guests are vegetarian",
];

const REPLIES: Record<Topic, { intros: string[]; body: string }> = {
  plan: {
    intros: [
      "Here’s a plan for 14 that keeps most of the work off the stove once people arrive.",
      "For 14 people, choose a main that cooks itself and sides you can finish in the last half hour. Here’s one way to do it.",
    ],
    body: `**Menu**
- Starter: burrata with roasted grapes and grilled bread
- Main: slow-roasted pork shoulder, about 4.5 kg bone-in
- Sides: crispy smashed potatoes, charred broccolini with lemon
- Vegetarian main: mushroom and leek galette, two of them so nobody gets a sliver
- Dessert: olive oil cake with whipped crème fraîche, made the day before

**How it comes together**
1. Friday night: bake the cake, make the galette dough, salt the pork.
2. Saturday 1:00 pm: the pork goes into a 150°C oven for about six hours.
3. 5:30 pm: boil the potatoes and let them steam dry.
4. 7:00 pm: guests arrive to the burrata while the pork rests under foil.

Want me to turn this into a shopping list, or adjust it for anyone’s dietary needs?`,
  },
  shopping: {
    intros: [
      "Shopping list for 14, grouped by where you’ll find it:",
      "Here’s everything for Saturday, sorted by aisle so it’s one pass through the shop:",
    ],
    body: `**Butcher**
- Pork shoulder, bone-in, 4.5 kg

**Produce**
- Red grapes, 1 kg
- Yukon Gold potatoes, 3.5 kg
- Broccolini, 6 bunches
- Lemons, 5
- Leeks, 3, and cremini mushrooms, 700 g
- Garlic, 2 heads, and a bunch of thyme

**Dairy**
- Burrata, 7 balls (half a ball each)
- Crème fraîche, 500 g
- Butter, 500 g

**Pantry**
- Olive oil, 1 L (the cake takes 240 ml)
- Flaky salt, sugar, flour, baking powder
- 3 baguettes, bought Saturday morning

To paste this into your notes app as a checklist, start each line with \`- [ ]\`.`,
  },
  timeline: {
    intros: [
      "Here’s Saturday, working back from dinner at 7:30 pm:",
      "A timeline for Saturday with dinner on the table at 7:30 pm:",
    ],
    body: `1. **9:00 am** Pick up bread and burrata, then set the table for 14.
2. **12:30 pm** Take the pork out of the fridge so it loses its chill.
3. **1:00 pm** Pork into a 150°C oven, fat side up.
4. **4:00 pm** Assemble both galettes and chill them.
5. **5:30 pm** Boil the potatoes, drain, and let them steam dry.
6. **6:15 pm** Galettes in alongside the pork.
7. **6:45 pm** Pork out to rest under foil; oven up to 220°C for the potatoes.
8. **7:15 pm** Char the broccolini and plate the burrata.
9. **7:30 pm** Carve and serve.

The only tight spot is 6:45 to 7:15, when the oven is shared. If you have a second oven, give it the potatoes.`,
  },
  dietary: {
    intros: [
      "Good to know now rather than on the day. With two vegetarians at a table of 14, make the sides work for everyone:",
      "Easy to plan around. Here’s how the menu changes for two vegetarian guests:",
    ],
    body: `- The galette becomes their main. One galette serves 6, so one is plenty, and the rest of the table will want some.
- Roast the potatoes in olive oil, not pork fat, and keep them on a separate tray.
- The burrata, broccolini and cake are already vegetarian.

If either of them is vegan, tell me and I’ll swap the crème fraîche and the pastry butter.`,
  },
  files: {
    intros: ["Thanks, I’ve got that.", "Got it, thanks for sending that over."],
    body: `With 14 at one long table, a few things make the evening easier:

- Seat the two people helping in the kitchen nearest the door.
- Put the vegetarian guests across from each other, so the galette only needs one spot on the table.
- Leave a gap of about 60 cm per person; a 2.4 m table fits 8 a side at a squeeze, so 7 a side is right.

Want me to check the guest list against the menu next?`,
  },
  general: {
    intros: [
      "Happy to help with that.",
      "Sure, let’s work it into the plan.",
    ],
    body: `For a dinner for 14, here’s what I’d settle first, since everything else depends on it:

- **Headcount and restrictions**: who isn’t eating what.
- **Oven space**: one oven means the main has to be something that rests well.
- **What you can make ahead**: anything done on Friday is one less thing on Saturday.

Tell me those three and I’ll draft the menu and the timeline.`,
  },
};

function topicFor(text: string, hasFiles: boolean): Topic {
  const t = text.toLowerCase();
  if (hasFiles) return "files";
  if (/vegetarian|vegan|gluten|allerg|diet|dairy/.test(t)) return "dietary";
  if (/shop|list|buy|grocer|ingredient/.test(t)) return "shopping";
  if (/time|schedule|when|saturday|order/.test(t)) return "timeline";
  if (/plan|menu|dinner|cook|guest|14/.test(t)) return "plan";
  return "general";
}

function replyText(topic: Topic, variant: number) {
  const { intros, body } = REPLIES[topic];
  return `${intros[variant % intros.length]}\n\n${body}`;
}

// Splits a reply into tokens of one to three words, like a model's output.
function tokenize(text: string) {
  const words = text.match(/\S+\s*|\s+/g) ?? [];
  const tokens: string[] = [];
  for (let i = 0; i < words.length; ) {
    const take = 1 + Math.floor(Math.random() * 3);
    tokens.push(words.slice(i, i + take).join(""));
    i += take;
  }
  return tokens;
}

function delayAfter(token: string) {
  if (/[.:?!]\s*$/.test(token.trimEnd()) || token.includes("\n\n")) return 140 + Math.random() * 160;
  return 28 + Math.random() * 46;
}

const thinkingDelay = () => 600 + Math.random() * 500;

let ids = 0;
const nextId = () => `m${++ids}`;

export function MessageThreadPreview() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [failNext, setFailNext] = useState(false);
  const stream = useRef<{ id: string; timer: number } | null>(null);
  const urls = useRef<string[]>([]);

  const streaming = messages.some((m) => m.status === "streaming");

  useEffect(
    () => () => {
      if (stream.current) clearTimeout(stream.current.timer);
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  function update(id: string, patch: Partial<ChatMessage>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function startReply(id: string, topic: Topic, variant: number) {
    const tokens = tokenize(replyText(topic, variant));
    const failAt = failNext ? Math.floor(tokens.length * 0.4) : -1;
    if (failNext) setFailNext(false);
    let i = 0;
    let text = "";
    const tick = () => {
      if (i === failAt) {
        stream.current = null;
        update(id, { status: "error", error: "The connection dropped before this reply finished." });
        return;
      }
      if (i >= tokens.length) {
        stream.current = null;
        update(id, { status: "complete" });
        return;
      }
      text += tokens[i++];
      update(id, { text });
      stream.current = { id, timer: window.setTimeout(tick, delayAfter(tokens[i - 1])) };
    };
    // A beat of "thinking" before the first token.
    stream.current = { id, timer: window.setTimeout(tick, thinkingDelay()) };
  }

  function send({ text, files }: PromptMessage) {
    if (streaming) return false;
    const attachments = files.map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      return { name: file.name, type: file.type, size: file.size, url };
    });
    const topic = topicFor(text, files.length > 0);
    const reply: ChatMessage = { id: nextId(), from: "assistant", text: "", status: "streaming", topic, variant: 0 };
    setMessages((prev) => [...prev, { id: nextId(), from: "user", text, status: "complete", attachments }, reply]);
    startReply(reply.id, topic, 0);
  }

  function stop() {
    if (!stream.current) return;
    clearTimeout(stream.current.timer);
    update(stream.current.id, { status: "stopped" });
    stream.current = null;
  }

  function retry(message: ChatMessage) {
    if (stream.current) {
      clearTimeout(stream.current.timer);
      stream.current = null;
    }
    const variant = (message.variant ?? 0) + 1;
    const topic = message.topic ?? "general";
    const fresh: ChatMessage = { id: nextId(), from: "assistant", text: "", status: "streaming", topic, variant };
    setMessages((prev) => prev.map((m) => (m.id === message.id ? fresh : m)));
    startReply(fresh.id, topic, variant);
  }

  function reset() {
    if (stream.current) clearTimeout(stream.current.timer);
    stream.current = null;
    setMessages([]);
  }

  return (
    <div className={styles.demo}>
      <div className={styles.chat}>
        <header className={styles.header}>
          <h2 className={styles.title}>Dinner for 14</h2>
          {messages.length > 0 && (
            <Button variant="ghost" onClick={reset}>
              New chat
            </Button>
          )}
        </header>

        <MessageThread
          className={styles.thread}
          label="Dinner planning conversation"
          empty={
            <div className={styles.empty}>
              <h3>What are we cooking?</h3>
              <p>Ask for a menu, a shopping list or a timeline for the day.</p>
            </div>
          }
        >
          {messages.map((m) => (
            <Message
              key={m.id}
              from={m.from}
              text={m.text}
              status={m.status}
              attachments={m.attachments}
              error={m.error}
              feedback={m.feedback ?? null}
              onFeedback={m.from === "assistant" ? (feedback) => update(m.id, { feedback }) : undefined}
              onRetry={m.from === "assistant" ? () => retry(m) : undefined}
            />
          ))}
        </MessageThread>

        <div className={styles.composer}>
          <PromptInput
            placeholder="Ask about the menu, the shopping, the timing…"
            suggestions={messages.length === 0 ? SUGGESTIONS : undefined}
            streaming={streaming}
            onStop={stop}
            onSubmit={send}
            accept="image/*,.pdf,.csv,.txt"
            footer={<ModePicker />}
          />
        </div>
      </div>

      <Checkbox
        className={styles.toggle}
        label="Drop the connection partway through the next reply"
        checked={failNext}
        onCheckedChange={setFailNext}
      />
    </div>
  );
}
