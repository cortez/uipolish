"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SidebarProvider } from "@registry/sidebar/sidebar";
import { AgentsScreen } from "@registry/agent-console/components/app/agents-screen";
import { ApprovalsScreen } from "@registry/agent-console/components/app/approvals-screen";
import { ConsoleContext, type ConsoleValue, type Route } from "@registry/agent-console/components/app/console-context";
import { ConsoleSidebar } from "@registry/agent-console/components/app/console-sidebar";
import { KnowledgeScreen } from "@registry/agent-console/components/app/knowledge-screen";
import { RunsScreen } from "@registry/agent-console/components/app/runs-screen";
import { SettingsScreen } from "@registry/agent-console/components/app/settings-screen";
import { UsageScreen } from "@registry/agent-console/components/app/usage-screen";
import { usePoll } from "@registry/agent-console/components/app/use-live";
import { mockRunner } from "@registry/agent-console/lib/agents/mock";
import type { Workspace } from "@registry/agent-console/lib/db/database";
import { createMemoryDatabase } from "@registry/agent-console/lib/db/in-memory";
import { createService, type ConsoleStatus } from "@registry/agent-console/lib/service";
import app from "@registry/agent-console/components/app/console.module.css";
import styles from "./agent-console.module.css";

/* The template's own sidebar, screens, store, engine and mock runner, all
   running in the browser: this file stands in for the router and the
   server. Runs start on their own, stop to ask in Approvals, and finish in
   Runs; everything the screens change, they change in the same store. */

const USER = { id: "ana@acme.example.com", name: "Ana Ruiz", email: "ana@acme.example.com" };

const noop = () => () => {};

export function AgentConsolePreview() {
  // Built after mount: the data is random and the clock is live, so there's nothing to server-render.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return (
    <div className={styles.demo}>
      {mounted ? (
        <SidebarProvider shortcut={false}>
          <Demo />
        </SidebarProvider>
      ) : (
        <div className={styles.frame} />
      )}
      <p className={styles.note}>
        Everything here is the template’s own code, with its mock runner in your browser. Two runs stop to ask in Approvals as it opens and
        more start every half minute; approve one and its run carries on. Turn a permission to “Ask every time” in Agents and the next run asks
        too.
      </p>
    </div>
  );
}

function Demo() {
  const [service] = useState(() => createService(createMemoryDatabase(), mockRunner, { traffic: true }));
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>();
  const [route, setRoute] = useState<Route>({ screen: "runs" });
  const [status, setStatus] = useState<ConsoleStatus>({ pendingApprovals: 0, running: 0 });

  useEffect(() => {
    service.engine.restart();
    service.workspaces(USER).then((list) => {
      setWorkspaces(list);
      setWorkspaceId((id) => id ?? list[0]?.id);
    });
    return () => service.engine.stop();
  }, [service]);

  const api = useMemo(() => (workspaceId ? service.forWorkspace(workspaceId, USER) : null), [service, workspaceId]);
  const refresh = () => api?.status().then(setStatus);
  usePoll(refresh, 1500, !!api);

  const value = useMemo<ConsoleValue | null>(
    () =>
      api && workspaceId
        ? {
            api,
            route,
            go: setRoute,
            user: USER,
            workspace: workspaces.find((w) => w.id === workspaceId) ?? workspaces[0],
            status,
            refreshStatus: () => void api.status().then(setStatus),
            runUrl: (id) => `https://console.acme.example.com/runs?run=${id}`,
          }
        : null,
    [api, workspaceId, workspaces, route, status],
  );

  if (!value || !workspaceId) return <div className={styles.frame} />;

  return (
    <ConsoleContext value={value}>
      <div className={styles.frame}>
        <ConsoleSidebar
          user={USER}
          workspaces={workspaces}
          workspaceId={workspaceId}
          onWorkspaceChange={(id) => {
            setWorkspaceId(id);
            setRoute({ screen: route.screen });
            // The workspace's name lives in its settings; a rename shows here.
            service.workspaces(USER).then(setWorkspaces);
          }}
          value={route.screen}
          onSelect={(screen) => {
            setRoute({ screen });
            service.workspaces(USER).then(setWorkspaces);
          }}
          pendingApprovals={status.pendingApprovals}
          onSignOut={() => setRoute({ screen: "runs" })}
        />
        <main key={workspaceId} className={app.main}>
          {route.screen === "runs" && <RunsScreen />}
          {route.screen === "approvals" && <ApprovalsScreen />}
          {route.screen === "knowledge" && <KnowledgeScreen />}
          {route.screen === "agents" && <AgentsScreen />}
          {route.screen === "usage" && <UsageScreen />}
          {route.screen === "settings" && <SettingsScreen />}
        </main>
      </div>
    </ConsoleContext>
  );
}
