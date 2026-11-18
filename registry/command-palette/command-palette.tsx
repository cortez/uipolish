"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Modal } from "../dialog/dialog";
import { Icon } from "../icons/icons";
import { fuzzyMatch } from "./fuzzy";
import styles from "./command-palette.module.css";

export type Command = {
  /** Unique across all sources; recents are stored by id. */
  id: string;
  label: string;
  /** Group heading. Groups keep the order they first appear in. */
  group?: string;
  /** Extra search words, e.g. "theme". */
  keywords?: string[];
  hint?: string;
  /** Keys shown on the right, e.g. ["⌘", "N"]. Display only: bind them yourself. */
  shortcut?: string[];
  icon?: ReactNode;
  onSelect: () => void;
};

export type CommandSource = {
  id: string;
  heading: string;
  /** Called after typing pauses. Stop work when `signal` aborts. */
  search: (query: string, signal: AbortSignal) => Promise<Command[]>;
  /** Shown if results take longer than 300ms. */
  loadingLabel?: string;
  /** Don't search until the query is this long. Default 1. */
  minLength?: number;
};

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: Command[];
  sources?: CommandSource[];
  /** Recent ids, newest first; pair with `onRecentChange`. */
  recent?: string[];
  onRecentChange?: (ids: string[]) => void;
  maxRecent?: number;
  /** ⌘K / Ctrl+K by default. `false` to bind it yourself. */
  hotkey?: string | false;
  placeholder?: string;
  label?: string;
  emptyHint?: string;
  triggerRef?: RefObject<HTMLElement | null>;
};

type Row = { key: string; command: Command; indices: number[] };
type Group = { key: string; heading: string; rows: Row[] };
type SourceState = { status: "idle" | "loading" | "done" | "error"; query: string; items: Command[]; slow: boolean };

const IDLE: SourceState = { status: "idle", query: "", items: [], slow: false };
const LOADING_DELAY = 300;
const DEBOUNCE = 120;

function score(query: string, command: Command) {
  const label = fuzzyMatch(query, command.label);
  if (label) return label;
  let best: number | null = null;
  for (const word of command.keywords ?? []) {
    const m = fuzzyMatch(query, word);
    if (m && (best === null || m.score > best)) best = m.score;
  }
  return best === null ? null : { score: best * 0.6, indices: [] };
}

