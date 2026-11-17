"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_FILTERS,
  RunHistory,
  type RunDetail,
  type RunFilters,
  type RunStep,
  type RunSummary,
  type RunTrigger,
} from "@registry/run-history/run-history";
import { Button } from "@registry/button/button";
import { Checkbox } from "@registry/checkbox/checkbox";
import { Select } from "@registry/select/select";
import styles from "./preview.module.css";

/* Acme, the supper-club app. Copper is its agent, and it runs as a few
   agents with one job each. A week of their runs, made after mount so server
   and browser agree, with one running live. */

const AGENTS = ["Menu planner", "Guest replies", "Shopping list", "Payout check"];
const SONNET = "claude-sonnet-4-5";
const HAIKU = "claude-haiku-4-5";
const PAGE = 25;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/* ---------- A seeded week ---------- */

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const ID_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeId(rand: () => number) {
  let s = "run_";
  for (let i = 0; i < 8; i++) s += ID_CHARS[Math.floor(rand() * ID_CHARS.length)];
  return s;
}

const HOSTS = ["Maya Chen", "Priya Patel", "Dana Whitfield", "Marco Ruiz", "Mara Okafor"];

const TITLES: Record<string, string[]> = {
  "Menu planner": [
    "Draft the menu for Saturday’s harvest supper",
    "Rework the tasting menu around the halibut delivery",
    "Plan a vegan five-course for the Clifton pop-up",
    "Suggest a dessert that uses the leftover quince",
    "Cost out the Thursday walk-in menu",
  ],
  "Guest replies": [
    "Answer Noor Haddad about the gluten-free courses",
    "Send seating reminders for Friday’s long table",
    "Reply to 6 waitlist questions",
    "Invite the waitlist for Sunday lunch",
    "Confirm dietary notes with 12 guests",
  ],
  "Shopping list": [
    "Build the shopping list for 24 covers",
    "Split the produce order between two suppliers",
    "Check the pantry against Saturday’s menu",
  ],
  "Payout check": ["Reconcile last week’s ticket payouts", "Flag refunds that haven’t settled", "Match Stripe payouts to events"],
};

const ERRORS = [
  "Resend returned 429 Too Many Requests after 3 attempts.",
  "check_supplier_stock timed out after 30s. Harvest & Co’s API didn’t answer.",
  "Stripe returned 401: the restricted key was rotated on Oct 30.",
  "The model’s reply wasn’t valid JSON for save_menu_draft, twice.",
];

function triggerFor(rand: () => number, agent: string): { trigger: RunTrigger; triggeredBy: string } {
  const r = rand();
  if (agent === "Payout check" || (agent === "Shopping list" && r < 0.5)) return { trigger: "schedule", triggeredBy: agent === "Payout check" ? "Mondays at 07:00" : "Daily at 06:30" };
  if (agent === "Guest replies" && r < 0.55) return { trigger: "webhook", triggeredBy: r < 0.3 ? "Inbox · new guest email" : "Stripe · checkout completed" };
  return { trigger: "user", triggeredBy: HOSTS[Math.floor(rand() * HOSTS.length)] };
}

function makeWeek(now: number): RunSummary[] {
  const rand = seeded(11);
  const runs: RunSummary[] = [];
  let t = now - 3 * MIN;
  for (let i = 0; i < 136; i++) {
    t -= (8 + rand() * 120) * MIN * (i < 6 ? 0.2 : 1);
    const agent = AGENTS[Math.floor(rand() * rand() * AGENTS.length)];
    const titles = TITLES[agent];
    const r = rand();
    const status = r < 0.09 ? "failed" : r < 0.13 ? "cancelled" : "succeeded";
    const tokens = Math.round(3000 + rand() * rand() * 42000);
    const durationMs = Math.round(4000 + rand() * rand() * 140_000);
    runs.push({
      id: makeId(rand),
      agent,
      title: titles[Math.floor(rand() * titles.length)],
      status,
      ...triggerFor(rand, agent),
      startedAt: new Date(t).toISOString(),
      durationMs: status === "cancelled" ? Math.round(durationMs / 3) : durationMs,
      tokens: status === "cancelled" ? Math.round(tokens / 3) : tokens,
      cost: Math.round(tokens * (agent === "Guest replies" ? 0.0000012 : 0.0000062) * 1000) / 1000,
      error: status === "failed" ? ERRORS[Math.floor(rand() * ERRORS.length)] : undefined,
    });
  }
  return runs;
}

