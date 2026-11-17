import type { RunStep, RunTrigger } from "@/components/ui/run-history/run-history";
import type { ApiKey, NotificationMatrix, WorkspaceSettings } from "@/components/ui/settings/settings";
import { needsApproval } from "@/lib/agents/policy";
import { TASKS, scriptFor } from "@/lib/agents/scenarios";
import { costOf, MODELS } from "@/lib/product";
import type { Agent, Approval, KnowledgeAccounts, Run, Source } from "./database";
import { newId } from "./ids";

/* A new workspace's sample data: three agents, a week of their runs (with
   the approvals people decided along the way), knowledge sources, settings,
   API keys and notifications. The console is whole on first sign-in;
   delete this file once yours is real. */

export type Seed = {
  settings: WorkspaceSettings;
  apiKeys: ApiKey[];
  notifications: NotificationMatrix;
  agents: Agent[];
  runs: Run[];
  approvals: Approval[];
  sources: Source[];
  accounts: KnowledgeAccounts;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TEAMMATES = ["Priya Raman", "Tom Becker"];

function agents(workspaceId: string, now: number): Agent[] {
  const base = { workspaceId, dailyLimit: 25, createdAt: now - 40 * DAY };
  return [
    {
      ...base,
      id: "agt_support",
      name: "Support agent",
      description: "Answers support tickets from the help center and drafts replies.",
      model: MODELS[0].id,
      instructions:
        "You answer Acme's support tickets. Read the ticket, find the answer in Knowledge, and draft a reply under 120 words. Never promise refunds or dates; hand those to the billing agent or a person.",
      policy: { read: "ask", change: "ask" },
      servers: [
        { id: "srv_zendesk", name: "Zendesk", host: "mcp.zendesk.example.com", status: "connected", account: "support@acme.example.com", granted: ["Read tickets", "Reply to tickets"], tools: [{ name: "get_ticket", description: "Read one ticket and its thread" }, { name: "search_tickets", description: "Find tickets by words or requester" }, { name: "reply_to_ticket", description: "Post a public reply" }] },
        { id: "srv_slack", name: "Slack", host: "mcp.slack.example.com", status: "needs-auth", message: "The sign-in expired on Nov 2.", account: "Acme" },
      ],
      allowed: [
        { id: "al_get_ticket", server: "Zendesk", tool: "get_ticket", effect: "read", description: "Read one ticket and its thread" },
        { id: "al_search_knowledge", server: "Knowledge", tool: "search_knowledge", effect: "read", description: "Search this workspace's Knowledge" },
      ],
    },
    {
      ...base,
      id: "agt_billing",
      name: "Billing agent",
      description: "Handles refunds, failed payments and invoice reminders.",
      model: MODELS[0].id,
      dailyLimit: 10,
      instructions:
        "You handle billing for Acme's customers. Check charges in Stripe before anything else. Refund duplicates in full; anything else needs a note on why. Be brief and exact with amounts.",
      policy: { read: "allow", change: "ask" },
      servers: [
        { id: "srv_stripe", name: "Stripe", host: "mcp.stripe.example.com", status: "connected", account: "Acme, Inc.", granted: ["Read charges and invoices", "Create refunds"], tools: [{ name: "list_charges" }, { name: "list_invoices" }, { name: "create_refund" }] },
        { id: "srv_gmail", name: "Gmail", host: "gmail.mcp.example.com", status: "connected", account: "billing@acme.example.com", tools: [{ name: "send_email" }] },
        { id: "srv_ledger", name: "Ledger", host: "mcp.ledger.example.com", status: "error", message: "It didn’t answer for 30 seconds." },
      ],
      allowed: [],
    },
    {
      ...base,
      id: "agt_research",
      name: "Research agent",
      description: "Reads the web and interviews, and writes digests to Notion.",
      model: MODELS[1].id,
      instructions:
        "You write short research digests for Acme's product team. Read widely, cite every claim, and lead with what changed this week and what it means for us. Write to Research › Digests in Notion.",
      policy: { read: "allow", change: "allow" },
      servers: [
        { id: "srv_search", name: "Web search", host: "search.mcp.example.com", status: "connected", tools: [{ name: "search" }, { name: "fetch_page" }] },
        { id: "srv_notion", name: "Notion", host: "mcp.notion.example.com", status: "connected", account: "Acme HQ", tools: [{ name: "create_page" }, { name: "search_pages" }] },
      ],
      allowed: [{ id: "al_search", server: "Web search", tool: "search", effect: "read" }],
    },
  ];
}

/** A small deterministic random, so a workspace's history is the same shape each time. */
function random(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** Plays a script instantly into a finished run, with its approval if it asked. */
function replay(agent: Agent, task: string, startedAt: number, trigger: RunTrigger, triggeredBy: string, rand: () => number): { run: Run; approval?: Approval } {
  const roll = rand();
  const beats = scriptFor(agent.id, task, rand, { fail: roll < 0.09, flaky: roll > 0.86 });
  const declined = rand() < 0.15;
  const decider = TEAMMATES[Math.floor(rand() * TEAMMATES.length)];
  const id = newId("run");
  const steps: RunStep[] = [];
  let t = 0;
  let n = 0;
  let approval: Approval | undefined;
  let status: Run["status"] = "succeeded";
  let error: string | undefined;
  let cancelNote: string | undefined;
  let output: Run["output"];
  const gap = () => 30 + Math.round(rand() * 90);

  for (const beat of beats) {
    if (status !== "succeeded") break;
    if (beat.kind === "output") {
      output = beat.output;
      continue;
    }
    if (beat.kind === "llm") {
      steps.push({ id: `${id}-s${++n}`, kind: "llm", name: beat.name, status: "succeeded", startMs: t, durationMs: beat.ms, model: agent.model, input: beat.input, output: beat.output, tokens: beat.tokens, cost: costOf(agent.model, beat.tokens) });
      t += beat.ms + gap();
      continue;
    }
    if (needsApproval(agent, beat.server, beat.name, beat.effect)) {
      const wait = (2 + Math.round(rand() * 20)) * MINUTE;
      const title = beat.ask?.title ?? `Let ${agent.name} run ${beat.name} on ${beat.server}`;
      const note = declined ? "Not this one; I’ll handle it myself." : undefined;
      steps.push({ id: `${id}-s${++n}`, kind: "tool", name: "Wait for approval", status: declined ? "failed" : "succeeded", startMs: t, durationMs: wait, input: title, ...(declined ? { error: `Declined by ${decider}: ${note}` } : { output: `Approved by ${decider}.` }) });
      approval = {
        id: newId("apr"),
        workspaceId: agent.workspaceId,
        runId: id,
        agentId: agent.id,
        title,
        context: `Run ${id}`,
        priority: beat.ask?.priority,
        status: declined ? "declined" : "approved",
        requestedAt: startedAt + t,
        note: beat.ask?.note,
        preview: beat.ask?.preview,
        recipients: beat.ask?.recipients,
        tool: { server: beat.server, name: beat.name, arguments: beat.args },
        fields: beat.ask?.fields,
        outcome: { by: decider, at: startedAt + t + wait, note },
      };
      t += wait + gap();
      if (declined) {
        status = "cancelled";
        cancelNote = `Declined by ${decider}: “${note}”`;
        break;
      }
    }
    const attempts = (beat.flaky?.times ?? 0) + 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const retried = attempt < attempts;
      const failed = !retried && !!beat.error;
      steps.push({
        id: `${id}-s${++n}`,
        kind: "tool",
        name: beat.name,
        status: retried ? "retried" : failed ? "failed" : "succeeded",
        startMs: t,
        durationMs: beat.ms,
        input: JSON.stringify(beat.args, null, 2),
        ...(attempt > 1 && { attempt }),
        ...(retried ? { error: beat.flaky!.error } : failed ? { error: beat.error } : { output: beat.result }),
      });
      t += beat.ms + gap();
      if (failed) {
        status = "failed";
        error = `${beat.name} failed: ${beat.error}`;
      }
    }
  }

  const tokens = steps.reduce((sum, s) => sum + (s.tokens ? s.tokens.input + s.tokens.output : 0), 0);
  const cost = steps.reduce((sum, s) => sum + (s.cost ?? 0), 0);
  const run: Run = {
    id,
    workspaceId: agent.workspaceId,
    agentId: agent.id,
    agent: agent.name,
    title: task,
    task,
    status,
    trigger,
    triggeredBy,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: t,
    tokens,
    cost,
    steps,
    ...(status === "succeeded" && { output }),
    ...(error && { error }),
    ...(cancelNote && { cancelNote }),
  };
  return { run, approval };
}

function sources(workspaceId: string, now: number): Source[] {
  const at = (minutes: number) => new Date(now - minutes * MINUTE).toISOString();
  const src = (s: Omit<Source, "workspaceId" | "addedAt" | "status">): Source => ({ ...s, workspaceId, addedAt: now - 20 * DAY, status: "ready" });
  return [
    src({
      id: "src_help",
      name: "acme.example.com/help",
      kind: "website",
      location: "Every page in acme.example.com/help/sitemap.xml",
      pages: 38,
      chunks: 211,
      tokens: 48930,
      syncedAt: at(60 * 20),
      passages: [
        { location: "Exporting reports", text: "Any report can be exported from its ⋯ menu: choose Export, then CSV or PDF. Filters and the date range you set are kept in the file." },
        { location: "Inviting your team", text: "Owners and admins can invite teammates from Settings → Members. Each person gets an email to join, valid for seven days." },
        { location: "Changing your billing email", text: "The billing email is in Settings → Billing → Details. Invoices go to the new address from the next one." },
        { location: "Slow dashboards", text: "Dashboards with more than 40 charts can time out. Split them, or turn on cached results in the dashboard's settings." },
      ],
    }),
    src({
      id: "src_refunds",
      name: "Refund policy 2026.pdf",
      kind: "file",
      pages: 4,
      chunks: 22,
      tokens: 5120,
      syncedAt: at(60 * 24 * 6),
      passages: [
        { location: "Page 1", text: "Duplicate charges are refunded in full to the original card, without a manager's sign-off, within 5 to 10 business days." },
        { location: "Page 2", text: "Annual plans cancelled within 14 days of renewal get a prorated refund for the unused months." },
      ],
    }),
    src({
      id: "src_playbooks",
      name: "Support playbooks",
      kind: "notion",
      location: "Acme HQ › Support › Playbooks, and 11 sub-pages",
      pages: 12,
      chunks: 64,
      tokens: 15210,
      syncedAt: at(42),
      passages: [
        { location: "Tone", text: "Replies are short, warm and specific. Lead with the answer, then the one step to take. Sign as Acme Support." },
        { location: "Escalation", text: "Hand refunds over $1,000, legal questions and outages to a person in #support-escalations." },
      ],
    }),
    src({
      id: "src_sso",
      name: "SSO setup guide.md",
      kind: "file",
      pages: 2,
      chunks: 9,
      tokens: 2110,
      syncedAt: at(60 * 24 * 2),
      passages: [{ location: "Beta", text: "SSO with Okta and Azure AD is in beta. Support can turn it on per workspace; SCIM provisioning follows in Q1." }],
    }),
    src({
      id: "src_release",
      name: "Release notes",
      kind: "googledrive",
      location: "Shared drive › Product › Release notes, 9 files",
      pages: 18,
      chunks: 96,
      tokens: 22400,
      syncedAt: at(60 * 3),
      passages: [{ location: "4.2", text: "Scheduled exports, daily or weekly, to email or Slack. CSV exports keep the columns you chose." }],
    }),
  ];
}

export function seedWorkspace(workspaceId: string, user: { name: string; email: string }, size: "full" | "small", now = Date.now()): Seed {
  const list = agents(workspaceId, now);
  const rand = random([...workspaceId].reduce((h, c) => h * 31 + c.charCodeAt(0), 7));
  const runs: Run[] = [];
  const approvals: Approval[] = [];
  const count = size === "full" ? 54 : 9;
  for (let i = 0; i < count; i++) {
    // Spread over the last six days, busier in working hours, none in the last few minutes.
    const startedAt = now - 10 * MINUTE - Math.floor(rand() ** 1.4 * 6 * DAY);
    const agent = list[Math.floor(rand() * list.length)];
    const pool = TASKS[agent.id];
    const kind = rand();
    const trigger: RunTrigger = kind < 0.45 ? "schedule" : kind < 0.75 ? "webhook" : "user";
    const by = trigger === "schedule" ? pool.schedule : trigger === "webhook" ? pool.webhook : rand() < 0.5 ? user.name : TEAMMATES[0];
    const { run, approval } = replay(agent, pool.tasks[Math.floor(rand() * pool.tasks.length)], startedAt, trigger, by, rand);
    runs.push(run);
    if (approval) approvals.push(approval);
  }

  return {
    settings: {
      name: size === "full" ? "Acme" : "Acme Sandbox",
      slug: size === "full" ? "acme" : "acme-sandbox",
      timezone: "America/New_York",
      locale: "en-US",
      defaultModel: MODELS[0].id,
      overrides: { titles: "claude-haiku-5-5" },
      spendLimit: size === "full" ? 25 : 10,
      alertAt: 80,
      requestsPerMinute: 600,
      tokensPerMinute: 200_000,
    },
    apiKeys: [
      { id: "key_zapier", name: "Zapier", last4: "9f2a", scopes: ["runs:read", "runs:write"], createdAt: now - 30 * DAY, createdBy: user.name, lastUsedAt: now - 2 * HOUR },
      { id: "key_ci", name: "CI smoke tests", last4: "c41e", scopes: ["runs:read"], createdAt: now - 160 * DAY, createdBy: TEAMMATES[1], lastUsedAt: now - 120 * DAY },
    ],
    notifications: {
      approval: { email: true, slack: true },
      failed: { email: true, slack: false },
      spend: { email: true, slack: false },
    },
    agents: list,
    runs,
    approvals,
    sources: size === "full" ? sources(workspaceId, now) : [],
    accounts: size === "full" ? { notion: "Acme HQ", googledrive: user.email } : {},
  };
}
