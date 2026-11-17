"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BrandMark, type BrandName } from "../brand-marks/brand-marks";
import { Button } from "../button/button";
import { Icon, type IconName } from "../icons/icons";
import { ModelPicker, type ModelOption } from "../model-picker/model-picker";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./agent-task.module.css";

/** What the agent is doing right now. Each has its own color. */
export type AgentPhase = "reading" | "searching" | "thinking" | "writing" | "reviewing";

/** Where the run is. `done`, `failed` and `stopped` are over. */
export type AgentStatus = "running" | "paused" | "done" | "failed" | "stopped";

export type AgentStepStatus = "pending" | "running" | "done" | "failed" | "skipped";

export type AgentStep = {
  id: string;
  /** What the step does, as a person would put it: "Read split-bill.ts". */
  title: string;
  status: AgentStepStatus;
};

export type AgentSearchResult = {
  title: string;
  /** Where it's from, short: "github.com/dinerojs/dinero.js". */
  source: string;
  /** The site's mark from `brand-marks`. Without one, the source's first letter shows. */
  brand?: BrandName;
};

/** A run of text in a revision: kept, struck out, or put in. */
export type AgentRevisionPart = string | { removed: string } | { added: string };

/** What the context panel shows. One kind per phase, plus the summary at the end. */
export type AgentContext =
  /** A file being read. Leave `lines` out while it loads: placeholder lines show. */
  | { kind: "file"; path: string; lines?: string[]; startLine?: number }
  /** A search: the query, and results as they come back. `running` while it's out. */
  | { kind: "search"; query: string; results: AgentSearchResult[]; running?: boolean }
  /** What the agent is weighing, a few words each. The newest is the strongest. */
  | { kind: "notes"; notes: string[] }
  /** Text being written. Pass the text so far; only append. `code` sets it in mono. */
  | { kind: "writing"; path?: string; text: string; streaming?: boolean; code?: boolean }
  /** A revision: what it took out and what it put in, in place. */
  | { kind: "review"; path?: string; note?: string; parts: AgentRevisionPart[]; code?: boolean }
  /** How it ended, in a line: "Split bills add up to the cent". `detail` defaults to steps, tokens and time. */
  | { kind: "summary"; title: string; detail?: string };

export type AgentTool = {
  id: string;
  /** Always shown in words beside the mark (or, when narrow, for the one in use). */
  name: string;
  /** The service's mark from `brand-marks`. */
  brand?: BrandName;
  /** Your own mark, for a tool without a brand: `<Icon name="file" />`. Sized to 14px. */
  icon?: ReactNode;
};

export type AgentUsage = {
  tokens: number;
  /** In dollars. */
  cost: number;
  /** `Date.now()` when the run started. Drives the clock. */
  startedAt?: number;
  /** `Date.now()` when it ended. The clock holds there. */
  endedAt?: number;
  /** Time spent paused so far, in ms; left off the clock. */
  pausedMs?: number;
};

type AgentTaskProps = {
  /** The agent's name, as the person knows it. */
  agent?: string;
  phase: AgentPhase;
  /** The words for the phase, under the agent's name. Defaults to "Reading file", "Searching web", "Thinking", "Writing", "Reviewing". */
  phaseLabel?: string;
  status?: AgentStatus;
  /** What the person asked for, as the run's title. */
  task: string;
  steps: AgentStep[];
  context?: AgentContext;
  /** `failed`: what happened and what it means, in words. Shown in the context panel. */
  error?: string;
  /** 0 to 1. Defaults to the steps: each done step counts one, the running one a half. */
  progress?: number;
  tools?: AgentTool[];
  /** The `id` of the tool in use. */
  activeTool?: string;
  usage?: AgentUsage;
  /** Formats the cost. Default: "$0.032", "$1.24". */
  formatCost?: (dollars: number) => string;
  model?: string;
  models?: ModelOption[];
  onModelChange?: (id: string) => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  /** Run again once it's over; "Try again" when it failed. */
  onRunAgain?: () => void;
  className?: string;
};

const PHASE_LABEL: Record<AgentPhase, string> = {
  reading: "Reading file",
  searching: "Searching web",
  thinking: "Thinking",
  writing: "Writing",
  reviewing: "Reviewing",
};

/** The glyph in the head's tile: what it's doing, at a glance. */
const PHASE_ICON: Record<AgentPhase, IconName> = {
  reading: "file",
  searching: "search",
  thinking: "more",
  writing: "pencil",
  reviewing: "eye",
};

