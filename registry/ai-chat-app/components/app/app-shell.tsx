"use client";

import { createContext, use, useCallback, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CommandPalette, type Command } from "@/components/ui/command-palette/command-palette";
import { SidebarProvider } from "@/components/ui/sidebar/sidebar";
import { toast } from "@/components/ui/toast/toast";
import {
  deleteConversation,
  pinConversation,
  renameConversation,
  restoreConversation,
  signOut,
  switchWorkspace,
} from "@/app/(app)/actions";
import type { ChatConversationSummary } from "@/lib/ai/events";
import { AppSidebar } from "./app-sidebar";
import styles from "./app.module.css";

/* The signed-in frame around every page: the sidebar, the search palette
   and the chat list they share. The list comes from the server once, then
   lives here, so a reply streaming into a new chat can add it without a
   reload. Changes go to the server actions in app/(app)/actions.ts. */

type Shell = {
  conversations: ChatConversationSummary[];
  /** Add a chat, or move it to the top with its new title and time. */
  upsert: (conversation: ChatConversationSummary) => void;
  workspaceId: string;
  /** Changes each time New chat is pressed, so the new-chat page starts clean. */
  newChatKey: number;
};

const ShellContext = createContext<Shell | null>(null);

export function useShell() {
  const shell = use(ShellContext);
  if (!shell) throw new Error("useShell must be inside <AppShell>.");
  return shell;
}

type AppShellProps = {
  user: { name: string; email: string };
  workspaces: { id: string; name: string }[];
  workspaceId: string;
  conversations: ChatConversationSummary[];
  children: ReactNode;
};

const byActivity = (a: ChatConversationSummary, b: ChatConversationSummary) => b.updatedAt - a.updatedAt;

export function AppShell({ user, workspaces, workspaceId, conversations: initial, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [conversations, setConversations] = useState(initial);
  const [newChatKey, setNewChatKey] = useState(0);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLElement>(null);

  // A fresh list from the server (after switching workspace) replaces this one.
  const [server, setServer] = useState(initial);
  if (server !== initial) {
    setServer(initial);
    setConversations(initial);
  }

  const upsert = useCallback((c: ChatConversationSummary) => {
    setConversations((list) => [c, ...list.filter((x) => x.id !== c.id)].sort(byActivity));
  }, []);

  const chatId = /^\/chat\/([^/]+)/.exec(pathname)?.[1];
  const value = pathname === "/chat" ? "new" : chatId;

  function startNewChat() {
    setNewChatKey((k) => k + 1);
    router.push("/chat");
  }

  async function rename(id: string, title: string) {
    const result = await renameConversation(id, title);
    if (!result.ok) throw new Error(result.error);
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, title: result.title } : c)));
  }

  async function pin(id: string, pinned: boolean) {
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, pinned } : c)));
    const result = await pinConversation(id, pinned).catch(() => ({ ok: false }) as const);
    if (!result.ok) {
      setConversations((list) => list.map((c) => (c.id === id ? { ...c, pinned: !pinned } : c)));
      toast.error(pinned ? "Couldn’t pin this chat" : "Couldn’t unpin this chat", { action: { label: "Retry", onClick: () => pin(id, pinned) } });
    }
  }

  async function remove(id: string) {
    const chat = conversations.find((c) => c.id === id);
    if (!chat) return;
    setConversations((list) => list.filter((c) => c.id !== id));
    if (id === chatId) startNewChat();
    const result = await deleteConversation(id).catch(() => ({ ok: false }) as const);
    if (!result.ok) {
      upsert(chat);
      toast.error("Couldn’t delete this chat", { description: chat.title, action: { label: "Retry", onClick: () => remove(id) } });
      return;
    }
    toast("Chat deleted", {
      description: chat.title,
      action: {
        label: "Undo",
        onClick: async () => {
          const restored = await restoreConversation(id).catch(() => ({ ok: false }) as const);
          if (restored.ok) upsert(chat);
          else toast.error("Couldn’t restore this chat");
        },
      },
    });
  }

  function changeWorkspace(id: string) {
    startTransition(async () => {
      await switchWorkspace(id);
      router.push("/chat");
      router.refresh();
    });
  }

  const commands: Command[] = [
    { id: "new", label: "New chat", group: "Actions", onSelect: startNewChat },
    { id: "settings", label: "Settings", group: "Actions", keywords: ["billing", "members", "model"], onSelect: () => router.push("/settings") },
    ...conversations.map((c) => ({ id: `chat-${c.id}`, label: c.title, group: "Chats", onSelect: () => router.push(`/chat/${c.id}`) })),
  ];

  const shell = useMemo(() => ({ conversations, upsert, workspaceId, newChatKey }), [conversations, upsert, workspaceId, newChatKey]);

  return (
    <ShellContext value={shell}>
      <SidebarProvider>
        <div className={styles.shell}>
          <AppSidebar
            user={user}
            workspaces={workspaces}
            workspaceId={workspaceId}
            onWorkspaceChange={changeWorkspace}
            conversations={conversations}
            value={value}
            onSelect={(id) => router.push(`/chat/${id}`)}
            onNew={startNewChat}
            onSearch={() => {
              searchRef.current = document.activeElement as HTMLElement | null;
              setSearching(true);
            }}
            onRename={rename}
            onPinnedChange={pin}
            onDelete={remove}
            onSettings={() => router.push("/settings")}
            onSignOut={() => startTransition(() => signOut())}
          />
          <main className={styles.main}>{children}</main>
        </div>
        <CommandPalette
          open={searching}
          onOpenChange={setSearching}
          commands={commands}
          label="Search chats"
          placeholder="Search chats…"
          emptyHint="No chats match. Try fewer words."
          triggerRef={searchRef}
        />
      </SidebarProvider>
    </ShellContext>
  );
}
