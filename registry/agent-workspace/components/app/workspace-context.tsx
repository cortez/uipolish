"use client";

import { createContext, use } from "react";
import type { ModelOption } from "@/components/ui/model-picker/model-picker";
import type { WorkspaceApi, WorkspaceUser } from "@/lib/coding/service";
import type { Person, SessionSummary, Workspace } from "@/lib/coding/session";

/* What every part of the workspace reads: the API, where we are, how to go
   elsewhere, the sidebar's sessions and the open tabs. WorkspaceShell
   provides it in the app (the URL is the route, the API is the server);
   the docs demo provides it with the same service running in the browser.
   Screens never import the router or the server, only this. */

/** `session`: the open session, or null for a new one. `draft` prefills the new session's composer. */
export type Route = { session: string | null; draft?: { text?: string; mentions?: string[] } };

export type WorkspaceValue = {
  api: WorkspaceApi;
  route: Route;
  go: (route: Route) => void;
  user: WorkspaceUser;
  workspace: Workspace;
  workspaces: Workspace[];
  switchWorkspace: (id: string) => void;
  people: Person[];
  sessions: SessionSummary[];
  /** Fetch the sidebar's sessions now, after a change that moves them. */
  refreshSessions: () => void;
  /** Open sessions, as tabs, in the order they were opened. */
  tabs: string[];
  closeTab: (id: string) => void;
  models: ModelOption[];
  /** The line under the composer. */
  hint: string;
  /** A link to a session, for Copy link. */
  sessionUrl: (id: string) => string;
  signOut: () => void;
};

export const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useWorkspace() {
  const value = use(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be inside <WorkspaceContext>.");
  return value;
}
