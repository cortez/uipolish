import type { ApiKey, NotificationMatrix, WorkspaceSettings } from "@/components/ui/settings/settings";
import type { Agent, Approval, Database, KnowledgeAccounts, Run, Source, Workspace } from "./database";
import { newId } from "./ids";
import { seedWorkspace } from "./seed";

/* Database, kept in maps. Every value is copied in and out, as a real
   database would, so nothing outside can change a row by holding it. Each
   new person gets two sample workspaces (seed.ts). Runs past 1,000 per
   workspace drop off the end, so a dev server left running stays small. */

type Space = {
  settings: WorkspaceSettings;
  apiKeys: ApiKey[];
  notifications: NotificationMatrix;
  agents: Map<string, Agent>;
  runs: Map<string, Run>;
  approvals: Map<string, Approval>;
  sources: Map<string, Source>;
  accounts: KnowledgeAccounts;
};

const MAX_RUNS = 1000;
const copy = <T>(value: T): T => structuredClone(value);
const startOf = (run: Run) => Date.parse(run.startedAt);

export function createMemoryDatabase(): Database {
  const people = new Map<string, Workspace[]>();
  const spaces = new Map<string, Space>();

  function space(workspaceId: string) {
    const s = spaces.get(workspaceId);
    if (!s) throw new Error("That workspace doesn’t exist.");
    return s;
  }

  return {
    async listWorkspaces(userId, userName, email) {
      let list = people.get(userId);
      if (!list) {
        list = [
          { id: newId("ws"), name: "Acme" },
          { id: newId("ws"), name: "Acme Sandbox" },
        ];
        list.forEach((w, i) => {
          const seed = seedWorkspace(w.id, { name: userName, email }, i === 0 ? "full" : "small");
          spaces.set(w.id, {
            settings: seed.settings,
            apiKeys: seed.apiKeys,
            notifications: seed.notifications,
            agents: new Map(seed.agents.map((a) => [a.id, a])),
            runs: new Map(seed.runs.map((r) => [r.id, r])),
            approvals: new Map(seed.approvals.map((a) => [a.id, a])),
            sources: new Map(seed.sources.map((s) => [s.id, s])),
            accounts: seed.accounts,
          });
        });
        people.set(userId, list);
      }
      // The name lives in settings, so a rename in Settings shows in the switcher.
      return list.map((w) => ({ id: w.id, name: spaces.get(w.id)?.settings.name ?? w.name }));
    },

    async getSettings(workspaceId) {
      return spaces.has(workspaceId) ? copy(space(workspaceId).settings) : null;
    },
    async updateSettings(workspaceId, patch) {
      if (!spaces.has(workspaceId)) return null;
      const s = space(workspaceId);
      s.settings = { ...s.settings, ...copy(patch) };
      return copy(s.settings);
    },
    async listApiKeys(workspaceId) {
      return copy(space(workspaceId).apiKeys);
    },
    async saveApiKey(workspaceId, key) {
      const s = space(workspaceId);
      s.apiKeys = [copy(key), ...s.apiKeys.filter((k) => k.id !== key.id)];
    },
    async deleteApiKey(workspaceId, id) {
      const s = space(workspaceId);
      const before = s.apiKeys.length;
      s.apiKeys = s.apiKeys.filter((k) => k.id !== id);
      return s.apiKeys.length < before;
    },
    async getNotifications(workspaceId) {
      return copy(space(workspaceId).notifications);
    },
    async setNotification(workspaceId, event, channel, on) {
      const s = space(workspaceId);
      s.notifications = { ...s.notifications, [event]: { ...s.notifications[event], [channel]: on } };
    },

    async listAgents(workspaceId) {
      return copy([...space(workspaceId).agents.values()]);
    },
    async getAgent(workspaceId, id) {
      const a = spaces.get(workspaceId)?.agents.get(id);
      return a ? copy(a) : null;
    },
    async saveAgent(agent) {
      space(agent.workspaceId).agents.set(agent.id, copy(agent));
    },

    async findRuns({ workspaceId, status, agent, trigger, since, until, text, offset = 0, limit = 25 }) {
      const words = text?.trim().toLowerCase();
      const all = [...space(workspaceId).runs.values()]
        .filter(
          (r) =>
            (!status || r.status === status) &&
            (!agent || r.agent === agent) &&
            (!trigger || r.trigger === trigger) &&
            (since === undefined || startOf(r) >= since) &&
            (until === undefined || startOf(r) < until) &&
            (!words || [r.id, r.title, r.agent, r.error ?? ""].some((v) => v.toLowerCase().includes(words))),
        )
        .sort((a, b) => startOf(b) - startOf(a));
      return { runs: copy(all.slice(offset, offset + limit)), total: all.length };
    },
    async getRun(workspaceId, id) {
      const r = spaces.get(workspaceId)?.runs.get(id);
      return r ? copy(r) : null;
    },
    async saveRun(run) {
      const runs = space(run.workspaceId).runs;
      runs.set(run.id, copy(run));
      if (runs.size > MAX_RUNS) {
        const oldest = [...runs.values()].filter((r) => r.status !== "running").sort((a, b) => startOf(a) - startOf(b))[0];
        if (oldest) runs.delete(oldest.id);
      }
    },

    async listApprovals(workspaceId) {
      return copy([...space(workspaceId).approvals.values()].sort((a, b) => b.requestedAt - a.requestedAt));
    },
    async getApproval(workspaceId, id) {
      const a = spaces.get(workspaceId)?.approvals.get(id);
      return a ? copy(a) : null;
    },
    async saveApproval(approval) {
      space(approval.workspaceId).approvals.set(approval.id, copy(approval));
    },

    async listSources(workspaceId) {
      return copy([...space(workspaceId).sources.values()].sort((a, b) => b.addedAt - a.addedAt));
    },
    async getSource(workspaceId, id) {
      const s = spaces.get(workspaceId)?.sources.get(id);
      return s ? copy(s) : null;
    },
    async saveSource(source) {
      space(source.workspaceId).sources.set(source.id, copy(source));
    },
    async deleteSource(workspaceId, id) {
      return space(workspaceId).sources.delete(id);
    },
    async getKnowledgeAccounts(workspaceId) {
      return copy(space(workspaceId).accounts);
    },
    async setKnowledgeAccount(workspaceId, service, account) {
      const s = space(workspaceId);
      s.accounts = { ...s.accounts, [service]: account };
    },
  };
}
