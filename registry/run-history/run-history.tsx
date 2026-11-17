"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "../button/button";
import { DatePicker } from "../date-picker/date-picker";
import { EmptyState } from "../empty-state/empty-state";
import { Pagination } from "../pagination/pagination";
import { SearchField } from "../search-field/search-field";
import { Select } from "../select/select";
import { useLoadingDelay } from "../skeleton/skeleton";
import { RunDetailView } from "./detail";
import { StatusGlyph, StatusTag, STATUS_TEXT, TriggerLabel } from "./parts";
import {
  cx,
  DEFAULT_FILTERS,
  elapsedOf,
  isFiltered,
  plural,
  useAnnouncer,
  useFormatters,
  useNow,
  type Formatters,
  type Result,
  type RunDetail,
  type RunFilters,
  type RunRange,
  type RunStatus,
  type RunSummary,
  type RunTrigger,
} from "./shared";
import styles from "./run-history.module.css";

export type {
  RunDetail,
  RunFilters,
  RunOutput,
  RunRange,
  RunStatus,
  RunStep,
  RunStepKind,
  RunStepStatus,
  RunSummary,
  RunTrigger,
} from "./shared";
export { DEFAULT_FILTERS } from "./shared";

export type RunHistoryProps = {
  /** The runs to show: one page, already filtered, newest first. Update a running one in place. */
  runs: RunSummary[];
  /** Runs matching the filters across every page. Default `runs.length`. */
  total?: number;
  /** Counted from 1. Leave out `onPageChange` to drop the pager. */
  page?: number;
  /** Default 25. */
  pageSize?: number;
  onPageChange?: (page: number) => void;

  /** The filters, controlled. Search reaches `onFiltersChange` 250ms after typing stops. */
  filters: RunFilters;
  onFiltersChange: (filters: RunFilters) => void;
  /** Agent names for the Agent filter. Fewer than two hides it. */
  agents?: string[];

  /** Runs that started since this page loaded and are held back so rows don't move. */
  newRuns?: number;
  /** Put them in: load page 1 again with them at the top. */
  onShowNewRuns?: () => void;

  /** The first load: holds the table's space and names the wait. */
  loading?: boolean;
  /** New filters or a new page are on the way: the old rows dim and stay put. */
  refreshing?: boolean;
  /** The list couldn't load: what went wrong, in a sentence. */
  error?: string;
  onRetry?: () => void;

  /** The open run. `null` shows the list. */
  selectedId?: string | null;
  /** Open a run, or `null` to go back to the list. Put it in the URL so it can be shared. */
  onSelect?: (id: string | null) => void;
  /** The open run's steps and output. Shown when `detail.id` is `selectedId`. */
  detail?: RunDetail;
  detailLoading?: boolean;
  detailError?: string;
  onRetryDetail?: () => void;

  /** Start the same run again. Resolve with the new run's id to open it. */
  onRerun?: (run: RunSummary) => Result | string | Promise<string | void>;
  /** Make a link to the run; the block copies it. Return the URL or a promise of it. */
  onShare?: (run: RunSummary) => string | Promise<string>;
  /** The viewer can see runs but not start them: why, and who can. Hides Re-run. */
  readOnly?: string;

  /** Under "No runs yet": how runs start in your product. */
  emptyDescription?: string;
  /** The way to start the first one: a button or a link. */
  emptyAction?: ReactNode;

  /** ISO 4217. Default "USD". */
  currency?: string;
  /** Default "en-US". */
  locale?: string;
  /** IANA zone the times are shown in. Default "UTC", so server and browser agree; pass the viewer's. */
  timeZone?: string;
  /** Ms timestamp treated as now on the first render. Default: now. */
  now?: number;

  /** Default "Runs". */
  title?: ReactNode;
  description?: ReactNode;
  /** The title's level; sections are one below. Default 1. */
  headingLevel?: 1 | 2 | 3 | 4;
  className?: string;
};

