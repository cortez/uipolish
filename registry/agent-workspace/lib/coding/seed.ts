import type { Member } from "./store";
import { scenarioFor, script } from "./mock-agent";
import { applyEvent, type CheckRun, type Effort, type Person, type Session, type Turn, type Workspace } from "./session";

/* What a first visit finds: two workspaces, a team with presence, and a
   week of sessions played from the mock agent's scripts, so every screen
   has something real in it (a pull request ready to merge, one with a
   failed check, one merged, sessions shared with teammates). Delete this
   file's call in store.ts once your data is real. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const TEAM: Person[] = [
  { id: "maya@acme.example.com", name: "Maya Chen", presence: "online" },
  { id: "jonas@acme.example.com", name: "Jonas Weber", presence: "away" },
  { id: "priya@acme.example.com", name: "Priya Raman", presence: "online" },
  { id: "leo@acme.example.com", name: "Leo Martins", presence: "offline" },
];

/** The repository's files, for All files. Every path the scripts touch is in it. */
const TREE = [
  ".github/workflows/ci.yml",
  "docs/api/export.md",
  "docs/architecture.md",
  "package.json",
  "playwright.config.ts",
  "src/app/api/export/route.ts",
  "src/app/api/search/route.ts",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/checkout/payment-form.tsx",
  "src/checkout/use-cart-total.ts",
  "src/checkout/tax.ts",
  "src/dashboard/queries.ts",
  "src/dashboard/usage-chart.tsx",
  "src/invoices/pdf/fonts.ts",
  "src/invoices/pdf/render.test.tsx",
  "src/invoices/pdf/render.tsx",
  "src/invoices/send-invoice.ts",
  "src/lib/feature-flags.ts",
  "src/lib/redis.ts",
  "src/settings/appearance.ts",
  "src/settings/forms/profile-form.tsx",
  "tests/e2e/checkout.spec.ts",
  "tests/e2e/fixtures/cards.ts",
  "tsconfig.json",
];

type Plan = {
  title?: string;
  /** Prompts, in order, each played to the end. */
  prompts: string[];
  /** How long ago the last turn ended. */
  ago: number;
  pinned?: boolean;
  sharedWith?: string[];
  /** Who wrote each prompt, by index; the owner otherwise. */
  authors?: Record<number, string>;
  merged?: boolean;
  /** Its E2E check fails. */
  fail?: boolean;
  effort?: Effort;
  model?: string;
};

let n = 0;
const id = (prefix: string) => `${prefix}_${(++n).toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function branchOf(title: string) {
  return (
    "agent/" +
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)
  );
}

/** A session as the mock agent would leave it, with real-looking times. */
function play(workspace: Workspace, ownerId: string, plan: Plan, now: number): Session {
  const created = now - plan.ago - plan.prompts.length * 4 * MINUTE;
  let session: Session = {
    id: id("ses"),
    workspaceId: workspace.id,
    title: plan.title ?? plan.prompts[0],
    pinned: plan.pinned ?? false,
    ownerId,
    sharedWith: plan.sharedWith ?? [],
    repo: workspace.repo,
    branch: branchOf(plan.title ?? scenarioFor(plan.prompts[0]).title),
    model: plan.model ?? "claude-sonnet-5-5",
    effort: plan.effort ?? "medium",
    createdAt: created,
    updatedAt: created,
    turns: [],
    files: [],
    tree: TREE,
    checks: [],
    pr: null,
  };
  let at = created;
  plan.prompts.forEach((prompt, i) => {
    const turn: Turn = {
      id: id("turn"),
      authorId: plan.authors?.[i] ?? ownerId,
      prompt,
      mentions: [],
      attachments: [],
      startedAt: at,
      status: "working",
      items: [],
      reply: "",
      files: [],
    };
    session = applyEvent(session, { type: "turn", turn }, at);
    // Real sessions take minutes: the script's beats, slowed down.
    for (const beat of script({ prompt, session, pace: 14, fail: plan.fail })) {
      at += beat.wait;
      session = applyEvent(session, beat.event(at), at);
    }
    session = applyEvent(session, { type: "done", at }, at);
    at += 3 * MINUTE;
  });
  // Shift the whole session so its last turn ended `ago` before now.
  const shift = now - plan.ago - (session.turns.at(-1)?.finishedAt ?? now);
  session = shiftTimes(session, shift);
  if (plan.merged && session.pr) session = { ...session, pr: { ...session.pr, merged: true } };
  return session;
}

function shiftTimes(session: Session, by: number): Session {
  const t = (v?: number) => (v === undefined ? v : v + by);
  return {
    ...session,
    createdAt: session.createdAt + by,
    updatedAt: session.updatedAt + by,
    checks: session.checks.map((c: CheckRun) => ({ ...c, startedAt: t(c.startedAt), finishedAt: t(c.finishedAt) })),
    turns: session.turns.map((turn) => ({
      ...turn,
      startedAt: turn.startedAt + by,
      finishedAt: t(turn.finishedAt),
      items: turn.items.map((item) =>
        item.kind === "steps" ? { ...item, steps: item.steps.map((s) => ({ ...s, startedAt: t(s.startedAt), finishedAt: t(s.finishedAt) })) } : item,
      ),
    })),
  };
}

export function seedWorkspaces(user: Member, now: number) {
  const me: Person = { id: user.id, name: user.name, presence: "online" };
  const [maya, jonas, priya] = TEAM;
  const main: Workspace = { id: id("ws"), name: "Acme", repo: "acme/web", plan: "Team" };
  const labs: Workspace = { id: id("ws"), name: "Acme Labs", repo: "acme/labs", plan: "Team" };

  const sessions: Session[] = [
    play(
      main,
      me.id,
      {
        prompts: [
          "The checkout E2E test fails about one run in five. Find out why and fix it.",
          "Can you give the slow tax path its own test in checkout.spec.ts, so a failure says which case broke?",
        ],
        ago: 9 * MINUTE,
        pinned: true,
        sharedWith: [maya.id],
        authors: { 1: maya.id },
      },
      now,
    ),
    play(
      main,
      me.id,
      { prompts: ["Add a per-workspace rate limit to POST /api/export: 10 a minute, with a clear 429."], ago: 2 * HOUR, sharedWith: [priya.id, jonas.id], fail: true },
      now,
    ),
    play(main, priya.id, { prompts: ["Invoice PDFs ignore the theme. Render them with the dark palette when the workspace uses dark mode."], ago: 3 * DAY, sharedWith: [me.id], merged: true }, now),
    play(main, me.id, { title: "Speed up the usage dashboard queries", prompts: ["The usage dashboard queries take 4s on big workspaces. Find the slow one and fix it."], ago: 26 * HOUR, pinned: true }, now),
    play(main, me.id, { title: "Clean up stale feature flags", prompts: ["Remove feature flags that have been fully rolled out for a month."], ago: 5 * DAY }, now),
    play(main, me.id, { title: "Move the profile form to the new form API", prompts: ["Move the profile settings form to the new form API, keeping validation messages the same."], ago: 9 * DAY }, now),
    play(labs, me.id, { title: "Sketch a retry policy for webhooks", prompts: ["Sketch a retry policy for outgoing webhooks with backoff and a dead-letter queue."], ago: 2 * DAY }, now),
  ];

  return {
    people: [me, ...TEAM],
    workspaces: [
      { ...main, memberIds: [me.id, ...TEAM.map((p) => p.id)], files: TREE },
      { ...labs, memberIds: [me.id, maya.id], files: TREE },
    ],
    sessions,
  };
}
