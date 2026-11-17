"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChatApp,
  type ChatConversation,
  type ChatMessage,
  type ChatStatus,
  type ModelOption,
  type Rating,
  type Source,
  type StarterPrompt,
  type ToolStep,
} from "@registry/chat-app/chat-app";
import { Avatar } from "@registry/avatar/avatar";
import { Checkbox } from "@registry/checkbox/checkbox";
import { Select } from "@registry/select/select";
import styles from "./chat-app.module.css";

/* Acme, a supper-club app, and Copper, its assistant. Everything below is fake:
   the streaming, the tool calls, the latency and the occasional failure. */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const MODELS: ModelOption[] = [
  { id: "copper-quick", name: "Copper Quick", description: "Fast answers to short questions" },
  { id: "copper", name: "Copper", description: "Menus, timings and guest messages" },
  { id: "copper-plus", name: "Copper Plus", description: "Thinks longer on big events. Pro plan", disabled: true },
];

const STARTERS: StarterPrompt[] = [
  {
    title: "Plan Saturday’s supper",
    detail: "A menu for everyone on the guest list",
    prompt: "Plan a menu for Saturday’s supper. Check the guest list for dietary needs.",
  },
  { title: "Write the reminder email", detail: "For guests who haven’t paid yet", prompt: "Write a friendly reminder to guests who haven’t paid for Saturday yet." },
  { title: "Build a cooking timeline", detail: "Working back from a 7:30 pm dinner", prompt: "Build a cooking timeline for Saturday, dinner at 7:30 pm." },
  { title: "Price a tasting menu", detail: "Six courses, 12 covers", prompt: "Help me price a six-course tasting menu for 12 covers." },
];

const SOURCES: Source[] = [
  {
    title: "What’s in season: November",
    url: "https://riversidemarket.example.org/seasonal/november",
    excerpt: "Winter squash, leeks, Brussels sprouts and Comice pears are at peak supply through the end of the month.",
  },
  {
    title: "Slow-roast pork shoulder for a crowd",
    url: "https://acme.example.com/guides/slow-roast-pork-shoulder",
    excerpt: "Allow about 80 minutes per kilo at 150°C, then rest it under foil for at least 30 minutes.",
  },
];

const REASONING = `Saturday’s supper has 14 confirmed guests. Before suggesting anything I should check the guest list for dietary notes, since a menu that misses an allergy is worse than no menu.

It’s early November, so the menu should lean on what’s in season at the market: squash, leeks, pears, sprouts. That keeps the cost down too.

One oven means the main has to be something that cooks unattended and rests well. A pork shoulder fits, and a galette covers the vegetarians.`;

const ANSWER = `Here’s a menu for Saturday that works for all 14, with everything but the greens done before guests arrive.

**Menu**
- **To start:** roasted squash soup with brown butter and sage, served in mugs as people arrive
- **Main:** slow-roasted pork shoulder with apple and fennel, about 4.5 kg bone-in
- **Vegetarian main:** mushroom and leek galette, two of them, so Priya and Tom get a proper slice
- **Sides:** crispy smashed potatoes and charred Brussels sprouts with lemon
- **Dessert:** pear and olive oil cake with crème fraîche

Squash, leeks, pears and sprouts are all at their best at the market this week[1], so they’ll be good and cheap.

**For Daniel’s tree-nut allergy**
- No pine nuts on the sprouts and no almonds in the cake; the recipe as written has neither.
- If you buy the galette pastry ready-made, check the label for traces.

The pork needs about six hours at 150°C plus 30 minutes’ rest[2], so it goes in at 1:00 pm for a 7:30 pm dinner. Want me to turn this into a shopping list?`;

function steps(t0: number): ToolStep[] {
  return [
    {
      id: "guests",
      title: "Read the guest list",
      status: "done",
      detail: "14 going · 2 vegetarian · 1 tree-nut allergy",
      input: `acme.guests.list({ event: "sat-supper-nov-8", rsvp: "going" })`,
      output: `{ "count": 14, "dietary": { "vegetarian": ["Priya Raman", "Tom Becker"], "tree_nut_allergy": ["Daniel Osei"] } }`,
      startedAt: t0,
      finishedAt: t0 + 1300,
    },
    {
      id: "season",
      title: "Checked what’s in season",
      status: "done",
      detail: "Riverside Farmers Market, week of Nov 3",
      input: `web.search("riverside farmers market in season november")`,
      output: `2 results · riversidemarket.example.org, acme.example.com`,
      startedAt: t0 + 1400,
      finishedAt: t0 + 3100,
    },
  ];
}

const RUNNING_TITLES: Record<string, string> = {
  guests: "Reading the guest list",
  season: "Checking what’s in season",
};