const RANGES: { value: RunRange; label: string }[] = [
  { value: "1h", label: "Last hour" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom dates…" },
];

const STATUSES: { value: RunStatus | "all"; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "running", label: "Running" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const TRIGGERS: { value: RunTrigger | "all"; label: string }[] = [
  { value: "all", label: "Any trigger" },
  { value: "user", label: "Started by a person" },
  { value: "schedule", label: "Schedule" },
  { value: "webhook", label: "Webhook" },
];

function Heading({ level, ...props }: { level: number } & ComponentProps<"h2">) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as "h2";
  return <Tag {...props} />;
}

/* ---------- Rows ---------- */

function RunRow({
  run,
  now,
  f,
  onOpen,
}: {
  run: RunSummary;
  now: number;
  f: Formatters;
  onOpen?: (id: string) => void;
}) {
  // A status that changes while you watch tints the row for a moment, in place.
  const [seen, setSeen] = useState(run.status);
  const [flash, setFlash] = useState<RunStatus | undefined>(undefined);
  if (seen !== run.status) {
    setSeen(run.status);
    setFlash(run.status);
  }

  const elapsed = elapsedOf(run, now);
  const running = run.status === "running";
  const label = `${run.title}, ${STATUS_TEXT[run.status]}`;

  return (
    <tr className={styles.row} data-status={run.status} data-flash={flash} data-run-id={run.id}>
      <td className={styles.cellRun}>
        <span className={styles.rowGlyph}>
          <StatusGlyph status={run.status} />
        </span>
        <div className={styles.runText}>
          {onOpen ? (
            <button type="button" className={styles.runOpen} aria-label={label} onClick={() => onOpen(run.id)}>
              {run.title}
            </button>
          ) : (
            <span className={styles.runTitle}>{run.title}</span>
          )}
          <span className={styles.runMeta}>
            <span className={styles.runId}>{run.id}</span>
            <span>
              <span aria-hidden="true">·</span> {run.agent}
            </span>
            {/* Narrower, the trigger and the time take a line of their own. */}
            <span className={styles.metaMid}>
              <TriggerLabel trigger={run.trigger} by={run.triggeredBy} />
              <span className={styles.metaNarrow}>
                <span aria-hidden="true">·</span> {f.when(run.startedAt)}
              </span>
            </span>
          </span>
          {run.status === "failed" && run.error && <span className={styles.runError}>{run.error}</span>}
          <span className={styles.runNumbers}>
            <span className={styles.mono}>{f.duration(elapsed)}</span>
            <span>
              <span className={styles.mono}>{f.tokens(run.tokens)}</span> tokens
            </span>
            <span className={styles.mono}>{f.cost(run.cost)}</span>
          </span>
        </div>
      </td>
      <td className={styles.cellStatus}>
        <StatusTag status={run.status} />
      </td>
      <td className={styles.cellTrigger}>
        <TriggerLabel trigger={run.trigger} by={run.triggeredBy} />
      </td>
      <td className={styles.cellStarted}>
        <time dateTime={run.startedAt} title={f.full(run.startedAt)}>
          {f.when(run.startedAt)}
        </time>
      </td>
      <td className={cx(styles.cellNum, styles.cellDuration)} data-live={running || undefined}>
        {f.duration(elapsed)}
      </td>
      <td className={cx(styles.cellNum, styles.cellTokens)}>{f.tokens(run.tokens)}</td>
      <td className={cx(styles.cellNum, styles.cellCost)}>{f.cost(run.cost)}</td>
    </tr>
  );
}

/* ---------- Filters ---------- */

function Toolbar({
  filters,
  onChange,
  agents,
  refreshing,
}: {
  filters: RunFilters;
  onChange: (next: RunFilters) => void;
  agents?: string[];
  refreshing: boolean;
}) {
  const [text, setText] = useState(filters.query);
  const [lastQuery, setLastQuery] = useState(filters.query);
  const timer = useRef(0);
  const latest = useRef(filters);
  useEffect(() => {
    latest.current = filters;
  });
  // A query set from outside (Clear filters) replaces what's typed.
  if (lastQuery !== filters.query) {
    setLastQuery(filters.query);
    setText(filters.query);
  }
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function type(value: string) {
    setText(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (value !== latest.current.query) onChange({ ...latest.current, query: value });
    }, 250);
  }

  const set = (patch: Partial<RunFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className={styles.toolbar}>
      <div className={styles.filters}>
        <SearchField
          label="Search runs"
          placeholder="Search titles, run IDs, errors"
          className={styles.search}
          value={text}
          loading={refreshing && text !== ""}
          onChange={(e) => type(e.currentTarget.value)}
          shortcut="/"
        />
        <div className={styles.selects}>
          <Select
            className={styles.select}
            aria-label="Status"
            options={STATUSES}
            value={filters.status}
            onValueChange={(v) => set({ status: v as RunFilters["status"] })}
          />
          {agents && agents.length > 1 && (
            <Select
              className={styles.select}
              aria-label="Agent"
              options={[{ value: "all", label: "Every agent" }, ...agents.map((a) => ({ value: a, label: a }))]}
              value={filters.agent}
              onValueChange={(v) => set({ agent: v })}
            />
          )}
          <Select
            className={styles.select}
            aria-label="Trigger"
            options={TRIGGERS}
            value={filters.trigger}
            onValueChange={(v) => set({ trigger: v as RunFilters["trigger"] })}
          />
          <Select
            className={styles.select}
            aria-label="Started"
            options={RANGES}
            value={filters.range}
            onValueChange={(v) => set({ range: v as RunRange })}
          />
        </div>
      </div>
      {filters.range === "custom" && (
        <DatePicker
          mode="range"
          label="Started between"
          className={styles.dates}
          value={filters.from && filters.to ? { start: filters.from, end: filters.to } : null}
          onValueChange={(v) => set({ from: v?.start, to: v?.end })}
        />
      )}
    </div>
  );
}

