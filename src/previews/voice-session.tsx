"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VoiceSession,
  type VoiceActivity,
  type VoiceDevice,
  type VoiceLevels,
  type VoiceSessionStatus,
  type VoiceSummary,
  type VoiceTranscriptItem,
} from "@registry/voice-session/voice-session";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { Select } from "@registry/select/select";
import styles from "./voice-session.module.css";

/* Acme, a supper-club app, and Copper, its agent, on a call planning
   Saturday's menu. Everything is fake: the voices are deterministic
   envelopes (the same moment always draws the same frame), the lookups
   are timers, and the network drops on cue. */

type Scenario = "live" | "connecting" | "denied" | "no-mic" | "drop" | "error" | "long" | "ended" | "summary-failed";

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: "live", label: "Live call" },
  { value: "connecting", label: "Connecting (slow after 6s)" },
  { value: "drop", label: "Network drops, then recovers" },
  { value: "error", label: "Copper fails" },
  { value: "denied", label: "Microphone blocked" },
  { value: "no-mic", label: "No microphone" },
  { value: "long", label: "Long call" },
  { value: "ended", label: "Call ended" },
  { value: "summary-failed", label: "Summary failed" },
];

const DEVICES: VoiceDevice[] = [
  { id: "default", label: "MacBook Pro Microphone", detail: "Built-in" },
  { id: "airpods", label: "Mara’s AirPods Pro", detail: "Bluetooth" },
  { id: "yeti", label: "Blue Yeti Stereo Microphone", detail: "USB" },
  { id: "studio", label: "Studio Display Microphone", detail: "Thunderbolt" },
];

const TOPIC = "Menu for Saturday’s supper · 14 guests";

const SUMMARY: VoiceSummary = {
  decisions: [
    "One menu for all 14, with the mushroom and leek galette as the main.",
    "Squash soup to start, charred sprouts on the side, pear and olive oil cake for dessert.",
    "No nuts anywhere, for Daniel’s allergy.",
  ],
  followUps: [
    { id: "list", text: "Add 12 items to the shopping list", owner: "agent", due: "Done" },
    { id: "pears", text: "Remind Mara to buy the pears", owner: "agent", due: "Thu, 9 am" },
    { id: "pastry", text: "Check the puff pastry label for nut traces", owner: "user", due: "Before Saturday" },
    { id: "tom", text: "Ask Tom whether he still wants to bring dessert", owner: "user" },
  ],
};

/* ---------- Speech, without randomness ---------- */

type Token = { start: number; end: number; charEnd: number; letters: number; index: number };

/** Times each word like speech: longer words take longer, commas and full stops leave a pause. */
function plan(text: string) {
  const tokens: Token[] = [];
  let t = 0;
  for (const m of text.matchAll(/\S+\s*/g)) {
    const word = m[0].trim();
    const letters = word.replace(/[^\p{L}\p{N}]/gu, "").length || 1;
    const start = t;
    const end = start + 110 + 46 * letters;
    tokens.push({ start, end, charEnd: (m.index ?? 0) + word.length, letters, index: tokens.length });
    t = end + (/[.?!]$/.test(word) ? 380 : /[,;:—]$/.test(word) ? 200 : 40);
  }
  return { tokens, total: t };
}

/** A smooth envelope per word, rippled by its syllables, louder on some words than others. Same time, same value. */
function levelAt(tokens: Token[], x: number) {
  const tok = tokens.find((k) => x >= k.start && x <= k.end);
  if (!tok) return 0;
  const f = (x - tok.start) / (tok.end - tok.start);
  const syllables = Math.max(1, Math.round(tok.letters / 3));
  const envelope = Math.sin(Math.PI * f) ** 0.6;
  const ripple = 0.72 + 0.28 * Math.cos(2 * Math.PI * f * syllables);
  const stress = 0.52 + 0.2 * Math.sin(tok.index * 2.3) + 0.1 * Math.sin(tok.index * 0.7);
  return stress * envelope * ripple;
}

/** How far the voice has got: a word counts once it's a third said. */
function spokenAt(tokens: Token[], x: number) {
  let chars = 0;
  for (const k of tokens) if (k.start + (k.end - k.start) / 3 <= x) chars = k.charEnd;
  return chars;
}

