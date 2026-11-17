"use client";

import { Avatar } from "@/components/ui/avatar/avatar";
import { MenuItem, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@/components/ui/dropdown-menu/dropdown-menu";
import { Icon } from "@/components/ui/icons/icons";
import { Sidebar, SidebarAccount, SidebarSwitcher, type SidebarItem } from "@/components/ui/sidebar/sidebar";
import type { ChatConversationSummary } from "@/lib/ai/events";
import { PRODUCT_NAME } from "@/lib/config";
import { ComposeGlyph, ProductMark } from "./glyphs";

/* The app's sidebar, as the kit's Sidebar lays it out: the workspace
   switcher, New chat and Search, the chat history and the account menu.
   It only renders; AppShell wires it to the router and the server. */

export type AppSidebarProps = {
  user: { name: string; email: string };
  workspaces: { id: string; name: string }[];
  workspaceId: string;
  onWorkspaceChange: (id: string) => void;
  /** Newest activity first. */
  conversations: ChatConversationSummary[];
  /** The open chat's id, "new" on a new chat, or nothing (settings). */
  value?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSearch: () => void;
  onRename: (id: string, title: string) => Promise<unknown>;
  onPinnedChange: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  onSettings: () => void;
  onSignOut: () => void;
};

const ITEMS: SidebarItem[] = [
  { id: "new", label: "New chat", icon: <ComposeGlyph /> },
  // ⌘K opens the search palette (AppShell binds it), so the key shows here.
  { id: "search", label: "Search chats", icon: <Icon name="search" />, shortcut: "K" },
];

export function AppSidebar({
  user,
  workspaces,
  workspaceId,
  onWorkspaceChange,
  conversations,
  value,
  onSelect,
  onNew,
  onSearch,
  onRename,
  onPinnedChange,
  onDelete,
  onSettings,
  onSignOut,
}: AppSidebarProps) {
  const workspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];
  return (
    <Sidebar
      aria-label={workspace?.name ?? PRODUCT_NAME}
      value={value}
      onValueChange={(id) => (id === "new" ? onNew() : id === "search" ? onSearch() : onSelect(id))}
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
          <MenuItem onSelect={onSettings}>Workspace settings</MenuItem>
        </SidebarSwitcher>
      }
      items={ITEMS}
      recent={{
        label: "Chats",
        items: conversations.map((c) => ({ id: c.id, title: c.title, pinned: c.pinned })),
        empty: (
          <>
            <p>No chats yet</p>
            <p>Chats you start show up here.</p>
          </>
        ),
        onRename,
        onPinnedChange,
        onDelete,
      }}
      footer={
        <SidebarAccount avatar={<Avatar name={user.name} size={24} decorative />} name={user.name} detail={user.email}>
          <MenuItem onSelect={onSettings}>Settings</MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={onSignOut}>Sign out</MenuItem>
        </SidebarAccount>
      }
    />
  );
}