const STATUS_ICON: Partial<Record<AgentStatus, IconName>> = {
  paused: "pause",
  done: "check",
  failed: "alert",
  stopped: "stop",
};

const STATUS_LABEL: Partial<Record<AgentStatus, string>> = {
  paused: "Paused",
  done: "Complete",
  failed: "Failed",
  stopped: "Stopped",
};

const STEP_TEXT: Record<AgentStepStatus, string> = {
  pending: "To do",
  running: "In progress",
  done: "Done",
  failed: "Failed",
  skipped: "Skipped",
};

const OVER: AgentStatus[] = ["done", "failed", "stopped"];

/** 842 → "842", 10480 → "10.5k", 248000 → "248k". */
export function formatTokens(n: number) {
  if (n < 1000) return String(Math.round(n));
  if (n < 1e6) {
    const k = n / 1000;
    return k < 99.95 ? `${k.toFixed(1)}k` : `${Math.round(k)}k`;
  }
  return `${(n / 1e6).toFixed(1)}M`;
}

const defaultCost = (n: number) => (n < 1 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`);

/** 15000 → "0:15", 754000 → "12:34", 3840000 → "1:04:00". */
function formatClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** The same string with every digit as an 8: the widest a number of that shape gets. */
const widest = (s: string) => s.replace(/\d/g, "8");

/** A number that holds its width: the widest value of its shape reserves the box. Pass several when no one value is widest in every face. */
function Counter({ value, reserve, className }: { value: string; reserve: string | string[]; className?: string }) {
  return (
    <span className={className ? `${styles.counter} ${className}` : styles.counter}>
      {(Array.isArray(reserve) ? reserve : [reserve]).map((r) => (
        <span key={r} className={styles.reserve} aria-hidden="true">
          {r}
        </span>
      ))}
      <span className={styles.value}>{value}</span>
    </span>
  );
}

/** "3/12" with each digit 0 to 9 in turn: in a face without tabular figures, one of them is the widest. */
const everyDigit = (total: number) => Array.from({ length: 10 }, (_, d) => `${String(total).replace(/\d/g, String(d))}/${total}`);

/** Ticks twice a second while `on`; holds its last value otherwise. Starts after mount. */
function useClock(on: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    if (!on) return () => window.clearTimeout(first);
    const id = window.setInterval(tick, 500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [on]);
  return now;
}

/** The agent's tile: the phase's glyph on its tint. The glyph redraws as the phase changes; the end states take theirs. */
function PhaseTile({ icon }: { icon: IconName }) {
  return (
    <span className={styles.tile} aria-hidden="true">
      <Icon name={icon} />
    </span>
  );
}

function StepIcon({ status }: { status: AgentStepStatus }) {
  return (
    <span className={styles.stepIcon} data-status={status} aria-hidden="true">
      <svg data-icon="pending" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" />
      </svg>
      <svg data-icon="running" viewBox="0 0 16 16">
        <circle className={styles.spinTrack} cx="8" cy="8" r="6" fill="none" />
        <path className={styles.spinArc} d="M8 2a6 6 0 0 1 6 6" fill="none" strokeLinecap="round" />
      </svg>
      <svg data-icon="done" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path className={styles.tick} d="M5.25 8.25l1.9 1.9 3.6-3.9" pathLength={1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg data-icon="failed" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M8 4.75v3.6" stroke="var(--ui-on-danger)" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" />
        <circle cx="8" cy="10.9" r="0.95" fill="var(--ui-on-danger)" />
      </svg>
      <svg data-icon="skipped" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" />
        <path d="M5.5 8h5" stroke="currentColor" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ToolMark({ tool }: { tool: AgentTool }) {
  if (tool.brand) return <BrandMark name={tool.brand} size={14} className={styles.toolMark} />;
  if (tool.icon) return <span className={styles.toolMark}>{tool.icon}</span>;
  return <span className={`${styles.toolMark} ${styles.toolLetter}`}>{tool.name.slice(0, 1).toUpperCase()}</span>;
}

/** How many items a layer had when it mounted: only later ones animate in. */
function useInitialCount(count: number) {
  const [initial] = useState(count);
  return initial;
}

function FileView({ ctx }: { ctx: Extract<AgentContext, { kind: "file" }> }) {
  const start = ctx.startLine ?? 1;
  return (
    <div className={styles.doc}>
      <div className={styles.docMain}>
        <p className={styles.path}>{ctx.path}</p>
        {ctx.lines ? (
          <ol className={styles.code} aria-label={`Lines ${start} to ${start + ctx.lines.length - 1}`} start={start}>
            {ctx.lines.map((line, i) => (
              <li key={i} className={styles.codeLine}>
                <span className={styles.lineNo} aria-hidden="true">
                  {start + i}
                </span>
                <span className={styles.lineText}>{line || " "}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.bones} aria-label="Loading the file" role="img">
            {[86, 64, 92, 48, 74].map((w, i) => (
              <span key={i} className={styles.bone} style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchView({ ctx }: { ctx: Extract<AgentContext, { kind: "search" }> }) {
  const initial = useInitialCount(ctx.results.length);
  return (
    <div className={styles.search}>
      <p className={styles.query} data-running={ctx.running || undefined}>
        <Icon name="search" className={styles.queryIcon} />
        <span className={styles.queryText}>
          <span className={styles.srOnly}>Searched for: </span>
          {ctx.query}
          {ctx.running && <span className={styles.caret} aria-hidden="true" />}
        </span>
      </p>
      {ctx.results.length > 0 && (
        <ol className={styles.results} aria-label="Results">
          {ctx.results.map((r, i) => (
            <li key={`${i}-${r.title}`} className={styles.result} data-enter={i >= initial || undefined}>
              <span className={styles.resultMark} aria-hidden="true">
                {r.brand ? <BrandMark name={r.brand} size={12} /> : <span className={styles.resultLetter}>{(r.source.match(/[a-z0-9]/i)?.[0] ?? "?").toUpperCase()}</span>}
              </span>
              <span className={styles.resultText}>
                <span className={styles.resultTitle}>{r.title}</span>
                <span className={styles.srOnly}>, </span>
                <span className={styles.resultSource}>{r.source}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NotesView({ ctx }: { ctx: Extract<AgentContext, { kind: "notes" }> }) {
  const initial = useInitialCount(ctx.notes.length);
  return (
    <ul className={styles.notes} aria-label="Notes">
      {ctx.notes.map((note, i) => (
        <li key={`${i}-${note}`} className={styles.note} data-latest={i === ctx.notes.length - 1 || undefined} data-enter={i >= initial || undefined}>
          {note}
        </li>
      ))}
    </ul>
  );
}

function WritingView({ ctx }: { ctx: Extract<AgentContext, { kind: "writing" }> }) {
  return (
    <div className={styles.doc}>
      <div className={styles.docMain}>
        {ctx.path && <p className={styles.path}>{ctx.path}</p>}
        <p className={styles.written} data-code={ctx.code || undefined} aria-busy={ctx.streaming || undefined}>
          {ctx.text}
          {ctx.streaming && <span className={styles.caret} aria-hidden="true" />}
        </p>
      </div>
    </div>
  );
}

function ReviewView({ ctx }: { ctx: Extract<AgentContext, { kind: "review" }> }) {
  const initial = useInitialCount(ctx.parts.length);
  return (
    <div className={styles.doc}>
      <div className={styles.docMain}>
        {(ctx.path || ctx.note) && (
          <p className={styles.path}>
            {ctx.path}
            {ctx.path && ctx.note && <span aria-hidden="true"> · </span>}
            {ctx.note && <span className={styles.pathNote}>{ctx.note}</span>}
          </p>
        )}
        <p className={styles.written} data-code={ctx.code || undefined}>
          {ctx.parts.map((part, i) => {
            const enter = i >= initial || undefined;
            if (typeof part === "string") return <span key={i}>{part}</span>;
            if ("removed" in part)
              return (
                <del key={i} className={styles.removed} data-enter={enter}>
                  <span className={styles.srOnly}>Removed: </span>
                  {part.removed}
                </del>
              );
            return (
              <ins key={i} className={styles.added} data-enter={enter}>
                <span className={styles.srOnly}>Added: </span>
                {part.added}
              </ins>
            );
          })}
        </p>
      </div>
    </div>
  );
}

function OutcomeView({ tone, title, detail }: { tone: "done" | "failed"; title: string; detail?: string }) {
  return (
    <div className={styles.outcome} data-tone={tone}>
      <span className={styles.outcomeTile} aria-hidden="true">
        {tone === "done" ? (
          <svg viewBox="0 0 24 24">
            <path className={styles.outcomeTick} d="M6.5 12.5l3.75 3.75L17.5 8.5" pathLength={1} />
          </svg>
        ) : (
          <Icon name="alert" />
        )}
      </span>
      <div className={styles.outcomeText}>
        <p className={styles.outcomeTitle}>{title}</p>
        {detail && <p className={styles.outcomeDetail}>{detail}</p>}
      </div>
    </div>
  );
}

type Shown =
  | { key: string; type: "context"; context: AgentContext }
  | { key: string; type: "error"; title: string; detail?: string }
  | { key: string; type: "empty" };

function keyOf(ctx: AgentContext) {
  switch (ctx.kind) {
    case "file":
    case "writing":
    case "review":
      return `${ctx.kind}:${ctx.path ?? ""}`;
    case "summary":
      return "summary";
    case "search":
    case "notes":
      // One layer while the query is typed and the results come in: only a new kind trades it.
      return ctx.kind;
  }
}

function edgesOf(el: HTMLElement) {
  const room = el.scrollHeight - el.clientHeight;
  return { overflow: room > 1, top: el.scrollTop > 1, bottom: room - el.scrollTop > 1 };
}

/** One layer of the context panel: scrolls if its content outgrows the panel, and follows text as it streams. */
function Layer({ shown, leaving, enter, summaryDetail, onLeft }: { shown: Shown; leaving?: boolean; enter?: boolean; summaryDetail: string; onLeft?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ overflow: false, top: false, bottom: false });
  // Only streaming text follows its end; everything else opens at its top.
  const follows = shown.type === "context" && shown.context.kind === "writing";
  const pinned = useRef(follows);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // Streaming text stays in view while the reader hasn't scrolled away from the end.
      if (pinned.current) el.scrollTop = el.scrollHeight;
      setEdges(edgesOf(el));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, []);

  let body: ReactNode = null;
  if (shown.type === "empty") body = <p className={styles.starting}>Getting started…</p>;
  else if (shown.type === "error") body = <OutcomeView tone="failed" title={shown.title} detail={shown.detail} />;
  else {
    const ctx = shown.context;
    if (ctx.kind === "file") body = <FileView ctx={ctx} />;
    else if (ctx.kind === "search") body = <SearchView ctx={ctx} />;
    else if (ctx.kind === "notes") body = <NotesView ctx={ctx} />;
    else if (ctx.kind === "writing") body = <WritingView ctx={ctx} />;
    else if (ctx.kind === "review") body = <ReviewView ctx={ctx} />;
    else body = <OutcomeView tone="done" title={ctx.title} detail={ctx.detail ?? summaryDetail} />;
  }

  return (
    <div
      ref={ref}
      className={styles.layer}
      data-leaving={leaving || undefined}
      data-enter={enter || undefined}
      data-fade-top={edges.top || undefined}
      data-fade-bottom={edges.bottom || undefined}
      aria-hidden={leaving || undefined}
      inert={leaving || undefined}
      tabIndex={edges.overflow && !leaving ? 0 : undefined}
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = follows && el.scrollHeight - el.scrollTop - el.clientHeight < 8;
        const next = edgesOf(el);
        if (next.top !== edges.top || next.bottom !== edges.bottom) setEdges(next);
      }}
      onAnimationEnd={(e) => {
        if (leaving && e.target === e.currentTarget) onLeft?.();
      }}
    >
      <div className={styles.layerInner}>{body}</div>
    </div>
  );
}

/** The live view of an agent working through a task: phase, steps, what it's looking at, tools, model and spend. */
export function AgentTask({
  agent = "Agent",
  phase,
  phaseLabel,
  status = "running",
  task,
  steps,
  context,
  error,
  progress,
  tools = [],
  activeTool,
  usage,
  formatCost = defaultCost,
  model,
  models,
  onModelChange,
  onPause,
  onResume,
  onStop,
  onRunAgain,
  className,
}: AgentTaskProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const footRef = useRef<HTMLDivElement>(null);

  const over = OVER.includes(status);
  const running = status === "running";
  const label = STATUS_LABEL[status] ?? phaseLabel ?? PHASE_LABEL[phase];

  const total = steps.length;
  const done = steps.filter((s) => s.status === "done" || s.status === "skipped").length;
  const doneCount = steps.filter((s) => s.status === "done").length;
  const working = steps.some((s) => s.status === "running");
  const value = Math.min(1, Math.max(0, status === "done" ? 1 : (progress ?? (total ? (done + (working ? 0.5 : 0)) / total : 0))));

  const now = useClock(running && usage?.startedAt !== undefined);
  let clock = "0:00";
  if (usage?.startedAt !== undefined) {
    const end = usage.endedAt ?? now ?? usage.startedAt;
    clock = formatClock(end - usage.startedAt - (usage.pausedMs ?? 0));
  }
  const tokens = formatTokens(usage?.tokens ?? 0);
  const cost = formatCost(usage?.cost ?? 0);
  const summaryDetail = `${total} ${total === 1 ? "step" : "steps"} · ${tokens} tokens · ${clock}`;

  const failedStep = steps.find((s) => s.status === "failed");
  // What the context panel shows: the error once it's failed, else the context.
  const target: Shown =
    status === "failed"
      ? { key: "error", type: "error", title: failedStep ? `Step ${steps.indexOf(failedStep) + 1} of ${total} failed: ${failedStep.title}` : "The run failed", detail: error }
      : context
        ? { key: keyOf(context), type: "context", context }
        : { key: "empty", type: "empty" };

  // When the kind changes, the old layer stays a beat to fade under the new one.
  // The last thing shown is kept (by the props it came from), so it leaves as it was.
  const [last, setLast] = useState({ shown: target, context, status, error });
  const [leaving, setLeaving] = useState<Shown[]>([]);
  const [swapped, setSwapped] = useState(false);
  if (last.context !== context || last.status !== status || last.error !== error) {
    if (last.shown.key !== target.key) {
      setLeaving((l) => [...l.filter((x) => x.key !== target.key), last.shown]);
      setSwapped(true);
    }
    setLast({ shown: target, context, status, error });
  }

  // Milestones only: each phase, a pause, and how it ended.
  const [announcement, setAnnouncement] = useState("");
  const [heard, setHeard] = useState(`${status}:${label}`);
  if (heard !== `${status}:${label}`) {
    setHeard(`${status}:${label}`);
    if (status === "running") setAnnouncement(`${agent}: ${label}`);
    else if (status === "paused") setAnnouncement(`${agent} paused`);
    else if (status === "done") setAnnouncement(`${task}: complete. ${context?.kind === "summary" ? context.title : ""}`.trim());
    else if (status === "failed") setAnnouncement(`${task}: failed. ${error ?? ""}`.trim());
    else setAnnouncement(`${agent} stopped`);
  }

  // Stop leaves with the state it causes; if it had focus, the main button takes it.
  const stopHadFocus = useRef(false);
  const showStop = !over && Boolean(onStop);
  useLayoutEffect(() => {
    if (showStop || !stopHadFocus.current) return;
    stopHadFocus.current = false;
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    footRef.current?.querySelector<HTMLElement>("[data-main]")?.focus({ preventScroll: true });
  }, [showStop]);

  let main: { label: string; icon: IconName; variant: "primary" | "secondary"; onClick: () => void } | null = null;
  if (running && onPause) main = { label: "Pause", icon: "pause", variant: "secondary", onClick: onPause };
  else if (status === "paused" && onResume) main = { label: "Resume", icon: "play", variant: "primary", onClick: onResume };
  else if (over && onRunAgain) main = { label: status === "failed" ? "Try again" : "Run again", icon: "retry", variant: "primary", onClick: onRunAgain };

  // Pause and Resume trade back and forth while it runs, so each reserves the other's width. Run again comes once, when Stop goes and leaves room.
  const mainNames = [...new Set([main?.label, ...(over ? [] : [onPause && "Pause", onResume && "Resume"])])].filter((n): n is string => Boolean(n));

  const showModel = Boolean(models?.length && model !== undefined && onModelChange);
  const showFootTop = tools.length > 0 || showModel;

  return (
    <section
      className={className ? `${styles.root} ${className}` : styles.root}
      data-phase={phase}
      data-status={status}
      aria-labelledby={titleId}
    >
      <div className={styles.head}>
        <PhaseTile icon={STATUS_ICON[status] ?? PHASE_ICON[phase]} />
        <div className={styles.heading}>
          <p className={styles.byline}>
            <span className={styles.agent}>{agent}</span>
            <span className={styles.phase}>
              <TextMorph>{label}</TextMorph>
            </span>
          </p>
          <h3 id={titleId} className={styles.task}>
            {task}
          </h3>
        </div>
        <div className={styles.progress}>
          <div
            className={styles.track}
            role="progressbar"
            aria-label={`${task}: progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(value * 100)}
            aria-valuetext={`${doneCount} of ${total} steps done`}
          >
            <span className={styles.fill} style={{ scale: `${value} 1` }} />
          </div>
          <Counter className={styles.count} value={`${doneCount}/${total}`} reserve={everyDigit(total)} />
        </div>
      </div>

      <div className={styles.panel} data-steps>
        <ol className={styles.steps} aria-label="Steps">
          {steps.map((step) => (
            <li key={step.id} className={styles.step} data-status={step.status}>
              <StepIcon status={step.status} />
              <span className={styles.stepTitle}>
                <span className={styles.srOnly}>{STEP_TEXT[step.status]}: </span>
                {step.title}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.panel} data-context role="region" aria-label={`${agent}’s workspace`}>
        <div className={styles.stage}>
          {leaving.map((l) => (
            <Layer key={`out-${l.key}`} shown={l} leaving summaryDetail={summaryDetail} onLeft={() => setLeaving((all) => all.filter((x) => x !== l))} />
          ))}
          <Layer key={`in-${target.key}`} shown={target} enter={swapped} summaryDetail={summaryDetail} />
        </div>
      </div>

      <div ref={footRef} className={styles.panel} data-foot>
        {showFootTop && (
          <div className={styles.footTop}>
            {tools.length > 0 && (
              <ul className={styles.tools} aria-label="Tools">
                {tools.map((tool) => {
                  const active = tool.id === activeTool && !over;
                  return (
                    <li key={tool.id} className={styles.tool} data-active={active || undefined}>
                      <ToolMark tool={tool} />
                      <span className={styles.toolName}>
                        {tool.name}
                        {active && <span className={styles.srOnly}>, in use</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {showModel && (
              <ModelPicker className={styles.model} models={models!} value={model!} onValueChange={onModelChange!} side="top" align="end" />
            )}
          </div>
        )}
        <div className={styles.footBottom}>
          <p className={styles.usage}>
            <span className={styles.stat}>
              <Counter value={tokens} reserve={tokens.length > 5 ? widest(tokens) : "88.8k"} />
              <span className={styles.statUnit}>tokens</span>
            </span>
            <span className={styles.stat}>
              <span className={styles.srOnly}>Cost: </span>
              <Counter value={cost} reserve={widest(cost)} />
            </span>
            <span className={styles.stat}>
              <span className={styles.srOnly}>Time: </span>
              <Counter value={clock} reserve={widest(clock)} />
            </span>
          </p>
          <div className={styles.actions}>
            {showStop && (
              <Button
                variant="ghost"
                className={styles.compact}
                aria-label="Stop"
                onClick={onStop}
                onFocus={() => (stopHadFocus.current = true)}
                onBlur={(e) => {
                  // Removed while focused also blurs, with nowhere to go: only a real move away counts.
                  const left = e.currentTarget;
                  if (e.relatedTarget) stopHadFocus.current = false;
                  else
                    requestAnimationFrame(() => {
                      if (left.isConnected) stopHadFocus.current = false;
                    });
                }}
              >
                {[
                  <Icon key="icon" name="stop" />,
                  <span key="label" className={styles.buttonLabel}>
                    Stop
                  </span>,
                ]}
              </Button>
            )}
            {main && (
              <Button
                variant={main.variant}
                className={over ? undefined : styles.compact}
                aria-label={main.label}
                data-main
                onClick={main.onClick}
              >
                {/* An array, not one element: Button would take one named element for an icon-only capsule at every width. */}
                {[
                  <Icon key="icon" name={main.icon} />,
                  <span key="label" className={styles.buttonLabel}>
                    {/* The names it trades between reserve the slot, so trading one for the other moves nothing beside it. */}
                    {mainNames.map((n) => (
                      <span key={n} className={styles.reserve} aria-hidden="true">
                        {n}
                      </span>
                    ))}
                    <span className={styles.morphSlot}>
                      <TextMorph>{main.label}</TextMorph>
                    </span>
                  </span>,
                ]}
              </Button>
            )}
          </div>
        </div>
      </div>

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </section>
  );
}