/* ---------- Traces ---------- */

const json = (v: unknown) => JSON.stringify(v);

/** A guest list export: the long tool output, 300 guests deep. */
function guestExport() {
  const rand = seeded(5);
  const first = ["Maya", "Priya", "Dana", "Marco", "Noor", "Theo", "Ines", "Kenji", "Lena", "Omar", "Ruth", "Sami", "Ada", "Felix", "Hana"];
  const last = ["Chen", "Patel", "Whitfield", "Ruiz", "Haddad", "Park", "Okafor", "Lindqvist", "Moreau", "Tanaka", "Silva"];
  const diet = ["none", "vegetarian", "vegan", "gluten-free", "nut allergy", "pescatarian"];
  return json({
    event_id: "evt_2291",
    exported_at: "2026-11-03T13:58:20Z",
    guests: Array.from({ length: 300 }, (_, i) => ({
      id: `gst_${1000 + i}`,
      name: `${first[Math.floor(rand() * first.length)]} ${last[Math.floor(rand() * last.length)]}`,
      party: 1 + Math.floor(rand() * 3),
      dietary: diet[Math.floor(rand() * rand() * diet.length)],
      paid: rand() > 0.1,
    })),
  });
}

type Template = Omit<RunStep, "startMs" | "status"> & { status?: RunStep["status"]; gap?: number };

function menuSteps(longOutput: boolean): Template[] {
  return [
    {
      id: "s1",
      kind: "llm",
      name: "Read the brief",
      model: SONNET,
      durationMs: 3200,
      input: "You are Copper, the menu planner for Saturday Supper Club in Bristol.\n\nBrief from Maya Chen:\n“Harvest supper for 24 on Saturday. Squash, apples, the last of the chanterelles. Keep it under £18 a head in ingredients. Two vegans, one coeliac.”\n\nPlan which tools to call, in order.",
      output: "I’ll check the pantry and what the suppliers have this week, pull the guests’ dietary notes, then plan five courses that work for the vegans and the coeliac guest without a separate menu.",
      tokens: { input: 2140, output: 186, cached: 1600 },
      cost: 0.0049,
    },
    {
      id: "s2",
      kind: "tool",
      name: "search_pantry",
      durationMs: 640,
      gap: 120,
      input: json({ query: "squash apple chanterelle", location: "Bristol kitchen" }),
      output: json({ items: [{ name: "Delica squash", qty: 9, unit: "each" }, { name: "Cox apples", qty: 4.5, unit: "kg" }, { name: "Chanterelles", qty: 0.6, unit: "kg", note: "use by Sunday" }] }),
    },
    longOutput
      ? {
          id: "s3",
          kind: "tool",
          name: "export_guest_list",
          durationMs: 2100,
          gap: 80,
          input: json({ event_id: "evt_2291", fields: ["name", "party", "dietary", "paid"] }),
          output: guestExport(),
        }
      : {
          id: "s3",
          kind: "tool",
          name: "get_guest_dietary",
          durationMs: 520,
          gap: 80,
          input: json({ event_id: "evt_2291" }),
          output: json({ covers: 24, vegan: 2, coeliac: 1, nut_allergy: 0, notes: ["Noor Haddad: no alcohol in sauces"] }),
        },
    {
      id: "s4",
      kind: "tool",
      name: "check_supplier_stock",
      status: "retried",
      durationMs: 30000,
      gap: 140,
      input: json({ supplier: "harvest-and-co", items: ["chanterelles", "hazelnuts", "crème fraîche"] }),
      error: "Timed out after 30s. Harvest & Co’s API didn’t answer.",
    },
    {
      id: "s5",
      kind: "tool",
      name: "check_supplier_stock",
      attempt: 2,
      durationMs: 1800,
      gap: 1000,
      input: json({ supplier: "harvest-and-co", items: ["chanterelles", "hazelnuts", "crème fraîche"] }),
      output: json({ chanterelles: { in_stock: true, price_per_kg: 38 }, hazelnuts: { in_stock: true, price_per_kg: 14 }, "crème fraîche": { in_stock: false, back: "2026-11-06" } }),
    },
    {
      id: "s6",
      kind: "llm",
      name: "Plan the courses",
      model: SONNET,
      durationMs: 14800,
      gap: 160,
      input: "Pantry, supplier stock and guest notes are attached. Plan five courses for 24, under £18 a head. Crème fraîche is out until Wednesday.",
      output: "1. Roast delica squash soup, sage oil, toasted hazelnuts (vegan, GF)\n2. Chanterelles on sourdough, or on polenta for the coeliac guest\n3. Cider-braised pork shoulder, apple and celeriac; squash and lentil for the vegans\n4. Bitter leaves, pear, mustard dressing\n5. Baked Cox apples, oat crumble, cashew cream (vegan, GF)\n\nEstimated £16.40 a head.",
      tokens: { input: 6820, output: 1240, cached: 2140 },
      cost: 0.0349,
    },
    {
      id: "s7",
      kind: "llm",
      name: "Write the menu card",
      model: HAIKU,
      durationMs: 4100,
      gap: 120,
      input: "Turn the plan into a printed menu card in the club’s voice: short, warm, no adjectives stacked.",
      output: "Saturday Supper Club · Harvest\n\nSquash soup, sage, hazelnut\nChanterelles on toast\nPork shoulder braised in cider, apple, celeriac\nBitter leaves, pear\nBaked apple, oat crumble",
      tokens: { input: 1980, output: 220 },
      cost: 0.0029,
    },
    {
      id: "s8",
      kind: "tool",
      name: "save_menu_draft",
      durationMs: 410,
      gap: 90,
      input: json({ event_id: "evt_2291", title: "Harvest supper", courses: 5 }),
      output: json({ draft_id: "mnu_7Qk2", url: "https://app.acme.example/menus/mnu_7Qk2" }),
    },
  ];
}

