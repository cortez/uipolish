"use client";

import { Avatar } from "@/components/ui/avatar/avatar";
import { MenuItem, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@/components/ui/dropdown-menu/dropdown-menu";
import { Sidebar, SidebarAccount, SidebarSwitcher, type SidebarItem } from "@/components/ui/sidebar/sidebar";
import { PRODUCT_NAME } from "@/lib/product";
import type { Screen } from "./console-context";
import { AgentsGlyph, ApprovalsGlyph, KnowledgeGlyph, ProductMark, RunsGlyph, SettingsGlyph, UsageGlyph } from "./marks";

/* The console's sidebar, as the kit's Sidebar lays it out: the workspace
   switcher, the six screens (Approvals counts what's waiting) and the
   account menu. It only renders; ConsoleShell wires it to the router. */

export type ConsoleSidebarProps = {
  user: { name: string; email: string };
  workspaces: { id: string; name: string }[];
  workspaceId: string;
  onWorkspaceChange: (id: string) => void;
  value: Screen;
  onSelect: (screen: Screen) => void;
  /** Approvals waiting: the badge on Approvals. */
  pendingApprovals: number;
  onSignOut: () => void;
};

export const SCREENS: { id: Screen; label: string }[] = [
  { id: "runs", label: "Runs" },
  { id: "approvals", label: "Approvals" },
  { id: "knowledge", label: "Knowledge" },
  { id: "agents", label: "Agents" },
  { id: "usage", label: "Usage" },
  { id: "settings", label: "Settings" },
];

const ICONS: Record<Screen, React.ReactNode> = {
  runs: <RunsGlyph />,
  approvals: <ApprovalsGlyph />,
  knowledge: <KnowledgeGlyph />,
  agents: <AgentsGlyph />,
  usage: <UsageGlyph />,
  settings: <SettingsGlyph />,
};

export function ConsoleSidebar({ user, workspaces, workspaceId, onWorkspaceChange, value, onSelect, pendingApprovals, onSignOut }: ConsoleSidebarProps) {
  const workspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];
  const items: SidebarItem[] = SCREENS.map((s) => ({ ...s, icon: ICONS[s.id], ...(s.id === "approvals" && { badge: pendingApprovals }) }));
  return (
    <Sidebar
      aria-label={workspace?.name ?? PRODUCT_NAME}
      value={value}
      onValueChange={(id) => onSelect(id as Screen)}
      header={
        <SidebarSwitcher mark={<ProductMark />} name={workspace?.name ?? PRODUCT_NAME}>
          <MenuRadioGroup label="Workspaces" value={workspaceId} onValueChange={onWorkspaceChange}>
            {workspaces.map((w) => (
              <MenuRadioItem key={w.id} value={w.id}>
                {w.name}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuItem onSelect={() => onSelect("settings")}>Workspace settings</MenuItem>
        </SidebarSwitcher>
      }
      items={items}
      footer={
        <SidebarAccount avatar={<Avatar name={user.name} size={24} decorative />} name={user.name} detail={user.email}>
          <MenuItem onSelect={() => onSelect("usage")}>Usage</MenuItem>
          <MenuItem onSelect={() => onSelect("settings")}>Settings</MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={onSignOut}>Sign out</MenuItem>
        </SidebarAccount>
      }
    />
  );
}
