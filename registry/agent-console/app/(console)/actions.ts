"use server";

import { redirect } from "next/navigation";
import type { AllowedTool } from "@/components/ui/agent-settings/agent-settings";
import type { ApprovalDecision } from "@/components/ui/approvals-inbox/approvals-inbox";
import type { KnowledgeService } from "@/components/ui/knowledge-base/knowledge-base";
import type { NewApiKey, WorkspaceSettings } from "@/components/ui/settings/settings";
import { apiOrNull, chooseWorkspace } from "@/lib/server";
import type { AgentPatch, ConsoleApi } from "@/lib/service";
import { endSession } from "@/lib/session";

/* Every change the screens make, as server actions. Each checks who's
   asking and returns { ok } rather than throwing, so the message survives a
   production build (thrown errors are redacted there);
   components/app/http-api.ts turns a failure back into an Error whose
   message the block shows. Reads that poll go through the route handlers in
   app/api; the rest load with their page and, after a change, from here. */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function act<T>(fn: (api: ConsoleApi) => Promise<T>): Promise<Result<T>> {
  const api = await apiOrNull();
  if (!api) return { ok: false, error: "Your session ended. Sign in again." };
  try {
    return { ok: true, value: await fn(api) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong. Try again." };
  }
}

export async function startRun(input: { agentId: string; task: string }) {
  return act((api) => api.startRun(input));
}
export async function rerun(id: string) {
  return act((api) => api.rerun(id));
}
export async function cancelRun(id: string) {
  return act((api) => api.cancelRun(id));
}

export async function decide(decision: ApprovalDecision) {
  return act((api) => api.decide(decision));
}

export async function addFiles(files: { name: string; size: number }[]) {
  return act((api) => api.addFiles(files));
}
export async function replaceFile(id: string, file: { name: string; size: number }) {
  return act((api) => api.replaceFile(id, file));
}
export async function addWebsite(url: string, crawl: boolean) {
  return act((api) => api.addWebsite(url, crawl));
}
export async function connectApp(service: KnowledgeService) {
  return act((api) => api.connectApp(service));
}
export async function resyncSource(id: string) {
  return act((api) => api.resyncSource(id));
}
export async function retrySources(ids: string[]) {
  return act((api) => api.retrySources(ids));
}
export async function removeSource(id: string) {
  return act((api) => api.removeSource(id));
}
export async function testRetrieval(question: string) {
  return act((api) => api.testRetrieval(question));
}

export async function loadAgents() {
  return act((api) => api.agents());
}
export async function updateAgent(id: string, patch: AgentPatch) {
  return act((api) => api.updateAgent(id, patch));
}
export async function setServer(agentId: string, serverId: string, action: "enable" | "disable" | "reconnect") {
  return act((api) => api.setServer(agentId, serverId, action));
}
export async function revokeTool(agentId: string, toolId: string) {
  return act((api) => api.revokeTool(agentId, toolId));
}
export async function restoreTool(agentId: string, tool: AllowedTool) {
  return act((api) => api.restoreTool(agentId, tool));
}

export async function loadUsage() {
  return act((api) => api.usage());
}

export async function loadSettings() {
  return act((api) => api.settings());
}
export async function saveSettings(patch: Partial<WorkspaceSettings>) {
  return act((api) => api.saveSettings(patch));
}
export async function createKey(input: NewApiKey) {
  return act((api) => api.createKey(input));
}
export async function revokeKey(id: string) {
  return act((api) => api.revokeKey(id));
}
export async function setNotification(event: string, channel: string, on: boolean) {
  return act((api) => api.setNotification(event, channel, on));
}
export async function testNotification(channel: string) {
  return act((api) => api.testNotification(channel));
}

export async function switchWorkspace(id: string): Promise<Result<null>> {
  return (await chooseWorkspace(id)) ? { ok: true, value: null } : { ok: false, error: "That workspace doesn’t exist." };
}

export async function signOut() {
  await endSession();
  redirect("/sign-in");
}
