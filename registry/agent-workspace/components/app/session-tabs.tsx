"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/icons/icons";
import { toast } from "@/components/ui/toast/toast";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useWorkspace } from "./workspace-context";
import text from "@/components/ui/text/text.module.css";
import styles from "./workspace.module.css";

/* The open sessions, as tabs along the top: each title cut with a fade
   when it's long, Rename and Close on the hovered or current tab, and New
   session at the end. A new session's draft is a tab of its own until it
   starts. The strip scrolls sideways when it's full; the current tab
   scrolls into view. */

export function SessionTabs() {
  const { api, route, go, tabs, closeTab, sessions, refreshSessions } = useWorkspace();
  const stripRef = useRef<HTMLUListElement>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const titleOf = (id: string) => sessions.find((s) => s.id === id)?.title ?? "Session";
  const working = (id: string) => sessions.find((s) => s.id === id)?.working ?? false;
  const current = route.session;

  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>("[data-current]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current, tabs.length]);

  async function rename(id: string, title: string) {
    setRenaming(null);
    if (!title.trim() || title.trim() === titleOf(id)) return;
    try {
      await api.rename(id, title);
      refreshSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn’t rename that session.");
    }
  }

  return (
    <nav className={styles.tabsNav} aria-label="Open sessions">
      <ul ref={stripRef} className={styles.tabs}>
        {tabs.map((id) => (
          <li key={id} className={styles.tab} data-current={id === current || undefined} data-renaming={renaming === id || undefined}>
            {renaming === id ? (
              <RenameField initial={titleOf(id)} onDone={(title) => (title === null ? setRenaming(null) : rename(id, title))} />
            ) : (
              <button
                type="button"
                className={styles.tabMain}
                aria-current={id === current ? "page" : undefined}
                title={titleOf(id)}
                onClick={() => go({ session: id })}
                onDoubleClick={() => setRenaming(id)}
              >
                {working(id) && <span className={styles.working} role="img" aria-label="Agent working" />}
                <span className={`${styles.tabTitle} ${text.truncate}`} dir="auto">
                  {titleOf(id)}
                </span>
              </button>
            )}
            {renaming !== id && (
              <span className={styles.tabActions}>
                <button type="button" className={styles.tabAction} aria-label={`Rename ${titleOf(id)}`} onClick={() => setRenaming(id)}>
                  <Icon name="pencil" />
                </button>
                <button type="button" className={styles.tabAction} aria-label={`Close ${titleOf(id)}`} onClick={() => closeTab(id)}>
                  <Icon name="close" />
                </button>
              </span>
            )}
          </li>
        ))}
        {current === null && (
          <li className={styles.tab} data-current>
            <span className={styles.tabMain} aria-current="page">
              <span className={`${styles.tabTitle} ${text.truncate}`}>New session</span>
            </span>
          </li>
        )}
      </ul>
      <Tooltip content="New session" describe={false}>
        <button type="button" className={styles.tabNew} aria-label="New session" onClick={() => go({ session: null, draft: { text: "" } })}>
          <Icon name="plus" />
        </button>
      </Tooltip>
    </nav>
  );
}

/** The tab's title as a field: Enter or leaving it saves, Escape puts it back. */
function RenameField({ initial, onDone }: { initial: string; onDone: (title: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  function finish(value: string | null) {
    if (done.current) return;
    done.current = true;
    onDone(value);
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") finish(e.currentTarget.value);
    else if (e.key === "Escape") finish(null);
  }
  return (
    <input
      ref={ref}
      className={styles.tabInput}
      defaultValue={initial}
      aria-label="Session name"
      maxLength={120}
      onKeyDown={onKeyDown}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  );
}
