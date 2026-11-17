"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Tabs } from "@base-ui/react/tabs";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import styles from "./pipeline.module.css";

export type PipelineStageStatus = "queued" | "running" | "done" | "failed" | "skipped";

export type PipelineLogLine =
  | string
  | {
      text: string;
      /** Colors the line: a result worth seeing in a long log. */
      tone?: "muted" | "success" | "warning" | "danger";
    };

export type PipelineStage = {
  id: string;
  /** A short name a person would use: "Build", "Import rows". */
  label: string;
  /** A 16px glyph for the node. Without one, the node shows the stage's number. */
  icon?: ReactNode;
  status: PipelineStageStatus;
  /** `Date.now()` values. They drive the duration under the node. */
  startedAt?: number;
  finishedAt?: number;
  /** Output, oldest first. Append to it; lines that arrive rise into the panel. */
  log?: PipelineLogLine[];
  /** `failed`: what went wrong, in a sentence: "2 specs failed in checkout". */
  error?: string;
};

export type PipelineMeta = string | { label: string; /** Set in mono: a branch, a commit, a file. */ code?: boolean };

type PipelineProps = {
  stages: PipelineStage[];
  /** What runs: "Deploy acme-web", "Import guest list". */
  title: string;
  /** Chips after the title: a branch, a commit, a source file. */
  meta?: PipelineMeta[];
  /** The stage whose log shows. Leave it out and the panel follows the work. */
  activeId?: string;
  onActiveChange?: (id: string) => void;
  /** Shows "Retry {stage}" when a stage failed. */
  onRetry?: (id: string) => void;
  /** Shows Cancel while it runs. */
  onCancel?: () => void;
  /** The person cancelled it. Mark the stages that didn't finish `skipped`. */
  cancelled?: boolean;
  /** The header once every stage is done: "Deployed", "Imported". Default "Done". */
  doneLabel?: string;
  /** The most the log panel grows to, in px. It starts six lines tall and never shrinks during a run. Default 216. */
  logHeight?: number;
  className?: string;
};

type Phase = "queued" | "running" | "done" | "failed" | "cancelled";

/** 2049 → "2.0s", 74000 → "1m 14s", 3720000 → "1h 2m". */
export function formatDuration(ms: number) {
  const s = Math.max(0, ms) / 1000;
  if (s < 60) return `${(Math.floor(s * 10) / 10).toFixed(1)}s`;
  const whole = Math.floor(s);
  if (whole < 3600) return `${Math.floor(whole / 60)}m ${String(whole % 60).padStart(2, "0")}s`;
  return `${Math.floor(whole / 3600)}h ${Math.floor((whole % 3600) / 60)}m`;
}

/** Ticks while `on`, so running durations count. Null before mount, so the server and the first paint agree. */
function useNow(on: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    if (!on) return () => window.clearTimeout(first);
    const t = window.setInterval(tick, 100);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [on]);
  return now;
}

const lineText = (l: PipelineLogLine) => (typeof l === "string" ? l : l.text);
const lineTone = (l: PipelineLogLine) =>
  typeof l === "string" ? (l.startsWith("$ ") ? "command" : undefined) : l.tone;

function stageTime(stage: PipelineStage, now: number | null) {
  if (stage.startedAt === undefined) return null;
  const end = stage.finishedAt ?? (stage.status === "running" ? now : null);
  if (end === null) return stage.status === "running" ? 0 : null;
  return end - stage.startedAt;
}

