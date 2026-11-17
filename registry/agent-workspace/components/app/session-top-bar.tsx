"use client";

import { Button } from "@/components/ui/button/button";
import { DropdownMenu, MenuCheckboxItem, MenuGroup, MenuItem } from "@/components/ui/dropdown-menu/dropdown-menu";
import { Icon } from "@/components/ui/icons/icons";
import { SidebarToggle } from "@/components/ui/sidebar/sidebar";
import { toast } from "@/components/ui/toast/toast";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { relativeWords, titleFrom } from "@/lib/coding/format";
import type { Session } from "@/lib/coding/session";
import { SessionTabs } from "./session-tabs";
import { useWorkspace } from "./workspace-context";
import styles from "./workspace.module.css";

/* The bar over the conversation: the sidebar's toggle, the open sessions
   as tabs, and the session's History, Copy link, Share and the changes
   panel's toggle. */

type SessionTopBarProps = {
  session: Session | null;
  panelOpen: boolean;
  onPanelChange: (open: boolean) => void;
  /** Scroll the thread to a turn. */
  onJump: (turnId: string) => void;
  phone: boolean;
};

export function SessionTopBar({ session, panelOpen, onPanelChange, onJump, phone }: SessionTopBarProps) {
  const { api, user, people, sessionUrl, refreshSessions } = useWorkspace();

  async function copyLink() {
    if (!session) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(sessionUrl(session.id));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn’t copy the link. Copy it from the address bar.");
    }
  }

  async function share(personId: string, on: boolean) {
    if (!session) return;
    const next = on ? [...session.sharedWith, personId] : session.sharedWith.filter((p) => p !== personId);
    try {
      await api.share(session.id, next);
      refreshSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn’t change who this is shared with.");
    }
  }

  const owner = session?.ownerId === user.id;
  const nameOf = (id: string) => (id === user.id ? "You" : (people.find((p) => p.id === id)?.name ?? "A teammate"));
  const teammates = people.filter((p) => p.id !== user.id && p.id !== session?.ownerId);

  return (
    <header className={styles.topbar}>
      <SidebarToggle className={styles.barButton} />
      <SessionTabs />
      {session && (
        <div className={styles.barActions}>
          <DropdownMenu
            align="end"
            trigger={
              <Button variant="ghost" size="sm" className={styles.barButton} aria-label="History">
                <Icon name="clock" />
              </Button>
            }
          >
            <MenuGroup label="Jump to a prompt">
              {session.turns.map((turn) => (
                <MenuItem key={turn.id} onSelect={() => onJump(turn.id)} description={`${nameOf(turn.authorId)} · ${relativeWords(turn.startedAt)}`}>
                  {titleFrom(turn.prompt)}
                </MenuItem>
              ))}
            </MenuGroup>
          </DropdownMenu>
          {!phone && (
            <Tooltip content="Copy link" describe={false}>
              <Button variant="ghost" size="sm" className={styles.barButton} aria-label="Copy link" onClick={copyLink}>
                <Icon name="link" />
              </Button>
            </Tooltip>
          )}
          <DropdownMenu
            align="end"
            trigger={
              <Button variant="ghost" size="sm" className={styles.barButton} aria-label="Share">
                <Icon name="share" />
              </Button>
            }
          >
            <MenuGroup label={owner ? "Shared with" : "Only the owner can change this"}>
              {teammates.map((p) => (
                <MenuCheckboxItem
                  key={p.id}
                  checked={session.sharedWith.includes(p.id)}
                  disabled={!owner}
                  onCheckedChange={(on) => share(p.id, on)}
                  closeOnSelect={false}
                >
                  {p.name}
                </MenuCheckboxItem>
              ))}
            </MenuGroup>
            {phone && <MenuItem onSelect={copyLink}>Copy link</MenuItem>}
          </DropdownMenu>
          {!phone && (
            <Tooltip content={panelOpen ? "Hide changes" : "Show changes"} kbd="⌘." describe={false}>
              <Button
                variant="ghost"
                size="sm"
                className={styles.barButton}
                aria-label={panelOpen ? "Hide changes" : "Show changes"}
                aria-pressed={panelOpen}
                onClick={() => onPanelChange(!panelOpen)}
              >
                <Icon name="panel" />
              </Button>
            </Tooltip>
          )}
        </div>
      )}
    </header>
  );
}
