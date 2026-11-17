"use client";

import type { RunFilters } from "@/components/ui/run-history/run-history";
import * as actions from "@/app/(console)/actions";
import type { Result } from "@/app/(console)/actions";
import type { ConsoleApi } from "@/lib/service";

/* ConsoleApi in the browser: reads from the route handlers in app/api,
   changes through the server actions in app/(console)/actions.ts. A failed
   action comes back as { ok: false, error } and is thrown here as an Error,
   so the block that called it shows the message where it was pressed. */

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 401) {
    window.location.assign("/sign-in");
    throw new Error("Your session ended. Sign in again.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "That didn’t load. Check your connection and try again.");
  }
  return response.json() as Promise<T>;
}

async function unwrap<T>(pending: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await pending;
  } catch {
    throw new Error("Couldn’t reach the server. Check your connection and try again.");
  }
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function query(filters: RunFilters, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, String(value));
  return params.toString();
}

export const httpApi: ConsoleApi = {
  status: () => get("/api/status"),

  runs: ({ filters, page }) => get(`/api/runs?${query(filters, page)}`),
  run: async (id) => {
    try {
      return await get(`/api/runs/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof Error && /No run/.test(error.message)) return null;
      throw error;
    }
  },
  startRun: (input) => unwrap(actions.startRun(input)),
  rerun: (id) => unwrap(actions.rerun(id)),
  cancelRun: (id) => unwrap(actions.cancelRun(id)),

  approvals: () => get("/api/approvals"),
  decide: (decision) => unwrap(actions.decide(decision)),

  knowledge: () => get("/api/knowledge"),
  addFiles: (files) => unwrap(actions.addFiles(files)),
  replaceFile: (id, file) => unwrap(actions.replaceFile(id, file)),
  addWebsite: (url, crawl) => unwrap(actions.addWebsite(url, crawl)),
  connectApp: (service) => unwrap(actions.connectApp(service)),
  resyncSource: (id) => unwrap(actions.resyncSource(id)),
  retrySources: (ids) => unwrap(actions.retrySources(ids)),
  removeSource: (id) => unwrap(actions.removeSource(id)),
  testRetrieval: (question) => unwrap(actions.testRetrieval(question)),

  agents: () => unwrap(actions.loadAgents()),
  updateAgent: (id, patch) => unwrap(actions.updateAgent(id, patch)),
  setServer: (agentId, serverId, action) => unwrap(actions.setServer(agentId, serverId, action)),
  revokeTool: (agentId, toolId) => unwrap(actions.revokeTool(agentId, toolId)),
  restoreTool: (agentId, tool) => unwrap(actions.restoreTool(agentId, tool)),

  usage: () => unwrap(actions.loadUsage()),

  settings: () => unwrap(actions.loadSettings()),
  saveSettings: (patch) => unwrap(actions.saveSettings(patch)),
  createKey: (input) => unwrap(actions.createKey(input)),
  revokeKey: (id) => unwrap(actions.revokeKey(id)),
  setNotification: (event, channel, on) => unwrap(actions.setNotification(event, channel, on)),
  testNotification: (channel) => unwrap(actions.testNotification(channel)),
};
