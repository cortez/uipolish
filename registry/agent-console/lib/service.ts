import type { AllowedTool } from "@/components/ui/agent-settings/agent-settings";
import type { ApprovalDecision, ApprovalRequest } from "@/components/ui/approvals-inbox/approvals-inbox";
import type { KnowledgeBatch, KnowledgeService, KnowledgeSource, KnowledgeTestResult, KnowledgeUsage } from "@/components/ui/knowledge-base/knowledge-base";
import type { RunDetail, RunFilters, RunSummary } from "@/components/ui/run-history/run-history";
import type { ApiKey, NewApiKey, NotificationChannel, NotificationMatrix, WorkspaceSettings } from "@/components/ui/settings/settings";
import type { UsageSegment } from "@/components/ui/usage-meter/usage-meter";
import { createEngine } from "@/lib/agents/engine";
import type { AgentRunner } from "@/lib/agents/runner";
import type { Agent, Approval, Database, Run, Workspace } from "@/lib/db/database";
import { newId } from "@/lib/db/ids";
import { createKnowledge } from "@/lib/knowledge/ingest";
import { MODELS, NOTIFICATION_EVENTS, PLAN, notificationChannels } from "@/lib/product";

/* What the console can do, for one person in one workspace: the reads each
   screen needs and every change it makes. The server binds it to the
   session in lib/server.ts and exposes it through the route handlers and
   server actions; the screens reach it through ConsoleApi, so the docs demo
   can bind the same service in the browser. Every method checks its input
   and throws an Error whose message is fit to show. */

export type ConsoleUser = { id: string; name: string; email: string };

export type RunsQuery = { filters: RunFilters; page: number; pageSize?: number };

/** Run history's DEFAULT_FILTERS, for server code: that module is a client one, so on the server its exports are references, not values. */
export const DEFAULT_RUN_FILTERS: RunFilters = { query: "", status: "all", agent: "all", trigger: "all", range: "7d" };
export type RunsPage = { runs: RunSummary[]; total: number; running: number };
export type AgentOption = { id: string; name: string };

export type AgentView = Omit<Agent, "workspaceId" | "createdAt"> & {
  /** Dollars in the last 24 hours, and what it went on. */
  spentToday: number;
  segments: UsageSegment[];
};
export type AgentPatch = Partial<Pick<Agent, "model" | "instructions" | "policy" | "dailyLimit">>;

export type KnowledgeState = {
  sources: KnowledgeSource[];
  usage: KnowledgeUsage;
  connected: Partial<Record<KnowledgeService, string>>;
  batch?: KnowledgeBatch;
};

export type AgentUsage = { id: string; name: string; runs: number; failed: number; tokens: number; cost: number };
export type UsageReport = {
  /** "November 2026". */
  period: string;
  spent: number;
  /** The monthly spend limit from Settings → Models. */
  limit: number;
  alertAt: number;
  runs: number;
  failed: number;
  tokens: number;
  byAgent: AgentUsage[];
};

export type SettingsData = {
  settings: WorkspaceSettings;
  apiKeys: ApiKey[];
  notifications: NotificationMatrix;
  channels: NotificationChannel[];
  spent: number;
  segments: UsageSegment[];
};

export type ConsoleStatus = { pendingApprovals: number; running: number };

export interface ConsoleApi {
  status(): Promise<ConsoleStatus>;

  runs(query: RunsQuery): Promise<RunsPage>;
  run(id: string): Promise<RunDetail | null>;
  startRun(input: { agentId: string; task: string }): Promise<string>;
  rerun(id: string): Promise<string>;
  cancelRun(id: string): Promise<void>;

  approvals(): Promise<ApprovalRequest[]>;
  decide(decision: ApprovalDecision): Promise<ApprovalRequest>;

  knowledge(): Promise<KnowledgeState>;
  addFiles(files: { name: string; size: number }[]): Promise<void>;
  replaceFile(id: string, file: { name: string; size: number }): Promise<void>;
  addWebsite(url: string, crawl: boolean): Promise<void>;
  connectApp(service: KnowledgeService): Promise<void>;
  resyncSource(id: string): Promise<void>;
  retrySources(ids: string[]): Promise<void>;
  removeSource(id: string): Promise<void>;
  testRetrieval(question: string): Promise<KnowledgeTestResult>;

