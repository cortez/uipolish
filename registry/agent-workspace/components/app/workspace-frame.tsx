"use client";

import { useState, type ReactNode } from "react";
import { CommandPalette, type Command } from "@/components/ui/command-palette/command-palette";
import { Dialog } from "@/components/ui/dialog/dialog";
import { Icon } from "@/components/ui/icons/icons";
import { Kbd } from "@/components/ui/kbd/kbd";
import { SidebarProvider } from "@/components/ui/sidebar/sidebar";
import { useWorkspace } from "./workspace-context";
import { WorkspaceSidebar } from "./workspace-sidebar";
import styles from "./workspace.module.css";

/* The frame around everything: the sidebar on the canvas, the session on
   the surface one step up, the search palette and the shortcuts. The app
   (WorkspaceShell) and the docs demo both render it. */

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["mod", "K"], label: "Search sessions" },
  { keys: ["mod", "B"], label: "Show or hide the sidebar" },
  { keys: ["mod", "."], label: "Show or hide the changes panel" },
  { keys: ["mod", "R"], label: "Start the dev server" },
  { keys: ["Enter"], label: "Send a prompt" },
  { keys: ["shift", "Enter"], label: "New line in a prompt" },
  { keys: ["Esc"], label: "Stop the agent while it works" },
];

type WorkspaceFrameProps = {
  children: ReactNode;
  /** Handle ⌘K, ⌘B and the panes' shortcuts. Off where the page around owns them (the docs demo). */
  shortcuts?: boolean;
};

export function WorkspaceFrame({ children, shortcuts = true }: WorkspaceFrameProps) {
  const { sessions, go } = useWorkspace();
  const [searching, setSearching] = useState(false);
  const [help, setHelp] = useState(false);

  const commands: Command[] = [
    { id: "new", label: "New session", group: "Actions", icon: <Icon name="compose" />, onSelect: () => go({ session: null, draft: { text: "" } }) },
    ...sessions.map((s) => ({
      id: s.id,
      label: s.title,
      group: "Sessions",
      icon: <Icon name={s.pinned ? "list" : "clock"} />,
      onSelect: () => go({ session: s.id }),
    })),
  ];

  return (
    <SidebarProvider shortcut={shortcuts ? "b" : false}>
      <div className={styles.shell}>
        <WorkspaceSidebar onSearch={() => setSearching(true)} onShortcuts={() => setHelp(true)} />
        <main className={styles.main}>{children}</main>
      </div>
      <CommandPalette
        open={searching}
        onOpenChange={setSearching}
        commands={commands}
        hotkey={shortcuts ? "k" : false}
        placeholder="Search sessions…"
        label="Search sessions"
        emptyHint="No sessions match. Try fewer words."
      />
      <Dialog open={help} onOpenChange={setHelp} title="Keyboard shortcuts" size="sm">
        <dl className={styles.shortcuts}>
          {SHORTCUTS.map((s) => (
            <div key={s.label} className={styles.shortcut}>
              <dt>{s.label}</dt>
              <dd>
                <Kbd keys={s.keys} size="sm" />
              </dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </SidebarProvider>
  );
}