/* A finished conversation, long enough to scroll. */
function history(now: number): ChatMessage[] {
  const t = now - 2 * HOUR;
  return [
    { id: "h1", role: "user", text: "We’ve got 14 coming Saturday. Can you plan the menu? Check the guest list first." },
    {
      id: "h2",
      role: "assistant",
      text: ANSWER,
      reasoning: { text: REASONING, duration: 4 },
      steps: steps(t),
      sources: SOURCES,
    },
    { id: "h3", role: "user", text: "Perfect. Can you make the shopping list, grouped by where I’ll buy it?" },
    {
      id: "h4",
      role: "assistant",
      text: `Here’s everything for 14, sorted so it’s one pass through each shop.

**Butcher**
- Pork shoulder, bone-in, 4.5 kg

**Market**
- Butternut squash, 3 large
- Leeks, 4, and chestnut mushrooms, 800 g
- Brussels sprouts, 1.5 kg
- Comice pears, 4
- Lemons, 4, and a bunch of sage

**Shop**
- Potatoes, 3.5 kg
- Crème fraîche, 500 g, and butter, 500 g
- Ready-made puff pastry, 2 packs (check for nut traces)
- Olive oil, 1 L

The squash and pears keep well, so buy them Thursday.`,
      rating: "up",
    },
    { id: "h5", role: "user", text: "Tom says he can bring dessert instead. Does that change anything?" },
    {
      id: "h6",
      role: "assistant",
      text: `Only a little. Take the pears, olive oil and crème fraîche off the list, and let Tom know about Daniel’s tree-nut allergy so he can pick something without almonds or hazelnuts.

It also frees the oven on Friday night, so you could make the soup a day early.`,
    },
    { id: "h7", role: "user", text: "Good idea. When should I start on Saturday?" },
    {
      id: "h8",
      role: "assistant",
      text: `Working back from 7:30 pm:

1. **12:30 pm** Take the pork out of the fridge.
2. **1:00 pm** Pork into a 150°C oven, fat side up.
3. **4:00 pm** Assemble both galettes and chill them.
4. **5:30 pm** Boil the potatoes, drain, let them steam dry.
5. **6:15 pm** Galettes in beside the pork.
6. **6:45 pm** Pork out to rest; oven up to 220°C for the potatoes.
7. **7:15 pm** Warm the soup and char the sprouts.
8. **7:30 pm** Carve and serve.

The tight spot is 6:45 to 7:15, when the oven is shared.`,
    },
    { id: "h9", role: "user", text: "Can you draft a message to the group with the start time and asking about lifts?" },
    {
      id: "h10",
      role: "assistant",
      text: `Here’s a draft:

Hi all, looking forward to Saturday! Doors open at **7:00 pm** and we’ll sit down around 7:30. It’s 14 of us, so it’ll be cosy.

If you’re driving and have a spare seat, reply here so we can sort out lifts from the station. Tom is bringing dessert, so no need to bring anything but yourselves.

Want me to send it from the event page?`,
    },
  ];
}

function conversations(now: number): ChatConversation[] {
  return [
    { id: "supper", title: "Saturday supper for 14", updatedAt: now - 2 * HOUR },
    { id: "wine", title: "Wine pairings under $25 a bottle", updatedAt: now - 5 * HOUR },
    { id: "dumpling", title: "Dumpling night shopping list", updatedAt: now - 1 * DAY - 3 * HOUR },
    { id: "seating", title: "Seating plan: keep the Okafors apart from the Beckers", updatedAt: now - 2 * DAY },
    { id: "vegan", title: "Vegan swaps for the galette", updatedAt: now - 4 * DAY },
    { id: "refunds", title: "Wording for the no-show refund policy", updatedAt: now - 6 * DAY },
    { id: "midsummer", title: "Midsummer table timeline", updatedAt: now - 12 * DAY },
    { id: "soup", title: "Soup swap sign-up copy", updatedAt: now - 20 * DAY },
    { id: "tasting", title: "Pricing a six-course tasting menu for 12 covers", updatedAt: now - 34 * DAY },
    { id: "allergens", title: "Allergen card template", updatedAt: now - 41 * DAY },
    { id: "thanks", title: "Thank-you note after the harvest supper", updatedAt: now - 58 * DAY },
  ];
}

function shortReply(title: string): ChatMessage[] {
  return [
    { id: `${title}-u`, role: "user", text: `Picking this back up: ${title.toLowerCase()}.` },
    {
      id: `${title}-a`,
      role: "assistant",
      text: `Here’s where we left it. I’ve kept the notes from last time, so tell me what changed and I’ll update them.`,
    },
  ];
}

// One to three words at a time, like a model's output.
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