/* ---------- Screen ---------- */

/** Past agent runs: a filterable table, and a trace of any one run. */
export function RunHistory({
  runs,
  total,
  page = 1,
  pageSize = 25,
  onPageChange,
  filters,
  onFiltersChange,
  agents,
  newRuns = 0,
  onShowNewRuns,
  loading = false,
  refreshing = false,
  error,
  onRetry,
  selectedId = null,
  onSelect,
  detail,
  detailLoading = false,
  detailError,
  onRetryDetail,
  onRerun,
  onShare,
  readOnly,
  emptyDescription = "Every run lands here with each model and tool call, what it cost, and what it made.",
  emptyAction,
  currency = "USD",
  locale = "en-US",
  timeZone = "UTC",
  now: nowProp,
  title = "Runs",
  description,
  headingLevel = 1,
  className,
}: RunHistoryProps) {
  const [start] = useState(() => nowProp ?? Date.now());
  const selected = selectedId ? (runs.find((r) => r.id === selectedId) ?? (detail?.id === selectedId ? detail.run : undefined)) : undefined;
  const live = runs.some((r) => r.status === "running") || selected?.status === "running";
  const now = useNow(live, start);
  // Day names only need the minute.
  const f = useFormatters(locale, currency, timeZone, Math.floor(now / 60_000) * 60_000);
  const { text: announcement, announce } = useAnnouncer();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const dim = useLoadingDelay(refreshing);
  const slow = useLoadingDelay(loading);

  // Back from a run: focus returns to its row, or to the title if it's gone.
  const lastSelected = useRef(selectedId);
  useEffect(() => {
    const was = lastSelected.current;
    lastSelected.current = selectedId;
    if (!was || selectedId) return;
    const button = tableRef.current?.querySelector<HTMLElement>(`[data-run-id="${CSS.escape(was)}"] button`);
    (button ?? titleRef.current)?.focus();
  }, [selectedId]);

  const total_ = total ?? runs.length;
  const filtered = isFiltered(filters);
  const running = runs.filter((r) => r.status === "running").length;
  const level = headingLevel;

  function open(id: string) {
    onSelect?.(id);
  }

  /* ----- A run is open: it takes the screen ----- */

  if (selectedId) {
    return (
      <div className={cx(styles.root, className)}>
        <RunDetailView
          runId={selectedId}
          run={selected}
          detail={detail?.id === selectedId ? detail : undefined}
          loading={detailLoading}
          error={detailError}
          onRetry={onRetryDetail}
          onBack={onSelect ? () => onSelect(null) : undefined}
          backLabel={typeof title === "string" ? title : "Runs"}
          onRerun={readOnly ? undefined : onRerun}
          onOpenRun={onSelect}
          onShare={onShare}
          readOnly={readOnly}
          now={now}
          f={f}
          level={level}
          announce={announce}
        />
        <span role="status" className={styles.srOnly}>
          {announcement}
        </span>
      </div>
    );
  }

  /* ----- The list ----- */

  const header = (
    <header className={styles.header}>
      <Heading level={level} id={titleId} ref={titleRef} tabIndex={-1} className={styles.title}>
        {title}
      </Heading>
      {description && <p className={styles.lede}>{description}</p>}
    </header>
  );

  const nothingYet = !loading && !error && runs.length === 0 && !filtered && total_ === 0;

  if (nothingYet) {
    return (
      <div className={cx(styles.root, className)}>
        {header}
        <div className={styles.panel}>
          <EmptyState size="page" art="stack" title="No runs yet" description={emptyDescription} titleAs="p" action={emptyAction} />
        </div>
      </div>
    );
  }

  const clear = () => onFiltersChange({ ...DEFAULT_FILTERS });

  let body: ReactNode;
  if (loading) {
    body = (
      <div className={styles.placeholder} aria-busy="true">
        <p className={styles.loadingLine} data-shown={slow || undefined}>
          <span className={styles.sweep}>Loading runs…</span>
        </p>
      </div>
    );
  } else if (error) {
    body = (
      <div className={styles.placeholder}>
        <EmptyState
          art="unplugged"
          title="Runs didn’t load"
          description={error}
          titleAs="p"
          action={
            onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            )
          }
        />
      </div>
    );
  } else if (runs.length === 0) {
    const what = filters.query.trim() ? `No runs match “${filters.query.trim()}”` : "No runs match these filters";
    const range = RANGES.find((r) => r.value === filters.range);
    body = (
      <div className={styles.placeholder}>
        <EmptyState
          art="search"
          title={what}
          description={
            filters.range !== "all" && filters.range !== "custom"
              ? `Searched ${range?.label.toLocaleLowerCase()}. Try a longer range, or clear the filters.`
              : "Try fewer filters, or search for a run ID or part of an error."
          }
          titleAs="p"
          action={
            <Button variant="secondary" onClick={clear}>
              Clear filters
            </Button>
          }
        />
      </div>
    );
  } else {
    body = (
      <div className={styles.tableWrap} ref={tableRef} data-dim={dim || undefined} aria-busy={refreshing || undefined}>
        <table className={styles.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col" className={styles.cellRun}>
                Run
              </th>
              <th scope="col" className={styles.cellStatus}>
                Status
              </th>
              <th scope="col" className={styles.cellTrigger}>
                Trigger
              </th>
              <th scope="col" className={styles.cellStarted}>
                Started
              </th>
              <th scope="col" className={cx(styles.cellNum, styles.cellDuration)}>
                Duration
              </th>
              <th scope="col" className={cx(styles.cellNum, styles.cellTokens)}>
                Tokens
              </th>
              <th scope="col" className={cx(styles.cellNum, styles.cellCost)}>
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <RunRow key={run.id} run={run} now={now} f={f} onOpen={onSelect ? open : undefined} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const pages = Math.max(1, Math.ceil(total_ / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total_, from + runs.length - 1);

  return (
    <div className={cx(styles.root, className)}>
      {header}
      <div className={styles.panel}>
        <Toolbar filters={filters} onChange={onFiltersChange} agents={agents} refreshing={refreshing} />

        {/* One line that's always there, so what it says can change without moving the table. */}
        <div className={styles.summary}>
          <p className={styles.count}>
            {loading ? (
              " "
            ) : error ? (
              " "
            ) : (
              <>
                <span>
                  {f.number(total_)} {plural(total_, "run")}
                </span>
                {running > 0 && (
                  <span className={styles.liveNote}>
                    <span className={styles.liveDot} aria-hidden="true" />
                    {running} running
                  </span>
                )}
              </>
            )}
          </p>
          <div className={styles.summaryActions}>
            {newRuns > 0 && onShowNewRuns && (
              <Button variant="secondary" onClick={() => {
                onShowNewRuns();
                announce(`${newRuns} new ${plural(newRuns, "run")} added at the top.`);
              }}>
                <span className={styles.newDot} aria-hidden="true" />
                Show {newRuns} new {plural(newRuns, "run")}
              </Button>
            )}
            {filtered && (
              <Button variant="ghost" onClick={clear}>
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {body}

        {onPageChange && !loading && !error && runs.length > 0 && pages > 1 && (
          <div className={styles.pager}>
            <p className={styles.range}>
              {f.number(from)}–{f.number(to)} of {f.number(total_)}
            </p>
            <Pagination page={page} total={total_} pageSize={pageSize} onPageChange={onPageChange} />
          </div>
        )}
      </div>

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}
