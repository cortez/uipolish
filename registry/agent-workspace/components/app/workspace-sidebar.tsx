"use client";

import { useEffect, useMemo, useState } from "react";
import { AvatarGroup } from "@/components/ui/avatar/avatar";
import { Badge } from "@/components/ui/badge/badge";
import { Button } from "@/components/ui/button/button";
import { DropdownMenu, MenuItem, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@/components/ui/dropdown-menu/dropdown-menu";
import { Icon } from "@/components/ui/icons/icons";
import { Sidebar, SidebarSwitcher, useSidebar, type SidebarRecentItem, type SidebarSectionItem } from "@/components/ui/sidebar/sidebar";
import { toast } from "@/components/ui/toast/toast";
import { useTheme, type Theme } from "@/components/ui/theme-toggle/theme-toggle";
import { HELP_URL, PRODUCT_NAME } from "@/lib/coding/config";
import { relativeTime, relativeWords } from "@/lib/coding/format";
import type { SessionSummary } from "@/lib/coding/session";
import { useWorkspace } from "./workspace-context";
import { PresenceAvatar, presenceWord, WorkspaceMark } from "./workspace-marks";
import styles from "./workspace.module.css";

/* The workspace's sidebar, as the kit's Sidebar lays it out: the switcher,
   Home, New session and Search, pinned and recent sessions (shared ones
   with their faces, the rest with how long ago they moved), the team with
   their presence, and a bottom bar with the plan, Help and Settings. */

type WorkspaceSidebarProps = {
  /** Opens the search palette. */
  onSearch: () => void;
  /** Opens the keyboard shortcuts. */
  onShortcuts: () => void;
};

/** Re-renders every minute, so "4m" becomes "5m". */
function useMinute() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function WorkspaceSidebar({ onSearch, onShortcuts }: WorkspaceSidebarProps) {
  const { api, route, go, user, workspace, workspaces, switchWorkspace, people, sessions, refreshSessions, closeTab } = useWorkspace();
  const now = useMinute();
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const recent: SidebarRecentItem[] = sessions.map((s: SessionSummary) => {
    const others = [s.ownerId, ...s.sharedWith].filter((id) => id !== user.id).map((id) => byId.get(id)).filter((p) => p !== undefined);
    return {
      id: s.id,
      title: s.title,
      pinned: s.pinned,
      meta: s.working ? (
        <span className={styles.working} role="img" aria-label="Agent working" />
      ) : others.length > 0 ? (
        <AvatarGroup className={styles.faces} people={others.map((p) => ({ name: p.name }))} size={20} max={3} label={`Shared with ${others.map((p) => p.name).join(", ")}`} />
      ) : (
        <time dateTime={new Date(s.updatedAt).toISOString()} title={relativeWords(s.updatedAt, now)}>
          {relativeTime(s.updatedAt, now)}
        </time>
      ),
    };
  });

  const team: SidebarSectionItem[] = people
    .filter((p) => p.id !== user.id)
    .sort((a, b) => ["online", "away", "offline"].indexOf(a.presence) - ["online", "away", "offline"].indexOf(b.presence))
    .map((p) => ({ id: `person:${p.id}`, label: p.name, icon: <PresenceAvatar person={p} />, detail: p.presence === "online" ? undefined : presenceWord(p.presence) }));

  async function act(work: Promise<unknown>, failed: string) {
    try {
      await work;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failed);
    } finally {
      refreshSessions();
    }
  }

  return (
    <Sidebar
      aria-label={workspace.name}
      value={route.session ?? "home"}
      onValueChange={(id) => {
        if (id === "home") go({ session: null });
        else if (id === "new") go({ session: null, draft: { text: "" } });
        else if (id === "search") onSearch();
        else if (id.startsWith("person:")) go({ session: null, draft: { mentions: [id.slice(7)] } });
        else go({ session: id });
      }}
      header={
        <SidebarSwitcher mark={<WorkspaceMark />} name={workspace.name ?? PRODUCT_NAME} detail={workspace.repo}>
          <MenuRadioGroup label="Workspaces" value={workspace.id} onValueChange={switchWorkspace}>
            {workspaces.map((w) => (
              <MenuRadioItem key={w.id} value={w.id}>
                {w.name}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </SidebarSwitcher>
      }
      items={[
        { id: "home", label: "Home", icon: <Icon name="home" /> },
        { id: "new", label: "New session", icon: <Icon name="compose" /> },
        { id: "search", label: "Search", icon: <Icon name="search" />, shortcut: "K" },
      ]}
      sections={team.length ? [{ id: "team", label: "Team", collapsible: true, items: team }] : []}
      recent={{
        label: "Sessions",
        items: recent,
        empty: (
          <>
            <p>No sessions yet</p>
            <p>Sessions you start or that teammates share show up here.</p>
          </>
        ),
        onRename: (id, title) => api.rename(id, title).finally(refreshSessions),
        onPinnedChange: (id, pinned) => act(api.pin(id, pinned), "Couldn’t pin that session."),
        onDelete: (id) => {
          closeTab(id);
          void act(api.remove(id), "Couldn’t delete that session.");
        },
      }}
      footer={<SidebarFooter plan={workspace.plan} onShortcuts={onShortcuts} />}
    />
  );
}

/** The bottom bar: the plan, Help and Settings. Folded to the rail, Settings alone. */
function SidebarFooter({ plan, onShortcuts }: { plan: string; onShortcuts: () => void }) {
  const { collapsed, mobile } = useSidebar();
  const { signOut } = useWorkspace();
  const { theme, setTheme } = useTheme();

  const settings = (size: "sm" | "md") => (
    <DropdownMenu
      side={collapsed && !mobile ? "right" : "top"}
      align="end"
      trigger={
        size === "sm" ? (
          <Button variant="ghost" size="sm" aria-label="Settings">
            <Icon name="settings" />
          </Button>
        ) : (
          <Button variant="ghost" aria-label="Settings">
            <Icon name="settings" />
          </Button>
        )
      }
    >
      <MenuRadioGroup label="Theme" value={theme ?? "system"} onValueChange={(t) => setTheme(t as Theme)}>
        <MenuRadioItem value="light">Light</MenuRadioItem>
        <MenuRadioItem value="dark">Dark</MenuRadioItem>
        <MenuRadioItem value="system">System</MenuRadioItem>
      </MenuRadioGroup>
      <MenuSeparator />
      <MenuItem onSelect={signOut}>Sign out</MenuItem>
    </DropdownMenu>
  );

  if (collapsed && !mobile) return <div className={styles.footerRail}>{settings("sm")}</div>;

  return (
    <div className={styles.footer}>
      <Badge tone="neutral" size="sm">
        {plan} plan
      </Badge>
      <span className={styles.footerActions}>
        <DropdownMenu
          side="top"
          align="end"
          trigger={
            <Button variant="ghost" aria-label="Help">
              <Icon name="help" />
            </Button>
          }
        >
          <MenuItem onSelect={onShortcuts}>Keyboard shortcuts</MenuItem>
          <MenuItem onSelect={() => window.open(HELP_URL, "_blank", "noopener")}>Documentation</MenuItem>
        </DropdownMenu>
        {settings("md")}
      </span>
    </div>
  );
}