/** What a recognizer shows mid-sentence: lower case, no punctuation, and the last word still unsure. */
function interimOf(text: string, tokens: Token[], x: number, guess?: [string, string]) {
  const heard = tokens.filter((k) => k.start <= x).length;
  const words = text.split(/\s+/).slice(0, heard).map((w) => w.replace(/[.,?!;:]/g, "").toLowerCase());
  let out = words.join(" ");
  if (guess && out.endsWith(guess[0].toLowerCase())) out = out.slice(0, -guess[0].length) + guess[1];
  return out;
}

type Utterance = {
  who: "user" | "agent";
  id: string;
  text: string;
  tokens: Token[];
  total: number;
  start: number;
  guess?: [string, string];
  done: (how: "done" | "interrupted") => void;
  lastShown: string | number;
};

/* ---------- Transcripts for the states that start mid-call ---------- */

const FIRST_EXCHANGE: VoiceTranscriptItem[] = [
  { id: "u1", role: "user", text: "Hi Copper. I need help with the menu for Saturday. Can you check who’s coming?", at: 3000 },
  { id: "t1", role: "tool", title: "Checked the guest list", status: "done", detail: "14 going · 2 vegetarian · 1 tree-nut allergy", at: 9000 },
  {
    id: "a1",
    role: "agent",
    text: "Fourteen are coming. Priya and Tom are vegetarian, and Daniel has a tree-nut allergy. Do you want one main everyone can eat, or a main and a vegetarian option?",
    at: 11000,
  },
];

const WHOLE_CALL: VoiceTranscriptItem[] = [
  ...FIRST_EXCHANGE,
  {
    id: "a2",
    role: "agent",
    text: "For a main and a vegetarian option, I’d do a slow-roast pork shoulder with apple and fennel, and a mushroom",
    interrupted: true,
    at: 24000,
  },
  { id: "u2", role: "user", text: "Sorry, actually, let’s make the galette the main for everyone. Keeps it simple.", at: 31000 },
  { id: "t2", role: "tool", title: "Checked what’s in season", status: "done", detail: "Riverside Farmers Market, week of Nov 3", at: 37000 },
  {
    id: "a3",
    role: "agent",
    text: "Got it, one galette menu for all fourteen. Squash, leeks and pears are in season, so: squash soup to start, the galette with charred sprouts, and a pear and olive oil cake. No nuts anywhere. Shall I add it all to the shopping list?",
    at: 39000,
  },
  { id: "u3", role: "user", text: "Yes please. And remind me Thursday to buy the pears.", at: 55000 },
  { id: "t3", role: "tool", title: "Added 12 items to the shopping list", status: "done", detail: "Butcher, market and shop", at: 59000 },
  { id: "t4", role: "tool", title: "Set a reminder", status: "done", detail: "Thu, Nov 6 at 9:00 am", at: 60000 },
  { id: "a4", role: "agent", text: "Done. Twelve items are on the list, and I’ll remind you Thursday at nine. Anything else?", at: 61000 },
];

function longCall(): VoiceTranscriptItem[] {
  const extra: VoiceTranscriptItem[] = [
    { id: "u4", role: "user", text: "What time should the galettes go in if we sit down at half seven?", at: 70000 },
    { id: "a5", role: "agent", text: "Bake them at 6:15 so they rest twenty minutes. If you make the pastry Friday, it’s about fifteen minutes of assembly on the day.", at: 74000 },
    { id: "u5", role: "user", text: "And the soup?", at: 86000 },
    { id: "a6", role: "agent", text: "Make it Friday too. It’s better the next day. Warm it from 7:00 and keep it on low.", at: 88000 },
    { id: "u6", role: "user", text: "Can you message the guests about parking? The street’s closed for the market on Saturday morning.", at: 98000 },
    { id: "t5", role: "tool", title: "Drafted a message to 14 guests", status: "done", detail: "Waiting for your OK in Messages", at: 103000 },
    { id: "a7", role: "agent", text: "I’ve drafted it: the closure ends at 2 pm, so evening parking is fine, and the nearest lot is on Mill Lane. It’s waiting for your OK.", at: 105000 },
    { id: "u7", role: "user", text: "Perfect. Who hasn’t paid yet?", at: 120000 },
    { id: "t6", role: "tool", title: "Couldn’t reach payments", status: "failed", detail: "Stripe didn’t answer. Try again in a minute.", at: 123000 },
    { id: "a8", role: "agent", text: "I couldn’t reach payments just now. I’ll check again after the call and put the list in your summary.", at: 126000 },
  ];
  return [...WHOLE_CALL, ...extra];
}

