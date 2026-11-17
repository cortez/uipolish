"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SessionScreen } from "@registry/agent-workspace/components/app/session-screen";
import { WorkspaceContext, type Route, type WorkspaceValue } from "@registry/agent-workspace/components/app/workspace-context";
import { WorkspaceFrame } from "@registry/agent-workspace/components/app/workspace-frame";
import { MODELS } from "@registry/agent-workspace/lib/coding/config";
import { createEngine } from "@registry/agent-workspace/lib/coding/engine";
import { mockAgent } from "@registry/agent-workspace/lib/coding/mock-agent";
import { createService } from "@registry/agent-workspace/lib/coding/service";
import type { Person, SessionSummary, Workspace } from "@registry/agent-workspace/lib/coding/session";
import { createMemoryStore } from "@registry/agent-workspace/lib/coding/store";
import styles from "./agent-workspace.module.css";

/* The template's own sidebar, panes, store, engine and scripted agent, all
   running in the browser: this file stands in for the router and the
   server. Send a prompt and the mock agent reads, edits, tests, pushes and
   waits for checks; everything it does lands in the same store the
   screens read. */

const USER = { id: "ana@acme.example.com", name: "Ana Ruiz", email: "ana@acme.example.com" };

const noop = () => () => {};

export function AgentWorkspacePreview() {
  // Built after mount: the sample's times are relative to now, so there's nothing to server-render.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return (
    <div className={styles.demo}>
      <div className={styles.frame}>{mounted && <Demo />}</div>
      <p className={styles.note}>
        Everything here is the template’s own code, with its scripted agent in your browser. Send a prompt (or pick a starter on Home) and watch
        it work; put /fail in a prompt to see a check fail. Merge is live once the checks pass.
      </p>
    </div>
  );
}

function Demo() {
  const [service] = useState(() => {
    const store = createMemoryStore();
    return createService(store, createEngine(store, async () => mockAgent));
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [route, setRoute] = useState<Route>({ session: null });
  const [tabs, setTabs] = useState<string[]>([]);

  const api = useMemo(() => (workspaceId ? service.forWorkspace(workspaceId, USER) : null), [service, workspaceId]);

  useEffect(() => {
    service.workspaces(USER).then((list) => {
      setWorkspaces(list);
      setWorkspaceId((id) => id ?? list[0]?.id);
    });
    return () => service.engine.stopAll();
  }, [service]);

  // A workspace opens on its two newest sessions, the first one showing.
  useEffect(() => {
    if (!api) return;
    Promise.all([api.sessions(), api.people()]).then(([list, team]) => {
      setSessions(list);
      setPeople(team);
      const first = list.slice(0, 2).map((s) => s.id);
      setTabs(first);
      setRoute({ session: first[0] ?? null });
    });
  }, [api]);

  const refreshSessions = useCallback(() => {
    api?.sessions().then(setSessions);
  }, [api]);

  const go = useCallback((to: Route) => {
    setRoute(to);
    if (to.session) setTabs((open) => (open.includes(to.session!) ? open : [...open, to.session!]));
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((open) => {
        const at = open.indexOf(id);
        const next = open.filter((t) => t !== id);
        if (route.session === id) setRoute({ session: next[Math.min(at, next.length - 1)] ?? null });
        return next;
      });
    },
    [route.session],
  );

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const value = useMemo<WorkspaceValue | null>(
    () =>
      api && workspace
        ? {
            api,
            route,
            go,
            user: USER,
            workspace,
            workspaces,
            switchWorkspace: setWorkspaceId,
            people,
            sessions,
            refreshSessions,
            tabs: tabs.filter((id) => sessions.some((s) => s.id === id)),
            closeTab,
            models: MODELS,
            hint: "A scripted agent is answering in this demo. The template connects to your model.",
            sessionUrl: (id) => `https://code.acme.example.com/sessions/${id}`,
            signOut: () => setRoute({ session: null }),
          }
        : null,
    [api, workspace, route, go, workspaces, people, sessions, refreshSessions, tabs, closeTab],
  );

  if (!value) return null;

  return (
    <WorkspaceContext value={value}>
      <WorkspaceFrame key={workspaceId} shortcuts={false}>
        <SessionScreen sessionId={route.session} shortcuts={false} />
      </WorkspaceFrame>
    </WorkspaceContext>
  );
}
