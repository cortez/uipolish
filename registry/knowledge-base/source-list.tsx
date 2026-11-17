"use client";

import { useId, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Button } from "../button/button";
import { ConfirmDialog } from "../dialog/dialog";
import { DropdownMenu, MenuItem, MenuSeparator } from "../dropdown-menu/dropdown-menu";
import { Icon } from "../icons/icons";
import { SearchField } from "../search-field/search-field";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import {
  Counter,
  SERVICES,
  STATUS_LABEL,
  SourceTile,
  StatusGlyph,
  isRunning,
  plural,
  stageFraction,
  useAction,
  type Formatters,
  type KnowledgeSource,
  type KnowledgeStatus,
  type Result,
} from "./shared";
import styles from "./knowledge-base.module.css";

type Filter = "all" | "working" | "failed";

type SourceListProps = {
  sources: KnowledgeSource[];
  f: Formatters;
  agent: string;
  /** Hides every change: re-sync, retry, remove. */
  locked: boolean;
  onResync?: (id: string) => Result;
  onRetry?: (ids: string[]) => Result;
  onRemove?: (id: string) => Result;
  announce: (line: string) => void;
  /** Where focus goes once a removed row is gone. */
  headingRef: RefObject<HTMLElement | null>;
  /** Rows shown before "Show n more". */
  pageSize: number;
  /** The empty list's message, when there's nothing at all. */
  empty?: ReactNode;
};

/** Keeps a removed source on screen, marked, until its row has folded away. */
function useLeaving(sources: KnowledgeSource[]) {
  const [prev, setPrev] = useState(sources);
  const [shown, setShown] = useState<(KnowledgeSource & { leaving?: true })[]>(sources);
  if (prev !== sources) {
    setPrev(sources);
    const ids = new Set(sources.map((s) => s.id));
    const next: (KnowledgeSource & { leaving?: true })[] = [...sources];
    shown.forEach((s, i) => {
      if (!ids.has(s.id)) next.splice(Math.min(i, next.length), 0, { ...s, leaving: true });
    });
    setShown(next);
  }
  const forget = (id: string) => setShown((list) => list.filter((s) => !(s.id === id && s.leaving)));
  return { shown, forget };
}