/* ---------- The demo ---------- */

export function VoiceSessionPreview() {
  const [scenario, setScenario] = useState<Scenario>("live");
  const [status, setStatus] = useState<VoiceSessionStatus>("requesting");
  const [activity, setActivity] = useState<VoiceActivity>("listening");
  const [transcript, setTranscript] = useState<VoiceTranscriptItem[]>([]);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [devices, setDevices] = useState<VoiceDevice[]>(DEVICES);
  const [deviceId, setDeviceId] = useState("default");
  const [startedAt, setStartedAt] = useState<number | undefined>();
  const [endedAt, setEndedAt] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [summary, setSummary] = useState<VoiceSummary | undefined>();
  const [summaryError, setSummaryError] = useState<string | undefined>();
  const [note, setNote] = useState("");

  const levels = useRef<VoiceLevels>({ user: 0, agent: 0 });
  const readLevels = useCallback(() => levels.current, []);
  const utterances = useRef<Utterance[]>([]);
  const run = useRef(0);
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  const startRef = useRef(0);

  const patch = useCallback((id: string, change: Partial<VoiceTranscriptItem>) => {
    setTranscript((all) => all.map((t) => (t.id === id ? ({ ...t, ...change } as VoiceTranscriptItem) : t)));
  }, []);

  // One loop drives every voice: levels for the visual, words for the transcript.
  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      let user = 0;
      let agent = 0;
      for (const u of [...utterances.current]) {
        const x = now - u.start;
        if (u.who === "agent") {
          agent = Math.max(agent, levelAt(u.tokens, x));
          const spoken = spokenAt(u.tokens, x);
          if (spoken !== u.lastShown) {
            u.lastShown = spoken;
            patch(u.id, { spoken });
          }
        } else {
          user = Math.max(user, mutedRef.current ? 0 : levelAt(u.tokens, x));
          const interim = interimOf(u.text, u.tokens, x, u.guess);
          if (interim !== u.lastShown) {
            u.lastShown = interim;
            patch(u.id, { text: interim });
          }
        }
        if (x >= u.total) {
          utterances.current = utterances.current.filter((v) => v !== u);
          u.done("done");
        }
      }
      levels.current = { user, agent };
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [patch]);

  const stopVoices = useCallback(() => {
    for (const u of utterances.current) u.done("interrupted");
    utterances.current = [];
    levels.current = { user: 0, agent: 0 };
  }, []);

  /* A script: a chain of steps that ends quietly when another starts. */
  const script = useCallback(
    (body: (s: Steps) => Promise<void>) => {
      stopVoices();
      const id = ++run.current;
      const alive = () => run.current === id;
      const sleep = (ms: number) =>
        new Promise<void>((resolve, reject) => setTimeout(() => (alive() ? resolve() : reject(new Error("cancelled"))), ms));
      const at = () => performance.now() - startRef.current;
      const s: Steps = {
        sleep,
        alive,
        async unmuted() {
          while (mutedRef.current) await sleep(200);
        },
        async user(id, text, guess) {
          await s.unmuted();
          setActivity("listening");
          setTranscript((all) => [...all, { id, role: "user", text: "", final: false, at: at() }]);
          const p = plan(text);
          await new Promise<void>((resolve) =>
            utterances.current.push({ who: "user", id, text, ...p, start: performance.now(), guess, lastShown: "", done: () => resolve() }),
          );
          await sleep(320);
          patch(id, { text, final: true });
        },
        async agent(id, text, bargeAt) {
          setActivity("speaking");
          setTranscript((all) => [...all, { id, role: "agent", text, spoken: 0, at: at() }]);
          const p = plan(text);
          const how = await new Promise<"done" | "interrupted">((resolve) => {
            const u: Utterance = { who: "agent", id, text, ...p, start: performance.now(), lastShown: 0, done: resolve };
            utterances.current.push(u);
            if (bargeAt !== undefined) {
              // Talking over Copper: the user's voice rises, and a beat later Copper stops mid-word.
              const bargeTime = p.tokens.find((k) => k.charEnd >= bargeAt)?.start ?? p.total;
              setTimeout(() => {
                if (!alive() || !utterances.current.includes(u)) return;
                s.bargeIn?.();
              }, bargeTime);
            }
          });
          if (how === "interrupted") patch(id, { interrupted: true });
          setActivity("listening");
        },
        async tool(id, running, done, detail, ms) {
          setActivity("thinking");
          setTranscript((all) => [...all, { id, role: "tool", title: running, status: "running", at: at() }]);
          await sleep(ms);
          patch(id, { title: done, status: "done", detail } as Partial<VoiceTranscriptItem>);
        },
      };
      body(s).catch(() => {});
    },
    [patch, stopVoices],
  );

  /** Copper stops: the voice cuts, the line is marked. */
  const interruptAgent = useCallback(() => {
    const speaking = utterances.current.find((u) => u.who === "agent");
    if (!speaking) return;
    utterances.current = utterances.current.filter((u) => u !== speaking);
    speaking.done("interrupted");
  }, []);

  const conversation = useCallback(
    (from: "start" | "after-first") =>
      script(async (s) => {
        if (from === "start") {
          await s.sleep(1400);
          await s.user("u1", "Hi Copper. I need help with the menu for Saturday. Can you check who’s coming?", ["coming", "comin"]);
          await s.sleep(500);
          await s.tool("t1", "Checking the guest list", "Checked the guest list", "14 going · 2 vegetarian · 1 tree-nut allergy", 1500);
          await s.sleep(250);
          await s.agent(
            "a1",
            "Fourteen are coming. Priya and Tom are vegetarian, and Daniel has a tree-nut allergy. Do you want one main everyone can eat, or a main and a vegetarian option?",
          );
          await s.sleep(900);
        }
        // Halfway through this one, the host talks over Copper.
        const barge = s.agent(
          "a2",
          "For a main and a vegetarian option, I’d do a slow-roast pork shoulder with apple and fennel, and a mushroom and leek galette you can make the day before.",
          96,
        );
        s.bargeIn = () => {
          s.user("u2", "Sorry, actually, let’s make the galette the main for everyone. Keeps it simple.", ["galette", "gallery"]).catch(() => {});
          setTimeout(() => s.alive() && interruptAgent(), 420);
        };
        await barge;
        // Wait for the host to finish.
        while (utterances.current.some((u) => u.who === "user")) await s.sleep(120);
        await s.sleep(400);
        await s.tool("t2", "Checking what’s in season", "Checked what’s in season", "Riverside Farmers Market, week of Nov 3", 1400);
        await s.agent(
          "a3",
          "Got it, one galette menu for all fourteen. Squash, leeks and pears are in season, so: squash soup to start, the galette with charred sprouts, and a pear and olive oil cake. No nuts anywhere. Shall I add it all to the shopping list?",
        );
        await s.sleep(800);
        await s.user("u3", "Yes please. And remind me Thursday to buy the pears.", ["pears", "pairs"]);
        await s.sleep(400);
        await s.tool("t3", "Adding 12 items to the shopping list", "Added 12 items to the shopping list", "Butcher, market and shop", 1300);
        await s.tool("t4", "Setting a reminder", "Set a reminder", "Thu, Nov 6 at 9:00 am", 900);
        await s.agent("a4", "Done. Twelve items are on the list, and I’ll remind you Thursday at nine. Anything else?");
      }),
    [interruptAgent, script],
  );

  const connect = useCallback(
    (askFirst: boolean) =>
      script(async (s) => {
        if (askFirst) {
          setStatus("requesting");
          await s.sleep(1100);
        }
        setStatus("connecting");
        await s.sleep(1300);
        const now = Date.now();
        startRef.current = performance.now();
        setStartedAt(now);
        setStatus("live");
        conversation("start");
      }),
    [conversation, script],
  );

  const writeSummary = useCallback((fail: boolean) => {
    const id = run.current;
    setSummary(undefined);
    setSummaryError(undefined);
    setTimeout(() => {
      if (run.current !== id) return;
      if (fail) setSummaryError("Copper couldn’t write the summary. The transcript is saved.");
      else setSummary(SUMMARY);
    }, 1700);
  }, []);

  const choose = useCallback(
    (next: Scenario) => {
      stopVoices();
      run.current++;
      setScenario(next);
      setMuted(false);
      setCaptions(true);
      setDevices(DEVICES);
      setDeviceId("default");
      setActivity("listening");
      setError(undefined);
      setSummary(undefined);
      setSummaryError(undefined);
      setEndedAt(undefined);
      setStartedAt(undefined);
      setTranscript([]);
      setNote("");
      const now = Date.now();
      startRef.current = performance.now();
      switch (next) {
        case "live":
          connect(true);
          break;
        case "connecting":
          setStatus("connecting");
          break;
        case "denied":
          setStatus("denied");
          break;
        case "no-mic":
          setDevices([]);
          setStatus("no-mic");
          break;
        case "drop":
          setStartedAt(now - 14000);
          startRef.current = performance.now() - 14000;
          setTranscript(FIRST_EXCHANGE);
          setStatus("live");
          script(async (s) => {
            await s.sleep(1600);
            setStatus("reconnecting");
            await s.sleep(3600);
            setStatus("live");
            await s.sleep(900);
            conversation("after-first");
          });
          break;
        case "error":
          setStartedAt(now - 14000);
          setTranscript(FIRST_EXCHANGE);
          setStatus("error");
          setError("Copper lost its connection to Acme’s recipe service. You’re still on the call.");
          break;
        case "long":
          setStartedAt(now - 24 * 60000 - 18000);
          setTranscript(longCall());
          setStatus("live");
          break;
        case "ended":
        case "summary-failed":
          setStartedAt(now - 64000);
          setEndedAt(now);
          setTranscript(WHOLE_CALL);
          setStatus("ended");
          writeSummary(next === "summary-failed");
          break;
      }
    },
    [connect, conversation, script, stopVoices, writeSummary],
  );

  // Start the call once, after mount.
  useEffect(() => {
    const t = setTimeout(() => choose("live"), 0);
    return () => clearTimeout(t);
  }, [choose]);

  function end() {
    stopVoices();
    run.current++;
    setActivity("listening");
    setEndedAt(Date.now());
    setStatus("ended");
    // Settle any line still being heard.
    setTranscript((all) =>
      all
        .filter((t) => !(t.role === "user" && t.final === false && !t.text))
        .map((t) => (t.role === "user" && t.final === false ? { ...t, final: true } : t)),
    );
    if (startedAt === undefined) {
      setSummary({ decisions: [], followUps: [] });
      return;
    }
    writeSummary(false);
  }

  function retry() {
    if (status === "denied" || status === "no-mic") {
      setDevices(DEVICES);
      connect(true);
      return;
    }
    if (status === "error") {
      script(async (s) => {
        setStatus("live");
        setError(undefined);
        await s.sleep(700);
        await s.agent("a-back", "Sorry about that, I’m back. Shall we pick up with the galette?");
      });
    }
  }

  return (
    <div className={styles.demo}>
      <div className={styles.controls}>
        <Select aria-label="State" options={SCENARIOS} value={scenario} onValueChange={(v) => choose(v as Scenario)} />
        <Button variant="secondary" onClick={() => choose(scenario)}>
          {[<Icon key="i" name="retry" />, <span key="l">Replay</span>]}
        </Button>
      </div>

      <div className={styles.frame}>
        <VoiceSession
          agentName="Copper"
          topic={TOPIC}
          status={status}
          activity={activity}
          levels={readLevels}
          muted={muted}
          onMutedChange={setMuted}
          captions={captions}
          onCaptionsChange={setCaptions}
          devices={devices}
          deviceId={deviceId}
          onDeviceChange={(id) => {
            setDeviceId(id);
            setNote(`Switched to ${DEVICES.find((d) => d.id === id)?.label}.`);
          }}
          transcript={transcript}
          startedAt={startedAt}
          endedAt={endedAt}
          error={error}
          onInterrupt={interruptAgent}
          onEnd={end}
          onRetry={retry}
          summary={summary}
          summaryError={summaryError}
          onRetrySummary={() => writeSummary(false)}
          onCallAgain={() => choose("live")}
        />
      </div>
      <p className={styles.note} role="status">
        {note}
      </p>
    </div>
  );
}

type Steps = {
  sleep: (ms: number) => Promise<void>;
  alive: () => boolean;
  unmuted: () => Promise<void>;
  user: (id: string, text: string, guess?: [string, string]) => Promise<void>;
  agent: (id: string, text: string, bargeAt?: number) => Promise<void>;
  tool: (id: string, running: string, done: string, detail: string, ms: number) => Promise<void>;
  bargeIn?: () => void;
};
