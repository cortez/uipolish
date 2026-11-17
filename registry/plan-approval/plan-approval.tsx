"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { Kbd } from "../kbd/kbd";
import styles from "./plan-approval.module.css";

export type PlanStepStatus = "planned" | "approved" | "skipped" | "running" | "done" | "failed";
export type PlanDecision = "approve" | "skip";

export type PlanStep = {
  id: string;
  /** What the step does, as a verb phrase: "Text the 12 guests". */
  title: string;
  status: PlanStepStatus;
  /** Shown when the step is open: what exactly will happen, in a sentence or two. */
  detail?: ReactNode;
  /** The tool the step calls, shown in mono: "postbox.send_sms". */
  tool?: string;
  /** A 16px icon for the step. Without one, the step's number shows. */
  icon?: ReactNode;
  /** Shown when the step failed. Say what happened and what to do. */
  error?: string;
};

type PlanApprovalProps = {
  steps: PlanStep[];
  /** The card's title. */
  title?: ReactNode;
  /** Who made the plan, for announcements: "Copper". */
  agent?: string;
  /** The plan is running. Defaults to whether a step is `running`. */
  running?: boolean;
  onDecide?: (id: string, decision: PlanDecision) => void;
  /** Approve every step that's still planned. */
  onApproveAll?: () => void;
  onRun?: () => void;
  /** Shown as Stop while the plan runs. */
  onStop?: () => void;
  /** Shown on a failed step. */
  onRetry?: (id: string) => void;
  className?: string;
};

type Phase = "review" | "running" | "paused" | "finished";

const CHIP: Record<PlanStepStatus, string> = {
  planned: "Planned",
  approved: "Approved",
  skipped: "Skipped",
  running: "Running",
  done: "Done",
  failed: "Failed",
};
const CHIP_ORDER = Object.keys(CHIP) as PlanStepStatus[];
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const RAN: PlanStepStatus[] = ["approved", "running", "done", "failed"];

/** A number that keeps the width of its widest value, and rolls in when it changes. */
function Num({ value, max }: { value: number; max: number }) {
  const [prev, setPrev] = useState(value);
  const [rolled, setRolled] = useState(false);
  if (prev !== value) {
    setPrev(value);
    setRolled(true);
  }
  const width = String(Math.max(max, value)).length;
  return (
    <span className={styles.num}>
      {DIGITS.map((d) => (
        <span key={d} className={styles.numGhost} aria-hidden="true">
          {d.repeat(width)}
        </span>
      ))}
      <span key={value} className={styles.numValue} data-rolled={rolled || undefined}>
        {value}
      </span>
    </span>
  );
}

function Spinner() {
  return (
    <svg className={styles.spinner} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" opacity="0.22" />
      <circle className={styles.arc} cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" pathLength={1} />
    </svg>
  );
}

function Glyph({ step, index }: { step: PlanStep; index: number }) {
  return (
    <span className={styles.glyph} data-status={step.status} aria-hidden="true">
      <span data-layer="icon" className={styles.ownIcon}>
        {step.icon ?? <span className={styles.number}>{index + 1}</span>}
      </span>
      <span data-layer="running">
        <Spinner />
      </span>
      <svg data-layer="done" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path className={styles.tick} d="M5.25 8.25l1.9 1.9 3.6-3.9" pathLength={1} fill="none" stroke="var(--ui-surface)" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg data-layer="failed" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M8 4.75v3.6" stroke="var(--ui-on-danger)" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" />
        <circle cx="8" cy="10.9" r="0.95" fill="var(--ui-on-danger)" />
      </svg>
    </span>
  );
}

/** A status pill that keeps the width of its longest label and changes color in place. */
function Chip({ status }: { status: PlanStepStatus }) {
  return (
    <span className={styles.chip} data-status={status}>
      {CHIP_ORDER.map((s) => (
        <span key={s} className={styles.chipLabel} data-on={s === status || undefined} aria-hidden={s !== status || undefined}>
          {CHIP[s]}
        </span>
      ))}
    </span>
  );
}

function nextPlanned(steps: PlanStep[], from: string) {
  const at = steps.findIndex((s) => s.id === from);
  const order = [...steps.slice(at + 1), ...steps.slice(0, Math.max(at, 0))];
  return order.find((s) => s.status === "planned" && s.id !== from)?.id ?? null;
}

