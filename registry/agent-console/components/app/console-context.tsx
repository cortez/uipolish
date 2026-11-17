"use client";

import { createContext, use } from "react";
import type { ConsoleApi, ConsoleStatus, ConsoleUser } from "@/lib/service";

/* What every screen reads: the API, where we are, how to go elsewhere, and
   the counts the sidebar shows. ConsoleShell provides it in the app (the
   URL is the route, the API is the server); the docs demo provides it with
   the same service running in the browser. Screens never import the router
   or the server, only this. */

export type Screen = "runs" | "approvals" | "knowledge" | "agents" | "usage" | "settings";

/** `run`: the open run on Runs. `agent`: the agent open on Agents. */
export type Route = { screen: Screen; run?: string | null; agent?: string | null };

export type ConsoleValue = {
  api: ConsoleApi;
  route: Route;
  go: (route: Route) => void;
  user: ConsoleUser;
  workspace: { id: string; name: string };
  status: ConsoleStatus;
  /** Fetch the sidebar's counts now, after a change that moves them. */
  refreshStatus: () => void;
  /** A shareable link to a run. */
  runUrl: (id: string) => string;
};

export const ConsoleContext = createContext<ConsoleValue | null>(null);

export function useConsole() {
  const value = use(ConsoleContext);
  if (!value) throw new Error("useConsole must be inside <ConsoleContext>.");
  return value;
}
