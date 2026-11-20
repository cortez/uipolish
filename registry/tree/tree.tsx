"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useDelayedBusy } from "../button/use-delayed-busy";
import { Icon } from "../icons/icons";
import styles from "./tree.module.css";

export type TreeItem = {
  /** Unique in the whole tree, not only among its siblings. */
  id: string;
  label: string;
  /** A 16px glyph before the label; decorative. */
  icon?: ReactNode;
  /** A short value at the end of the row: a change count, a diff mark. */
  meta?: ReactNode;
  /** What `meta` says, for screen readers, when it isn't plain text ("Added"). */
  metaLabel?: string;
  /** Present, even empty, makes the item a folder. */
  children?: TreeItem[];
  /** A folder whose children load the first time it opens (see `loadChildren`). */
  lazy?: boolean;
  disabled?: boolean;
};

type TreeProps = Omit<ComponentProps<"ul">, "children" | "defaultValue" | "onChange"> & {
  items: TreeItem[];
  /** The selected item's id. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Ids of the open folders. */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** Folders can be selected too: a press selects one and toggles it; its chevron only toggles. */
  selectFolders?: boolean;
  /** Fetches a `lazy` folder's children the first time it opens. Reject to show a retry row. */
  loadChildren?: (item: TreeItem) => Promise<TreeItem[]>;
  /** A faint line down each open folder. */
  guides?: boolean;
};

/** Where a lazy folder's children are: asked for, asked for again after a failure, or failed. */
type Loading = "loading" | "retrying" | "failed";

type Row =
  | { kind: "item"; key: string; item: TreeItem; parent: TreeItem | null; folder: boolean }
  | { kind: "retry"; key: string; item: TreeItem; parent: TreeItem; folder: false };

type TreeContextValue = {
  value: string | null;
  open: Set<string>;
  tabStop: string | null;
  loaded: Record<string, TreeItem[]>;
  loading: Record<string, Loading>;
  selectFolders: boolean;
  guides: boolean;
  register: (key: string, node: HTMLLIElement | null) => void;
  setActive: (key: string) => void;
  press: (item: TreeItem) => void;
  toggle: (item: TreeItem) => void;
  retry: (item: TreeItem) => void;
};

const TreeContext = createContext<TreeContextValue | null>(null);

const retryKey = (id: string) => `${id}\u0000retry`;
const isFolder = (item: TreeItem) => item.children !== undefined || item.lazy === true;

/** How long a pause ends a run of typed letters. */
const TYPEAHEAD_PAUSE = 500;