function replySteps(): Template[] {
  return [
    {
      id: "s1",
      kind: "tool",
      name: "list_waitlist",
      durationMs: 380,
      input: json({ event_id: "evt_2304", status: "waiting" }),
      output: json({ count: 42, first: ["Theo Park", "Ines Moreau", "Kenji Tanaka"] }),
    },
    {
      id: "s2",
      kind: "llm",
      name: "Write the invite",
      model: HAIKU,
      durationMs: 3900,
      gap: 140,
      input: "Write a short invite for Sunday lunch for people on the waitlist. 18 seats opened up. Include the link and say seats go in order of reply.",
      output: "Good news: 18 seats just opened for Sunday lunch at 1pm. They go in order of reply, so if you’d like one, tap below.",
      tokens: { input: 1260, output: 96 },
      cost: 0.0015,
    },
    {
      id: "s3",
      kind: "tool",
      name: "send_invites",
      status: "retried",
      durationMs: 2200,
      gap: 120,
      input: json({ template: "waitlist-open", recipients: 42 }),
      error: "Resend returned 429 Too Many Requests. Retrying in 4s.",
    },
    {
      id: "s4",
      kind: "tool",
      name: "send_invites",
      attempt: 2,
      status: "retried",
      durationMs: 2400,
      gap: 4000,
      input: json({ template: "waitlist-open", recipients: 24 }),
      error: "Resend returned 429 Too Many Requests. 18 of 42 sent. Retrying in 8s.",
    },
    {
      id: "s5",
      kind: "tool",
      name: "send_invites",
      attempt: 3,
      status: "failed",
      durationMs: 2300,
      gap: 8000,
      input: json({ template: "waitlist-open", recipients: 24 }),
      error:
        "Resend returned 429 Too Many Requests after 3 attempts. 18 of 42 invites went out; the other 24 weren’t sent. The account’s limit is 10 emails a second. Re-run sends only to the 24 who didn’t get one.",
    },
  ];
}

/** Lays the steps out in time, and plays them up to `elapsed` for a live run. */
function build(templates: Template[], elapsed?: number) {
  let t = 0;
  const steps: RunStep[] = [];
  for (const { gap = 0, status = "succeeded", ...step } of templates) {
    t += gap;
    const start = t;
    t += step.durationMs ?? 0;
    if (elapsed === undefined || t <= elapsed) {
      steps.push({ ...step, status, startMs: start });
    } else if (start <= elapsed) {
      steps.push({ ...step, status: "running", startMs: start, durationMs: undefined, output: undefined, error: undefined, tokens: undefined, cost: undefined });
      break;
    } else break;
  }
  const end = t;
  return { steps, end };
}

function totals(steps: RunStep[]) {
  return {
    tokens: steps.reduce((n, s) => n + (s.tokens ? s.tokens.input + s.tokens.output : 0), 0),
    cost: Math.round(steps.reduce((n, s) => n + (s.cost ?? 0), 0) * 1000) / 1000,
  };
}