export function PlanApproval({
  steps,
  title = "Plan",
  agent,
  running: runningProp,
  onDecide,
  onApproveAll,
  onRun,
  onStop,
  onRetry,
  className,
}: PlanApprovalProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const hintId = `${uid}-hint`;
  const headRefs = useRef(new Map<string, HTMLButtonElement>());
  const rootRef = useRef<HTMLElement>(null);
  const focusNext = useRef<string | null>(null);

  const running = runningProp ?? steps.some((s) => s.status === "running");
  const ran = steps.some((s) => s.status === "done" || s.status === "failed");
  const waiting = steps.some((s) => s.status === "approved" || s.status === "planned");
  const phase: Phase = running ? "running" : !ran ? "review" : waiting ? "paused" : "finished";

  const total = steps.length;
  const approved = steps.filter((s) => s.status === "approved").length;
  const decided = steps.filter((s) => s.status !== "planned").length;
  const planned = total - decided;
  const runnable = steps.filter((s) => RAN.includes(s.status)).length;
  const done = steps.filter((s) => s.status === "done").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;

  const [expanded, setExpanded] = useState<string | null>(() =>
    phase === "review" ? (steps.find((s) => s.status === "planned")?.id ?? null) : (steps.find((s) => s.status === "failed")?.id ?? null),
  );
  const [active, setActive] = useState<string | null>(expanded ?? steps[0]?.id ?? null);
  const [announcement, setAnnouncement] = useState("");

  // React to what the parent changed: fold when the run starts, open a
  // failure, and say what happened.
  const [previous, setPrevious] = useState({ steps, phase });
  if (previous.steps !== steps || previous.phase !== phase) {
    setPrevious({ steps, phase });
    const said: string[] = [];
    if (phase === "running" && previous.phase !== "running") {
      setExpanded(null);
      said.push(`${agent ? `${agent} is running` : "Running"} ${runnable} ${runnable === 1 ? "step" : "steps"}`);
    }
    for (const step of steps) {
      const before = previous.steps.find((p) => p.id === step.id);
      if (!before || before.status === step.status) continue;
      if (step.status === "failed") {
        setExpanded(step.id);
        said.push(`${step.title} failed${step.error ? `: ${step.error}` : ""}`);
      } else if (step.status === "running" || step.status === "done" || phase === "review") {
        said.push(`${step.title}: ${CHIP[step.status].toLowerCase()}`);
      }
    }
    if (phase === "finished" && previous.phase === "running" && failed === 0) said.push(`Plan done. ${done} of ${runnable} steps ran`);
    if (expanded && !steps.some((s) => s.id === expanded)) setExpanded(null);
    if (said.length) setAnnouncement(said.join(". "));
  }

  useEffect(() => {
    const id = focusNext.current;
    if (!id) return;
    focusNext.current = null;
    headRefs.current.get(id)?.focus();
  });

  const reviewing = phase === "review";
  const open = phase === "review" || phase === "paused";
  const canDecide = (s: PlanStep) => (open && (s.status === "planned" || s.status === "approved" || s.status === "skipped")) || s.status === "failed";

  function decide(step: PlanStep, decision: PlanDecision) {
    if (!onDecide || !canDecide(step)) return;
    onDecide(step.id, decision);
    const next = step.status === "failed" ? null : nextPlanned(steps, step.id);
    setExpanded(next);
    // The buttons the person pressed are folding away; keep focus on a step.
    if (rootRef.current?.contains(document.activeElement)) {
      const to = next ?? step.id;
      setActive(to);
      focusNext.current = to;
    }
  }

  function onKey(event: KeyboardEvent<HTMLLIElement>, step: PlanStep, index: number) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    let to: number | null = null;
    if (key === "ArrowDown") to = Math.min(index + 1, total - 1);
    else if (key === "ArrowUp") to = Math.max(index - 1, 0);
    else if (key === "Home") to = 0;
    else if (key === "End") to = total - 1;
    else if ((key === "a" || key === "A") && !event.shiftKey && step.status !== "failed") {
      if (!canDecide(step)) return;
      event.preventDefault();
      decide(step, "approve");
      return;
    } else if ((key === "s" || key === "S") && !event.shiftKey) {
      if (!canDecide(step)) return;
      event.preventDefault();
      decide(step, "skip");
      return;
    } else return;
    event.preventDefault();
    const target = steps[to];
    if (!target) return;
    setActive(target.id);
    headRefs.current.get(target.id)?.focus();
  }

  const tabStop = steps.some((s) => s.id === active) ? active : (steps[0]?.id ?? null);
  const status =
    phase === "running" ? "running" : phase === "review" ? "review" : failed ? "stopped" : phase === "paused" ? "paused" : "done";

  return (
    <section
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      aria-labelledby={titleId}
      data-phase={phase}
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <h3 id={titleId} className={styles.title}>
            {title}
          </h3>
          <Badge size="sm" className={styles.count}>
            {total} {total === 1 ? "step" : "steps"}
          </Badge>
        </div>
        <span className={styles.status} data-status={status}>
          <span className={styles.statusLayer} data-on={status === "review" || undefined} aria-hidden={status !== "review" || undefined}>
            <Num value={decided} max={total} /> of {total} decided
          </span>
          <span className={styles.statusLayer} data-on={status === "running" || undefined} aria-hidden={status !== "running" || undefined}>
            <span className={styles.liveDot} aria-hidden="true" />
            Running
          </span>
          <span className={styles.statusLayer} data-on={status === "done" || undefined} aria-hidden={status !== "done" || undefined}>
            <Icon name="check" />
            Plan done
          </span>
          <span className={styles.statusLayer} data-on={status === "stopped" || undefined} aria-hidden={status !== "stopped" || undefined}>
            Stopped
          </span>
          <span className={styles.statusLayer} data-on={status === "paused" || undefined} aria-hidden={status !== "paused" || undefined}>
            Paused
          </span>
        </span>
      </header>

      <div className={styles.card}>
        {total === 0 ? (
          <p className={styles.empty}>No steps yet. {agent ?? "The agent"} will list them here before anything runs.</p>
        ) : (
          <ol className={styles.list} aria-label="Steps">
            {steps.map((step, index) => {
              const isOpen = expanded === step.id;
              const panelId = `${uid}-${step.id}`;
              const deciding = Boolean(onDecide) && canDecide(step) && step.status !== "failed";
              return (
                <li
                  key={step.id}
                  className={styles.step}
                  data-status={step.status}
                  data-open={isOpen || undefined}
                  onKeyDown={(e) => onKey(e, step, index)}
                >
                  <button
                    ref={(el) => {
                      if (el) headRefs.current.set(step.id, el);
                      else headRefs.current.delete(step.id);
                    }}
                    type="button"
                    className={styles.head}
                    tabIndex={tabStop === step.id ? 0 : -1}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    aria-describedby={open && onDecide ? hintId : undefined}
                    aria-keyshortcuts={open && onDecide ? "A S" : undefined}
                    onFocus={() => setActive(step.id)}
                    onClick={() => setExpanded(isOpen ? null : step.id)}
                  >
                    <Glyph step={step} index={index} />
                    <span className={styles.stepTitle}>
                      {step.title}
                      <span className={styles.srOnly}>, </span>
                    </span>
                    <Chip status={step.status} />
                  </button>
                  <div id={panelId} className={styles.panel} inert={!isOpen}>
                    <div className={styles.clip}>
                      <div className={styles.body}>
                        {step.detail && <p className={styles.detail}>{step.detail}</p>}
                        {step.tool && (
                          <p className={styles.tool}>
                            <span className={styles.toolLabel}>Uses</span>
                            <code className={styles.toolName}>{step.tool}</code>
                          </p>
                        )}
                        {step.status === "failed" && (
                          <p className={styles.error}>{step.error ?? "This step didn’t finish."}</p>
                        )}
                        {deciding && (
                          <div className={styles.actions}>
                            <Button
                              variant="secondary"
                              aria-pressed={step.status === "approved"}
                              onClick={() => decide(step, "approve")}
                            >
                              <Icon name="check" />
                              Approve
                              <span className={styles.key} aria-hidden="true">
                                <Kbd keys={["A"]} size="sm" />
                              </span>
                            </Button>
                            <Button
                              variant="ghost"
                              aria-pressed={step.status === "skipped"}
                              onClick={() => decide(step, "skip")}
                            >
                              Skip
                              <span className={styles.key} aria-hidden="true">
                                <Kbd keys={["S"]} size="sm" />
                              </span>
                            </Button>
                          </div>
                        )}
                        {step.status === "failed" && (onRetry || onDecide) && (
                          <div className={styles.actions}>
                            {onRetry && (
                              <Button variant="secondary" onClick={() => onRetry(step.id)}>
                                <Icon name="retry" />
                                Retry
                              </Button>
                            )}
                            {onDecide && (
                              <Button variant="ghost" onClick={() => decide(step, "skip")}>
                                Skip
                                <span className={styles.key} aria-hidden="true">
                                  <Kbd keys={["S"]} size="sm" />
                                </span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <footer className={styles.footer}>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.fill} style={{ scale: `${runnable ? (done + failed) / runnable : 0} 1` }} />
        </span>
        <span className={styles.tally}>
          <span className={styles.tallyLayer} data-on={reviewing || undefined} aria-hidden={!reviewing || undefined}>
            <Num value={approved} max={total} /> approved
          </span>
          <span className={styles.tallyLayer} data-on={!reviewing || undefined} aria-hidden={reviewing || undefined}>
            <Num value={done} max={runnable} /> of {runnable} done
            {skipped > 0 && <span className={styles.quiet}> · {skipped} skipped</span>}
          </span>
        </span>
        <span className={styles.buttons} data-phase={phase}>
          <span className={styles.slot}>
            <span className={styles.slotLayer} data-on={reviewing || undefined}>
              <Button variant="ghost" disabled={!planned || !onApproveAll} inert={!reviewing} onClick={onApproveAll}>
                Approve all
              </Button>
            </span>
            {onStop && (
              <span className={styles.slotLayer} data-on={phase === "running" || undefined}>
                <Button variant="ghost" inert={phase !== "running"} onClick={onStop}>
                  Stop
                </Button>
              </span>
            )}
          </span>
          <span className={`${styles.slot} ${styles.runSlot}`}>
            <span className={styles.slotLayer} data-on={phase !== "finished" || undefined}>
              <Button
                variant="primary"
                busy={phase === "running"}
                busyLabel="Running…"
                disabled={open && (!approved || !onRun)}
                inert={phase === "finished"}
                onClick={onRun}
              >
                {phase === "paused" ? "Resume" : "Run plan"}
              </Button>
            </span>
          </span>
        </span>
      </footer>

      <span id={hintId} className={styles.srOnly}>
        Press A to approve, S to skip.
      </span>
      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </section>
  );
}