export function CommandPalette({
  open,
  onOpenChange,
  commands,
  sources = [],
  recent: recentProp,
  onRecentChange,
  maxRecent = 5,
  hotkey = "k",
  placeholder = "Type a command or search…",
  label = "Command palette",
  emptyHint = "Check the spelling, or try fewer letters.",
  triggerRef,
}: CommandPaletteProps) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  // State, not a ref: the popup mounts in Base UI's portal after `open` turns true.
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportMounted, setViewportMounted] = useState(false);
  const attachViewport = useCallback((el: HTMLDivElement | null) => {
    viewportRef.current = el;
    setViewportMounted(!!el);
  }, []);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollToActive = useRef(false);

  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [localRecent, setLocalRecent] = useState<string[]>([]);
  const [seen, setSeen] = useState<Record<string, Command>>({});
  const [results, setResults] = useState<Record<string, SourceState>>({});
  const recent = recentProp ?? localRecent;

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setActiveKey(null);
      setResults({});
    }
  }

  useEffect(() => {
    if (!hotkey) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== hotkey) return;
      event.preventDefault();
      onOpenChange(!open);
    }
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [hotkey, open, onOpenChange]);

  const trimmed = query.trim();
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controllers: AbortController[] = [];
    const timers: number[] = [];
    for (const source of sources) {
      if (trimmed.length < (source.minLength ?? 1)) continue;
      const controller = new AbortController();
      controllers.push(controller);
      const set = (patch: Partial<SourceState>) =>
        setResults((r) => ({ ...r, [source.id]: { ...(r[source.id] ?? IDLE), ...patch } }));
      timers.push(
        window.setTimeout(() => {
          set({ status: "loading", query: trimmed, items: [], slow: false });
          timers.push(window.setTimeout(() => set({ slow: true }), LOADING_DELAY - DEBOUNCE));
          source.search(trimmed, controller.signal).then(
            (items) => {
              if (!controller.signal.aborted) set({ status: "done", items, slow: false });
            },
            () => {
              if (!controller.signal.aborted) set({ status: "error", items: [], slow: false });
            },
          );
        }, DEBOUNCE),
      );
    }
    return () => {
      controllers.forEach((c) => c.abort());
      timers.forEach(clearTimeout);
    };
    // `sources` is usually a new array each render; key on ids instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trimmed, retryCount, sources.map((s) => s.id).join()]);

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    const lookup = new Map<string, Command>(Object.entries(seen));
    for (const c of commands) lookup.set(c.id, c);

    if (!trimmed) {
      const rows = recent
        .map((rid) => lookup.get(rid))
        .filter((c): c is Command => !!c)
        .slice(0, maxRecent)
        .map((command) => ({ key: `recent:${command.id}`, command, indices: [] }));
      if (rows.length) out.push({ key: "recent", heading: "Recent", rows });
      const byGroup = new Map<string, Row[]>();
      for (const command of commands) {
        const g = command.group ?? "Commands";
        if (!byGroup.has(g)) byGroup.set(g, []);
        byGroup.get(g)!.push({ key: `${g}:${command.id}`, command, indices: [] });
      }
      for (const [g, groupRows] of byGroup) out.push({ key: g, heading: g, rows: groupRows });
      return out;
    }

    const scored = new Map<string, { best: number; rows: (Row & { score: number })[] }>();
    for (const command of commands) {
      const m = score(trimmed, command);
      if (!m) continue;
      const g = command.group ?? "Commands";
      if (!scored.has(g)) scored.set(g, { best: -Infinity, rows: [] });
      const entry = scored.get(g)!;
      entry.rows.push({ key: `${g}:${command.id}`, command, indices: m.indices, score: m.score });
      entry.best = Math.max(entry.best, m.score);
    }
    const staticGroups = [...scored.entries()]
      .sort((a, b) => b[1].best - a[1].best)
      .map(([g, entry]) => ({
        key: g,
        heading: g,
        rows: entry.rows.sort((a, b) => b.score - a.score),
      }));
    out.push(...staticGroups);

    // Async results go last, so late arrivals never move what's under the cursor.
    for (const source of sources) {
      const state = results[source.id];
      if (!state || state.query !== trimmed) continue;
      if (state.status === "done" && state.items.length) {
        out.push({
          key: `source:${source.id}`,
          heading: source.heading,
          rows: state.items.map((command) => ({
            key: `${source.id}:${command.id}`,
            command,
            indices: fuzzyMatch(trimmed, command.label)?.indices ?? [],
          })),
        });
      }
      if (state.status === "error") {
        out.push({
          key: `source:${source.id}`,
          heading: source.heading,
          rows: [
            {
              key: `${source.id}:retry`,
              indices: [],
              command: {
                id: `${source.id}:retry`,
                label: `Couldn’t search ${source.heading.toLowerCase()}. Try again`,
                onSelect: () => {
                  setResults((r) => ({ ...r, [source.id]: IDLE }));
                  setRetryCount((n) => n + 1);
                },
              },
            },
          ],
        });
      }
    }
    return out;
  }, [commands, sources, results, recent, seen, trimmed, maxRecent]);

  const rows = groups.flatMap((g) => g.rows);
  const active = rows.find((r) => r.key === activeKey) ?? rows[0] ?? null;
  const optionId = (key: string) => `${id}-opt-${key.replace(/[^\w-]/g, "_")}`;

  const current = (s: CommandSource) => (results[s.id]?.query === trimmed ? results[s.id] : undefined);
  const pending = trimmed ? sources.filter((s) => current(s)?.status === "loading") : [];
  const slow = pending.filter((s) => current(s)?.slow);
  // Debounce pending: not "no results" yet.
  const waiting = sources.some((s) => trimmed.length >= (s.minLength ?? 1) && !current(s));
  const empty = trimmed.length > 0 && rows.length === 0 && pending.length === 0 && !waiting;

  // Only keyboard moves scroll; pointer moves would slide the list under the cursor.
  useLayoutEffect(() => {
    if (!scrollToActive.current || !active) return;
    scrollToActive.current = false;
    document.getElementById(optionId(active.key))?.scrollIntoView({ block: "nearest" });
  });

  // Only the viewport's height animates, so the scroller's rows lay out once per change.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const scroller = scrollerRef.current;
    if (!viewport || !scroller) return;
    viewport.dataset.instant = "";
    viewport.style.height = `${scroller.offsetHeight}px`;
    const frame = requestAnimationFrame(() => delete viewport.dataset.instant);
    const observer = new ResizeObserver(() => {
      viewport.style.height = `${scroller.offsetHeight}px`;
    });
    observer.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [viewportMounted]);

  function move(to: number) {
    if (!rows.length) return;
    const index = (to + rows.length) % rows.length;
    scrollToActive.current = true;
    setActiveKey(rows[index].key);
  }

  function run(row: Row) {
    const { command } = row;
    if (!command.id.endsWith(":retry")) {
      const next = [command.id, ...recent.filter((r) => r !== command.id)].slice(0, maxRecent);
      if (recentProp === undefined) setLocalRecent(next);
      onRecentChange?.(next);
      if (!commands.some((c) => c.id === command.id)) setSeen((s) => ({ ...s, [command.id]: command }));
      onOpenChange(false);
    }
    command.onSelect();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const index = active ? rows.indexOf(active) : -1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(index - 1);
    } else if (event.key === "Home" && rows.length) {
      event.preventDefault();
      move(0);
    } else if (event.key === "End" && rows.length) {
      event.preventDefault();
      move(rows.length - 1);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (active) run(active);
    }
  }

  const status = !trimmed
    ? ""
    : empty
      ? `No results for ${trimmed}`
      : slow.length
        ? `${rows.length} results, searching ${slow.map((s) => s.heading.toLowerCase()).join(", ")}`
        : `${rows.length} ${rows.length === 1 ? "result" : "results"}`;

  // The field keeps focus whatever is pressed inside the palette.
  function keepFocus(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target === inputRef.current) return;
    // A press on a classic scrollbar keeps working as a drag.
    if (event.nativeEvent.offsetX > target.clientWidth && target.clientWidth > 0) return;
    event.preventDefault();
    if (document.activeElement !== inputRef.current) inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <Modal
      open={open}
      onDismiss={() => onOpenChange(false)}
      initialFocus={inputRef}
      triggerRef={triggerRef}
      growFrom="center"
      className={styles.palette}
      aria-label={label}
    >
      <div className={styles.search} onPointerDown={keepFocus}>
        <Icon className={styles.searchIcon} name="search" />
        <input
          ref={inputRef}
          className={styles.input}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? optionId(active.key) : undefined}
          aria-label={label}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveKey(null);
            scrollerRef.current?.scrollTo({ top: 0 });
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      <div ref={attachViewport} className={styles.viewport} onPointerDown={keepFocus}>
        <div ref={scrollerRef} className={styles.scroller}>
          <div id={listId} role="listbox" aria-label={label} className={styles.listbox}>
            {groups.map((group) => (
              <div key={group.key} role="group" aria-labelledby={`${id}-${group.key}`} className={styles.group}>
                <div id={`${id}-${group.key}`} className={styles.heading} aria-hidden="true">
                  {group.heading}
                </div>
                {group.rows.map((row) => {
                  const selected = row === active;
                  return (
                    <div
                      key={row.key}
                      id={optionId(row.key)}
                      role="option"
                      aria-selected={selected}
                      data-active={selected || undefined}
                      className={styles.option}
                      onPointerDown={(e) => e.preventDefault()}
                      onPointerMove={() => !selected && setActiveKey(row.key)}
                      onClick={() => run(row)}
                    >
                      {row.command.icon && (
                        <span className={styles.icon} aria-hidden="true">
                          {row.command.icon}
                        </span>
                      )}
                      <span className={styles.label}>
                        <Highlight text={row.command.label} indices={row.indices} dim={!!trimmed} />
                        {row.command.hint && <span className={styles.hint}>{row.command.hint}</span>}
                      </span>
                      {/* Enter is on every row and shows on the highlighted one, in the
                          shortcut's place: the cell holds the wider of the two, so moving
                          the highlight never reflows a label. */}
                      <span className={styles.keys} aria-hidden="true">
                        {row.command.shortcut && (
                          <span className={styles.shortcut}>
                            {row.command.shortcut.map((k) => (
                              <kbd key={k} className={styles.key}>
                                {k}
                              </kbd>
                            ))}
                          </span>
                        )}
                        <kbd className={`${styles.key} ${styles.enter}`}>enter</kbd>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {slow.map((source) => (
            <div key={source.id} className={styles.loading}>
              <div className={styles.heading}>{source.heading}</div>
              <div className={styles.loadingRow}>
                <span className={styles.loadingLabel}>
                  <span className={styles.loadingText}>
                    {source.loadingLabel ?? `Searching ${source.heading.toLowerCase()}…`}
                  </span>
                </span>
              </div>
            </div>
          ))}

          {empty && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No results for “{trimmed}”</p>
              <p className={styles.emptyHint}>{emptyHint}</p>
            </div>
          )}
        </div>
      </div>

      <footer className={styles.footer} aria-hidden="true" onPointerDown={keepFocus}>
        <span>
          <kbd className={styles.key}>↑</kbd>
          <kbd className={styles.key}>↓</kbd> to move
        </span>
        <span>
          <kbd className={styles.key}>enter</kbd> to run
        </span>
        <span>
          <kbd className={styles.key}>esc</kbd> to close
        </span>
      </footer>

      <div role="status" className={styles.srOnly}>
        {status}
      </div>
    </Modal>
  );
}

function Highlight({ text, indices, dim }: { text: string; indices: number[]; dim: boolean }) {
  if (!dim) return <span className={styles.text}>{text}</span>;
  const hit = new Set(indices);
  const parts: { text: string; match: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const match = hit.has(i);
    const last = parts[parts.length - 1];
    if (last && last.match === match) last.text += text[i];
    else parts.push({ text: text[i], match });
  }
  return (
    <span className={styles.text} data-dim="">
      {parts.map((p, i) =>
        p.match ? (
          <mark key={i} className={styles.match}>
            {p.text}
          </mark>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </span>
  );
}