const MENU_OUTPUT =
  "Harvest supper, Saturday 8 November, 24 covers\n\n1. Roast delica squash soup, sage oil, toasted hazelnuts\n2. Chanterelles on sourdough (polenta for the coeliac guest)\n3. Cider-braised pork shoulder, apple, celeriac; squash and lentil for the two vegans\n4. Bitter leaves, pear, mustard dressing\n5. Baked Cox apples, oat crumble, cashew cream\n\nIngredients come to about £16.40 a head. Crème fraîche is out until Wednesday, so dessert uses cashew cream for everyone. The draft is saved as “Harvest supper” for Maya to review.";

/** The trace for any run: the live one plays out, the showcase ones are hand-written, the rest share a shape. */
function traceFor(run: RunSummary, now: number, live: LiveRun | null): RunDetail {
  if (live && run.id === live.id) {
    const elapsed = now - Date.parse(run.startedAt);
    const { steps } = build(menuSteps(false), run.status === "running" ? elapsed : undefined);
    return { id: run.id, run, steps, output: run.status === "succeeded" ? { text: MENU_OUTPUT } : undefined };
  }
  if (run.id === FAILED_ID) return { id: run.id, run, steps: build(replySteps()).steps };
  if (run.id === LONG_ID) return { id: run.id, run, steps: build(menuSteps(true)).steps, output: { text: MENU_OUTPUT } };
  if (run.status === "cancelled") {
    const steps = build(menuSteps(false)).steps.slice(0, 3);
    return { id: run.id, run, steps, cancelNote: `Cancelled by ${run.triggeredBy && run.trigger === "user" ? run.triggeredBy : "Maya Chen"}.` };
  }
  if (run.status === "failed") {
    const steps = build(menuSteps(false)).steps.slice(0, 4).map((s, i, all) => (i === all.length - 1 ? { ...s, status: "failed" as const, error: run.error } : s));
    return { id: run.id, run, steps };
  }
  if (run.agent === "Guest replies") {
    const steps = build(replySteps()).steps.slice(0, 2);
    return { id: run.id, run, steps: [...steps, { id: "s3", kind: "tool", name: "send_reply", status: "succeeded", startMs: 4500, durationMs: 620, input: json({ to: "guest", thread: "thr_8812" }), output: json({ sent: true }) }], output: { text: steps[1].output ?? "" } };
  }
  return { id: run.id, run, steps: build(menuSteps(false)).steps, output: { text: MENU_OUTPUT } };
}

const FAILED_ID = "run_W7kQ2mPx";
const LONG_ID = "run_Hx4eR9tB";

type LiveRun = { id: string };

/* ---------- The preview ---------- */

type Scenario = "live" | "failed" | "long" | "empty" | "loading" | "error" | "no-results" | "read-only" | "slow";

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: "live", label: "Live, with a run going" },
  { value: "failed", label: "A failed run" },
  { value: "long", label: "Very long tool output" },
  { value: "no-results", label: "No results for filters" },
  { value: "slow", label: "Slow network" },
  { value: "read-only", label: "Can view, can’t re-run" },
  { value: "empty", label: "No runs yet" },
  { value: "loading", label: "Loading" },
  { value: "error", label: "Didn’t load" },
];

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function matches(run: RunSummary, f: RunFilters, now: number) {
  const q = f.query.trim().toLocaleLowerCase();
  if (q && !`${run.title} ${run.id} ${run.error ?? ""} ${run.agent}`.toLocaleLowerCase().includes(q)) return false;
  if (f.status !== "all" && run.status !== f.status) return false;
  if (f.agent !== "all" && run.agent !== f.agent) return false;
  if (f.trigger !== "all" && run.trigger !== f.trigger) return false;
  const t = Date.parse(run.startedAt);
  const span = { "1h": HOUR, "24h": DAY, "7d": 7 * DAY, "30d": 30 * DAY }[f.range as string];
  if (span && now - t > span) return false;
  if (f.range === "custom" && f.from && f.to) {
    const day = run.startedAt.slice(0, 10);
    if (day < f.from || day > f.to) return false;
  }
  return true;
}