export function Pipeline({
  stages,
  title,
  meta,
  activeId,
  onActiveChange,
  onRetry,
  onCancel,
  cancelled = false,
  doneLabel = "Done",
  logHeight = 216,
  className,
}: PipelineProps) {
  const id = useId();
  const rootRef = useRef<HTMLElement>(null);

  const running = stages.find((s) => s.status === "running");
  const failed = stages.find((s) => s.status === "failed");
  const settledCount = stages.filter((s) => s.status === "done" || s.status === "skipped").length;
  const doneCount = stages.filter((s) => s.status === "done").length;
  // A skipped stage counts as started only if it ran before it was cancelled.
  const lastStarted = [...stages]
    .reverse()
    .find((s) => (s.status !== "queued" && s.status !== "skipped") || s.startedAt !== undefined);

  const phase: Phase = cancelled
    ? "cancelled"
    : failed
      ? "failed"
      : running
        ? "running"
        : stages.length > 0 && settledCount === stages.length
          ? "done"
          : lastStarted
            ? "running"
            : "queued";

  const now = useNow(phase === "running");

  // The panel follows the work: the running stage, else the one that failed,
  // else the last one that ran. A stage the person picks holds until they
  // pick the one being followed again, or a new run starts.
  const follow = (running ?? failed ?? lastStarted ?? stages[0])?.id ?? "";
  const runKey = String(stages[0]?.startedAt ?? "new");
  const [picked, setPicked] = useState<{ id: string; run: string } | null>(null);
  const pickedId = picked && picked.run === runKey && stages.some((s) => s.id === picked.id) ? picked.id : null;
  const viewed = activeId ?? pickedId ?? follow;
  const viewedStage = stages.find((s) => s.id === viewed);

  // Arrow keys follow the layout: across while the nodes sit in a row, up and
  // down once a narrow container stacks them.
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setOrientation(entry.contentRect.width < 520 ? "vertical" : "horizontal"),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Milestones for a screen reader: a stage starting, finishing or failing.
  const [announce, setAnnounce] = useState("");
  const prev = useRef<Map<string, PipelineStageStatus> | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = new Map(stages.map((s) => [s.id, s.status]));
    if (!before) return;
    const changed = stages.filter((s) => before.get(s.id) !== s.status);
    const said = changed
      .map((s) => {
        const t = stageTime(s, Date.now());
        if (s.status === "running") return `${s.label} started.`;
        if (s.status === "done") return `${s.label} done${t !== null ? ` in ${formatDuration(t)}` : ""}.`;
        if (s.status === "failed") return `${s.label} failed.${s.error ? ` ${s.error}.` : ""}`;
        return null;
      })
      .filter(Boolean);
    if (said.length) setAnnounce(said.join(" "));
  }, [stages]);

  const total = (() => {
    const first = stages.find((s) => s.startedAt !== undefined)?.startedAt;
    if (first === undefined) return null;
    if (phase === "running") return now === null ? 0 : now - first;
    const ends = stages.map((s) => s.finishedAt ?? 0);
    const end = Math.max(...ends);
    return end > first ? end - first : null;
  })();

  const status =
    phase === "running"
      ? `Running · ${(running ?? lastStarted)?.label ?? ""}`
      : phase === "failed"
        ? `Failed · ${failed?.label ?? ""}`
        : phase === "done"
          ? doneLabel
          : phase === "cancelled"
            ? "Cancelled"
            : "Queued";

  // Every value the status can take, laid under it, so its box is the widest
  // one's from the start and never clips or nudges the title.
  const statuses = [
    ...stages.flatMap((s) => [`Running · ${s.label}`, `Failed · ${s.label}`]),
    doneLabel,
    "Cancelled",
    "Queued",
  ];

  const position = running ? stages.indexOf(running) + 1 : settledCount;

  // The panel is as tall as the longest log this run, between six lines and
  // logHeight, so following the work to a new stage never shrinks it.
  const logLines = Math.max(0, ...stages.map((s) => s.log?.length ?? 0));

  return (
    <section
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-phase={phase}
      aria-labelledby={`${id}-title`}
      style={{ "--log-height": `${logHeight}px`, "--log-lines": logLines } as CSSProperties}
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <h3 id={`${id}-title`} className={styles.title}>
            {title}
          </h3>
          {meta?.map((m, i) => {
            const label = typeof m === "string" ? m : m.label;
            const code = typeof m !== "string" && m.code;
            return (
              <Badge key={`${label}-${i}`} size="sm" className={code ? styles.code : undefined}>
                {label}
              </Badge>
            );
          })}
        </div>
        <p className={styles.status} data-phase={phase}>
          <span className={styles.statusText}>
            {statuses.map((w, i) => (
              <span key={`${w}-${i}`} className={styles.reserve} aria-hidden="true">
                {w}
              </span>
            ))}
            <span className={styles.statusNow}>
              <span className={styles.statusDot} aria-hidden="true" />
              {status}
            </span>
          </span>
        </p>
      </header>

      <Tabs.Root
        className={styles.body}
        value={viewed}
        orientation={orientation}
        onValueChange={(v) => {
          const next = String(v);
          setPicked(next === follow ? null : { id: next, run: runKey });
          onActiveChange?.(next);
        }}
      >
        <Tabs.List
          className={styles.track}
          activateOnFocus
          aria-label={`${title}: stages`}
          style={{ "--count": stages.length } as CSSProperties}
        >
          {stages.map((s, i) => {
            const t = stageTime(s, now);
            const next = stages[i + 1];
            return (
              <div key={s.id} className={styles.step} data-status={s.status}>
                <Tabs.Tab
                  value={s.id}
                  className={styles.tab}
                  data-status={s.status}
                  aria-label={`${s.label}, ${s.status === "done" ? "done" : s.status}${t !== null && s.status !== "queued" ? `, ${formatDuration(t)}` : ""}`}
                >
                  <span className={styles.node} data-status={s.status}>
                    <span className={styles.glyph} aria-hidden="true">
                      {s.icon ?? <span className={styles.number}>{i + 1}</span>}
                    </span>
                    {(s.status === "done" || s.status === "failed") && (
                      <span className={styles.mark} data-status={s.status} aria-hidden="true">
                        <svg viewBox="0 0 12 12" width="12" height="12">
                          {s.status === "done" ? (
                            <path d="M3.25 6.25 L5.1 8 L8.75 4.25" pathLength={1} />
                          ) : (
                            <path d="M4 4 L8 8 M8 4 L4 8" pathLength={1} />
                          )}
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className={styles.text}>
                    <span className={styles.label}>{s.label}</span>
                    <span className={styles.time} data-status={s.status}>
                      {t !== null ? formatDuration(t) : s.status === "skipped" ? "skipped" : "–"}
                    </span>
                  </span>
                </Tabs.Tab>
                {next && (
                  <span
                    className={styles.connector}
                    data-filled={
                      s.status === "done" ||
                      (s.status === "skipped" && next.status !== "queued" && next.status !== "skipped") ||
                      undefined
                    }
                    data-active={s.status === "running" || undefined}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </Tabs.List>

        <div className={styles.well}>
          <div className={styles.caption}>
            <span className={styles.captionLabel}>
              {viewedStage ? `${viewedStage.label} output` : "Output"}
            </span>
            {phase === "running" && running && viewed !== running.id ? (
              <button
                type="button"
                className={styles.follow}
                onClick={() => {
                  setPicked(null);
                  onActiveChange?.(running.id);
                }}
              >
                Follow {running.label}
                <Icon name="arrow-right" />
              </button>
            ) : null}
          </div>
          {stages.map((s, i) => (
            <Tabs.Panel key={s.id} value={s.id} className={styles.panel}>
              <Log
                key={`${s.id}-${s.startedAt ?? "q"}`}
                stage={s}
                before={stages[i - 1]}
                cancelled={cancelled}
                // Reading back through a log pins its stage, so finishing doesn't pull it away.
                onHold={(held) => {
                  if (held) setPicked({ id: s.id, run: runKey });
                  else if (s.id === follow) setPicked(null);
                }}
              />
            </Tabs.Panel>
          ))}
        </div>
      </Tabs.Root>

      <footer className={styles.foot}>
        <p className={styles.summary}>
          {total !== null && <span className={styles.total}>{formatDuration(total)}</span>}
          {phase === "failed" && failed ? (
            <span className={styles.error}>{failed.error ?? `${failed.label} failed`}</span>
          ) : phase === "queued" ? (
            <span>Not started</span>
          ) : (
            <span>
              {phase === "running" ? `Stage ${Math.max(1, position)} of ${stages.length}` : `${doneCount} of ${stages.length} stages done`}
            </span>
          )}
        </p>
        <div className={styles.actions}>
          {phase === "running" && onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {phase === "failed" && failed && onRetry && (
            <Button variant="secondary" onClick={() => onRetry(failed.id)}>
              <Icon name="retry" />
              Retry {failed.label}
            </Button>
          )}
        </div>
      </footer>

      <span role="status" className={styles.srOnly}>
        {announce}
      </span>
    </section>
  );
}

/** One stage's output. Follows the end while the reader is there; once they scroll up it holds still. */
function Log({
  stage,
  before,
  cancelled,
  onHold,
}: {
  stage: PipelineStage;
  before?: PipelineStage;
  cancelled: boolean;
  onHold: (held: boolean) => void;
}) {
  const lines = stage.log ?? [];
  const ref = useRef<HTMLDivElement>(null);
  // Lines already there when the panel opens just appear; later ones rise in.
  const [seen] = useState(lines.length);
  const [heldAt, setHeldAt] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && heldAt === null) el.scrollTop = el.scrollHeight;
  }, [lines.length, heldAt]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    if (atEnd !== (heldAt === null)) onHold(!atEnd);
    setHeldAt((h) => (atEnd ? null : (h ?? lines.length)));
  };

  const behind = heldAt === null ? 0 : lines.length - heldAt;

  const empty =
    lines.length > 0
      ? null
      : stage.status === "queued"
        ? before
          ? `Waits for ${before.label}`
          : "Waits to start"
        : stage.status === "running"
          ? `Starting ${stage.label.toLowerCase()}…`
          : stage.status === "skipped"
            ? cancelled
              ? "Cancelled before it ran"
              : "Skipped"
            : stage.status === "failed"
              ? (stage.error ?? "Failed with no output")
              : "No output";

  return (
    <div className={styles.logFrame}>
      <div ref={ref} className={styles.log} onScroll={onScroll}>
        {empty ? (
          <p
            className={stage.status === "running" ? `${styles.empty} ${styles.working}` : styles.empty}
            data-status={stage.status}
          >
            {empty}
          </p>
        ) : (
          <ol className={styles.lines}>
            {lines.map((l, i) => (
              <li key={i} className={styles.line} data-tone={lineTone(l)} data-new={i >= seen || undefined}>
                {lineText(l)}
              </li>
            ))}
          </ol>
        )}
      </div>
      {behind > 0 && (
        <button
          type="button"
          className={styles.latest}
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
            el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
          }}
        >
          <Icon name="arrow-down" />
          {behind} new {behind === 1 ? "line" : "lines"}
        </button>
      )}
    </div>
  );
}