const pause = (token: string) => (/[.:?!]\s*$/.test(token.trimEnd()) || token.includes("\n\n") ? 120 + Math.random() * 140 : 24 + Math.random() * 40);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Scenario = "live" | "long" | "error" | "offline" | "limit" | "loading" | "load-error" | "first-run";

const SCENARIOS = [
  { value: "live", label: "New chat" },
  { value: "long", label: "Long conversation" },
  { value: "error", label: "Reply failed partway" },
  { value: "offline", label: "Offline" },
  { value: "limit", label: "Rate-limited" },
  { value: "loading", label: "Loading" },
  { value: "load-error", label: "Couldn’t load" },
  { value: "first-run", label: "No chats yet" },
];

let ids = 0;
const nextId = (prefix: string) => `${prefix}${++ids}`;

export function ChatAppPreview() {
  const [now] = useState(() => Date.now());
  const [list, setList] = useState<ChatConversation[]>(() => conversations(now));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [listLoading, setListLoading] = useState(false);
  const [model, setModel] = useState("copper");
  const [scenario, setScenario] = useState<Scenario>("live");
  const [dropNext, setDropNext] = useState(false);
  const [note, setNote] = useState("");
  const run = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function cancelRun() {
    run.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function patch(id: string, change: (m: ChatMessage) => Partial<ChatMessage>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...change(m) } : m)));
  }

  /* Reasoning, then two tool calls, then the answer with two sources. */
  async function stream(replyId: string, drop: boolean) {
    const me = ++run.current;
    const alive = () => run.current === me;
    const started = Date.now();
    setStatus("streaming");
    patch(replyId, () => ({ reasoning: { text: "", streaming: true, startedAt: started } }));

    let thought = "";
    for (const token of tokenize(REASONING)) {
      await wait(pause(token) * 1.3);
      if (!alive()) return;
      thought += token;
      const text = thought;
      patch(replyId, (m) => ({ reasoning: { ...m.reasoning!, text } }));
    }
    patch(replyId, (m) => ({
      reasoning: { ...m.reasoning!, streaming: false, duration: Math.round((Date.now() - started) / 1000) },
    }));

    const t0 = Date.now();
    const done = steps(t0);
    const plan: ToolStep[] = done.map((s) => ({ id: s.id, title: RUNNING_TITLES[s.id], status: "pending", input: s.input }));
    for (let i = 0; i < done.length; i++) {
      const startedAt = Date.now();
      plan[i] = { ...plan[i], status: "running", startedAt };
      patch(replyId, () => ({ steps: [...plan] }));
      await wait(i === 0 ? 1300 : 1700);
      if (!alive()) return;
      plan[i] = { ...done[i], startedAt, finishedAt: Date.now() };
      patch(replyId, () => ({ steps: [...plan] }));
      await wait(150);
      if (!alive()) return;
    }

    await wait(400);
    if (!alive()) return;
    patch(replyId, () => ({ sources: SOURCES }));
    const tokens = tokenize(ANSWER);
    const failAt = drop ? Math.floor(tokens.length * 0.45) : -1;
    let text = "";
    for (let i = 0; i < tokens.length; i++) {
      if (i === failAt) {
        patch(replyId, () => ({ status: "error", error: "The connection dropped before this reply finished." }));
        setStatus("error");
        return;
      }
      await wait(pause(tokens[i]));
      if (!alive()) return;
      text += tokens[i];
      const so = text;
      patch(replyId, () => ({ text: so }));
    }
    patch(replyId, () => ({ status: "complete" }));
    setStatus("ready");
  }

  function send(text: string, files: File[]) {
    const reply: ChatMessage = { id: nextId("a"), role: "assistant", text: "", status: "streaming" };
    const attachments = files.map((f) => ({
      name: f.name,
      type: f.type,
      size: f.size,
      url: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }));
    setMessages((prev) => [...prev, { id: nextId("u"), role: "user", text, attachments }, reply]);
    if (activeId === null) {
      // A real backend would name the chat; the first line is close enough here.
      const id = nextId("c");
      const starter = STARTERS.find((s) => s.prompt === text);
      const title = starter?.title ?? (text.length > 42 ? `${text.slice(0, 40).trimEnd()}…` : text);
      setList((prev) => [{ id, title, updatedAt: Date.now() }, ...prev]);
      setActiveId(id);
    } else {
      setList((prev) => prev.map((c) => (c.id === activeId ? { ...c, updatedAt: Date.now() } : c)));
    }
    const drop = dropNext;
    setDropNext(false);
    stream(reply.id, drop);
  }

  function stop() {
    cancelRun();
    setMessages((prev) =>
      prev.map((m) =>
        m.status === "streaming"
          ? {
              ...m,
              status: "stopped",
              reasoning: m.reasoning && { ...m.reasoning, streaming: false },
              steps: m.steps?.map((s) => (s.status === "running" || s.status === "pending" ? { ...s, status: "cancelled", finishedAt: Date.now() } : s)),
            }
          : m,
      ),
    );
    setStatus("ready");
  }

  function retry(messageId: string) {
    cancelRun();
    const fresh: ChatMessage = { id: nextId("a"), role: "assistant", text: "", status: "streaming" };
    setMessages((prev) => prev.map((m) => (m.id === messageId ? fresh : m)));
    stream(fresh.id, false);
  }

  function open(id: string) {
    cancelRun();
    setActiveId(id);
    setMessages([]);
    setStatus("loading");
    later(() => {
      setMessages(id === "supper" ? history(now) : shortReply(list.find((c) => c.id === id)?.title ?? "this"));
      setStatus("ready");
    }, 650);
  }

  function startNew() {
    cancelRun();
    setActiveId(null);
    setMessages([]);
    setStatus((s) => (s === "offline" || s === "rate-limited" ? s : "ready"));
  }

  async function rename(id: string, title: string) {
    await wait(500 + Math.random() * 400);
    if (Math.random() < 0.15) throw new Error("Couldn’t rename this chat. Check your connection and try again.");
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  async function remove(id: string) {
    await wait(600 + Math.random() * 400);
    if (Math.random() < 0.15) throw new Error("Couldn’t delete this chat. Check your connection and try again.");
    setList((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) startNew();
  }

  function rate(id: string, rating: Rating) {
    patch(id, () => ({ rating }));
  }

  function choose(next: Scenario) {
    cancelRun();
    setScenario(next);
    setNote("");
    setListLoading(false);
    setList(conversations(now));
    switch (next) {
      case "live":
        setActiveId(null);
        setMessages([]);
        setStatus("ready");
        break;
      case "long":
        setActiveId("supper");
        setMessages(history(now));
        setStatus("ready");
        break;
      case "error": {
        const failed: ChatMessage = {
          ...history(now)[1],
          id: "failed",
          text: ANSWER.slice(0, ANSWER.lastIndexOf(" ", 470)),
          status: "error",
          error: "The connection dropped before this reply finished.",
          rating: undefined,
        };
        setActiveId("supper");
        setMessages([history(now)[0], failed]);
        setStatus("error");
        break;
      }
      case "offline":
        setActiveId("supper");
        setMessages(history(now).slice(0, 4));
        setStatus("offline");
        break;
      case "limit":
        setActiveId("supper");
        setMessages(history(now).slice(0, 4));
        setStatus("rate-limited");
        break;
      case "loading":
        setActiveId("supper");
        setMessages([]);
        setStatus("loading");
        setListLoading(true);
        break;
      case "load-error":
        setActiveId("supper");
        setMessages([]);
        setStatus("load-error");
        break;
      case "first-run":
        setList([]);
        setActiveId(null);
        setMessages([]);
        setStatus("ready");
        break;
    }
  }

  const resetsAt = new Date(now);
  resetsAt.setHours(15, 0, 0, 0);

  return (
    <div className={styles.demo}>
      <div className={styles.controls}>
        <Select
          size="sm"
          aria-label="State"
          options={SCENARIOS}
          value={scenario}
          onValueChange={(v) => choose(v as Scenario)}
        />
        <Checkbox label="Drop the connection partway through the next reply" checked={dropNext} onCheckedChange={setDropNext} />
      </div>

      <div className={styles.frame}>
        <ChatApp
          key={scenario}
          conversations={list}
          conversationsLoading={listLoading}
          activeId={activeId}
          messages={messages}
          status={status}
          onSend={send}
          onStop={stop}
          onRetry={retry}
          onSelect={open}
          onNew={startNew}
          onRename={rename}
          onDelete={remove}
          onRate={rate}
          onComment={() => setNote("Thanks, Copper’s team will read that.")}
          onReload={() => open("supper")}
          onUpgrade={() => setNote("This is where the plans page opens.")}
          limitResetsAt={resetsAt}
          models={MODELS}
          model={model}
          onModelChange={setModel}
          assistantName="Copper"
          greeting="What are we cooking up?"
          starters={STARTERS}
          composerHint="Copper can get things wrong. Check allergens yourself."
          accept="image/*,.pdf,.csv,.txt"
          now={now}
          sidebarFooter={
            <div className={styles.account}>
              <Avatar name="Mara Lindqvist" size={32} decorative />
              <span className={styles.accountText}>
                <span className={styles.accountName}>Mara Lindqvist</span>
                <span className={styles.accountPlan}>Acme Free · 40 messages a day</span>
              </span>
            </div>
          }
        />
      </div>
      <p className={styles.note} role="status">
        {note}
      </p>
    </div>
  );
}