export function SourceList({
  sources,
  f,
  agent,
  locked,
  onResync,
  onRetry,
  onRemove,
  announce,
  headingRef,
  pageSize,
  empty,
}: SourceListProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [removing, setRemoving] = useState<KnowledgeSource | null>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const { shown, forget } = useLeaving(sources);
  // Rows there from the start just show; rows added later open in place.
  const [initial] = useState(() => new Set(sources.map((s) => s.id)));

  const working = sources.filter((s) => isRunning(s.status)).length;
  const failed = sources.filter((s) => s.status === "failed");
  const showTools = sources.length > 6;
  const q = query.trim().toLocaleLowerCase();

  // A filter that's emptied out (the last failure retried) falls back to all.
  const activeFilter = (filter === "failed" && failed.length === 0) || (filter === "working" && working === 0) ? "all" : filter;

  const matches = shown.filter((s) => {
    if (s.leaving) return true;
    if (activeFilter === "working" && !isRunning(s.status)) return false;
    if (activeFilter === "failed" && s.status !== "failed") return false;
    if (q && !`${s.name} ${s.location ?? ""}`.toLocaleLowerCase().includes(q)) return false;
    return true;
  });
  const visible = expanded || matches.length <= pageSize + 2 ? matches : matches.slice(0, pageSize);
  const hidden = matches.length - visible.length;

  if (sources.length === 0 && shown.length === 0) return <>{empty}</>;

  return (
    <div className={styles.listWrap}>
      {showTools && (
        <div className={styles.tools}>
          {/* The search field's height: controls in one row share one height. */}
          <SegmentedControl
            aria-label="Show"
            widths="content"
            value={activeFilter}
            onValueChange={(v) => {
              setFilter(v as Filter);
              setExpanded(false);
            }}
            className={styles.filter}
          >
            <Segment value="all">
              All <Counter className={styles.segCount} value={f.number(sources.length)} />
            </Segment>
            <Segment value="working" disabled={working === 0}>
              In progress <Counter className={styles.segCount} value={f.number(working)} />
            </Segment>
            <Segment value="failed" disabled={failed.length === 0}>
              Failed <Counter className={styles.segCount} value={f.number(failed.length)} />
            </Segment>
          </SegmentedControl>
          <SearchField
            label="Find a source"
            placeholder="Find a source"
            value={query}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setExpanded(false);
            }}
            onClear={() => setQuery("")}
            className={styles.search}
          />
        </div>
      )}

      {matches.length === 0 ? (
        <div className={styles.noMatch}>
          <p className={styles.noMatchTitle}>No sources match “{query.trim()}”</p>
          <Button variant="secondary" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </div>
      ) : (
        <ul className={styles.list}>
          {visible.map((s) => (
            <Row
              key={s.id}
              source={s}
              arrived={!initial.has(s.id)}
              leaving={!!s.leaving}
              onGone={() => forget(s.id)}
              f={f}
              locked={locked}
              onResync={onResync}
              onRetry={onRetry}
              onRemove={onRemove ? () => setRemoving(s) : undefined}
              announce={announce}
            />
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <Button ref={moreRef} variant="ghost" className={styles.more} onClick={() => setExpanded(true)}>
          Show {f.number(hidden)} more
          <Icon name="chevron-down" />
        </Button>
      )}

      {onRemove && (
        <ConfirmDialog
          open={!!removing}
          onOpenChange={(open) => {
            if (!open) setRemoving(null);
          }}
          title={removing ? `Remove ${removing.name}?` : ""}
          description={removing ? removeLine(removing, agent, f) : undefined}
          confirmLabel="Remove source"
          finalFocus={headingRef}
          onConfirm={async () => {
            if (!removing) return;
            const name = removing.name;
            await onRemove(removing.id);
            announce(`${name} removed. ${agent} no longer answers from it.`);
          }}
        />
      )}
    </div>
  );
}

function removeLine(s: KnowledgeSource, agent: string, f: Formatters) {
  const what = s.chunks ? `its ${f.number(s.chunks)} ${plural(s.chunks, "chunk")}` : "it";
  const where =
    s.kind === "file"
      ? "Upload it again to bring it back."
      : s.kind === "website"
        ? "Nothing changes on the site itself."
        : `Nothing is deleted in ${SERVICES[s.kind].title}.`;
  return `${agent} stops answering from ${what} right away. ${where}`;
}

/* ---------- Row ---------- */

/** Every status label sits in one cell, so the pill keeps the widest one's width. */
const LABELS = Object.entries(STATUS_LABEL) as [KnowledgeStatus, string][];

function Row({
  source: s,
  arrived,
  leaving,
  onGone,
  f,
  locked,
  onResync,
  onRetry,
  onRemove,
  announce,
}: {
  source: KnowledgeSource;
  /** Added after the list first showed: it opens in place. */
  arrived: boolean;
  leaving: boolean;
  onGone: () => void;
  f: Formatters;
  locked: boolean;
  onResync?: (id: string) => Result;
  onRetry?: (ids: string[]) => Result;
  onRemove?: () => void;
  announce: (line: string) => void;
}) {
  const id = useId();
  const retry = useAction();
  const resync = useAction();
  const failed = s.status === "failed";

  async function doRetry() {
    const ok = await retry.run(() => onRetry?.([s.id]), "Couldn’t start again. Try once more.");
    if (ok) announce(`Reading ${s.name} again.`);
  }
  async function doResync() {
    const ok = await resync.run(() => onResync?.(s.id), "Couldn’t start a sync. Try again.");
    if (ok) announce(`Syncing ${s.name}.`);
  }

  // Counts hold room while they climb, number and unit together, so the line beside them holds still.
  const running = isRunning(s.status) && s.status !== "queued";
  const counts: ReactNode[] = [];
  const count = (key: string, n: number | undefined, unit: string, shown: string | undefined, reserve: string) => {
    if (n === undefined && !running) return;
    const text = `${shown ?? "–"} ${plural(n ?? 2, unit)}`;
    counts.push(
      <span key={key} className={styles.count}>
        <Counter value={text} reserve={running ? `${reserve} ${unit}s` : undefined} />
      </span>,
    );
  };
  count("p", s.pages, "page", s.pages !== undefined ? f.number(s.pages) : undefined, "888");
  count("c", s.chunks, "chunk", s.chunks !== undefined ? f.number(s.chunks) : undefined, "8,888");
  count("t", s.tokens, "token", s.tokens !== undefined ? f.compact(s.tokens) : undefined, "888.8k");

  let when: string | null = null;
  if (s.status === "queued") when = "Waiting its turn";
  else if (s.status === "ready" && s.syncedAt) when = `Synced ${f.ago(s.syncedAt)}`;
  else if (failed && s.syncedAt) when = `Last good sync ${f.ago(s.syncedAt)}`;

  const canResync = !locked && onResync && !isRunning(s.status) && !failed;
  const hasMenu = !leaving && (canResync || s.href || (!locked && onRemove));

  return (
    <li
      className={styles.rowItem}
      data-arrived={arrived || undefined}
      data-leaving={leaving || undefined}
      inert={leaving || undefined}
      onTransitionEnd={(e) => {
        if (leaving && e.target === e.currentTarget && e.propertyName === "grid-template-rows") onGone();
      }}
    >
      <div className={styles.rowClip}>
        <div
          className={styles.row}
          data-status={s.status}
          aria-labelledby={`${id}-name`}
          style={{ "--kb-stage": stageFraction(s) } as CSSProperties}
        >
          <SourceTile source={s} />
          <div className={styles.rowMain}>
            <div className={styles.rowHead}>
              <span id={`${id}-name`} className={styles.rowName}>
                {s.name}
              </span>
              {/* The cell holds the widest pill (an invisible copy with every
                  label), so the name never rewraps; the pill itself fits its
                  word and sits at the cell's end. */}
              <span className={styles.pillCell}>
                <span className={`${styles.pill} ${styles.pillGhost}`} aria-hidden="true">
                  <span className={styles.statusIcon} />
                  <span className={styles.pillSlot}>
                    {LABELS.map(([key, label]) => (
                      <span key={key} className={styles.pillGhostLabel}>
                        {label}
                      </span>
                    ))}
                  </span>
                </span>
                <span className={styles.pill} aria-describedby={failed && s.error ? `${id}-error` : undefined}>
                  <StatusGlyph status={s.status} />
                  <span className={styles.pillSlot}>
                    {LABELS.map(([key, label]) => (
                      <span key={key} className={styles.pillLabel} data-on={key === s.status || undefined} aria-hidden={key !== s.status}>
                        {label}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            </div>
            {s.location && <span className={styles.rowLocation}>{s.location}</span>}
            {(counts.length > 0 || when) && (
              <span className={styles.rowMeta}>
                {counts}
                {when && <span className={styles.count}>{when}</span>}
              </span>
            )}
            {failed && (
              <div className={styles.rowFail}>
                <p id={`${id}-error`} className={styles.rowError}>
                  {s.error ?? "This source couldn’t be read."}
                </p>
                {!locked && onRetry && (
                  <Button variant="secondary" busy={retry.busy} busyLabel="Retrying…" onClick={doRetry} aria-describedby={`${id}-name`}>
                    <Icon name="retry" />
                    Retry
                  </Button>
                )}
              </div>
            )}
            {(retry.error || resync.error) && (
              <p className={styles.rowError} role="alert">
                {retry.error ?? resync.error}
              </p>
            )}
          </div>
          <div className={styles.rowEnd}>
            {hasMenu ? (
              <DropdownMenu
                align="end"
                trigger={
                  <Button variant="ghost" size="sm" aria-label={`Actions for ${s.name}`}>
                    <Icon name="more" />
                  </Button>
                }
              >
                {canResync && (
                  <MenuItem icon={<Icon name="retry" />} onSelect={doResync} description={s.kind === "file" ? "Read the same file again" : "Pick up what changed"}>
                    Re-sync
                  </MenuItem>
                )}
                {s.href && (
                  <MenuItem icon={<Icon name="external" />} onSelect={() => window.open(s.href, "_blank", "noopener")}>
                    {s.kind === "file" ? "Open file" : s.kind === "website" ? "Open site" : `Open in ${SERVICES[s.kind].title}`}
                  </MenuItem>
                )}
                {!locked && onRemove && (
                  <>
                    {(canResync || s.href) && <MenuSeparator />}
                    <MenuItem variant="danger" icon={<Icon name="trash" />} onSelect={onRemove}>
                      Remove…
                    </MenuItem>
                  </>
                )}
              </DropdownMenu>
            ) : (
              <span className={styles.rowEndSpacer} aria-hidden="true" />
            )}
          </div>
          {/* The line under the row: it travels through reading, chunking and indexing in the stage's color. */}
          <span className={styles.track} aria-hidden="true">
            <span className={styles.trackFill} />
          </span>
        </div>
      </div>
    </li>
  );
}