/** A tree of nested items: one selection, folders that fold, the keyboard of the ARIA tree pattern. */
export function Tree({
  items,
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  expanded: controlledExpanded,
  defaultExpanded,
  onExpandedChange,
  selectFolders = false,
  loadChildren,
  guides = true,
  className,
  onKeyDown,
  ...props
}: TreeProps) {
  const [ownValue, setOwnValue] = useState<string | null>(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : ownValue;
  const [ownExpanded, setOwnExpanded] = useState<string[]>(defaultExpanded ?? []);
  const expanded = controlledExpanded ?? ownExpanded;
  const open = useMemo(() => new Set(expanded), [expanded]);

  const [loaded, setLoaded] = useState<Record<string, TreeItem[]>>({});
  const [loading, setLoading] = useState<Record<string, Loading>>({});
  /** The row the keyboard is on: the tree's one tab stop. */
  const [active, setActive] = useState<string | null>(null);

  // The rows in sight, top to bottom: what the arrow keys walk.
  const rows = useMemo(() => {
    const out: Row[] = [];
    const walk = (list: TreeItem[], parent: TreeItem | null) => {
      for (const item of list) {
        const folder = isFolder(item);
        out.push({ kind: "item", key: item.id, item, parent, folder });
        if (!folder || !open.has(item.id)) continue;
        const kids = item.children ?? loaded[item.id];
        if (kids) walk(kids, item);
        else if (loading[item.id] === "failed") out.push({ kind: "retry", key: retryKey(item.id), item, parent: item, folder: false });
      }
    };
    walk(items, null);
    return out;
  }, [items, open, loaded, loading]);

  const has = (key: string | null) => key !== null && rows.some((r) => r.key === key);
  const tabStop = has(active) ? active : has(value) ? value : (rows[0]?.key ?? null);

  const nodes = useRef(new Map<string, HTMLLIElement>());
  const register = useCallback((key: string, node: HTMLLIElement | null) => {
    if (node) nodes.current.set(key, node);
    else nodes.current.delete(key);
  }, []);
  const focus = (key: string) => {
    setActive(key);
    nodes.current.get(key)?.focus();
  };

  const setExpanded = (next: string[]) => {
    if (controlledExpanded === undefined) setOwnExpanded(next);
    onExpandedChange?.(next);
  };

  const requested = useRef(new Set<string>());
  const load = (item: TreeItem, again = false) => {
    if (!loadChildren || item.children !== undefined || loaded[item.id] || requested.current.has(item.id)) return;
    requested.current.add(item.id);
    setLoading((s) => ({ ...s, [item.id]: again ? "retrying" : "loading" }));
    loadChildren(item).then(
      (kids) => {
        requested.current.delete(item.id);
        setLoaded((s) => ({ ...s, [item.id]: kids }));
        setLoading((s) => {
          const next = { ...s };
          delete next[item.id];
          return next;
        });
      },
      () => {
        requested.current.delete(item.id);
        setLoading((s) => ({ ...s, [item.id]: "failed" }));
      },
    );
  };

  /** Opens every folder in `list` that isn't open. */
  const expandAll = (list: TreeItem[]) => {
    const closed = list.filter((i) => isFolder(i) && !i.disabled && !open.has(i.id));
    if (closed.length === 0) return;
    for (const item of closed) if (item.lazy && loading[item.id] !== "failed") load(item);
    setExpanded([...expanded, ...closed.map((i) => i.id)]);
  };

  const toggle = (item: TreeItem) => {
    if (item.disabled) return;
    if (open.has(item.id)) setExpanded(expanded.filter((id) => id !== item.id));
    else expandAll([item]);
  };

  const select = (item: TreeItem) => {
    if (item.id === value) return;
    if (controlledValue === undefined) setOwnValue(item.id);
    onValueChange?.(item.id);
  };

  /** A click, Enter or Space on a row. */
  const press = (item: TreeItem) => {
    if (item.disabled) return;
    const folder = isFolder(item);
    if (folder) toggle(item);
    if (!folder || selectFolders) select(item);
  };

  const retry = (item: TreeItem) => {
    // The retry row is about to go; the keyboard waits on its folder.
    if (document.activeElement === nodes.current.get(retryKey(item.id))) focus(item.id);
    load(item, true);
  };

  const typed = useRef({ text: "", at: 0 });

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const at = rows.findIndex((r) => nodes.current.get(r.key) === event.target);
    const row = rows[at];
    if (!row) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const key = rtl && event.key === "ArrowLeft" ? "ArrowRight" : rtl && event.key === "ArrowRight" ? "ArrowLeft" : event.key;
    const isOpen = row.folder && open.has(row.item.id);
    let handled = true;

    if (key === "ArrowDown") {
      if (rows[at + 1]) focus(rows[at + 1].key);
    } else if (key === "ArrowUp") {
      if (rows[at - 1]) focus(rows[at - 1].key);
    } else if (key === "Home") {
      focus(rows[0].key);
    } else if (key === "End") {
      focus(rows[rows.length - 1].key);
    } else if (key === "ArrowRight") {
      // A closed folder opens; an open one hands the keyboard to its first row.
      if (row.folder && !isOpen) toggle(row.item);
      else if (isOpen && rows[at + 1]?.parent === row.item) focus(rows[at + 1].key);
    } else if (key === "ArrowLeft") {
      // An open folder closes; anything else steps out to its folder.
      if (isOpen) toggle(row.item);
      else if (row.parent) focus(row.parent.id);
    } else if (key === "Enter" || key === " ") {
      if (row.kind === "retry") retry(row.item);
      else press(row.item);
    } else if (key === "*") {
      // Every folder beside this row opens.
      if (row.kind === "item") expandAll(row.parent ? (row.parent.children ?? loaded[row.parent.id] ?? []) : items);
    } else if (key.length === 1) {
      // Letters typed in a run jump to the next row whose label starts with them.
      const now = performance.now();
      const run = now - typed.current.at < TYPEAHEAD_PAUSE ? typed.current.text + key.toLowerCase() : key.toLowerCase();
      typed.current = { text: run, at: now };
      // One letter pressed again and again cycles through its rows.
      const repeat = [...run].every((c) => c === run[0]);
      const query = repeat ? run[0] : run;
      const from = repeat || run.length === 1 ? at + 1 : at;
      for (let i = 0; i < rows.length; i++) {
        const next = rows[(from + i) % rows.length];
        if (next.kind === "item" && next.item.label.toLowerCase().startsWith(query)) {
          focus(next.key);
          break;
        }
      }
    } else {
      handled = false;
    }
    if (handled) event.preventDefault();
  }

  // Nothing folds or fades until the first paint: a tree that starts open is simply open.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setReady(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const context: TreeContextValue = { value, open, tabStop, loaded, loading, selectFolders, guides, register, setActive, press, toggle, retry };

  return (
    <TreeContext value={context}>
      <ul
        role="tree"
        className={className ? `${styles.tree} ${className}` : styles.tree}
        data-ready={ready || undefined}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <Level items={items} level={1} />
      </ul>
    </TreeContext>
  );
}

function Level({ items, level }: { items: TreeItem[]; level: number }) {
  return items.map((item, index) => <Node key={item.id} item={item} level={level} index={index} count={items.length} />);
}

