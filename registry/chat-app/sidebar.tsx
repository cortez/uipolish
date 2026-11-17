"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { Button } from "../button/button";
import { DropdownMenu, MenuItem, MenuSeparator } from "../dropdown-menu/dropdown-menu";
import { Icon } from "../icons/icons";
import { SearchField } from "../search-field/search-field";
import type { ChatConversation } from "./chat-app";
import styles from "./chat-app.module.css";

const DAY = 24 * 60 * 60 * 1000;

type Group = { label: string; items: ChatConversation[] };

const time = (value: number | Date) => (typeof value === "number" ? value : value.getTime());

/** Today, Previous 7 days, Older; newest first, empty groups dropped. */
export function groupConversations(conversations: ChatConversation[], now: number): Group[] {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const today = midnight.getTime();
  const groups: Group[] = [
    { label: "Today", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  const sorted = [...conversations].sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
  for (const c of sorted) {
    const t = time(c.updatedAt);
    groups[t >= today ? 0 : t >= today - 7 * DAY ? 1 : 2].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

/** A 16px pencil on the icon grid, for Rename. */
export function PencilGlyph() {
  return (
    <svg className={styles.glyph} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.6 3.15a1.6 1.6 0 0 1 2.25 2.25L6 12.25l-3 .75.75-3Z" />
      <path d="M9.5 4.25 11.75 6.5" />
    </svg>
  );
}

function MoreGlyph() {
  return (
    <svg className={styles.glyph} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8h.01M8 8h.01M12.5 8h.01" strokeWidth="2.25" />
    </svg>
  );
}

type SidebarProps = {
  conversations: ChatConversation[];
  loading: boolean;
  activeId: string | null;
  now: number;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void | Promise<unknown>;
  onDeleteRequest: (conversation: ChatConversation) => void;
  newChatRef?: Ref<HTMLButtonElement>;
  footer?: ReactNode;
  /** In the drawer the drawer's own title names the list. */
  inDrawer?: boolean;
};

export function Sidebar({
  conversations,
  loading,
  activeId,
  now,
  onSelect,
  onNew,
  onRename,
  onDeleteRequest,
  newChatRef,
  footer,
  inDrawer,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const groupId = useId();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? conversations.filter((c) => c.title.toLowerCase().includes(q)) : conversations;
    return groupConversations(matches, now);
  }, [conversations, query, now]);

  let list: ReactNode;
  if (loading) {
    list = (
      <p className={styles.listLoading} role="status">
        Loading chats…
      </p>
    );
  } else if (conversations.length === 0) {
    list = (
      <div className={styles.listEmpty}>
        <p className={styles.listEmptyTitle}>No chats yet</p>
        <p className={styles.listNote}>Conversations you start show up here.</p>
      </div>
    );
  } else if (groups.length === 0) {
    list = (
      <div className={styles.listEmpty}>
        <p className={styles.listEmptyTitle}>No chats match “{query.trim()}”</p>
        <Button variant="ghost" onClick={() => setQuery("")}>
          Clear search
        </Button>
      </div>
    );
  } else {
    list = groups.map((group, g) => (
      <section key={group.label} className={styles.group} aria-labelledby={`${groupId}-${g}`}>
        <h3 id={`${groupId}-${g}`} className={styles.groupLabel}>
          {group.label}
        </h3>
        <ul className={styles.rows}>
          {group.items.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              active={c.id === activeId}
              editing={editing === c.id}
              onSelect={() => onSelect(c.id)}
              onStartRename={() => setEditing(c.id)}
              onEndRename={() => setEditing(null)}
              onRename={(title) => onRename(c.id, title)}
              onDelete={() => onDeleteRequest(c)}
            />
          ))}
        </ul>
      </section>
    ));
  }

  return (
    <div className={styles.sidebarBody} data-in-drawer={inDrawer || undefined}>
      <div className={styles.sidebarTop}>
        <Button ref={newChatRef} variant="secondary" className={styles.newChat} onClick={onNew}>
          <Icon name="plus" />
          New chat
        </Button>
        <SearchField
          label="Search chats"
          placeholder="Search chats"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          disabled={loading || conversations.length === 0}
        />
      </div>
      <nav className={styles.list} aria-label="Chats">
        {list}
      </nav>
      {footer && <div className={styles.sidebarFooter}>{footer}</div>}
    </div>
  );
}

type RowProps = {
  conversation: ChatConversation;
  active: boolean;
  editing: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onEndRename: () => void;
  onRename: (title: string) => void | Promise<unknown>;
  onDelete: () => void;
};

function ConversationRow({
  conversation,
  active,
  editing,
  onSelect,
  onStartRename,
  onEndRename,
  onRename,
  onDelete,
}: RowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const selectRef = useRef<HTMLButtonElement>(null);
  const title = conversation.title || "Untitled chat";

  return (
    <li className={styles.row} data-active={active || undefined} data-menu-open={menuOpen || undefined}>
      {editing ? (
        <RenameField
          initial={title}
          onCommit={onRename}
          onDone={(moveFocus) => {
            onEndRename();
            if (moveFocus) requestAnimationFrame(() => selectRef.current?.focus());
          }}
        />
      ) : (
        <>
          <button
            ref={selectRef}
            type="button"
            className={styles.rowButton}
            aria-current={active ? "page" : undefined}
            onClick={onSelect}
          >
            <span className={styles.rowTitle}>{title}</span>
          </button>
          <DropdownMenu
            align="end"
            open={menuOpen}
            onOpenChange={setMenuOpen}
            trigger={
              <button type="button" className={styles.more} aria-label={`Actions for ${title}`}>
                <MoreGlyph />
              </button>
            }
          >
            <MenuItem icon={<PencilGlyph />} onSelect={onStartRename}>
              Rename
            </MenuItem>
            <MenuSeparator />
            <MenuItem variant="danger" icon={<Icon name="trash" />} onSelect={onDelete}>
              Delete
            </MenuItem>
          </DropdownMenu>
        </>
      )}
    </li>
  );
}

type RenameFieldProps = {
  initial: string;
  onCommit: (title: string) => void | Promise<unknown>;
  /** `moveFocus`: the field had focus, so hand it back to the row. */
  onDone: (moveFocus: boolean) => void;
};

/** The row's title, editable in place. Enter or leaving saves, Escape cancels. */
function RenameField({ initial, onCommit, onDone }: RenameFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  // The menu hands focus back to its trigger as it closes; take it after that.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  async function commit(moveFocus: boolean) {
    if (busy) return;
    const next = value.trim();
    if (!next || next === initial) {
      onDone(moveFocus);
      return;
    }
    const result = onCommit(next);
    if (!(result instanceof Promise)) {
      onDone(moveFocus);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await result;
      onDone(moveFocus);
    } catch (reason) {
      setBusy(false);
      setError(reason instanceof Error && reason.message ? reason.message : "Couldn’t rename this chat. Try again.");
      inputRef.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      commit(true);
    } else if (event.key === "Escape") {
      // Kept here, so a drawer around the list stays open.
      event.preventDefault();
      event.stopPropagation();
      if (!busy) onDone(true);
    }
  }

  return (
    <div className={styles.rename}>
      <input
        ref={inputRef}
        className={busy ? `${styles.renameInput} ${styles.renameBusy}` : styles.renameInput}
        value={value}
        maxLength={80}
        aria-label="Chat name"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-busy={busy || undefined}
        readOnly={busy}
        onChange={(e) => {
          setValue(e.currentTarget.value);
          setError(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (!error) commit(false);
        }}
      />
      {error && (
        <p id={errorId} className={styles.renameError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