export function RunHistoryPreview() {
  const [scenario, setScenario] = useState<Scenario>("live");
  const [failNext, setFailNext] = useState(false);
  const failRef = useRef(failNext);
  useEffect(() => {
    failRef.current = failNext;
  }, [failNext]);

  const [base, setBase] = useState<number | null>(null);
  const [all, setAll] = useState<RunSummary[]>([]);
  const [held, setHeld] = useState<RunSummary[]>([]);
  const [live, setLive] = useState<LiveRun | null>(null);
  const [filters, setFilters] = useState<RunFilters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<RunFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(0);
  const [round, setRound] = useState(0);
  const slow = scenario === "slow";

  /** A server call: a realistic wait, and the failure you asked for. */
  const call = useCallback(async (ms: number, failure: string) => {
    await wait(ms);
    if (failRef.current) {
      setFailNext(false);
      throw new Error(failure);
    }
  }, []);

  // Build the week after mount, so server and browser render the same first frame: loading.
  useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    const week = makeWeek(start);
    // The two showcase runs: a failed send, and a run with a huge tool result.
    week[3] = { ...week[3], id: FAILED_ID, agent: "Guest replies", title: "Invite the waitlist for Sunday lunch", status: "failed", trigger: "user", triggeredBy: "Priya Patel", durationMs: 23_610, tokens: 1356, cost: 0.002, error: "send_invites: Resend returned 429 Too Many Requests after 3 attempts. 18 of 42 invites went out." };
    week[5] = { ...week[5], id: LONG_ID, agent: "Menu planner", title: "Draft the menu for Saturday’s harvest supper, checking every guest’s dietary notes against the full export", status: "succeeded", trigger: "user", triggeredBy: "Maya Chen", durationMs: 59_520, tokens: 12_590, cost: 0.043 };
    const liveRun: RunSummary = {
      id: "run_Lv8cN3dA",
      agent: "Menu planner",
      title: "Draft the menu for Saturday’s harvest supper",
      status: "running",
      trigger: "user",
      triggeredBy: "Maya Chen",
      startedAt: new Date(start - 6_000).toISOString(),
      tokens: 0,
      cost: 0,
    };
    const loadFor = scenario === "loading" ? 1e9 : scenario === "slow" ? 2600 : 700;
    wait(loadFor).then(() => {
      if (cancelled) return;
      setBase(start);
      setNow(Date.now());
      setAll(scenario === "empty" ? [] : [liveRun, ...week]);
      setLive(scenario === "empty" ? null : { id: liveRun.id });
      if (scenario === "failed") setSelectedId(FAILED_ID);
      if (scenario === "long") setSelectedId(LONG_ID);
      if (scenario === "no-results") {
        const f = { ...DEFAULT_FILTERS, query: "lamb tagine", range: "24h" as const };
        setFilters(f);
        setApplied(f);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scenario, round]);

  // The live run plays out, and scheduled runs keep arriving while you watch.
  useEffect(() => {
    if (base === null || scenario === "empty") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [base, scenario]);

  useEffect(() => {
    if (base === null || scenario !== "live") return;
    const rand = seeded(23);
    const id = window.setInterval(() => {
      setHeld((h) => [
        {
          id: makeId(rand),
          agent: "Guest replies",
          title: h.length % 2 ? "Reply to a question about parking" : "Answer a dietary question from the waitlist",
          status: "succeeded",
          trigger: "webhook",
          triggeredBy: "Inbox · new guest email",
          startedAt: new Date(Date.now() - 4000).toISOString(),
          durationMs: 3800 + Math.round(rand() * 2000),
          tokens: 1400 + Math.round(rand() * 600),
          cost: 0.002,
        },
        ...h,
      ]);
    }, 14_000);
    return () => window.clearInterval(id);
  }, [base, scenario]);

  // Every running run follows its trace: tokens and cost so far, and done once the last step is.
  const runs = useMemo(() => {
    if (!live) return all;
    return all.map((r) => {
      if (r.id !== live.id && r.status !== "running") return r;
      const elapsed = now - Date.parse(r.startedAt);
      const { steps, end } = build(menuSteps(false), elapsed);
      const sum = totals(steps);
      if (elapsed >= end) return { ...r, status: "succeeded" as const, durationMs: end, ...totals(build(menuSteps(false)).steps) };
      return { ...r, ...sum };
    });
  }, [all, live, now]);

  const filtered = useMemo(() => runs.filter((r) => matches(r, applied, base ?? 0)), [runs, applied, base]);
  const shown = filtered.slice((page - 1) * PAGE, page * PAGE);

  // Opening a run loads its trace; a live one keeps following.
  const selected = selectedId ? runs.find((r) => r.id === selectedId) : undefined;
  const request = useRef(0);
  function openRun(id: string | null) {
    setSelectedId(id);
    const req = ++request.current;
    setDetailError(undefined);
    setDetailLoading(!!id);
    if (!id) return;
    call(slow ? 2400 : 600, "The trace service timed out. The run itself is fine.")
      .then(() => req === request.current && setDetailLoading(false))
      .catch((e: Error) => {
        if (req !== request.current) return;
        setDetailLoading(false);
        setDetailError(e.message);
      });
  }
  const traced = selected && !detailLoading && !detailError ? traceFor(selected, now, live) : undefined;

  async function changeFilters(next: RunFilters) {
    setFilters(next);
    setRefreshing(true);
    await wait(slow ? 2400 : 450);
    setApplied(next);
    setPage(1);
    setRefreshing(false);
  }

  async function changePage(p: number) {
    setRefreshing(true);
    await wait(slow ? 2000 : 300);
    setPage(p);
    setRefreshing(false);
  }

  function pick(next: Scenario) {
    setScenario(next);
    setBase(null);
    setAll([]);
    setHeld([]);
    setLive(null);
    setFilters(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPage(1);
    setSelectedId(null);
    setRound((r) => r + 1);
  }

  const loading = base === null && scenario !== "error";

  return (
    <div className={styles.stack}>
      <div className={styles.row}>
        <Select aria-label="State" options={SCENARIOS} value={scenario} onValueChange={(v) => pick(v as Scenario)} />
        <Checkbox label="Fail the next request" checked={failNext} onCheckedChange={setFailNext} />
        <Button variant="ghost" onClick={() => pick(scenario)}>
          Start over
        </Button>
      </div>

      <RunHistory
        headingLevel={2}
        description="Every run Copper has made for Saturday Supper Club: what it was asked, each model and tool call, and what it cost."
        timeZone="Europe/London"
        currency="GBP"
        now={base ?? undefined}
        runs={scenario === "error" ? [] : shown}
        total={scenario === "error" ? 0 : filtered.length}
        page={page}
        pageSize={PAGE}
        onPageChange={changePage}
        filters={filters}
        onFiltersChange={changeFilters}
        agents={AGENTS}
        newRuns={held.length}
        onShowNewRuns={() => {
          setAll((a) => [...held, ...a]);
          setHeld([]);
          setPage(1);
        }}
        loading={loading}
        refreshing={refreshing}
        error={scenario === "error" ? "Acme couldn’t reach the run log. Runs are still being recorded; nothing is lost." : undefined}
        onRetry={() => pick("live")}
        selectedId={selectedId}
        onSelect={openRun}
        detail={traced}
        detailLoading={detailLoading}
        detailError={detailError}
        onRetryDetail={() => openRun(selectedId)}
        readOnly={scenario === "read-only" ? "Hosts can look at runs but not start them. Ask Mara Okafor for the Operator role." : undefined}
        onRerun={async (run) => {
          await call(slow ? 2600 : 900, "Copper is at its limit of 3 runs at once. Try again when one finishes.");
          const id = makeId(seeded(Date.now() % 2147483646 || 1));
          const fresh: RunSummary = {
            ...run,
            id,
            status: "running",
            trigger: "user",
            triggeredBy: "Maya Chen",
            startedAt: new Date(Date.now()).toISOString(),
            durationMs: undefined,
            tokens: 0,
            cost: 0,
            error: undefined,
            agent: "Menu planner",
          };
          setAll((a) => [fresh, ...a]);
          setLive({ id });
          setNow(Date.now());
          // The block opens the new run with this id; its trace is already live.
          return id;
        }}
        onShare={async (run) => {
          await call(slow ? 2000 : 500, "Couldn’t make a link. Try again.");
          return `https://app.acme.example/runs/${run.id}`;
        }}
        emptyDescription="Copper logs every run here: what it was asked, each model and tool call, and what it cost. Start one from any event’s Copper tab, or put an agent on a schedule."
        emptyAction={
          <>
            <Button>Run Menu planner</Button>
            <Button variant="secondary">
              Set up a schedule
            </Button>
          </>
        }
      />

      <p className={styles.note}>
        Requests take about half a second; “Slow network” makes them take two. A new run arrives every 14 seconds in the
        live state and waits above the table, so nothing moves under your pointer. Tick “Fail the next request” to see
        how loading a trace or a Re-run recovers.
      </p>
    </div>
  );
}