function Node({ item, level, index, count }: { item: TreeItem; level: number; index: number; count: number }) {
  const tree = use(TreeContext)!;
  const folder = isFolder(item);
  const open = folder && tree.open.has(item.id);
  const kids = item.children ?? tree.loaded[item.id];
  const state = tree.loading[item.id];
  const selectable = !folder || tree.selectFolders;

  // Nothing for the first 300ms of a load, then a quiet row that stays long
  // enough to be read. A retry shows it at once: the press needs an answer.
  const waiting = useDelayedBusy(open && state === "loading");
  const note = !open ? null : state === "failed" ? "failed" : waiting || state === "retrying" ? "loading" : null;
  // The row keeps its words while it folds away.
  const [lastNote, setLastNote] = useState(note);
  if (note && note !== lastNote) setLastNote(note);
  const showKids = open && kids !== undefined && note === null;
  // Children mount the first time their folder opens, and stay to fold shut.
  const [seen, setSeen] = useState(showKids);
  if (showKids && !seen) setSeen(true);

  const meta = item.meta != null && item.meta !== false && item.meta !== "";
  const metaText = item.metaLabel ?? (typeof item.meta === "string" || typeof item.meta === "number" ? String(item.meta) : null);
  const style = { "--tree-level": level - 1 } as CSSProperties;

  function handleClick(event: MouseEvent) {
    // With folders selectable, the chevron is the way to fold one without selecting it.
    if (tree.selectFolders && folder && (event.target as Element).closest("[data-chevron]")) tree.toggle(item);
    else tree.press(item);
  }

  return (
    <li
      ref={(node) => tree.register(item.id, node)}
      role="treeitem"
      className={styles.item}
      style={style}
      aria-label={metaText ? `${item.label}, ${metaText}` : item.label}
      aria-level={level}
      aria-posinset={index + 1}
      aria-setsize={count}
      aria-expanded={folder ? open : undefined}
      aria-selected={selectable ? tree.value === item.id : undefined}
      aria-disabled={item.disabled || undefined}
      aria-busy={state === "loading" || state === "retrying" || undefined}
      tabIndex={tree.tabStop === item.id ? 0 : -1}
      onFocus={(event) => {
        if (event.target === event.currentTarget) tree.setActive(item.id);
      }}
    >
      <div className={styles.row} data-selected={tree.value === item.id || undefined} data-disabled={item.disabled || undefined} onClick={handleClick}>
        <span className={styles.twist} data-chevron="">
          {/* Before a label it points right and opens downward: a quarter turn, not a morph. */}
          {folder && <Icon name="chevron-right" className={styles.chevron} data-turn={open ? "open" : ""} />}
        </span>
        {item.icon != null && <span className={styles.icon}>{item.icon}</span>}
        <span className={styles.label} onPointerEnter={titleWhenCut}>
          {item.label}
        </span>
        {meta && <span className={styles.meta}>{item.meta}</span>}
      </div>
      {folder && (
        <>
          <Fold open={note !== null} swap={showKids}>
            <ul role="group" className={styles.group} data-guides={tree.guides || undefined} style={style}>
              {lastNote === "failed" ? (
                <Retry key="failed" item={item} level={level + 1} focusable={note === "failed"} />
              ) : (
                <li key="loading" className={styles.note} aria-hidden="true">
                  <span className={styles.sweep}>Loading…</span>
                </li>
              )}
            </ul>
          </Fold>
          <Fold open={showKids}>
            {seen && kids && (
              <ul role="group" className={styles.group} data-guides={tree.guides || undefined} style={style}>
                {kids.length === 0 ? (
                  <li role="none" className={styles.note}>
                    Empty
                  </li>
                ) : (
                  <Level items={kids} level={level + 1} />
                )}
              </ul>
            )}
          </Fold>
        </>
      )}
    </li>
  );
}

/** The row a failed load leaves in the folder: says what happened, and a press tries again. */
function Retry({ item, level, focusable }: { item: TreeItem; level: number; focusable: boolean }) {
  const tree = use(TreeContext)!;
  const key = retryKey(item.id);
  return (
    <li
      ref={(node) => tree.register(key, focusable ? node : null)}
      role="treeitem"
      className={styles.item}
      style={{ "--tree-level": level - 1 } as CSSProperties}
      aria-label={`Couldn’t load ${item.label}. Try again`}
      aria-level={level}
      aria-posinset={1}
      aria-setsize={1}
      aria-selected={false}
      tabIndex={focusable && tree.tabStop === key ? 0 : -1}
      onFocus={() => tree.setActive(key)}
    >
      <div className={styles.row} data-retry="" onClick={() => tree.retry(item)}>
        <span className={styles.twist} />
        <span className={styles.icon} data-tone="danger">
          <Icon name="alert" />
        </span>
        <span className={styles.label}>
          Couldn’t load. <span className={styles.again}>Try again</span>
        </span>
      </div>
    </li>
  );
}

/** Opens and closes on height: grid rows 0fr → 1fr, its content inert while closed. */
function Fold({ open, swap = false, children }: { open: boolean; swap?: boolean; children: ReactNode }) {
  return (
    <div className={styles.fold} data-open={open || undefined} data-swap={swap || undefined} inert={!open}>
      <div className={styles.foldInner}>{children}</div>
    </div>
  );
}

/** A cut label gets its full text as a tooltip, only while it is cut. */
function titleWhenCut(event: { currentTarget: HTMLElement }) {
  const el = event.currentTarget;
  if (el.scrollWidth > el.clientWidth + 1) el.title = el.textContent ?? "";
  else el.removeAttribute("title");
}
