"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ModelOption } from "@/components/ui/model-picker/model-picker";
import { toast } from "@/components/ui/toast/toast";
import { signOut, switchWorkspace } from "@/app/(workspace)/actions";
import type { WorkspaceUser } from "@/lib/coding/service";
import type { Person, SessionSummary, Workspace } from "@/lib/coding/session";
import { httpWorkspace } from "./http-workspace";
import { WorkspaceContext, type Route, type WorkspaceValue } from "./workspace-context";
import { useStored } from "./use-stored";
import { WorkspaceFrame } from "./workspace-frame";

/* The signed-in frame in the app: the workspace context on the router and
   the server. The URL is the route (/sessions/ses_…), the API is
   http-workspace.ts, the sidebar's sessions refresh every few seconds, and
   the open tabs are kept for this browser. */

type WorkspaceShellProps = {
  user: WorkspaceUser;
  workspaces: Workspace[];
  workspaceId: string;
  sessions: SessionSummary[];
  people: Person[];
  models: ModelOption[];
  hint: string;
  children: ReactNode;
};

const parseTabs = (raw: unknown) => (Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : null);

export function WorkspaceShell({ user, workspaces, workspaceId, sessions: initialSessions, people: initialPeople, models, hint, children }: WorkspaceShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [sessions, setSessions] = useState(initialSessions);
  const [people, setPeople] = useState(initialPeople);
  const [stored, saveTabs] = useStored<string[]>(`workspace-tabs:${workspaceId}`, [], parseTabs);
  const [draft, setDraft] = useState<Route["draft"]>();

  // Fresh data from the server (after a workspace switch) replaces ours.
  const [server, setServer] = useState(initialSessions);
  if (server !== initialSessions) {
    setServer(initialSessions);
    setSessions(initialSessions);
    setPeople(initialPeople);
  }

  const match = /^\/sessions\/([^/]+)/.exec(pathname);
  const current = match ? decodeURIComponent(match[1]) : null;
  const route = useMemo<Route>(() => ({ session: current, draft: current ? undefined : draft }), [current, draft]);

  // A tab being closed stays closed while the router leaves its session.
  const [closing, setClosing] = useState<string | null>(null);
  const [lastCurrent, setLastCurrent] = useState(current);
  if (lastCurrent !== current) {
    setLastCurrent(current);
    setClosing(null);
  }

  // The open session is always a tab; tabs for sessions that are gone close.
  const tabs = useMemo(() => {
    const known = new Set(sessions.map((s) => s.id));
    const open = stored.filter((id) => id !== closing && (known.has(id) || id === current));
    return current && current !== closing && !open.includes(current) ? [...open, current] : open;
  }, [stored, sessions, current, closing]);

  // Keep what's open for the next visit.
  useEffect(() => {
    if (tabs.length !== stored.length || tabs.some((id, i) => id !== stored[i])) saveTabs(tabs);
  }, [tabs, stored, saveTabs]);

  const go = useCallback(
    (to: Route) => {
      setDraft(to.draft);
      router.push(to.session ? `/sessions/${encodeURIComponent(to.session)}` : "/sessions", { scroll: false });
    },
    [router],
  );

  const refreshSessions = useCallback(() => {
    httpWorkspace.sessions().then(setSessions, () => {});
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshSessions();
      httpWorkspace.people().then(setPeople, () => {});
    }, 5000);
    return () => window.clearInterval(id);
  }, [refreshSessions]);

  const closeTab = useCallback(
    (id: string) => {
      const at = tabs.indexOf(id);
      const next = tabs.filter((t) => t !== id);
      saveTabs(next);
      if (id === current) {
        setClosing(id);
        const neighbor = next[Math.min(at, next.length - 1)];
        router.push(neighbor ? `/sessions/${encodeURIComponent(neighbor)}` : "/sessions", { scroll: false });
      }
    },
    [tabs, current, router, saveTabs],
  );

  const changeWorkspace = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await switchWorkspace(id).catch(() => ({ ok: false, error: "Couldn’t switch workspace." }) as const);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        router.push("/sessions");
        router.refresh();
      });
    },
    [router],
  );

  const workspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];
  const value = useMemo<WorkspaceValue>(
    () => ({
      api: httpWorkspace,
      route,
      go,
      user,
      workspace,
      workspaces,
      switchWorkspace: changeWorkspace,
      people,
      sessions,
      refreshSessions,
      tabs,
      closeTab,
      models,
      hint,
      sessionUrl: (id) => `${window.location.origin}/sessions/${encodeURIComponent(id)}`,
      signOut: () => startTransition(() => signOut()),
    }),
    [route, go, user, workspace, workspaces, changeWorkspace, people, sessions, refreshSessions, tabs, closeTab, models, hint],
  );

  return (
    <WorkspaceContext value={value}>
      <WorkspaceFrame key={workspaceId}>{children}</WorkspaceFrame>
    </WorkspaceContext>
  );
}
