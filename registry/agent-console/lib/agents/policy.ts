import type { ToolEffect } from "@/components/ui/agent-settings/agent-settings";
import type { Agent } from "@/lib/db/database";

/* Whether a tool call waits for a person: what Agents → Permissions says.
   A tool set to Always allow never asks; otherwise reads and changes follow
   the agent's policy, and sends, deletes and spends always ask. */

export function needsApproval(agent: Pick<Agent, "policy" | "allowed">, server: string, tool: string, effect: ToolEffect) {
  if (agent.allowed.some((t) => t.server === server && t.tool === tool)) return false;
  if (effect === "read" || effect === "change") return agent.policy[effect] === "ask";
  return true;
}

/** Why a tool can't run at all, from the state of its server; null when it can. */
export function serverProblem(agent: Pick<Agent, "servers">, server: string) {
  const s = agent.servers.find((x) => x.name === server);
  if (!s) return null;
  if (s.status === "disabled") return `${server} is turned off for this agent. Turn it on in Agents → Connections.`;
  if (s.status === "needs-auth") return `${server} is signed out. Sign in again in Agents → Connections.`;
  if (s.status === "error") return `${server} can’t connect${s.message ? `: ${s.message}` : "."}`;
  return null;
}