  agents(): Promise<AgentView[]>;
  updateAgent(id: string, patch: AgentPatch): Promise<AgentView>;
  setServer(agentId: string, serverId: string, action: "enable" | "disable" | "reconnect"): Promise<AgentView>;
  revokeTool(agentId: string, toolId: string): Promise<AgentView>;
  restoreTool(agentId: string, tool: AllowedTool): Promise<AgentView>;

  usage(): Promise<UsageReport>;

  settings(): Promise<SettingsData>;
  saveSettings(patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings>;
  createKey(input: NewApiKey): Promise<{ key: ApiKey; secret: string }>;
  revokeKey(id: string): Promise<void>;
  setNotification(event: string, channel: string, on: boolean): Promise<void>;
  testNotification(channel: string): Promise<void>;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const RANGE_MS: Record<string, number> = { "1h": HOUR, "24h": DAY, "7d": 7 * DAY, "30d": 30 * DAY };

const summary = ({ id, agent, title, status, trigger, triggeredBy, startedAt, durationMs, tokens, cost, error }: Run): RunSummary => ({
  id, agent, title, status, trigger, triggeredBy, startedAt, durationMs, tokens, cost, error,
});

function request(a: Approval, agentName: string): ApprovalRequest {
  return {
    id: a.id,
    requester: { id: a.agentId, name: agentName, kind: "agent" },
    title: a.title,
    context: a.context,
    priority: a.priority,
    status: a.status,
    requestedAt: a.requestedAt,
    expiresAt: a.expiresAt,
    note: a.note,
    preview: a.preview,
    recipients: a.recipients,
    tool: a.tool,
    // Fields keep `max`, so the screen can check an amount before it's sent.
    fields: a.fields,
    outcome: a.outcome,
  };
}

const monthStart = (now: number) => {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};

export function createService(db: Database, runner: AgentRunner, options: { traffic?: boolean } = {}) {
  const knowledge = createKnowledge(db);
  const engine = createEngine(db, runner, {
    traffic: options.traffic ?? runner.name === "mock",
    searchKnowledge: async (workspaceId, query) => (await knowledge.search(workspaceId, query)).map((c) => ({ location: c.location, text: c.text })),
  });

  async function view(workspaceId: string, agent: Agent): Promise<AgentView> {
    const { runs } = await db.findRuns({ workspaceId, agent: agent.name, since: Date.now() - DAY, limit: 10_000 });
    const by = (trigger: Run["trigger"]) => runs.filter((r) => r.trigger === trigger).reduce((sum, r) => sum + r.cost, 0);
    const { id, name, description, model, instructions, policy, dailyLimit, servers, allowed } = agent;
    return {
      ...{ id, name, description, model, instructions, policy, dailyLimit, servers, allowed },
      spentToday: runs.reduce((sum, r) => sum + r.cost, 0),
      segments: [
        { id: "user", label: "Started by people", value: by("user") },
        { id: "schedule", label: "Scheduled", value: by("schedule") },
        { id: "webhook", label: "Webhooks", value: by("webhook") },
      ],
    };
  }

  async function monthRuns(workspaceId: string) {
    return (await db.findRuns({ workspaceId, since: monthStart(Date.now()), limit: 100_000 })).runs;
  }

  return {
    engine,
    knowledge,

    workspaces(user: ConsoleUser): Promise<Workspace[]> {
      return db.listWorkspaces(user.id, user.name, user.email);
    },

    /** The API for one person in one workspace they belong to. Check membership before calling it. */
    forWorkspace(workspaceId: string, user: ConsoleUser): ConsoleApi {
      engine.keepBusy(workspaceId);

      const agentOf = async (id: string) => {
        const agent = await db.getAgent(workspaceId, id);
        if (!agent) throw new Error("That agent doesn’t exist any more.");
        return agent;
      };
      const saveAgent = async (agent: Agent) => {
        await db.saveAgent(agent);
        return view(workspaceId, agent);
      };

      return {
        async status() {
          const [approvals, { total }] = await Promise.all([db.listApprovals(workspaceId), db.findRuns({ workspaceId, status: "running", limit: 0 })]);
          return { pendingApprovals: approvals.filter((a) => a.status === "pending").length, running: total };
        },

        async runs({ filters, page, pageSize = 25 }) {
          const f = { ...DEFAULT_RUN_FILTERS, ...filters };
          const since =
            f.range === "custom" ? (f.from ? Date.parse(f.from) : undefined) : RANGE_MS[f.range] ? Date.now() - RANGE_MS[f.range] : undefined;
          const until = f.range === "custom" && f.to ? Date.parse(f.to) + DAY : undefined;
          const safePage = Math.max(1, Math.floor(page) || 1);
          const [{ runs, total }, running] = await Promise.all([
            db.findRuns({
              workspaceId,
              text: f.query.slice(0, 200),
              status: f.status === "all" ? undefined : f.status,
              agent: f.agent === "all" ? undefined : f.agent,
              trigger: f.trigger === "all" ? undefined : f.trigger,
              since,
              until,
              offset: (safePage - 1) * pageSize,
              limit: Math.min(pageSize, 100),
            }),
            db.findRuns({ workspaceId, status: "running", limit: 0 }),
          ]);
          return { runs: runs.map(summary), total, running: running.total };
        },

        async run(id) {
          const run = await db.getRun(workspaceId, id);
          if (!run) return null;
          return { id: run.id, run: summary(run), steps: run.steps, output: run.output, cancelNote: run.cancelNote };
        },

        async startRun({ agentId, task }) {
          return (await engine.start(workspaceId, { agentId, task: String(task), trigger: "user", triggeredBy: user.name })).id;
        },
        async rerun(id) {
          return (await engine.rerun(workspaceId, id, user.name)).id;
        },
        async cancelRun(id) {
          await engine.cancel(workspaceId, id, user.name);
        },

        async approvals() {
          const [approvals, agents] = await Promise.all([db.listApprovals(workspaceId), db.listAgents(workspaceId)]);
          const names = new Map(agents.map((a) => [a.id, a.name]));
          return approvals.map((a) => request(a, names.get(a.agentId) ?? "Agent"));
        },
        async decide(decision) {
          if (decision.decision !== "approve" && decision.decision !== "decline") throw new Error("Approve or decline.");
          const note = decision.note?.trim().slice(0, 500) || undefined;
          const updated = await engine.decide(workspaceId, { ...decision, note }, user.name);
          return request(updated, (await db.getAgent(workspaceId, updated.agentId))?.name ?? "Agent");
        },

        async knowledge() {
          const state = await knowledge.state(workspaceId);
          return { sources: state.sources, connected: state.connected, batch: state.batch, usage: { used: state.used, limit: PLAN.knowledgePages, unit: "pages" } };
        },
        async addFiles(files) {
          const { used } = await knowledge.state(workspaceId);
          if (used >= PLAN.knowledgePages) throw new Error("Knowledge is full. Remove sources or upgrade to add more.");
          await knowledge.addFiles(workspaceId, files.slice(0, 100));
        },
        async replaceFile(id, file) {
          await knowledge.replaceFile(workspaceId, id, file);
        },
        async addWebsite(url, crawl) {
          await knowledge.addWebsite(workspaceId, url, crawl);
        },
        async connectApp(service) {
          if (!["googledrive", "notion", "dropbox"].includes(service)) throw new Error("That app isn’t offered.");
          await knowledge.connect(workspaceId, service, user.email);
        },
        async resyncSource(id) {
          await knowledge.resync(workspaceId, id);
        },
        async retrySources(ids) {
          await knowledge.retry(workspaceId, ids.slice(0, 100));
        },
        async removeSource(id) {
          await knowledge.remove(workspaceId, id);
        },
        async testRetrieval(question) {
          return { chunks: await knowledge.search(workspaceId, question.slice(0, 500)) };
        },

        async agents() {
          const agents = await db.listAgents(workspaceId);
          return Promise.all(agents.map((a) => view(workspaceId, a)));
        },
        async updateAgent(id, patch) {
          const agent = await agentOf(id);
          if (patch.model !== undefined && !MODELS.some((m) => m.id === patch.model)) throw new Error("Pick one of the models listed.");
          if (patch.dailyLimit !== undefined && !(patch.dailyLimit >= 1 && patch.dailyLimit <= 500)) throw new Error("Set a daily limit from $1 to $500.");
          if (patch.instructions !== undefined) {
            const text = patch.instructions.trim();
            if (!text) throw new Error("Write at least a line of instructions.");
            if (text.length > 8000) throw new Error("Keep instructions under 8,000 characters.");
            patch = { ...patch, instructions: text };
          }
          const policy = patch.policy && { read: patch.policy.read === "allow" ? "allow" : "ask", change: patch.policy.change === "allow" ? "allow" : "ask" } as const;
          return saveAgent({ ...agent, ...patch, ...(policy && { policy }) });
        },
        async setServer(agentId, serverId, action) {
          const agent = await agentOf(agentId);
          const server = agent.servers.find((s) => s.id === serverId);
          if (!server) throw new Error("That server isn’t connected any more.");
          // Reconnecting is where the server's OAuth sign-in goes; the sample signs straight back in.
          server.status = action === "disable" ? "disabled" : "connected";
          server.message = undefined;
          return saveAgent(agent);
        },
        async revokeTool(agentId, toolId) {
          const agent = await agentOf(agentId);
          return saveAgent({ ...agent, allowed: agent.allowed.filter((t) => t.id !== toolId) });
        },
        async restoreTool(agentId, tool) {
          const agent = await agentOf(agentId);
          if (agent.allowed.some((t) => t.id === tool.id)) return view(workspaceId, agent);
          return saveAgent({ ...agent, allowed: [...agent.allowed, tool] });
        },

        async usage() {
          const [runs, settings, agents] = await Promise.all([monthRuns(workspaceId), db.getSettings(workspaceId), db.listAgents(workspaceId)]);
          const byAgent = agents.map((a) => {
            const mine = runs.filter((r) => r.agentId === a.id);
            return {
              id: a.id,
              name: a.name,
              runs: mine.length,
              failed: mine.filter((r) => r.status === "failed").length,
              tokens: mine.reduce((sum, r) => sum + r.tokens, 0),
              cost: mine.reduce((sum, r) => sum + r.cost, 0),
            };
          });
          return {
            period: new Date(monthStart(Date.now())).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
            spent: runs.reduce((sum, r) => sum + r.cost, 0),
            limit: settings?.spendLimit ?? 0,
            alertAt: settings?.alertAt ?? 80,
            runs: runs.length,
            failed: runs.filter((r) => r.status === "failed").length,
            tokens: runs.reduce((sum, r) => sum + r.tokens, 0),
            byAgent,
          };
        },

        async settings() {
          const [settings, apiKeys, notifications, runs, agents] = await Promise.all([
            db.getSettings(workspaceId),
            db.listApiKeys(workspaceId),
            db.getNotifications(workspaceId),
            monthRuns(workspaceId),
            db.listAgents(workspaceId),
          ]);
          if (!settings) throw new Error("That workspace doesn’t exist.");
          return {
            settings,
            apiKeys,
            notifications,
            channels: notificationChannels(user.email),
            spent: runs.reduce((sum, r) => sum + r.cost, 0),
            segments: agents.map((a) => ({ id: a.id, label: a.name, value: runs.filter((r) => r.agentId === a.id).reduce((sum, r) => sum + r.cost, 0) })),
          };
        },
        async saveSettings(patch) {
          if (patch.spendLimit !== undefined && patch.spendLimit > (PLAN.maxSpendLimit ?? Infinity)) throw new Error("That’s over your plan’s spend limit.");
          const saved = await db.updateSettings(workspaceId, patch);
          if (!saved) throw new Error("That workspace doesn’t exist.");
          return saved;
        },
        async createKey({ name, scopes, expiresInDays }) {
          if (!name.trim()) throw new Error("Name the key after what uses it.");
          if (!scopes.length) throw new Error("Pick at least one scope.");
          const bytes = crypto.getRandomValues(new Uint8Array(24));
          const secret = `sk-acme-${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
          // Store a hash of the secret in a real database, never the secret.
          const key: ApiKey = {
            id: newId("key"),
            name: name.trim().slice(0, 80),
            last4: secret.slice(-4),
            scopes,
            createdAt: Date.now(),
            createdBy: user.name,
            lastUsedAt: null,
            expiresAt: expiresInDays ? Date.now() + expiresInDays * DAY : null,
          };
          await db.saveApiKey(workspaceId, key);
          return { key, secret };
        },
        async revokeKey(id) {
          if (!(await db.deleteApiKey(workspaceId, id))) throw new Error("That key was already revoked.");
        },
        async setNotification(event, channel, on) {
          if (!NOTIFICATION_EVENTS.some((e) => e.id === event)) throw new Error("That notification doesn’t exist.");
          await db.setNotification(workspaceId, event, channel, !!on);
        },
        async testNotification(channel) {
          // Send through your email provider or Slack app here.
          await new Promise((resolve) => setTimeout(resolve, 700));
          if (!notificationChannels(user.email).some((c) => c.id === channel)) throw new Error("That channel isn’t set up.");
        },
      };
    },
  };
}

export type Service = ReturnType<typeof createService>;
