"use client";

import { useCallback, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar/sidebar";
import { toast } from "@/components/ui/toast/toast";
import { signOut, switchWorkspace } from "@/app/(console)/actions";
import type { ConsoleStatus, ConsoleUser } from "@/lib/service";
import { ConsoleContext, type Route, type Screen } from "./console-context";
import { ConsoleSidebar, SCREENS } from "./console-sidebar";
import { httpApi } from "./http-api";
import { usePoll } from "./use-live";
import styles from "./console.module.css";

/* The signed-in frame around every screen: the sidebar, and the console
   context the screens read. The URL is the route (/runs?run=run_…), the API
   is the server (http-api.ts), and the sidebar's counts refresh every few
   seconds. Switching workspace sets a cookie and reloads the screens. */

type ConsoleShellProps = {
  user: ConsoleUser;
  workspaces: { id: string; name: string }[];
  workspaceId: string;
  status: ConsoleStatus;
  children: ReactNode;
};

export function ConsoleShell({ user, workspaces, workspaceId, status: initial, children }: ConsoleShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState(initial);

  // Fresh counts from the server (after a workspace switch) replace these.
  const [server, setServer] = useState(initial);
  if (server !== initial) {
    setServer(initial);
    setStatus(initial);
  }

  const first = pathname.split("/")[1];
  const screen: Screen = SCREENS.some((s) => s.id === first) ? (first as Screen) : "runs";
  const run = params.get("run");
  const agent = params.get("agent");

  const go = useCallback(
    (to: Route) => {
      const query = new URLSearchParams();
      if (to.run) query.set("run", to.run);
      if (to.agent) query.set("agent", to.agent);
      const search = query.toString();
      router.push(`/${to.screen}${search ? `?${search}` : ""}`, { scroll: false });
    },
    [router],
  );

  const refreshStatus = useCallback(() => {
    httpApi.status().then(setStatus, () => {});
  }, []);
  usePoll(refreshStatus, 4000);

  const workspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];
  const value = useMemo(
    () => ({
      api: httpApi,
      route: { screen, run, agent },
      go,
      user,
      workspace,
      status,
      refreshStatus,
      runUrl: (id: string) => `${window.location.origin}/runs?run=${encodeURIComponent(id)}`,
    }),
    [screen, run, agent, go, user, workspace, status, refreshStatus],
  );

  function changeWorkspace(id: string) {
    startTransition(async () => {
      const result = await switchWorkspace(id).catch(() => ({ ok: false, error: "Couldn’t switch workspace." }) as const);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/${screen}`);
      router.refresh();
    });
  }

  return (
    <ConsoleContext value={value}>
      <SidebarProvider>
        <div className={styles.shell}>
          <ConsoleSidebar
            user={user}
            workspaces={workspaces}
            workspaceId={workspaceId}
            onWorkspaceChange={changeWorkspace}
            value={screen}
            onSelect={(next) => go({ screen: next })}
            pendingApprovals={status.pendingApprovals}
            onSignOut={() => startTransition(() => signOut())}
          />
          {/* Keyed by workspace, so a switch starts each screen fresh. */}
          <main key={workspaceId} className={styles.main}>
            {children}
          </main>
        </div>
      </SidebarProvider>
    </ConsoleContext>
  );
}
