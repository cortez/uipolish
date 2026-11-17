"use client";

import {
  Children,
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { ButtonLink } from "../button/button-link";
import { Icon } from "../icons/icons";
import { Progress } from "../progress/progress";
import { ToolSteps, type ToolStep } from "../tool-steps/tool-steps";
import styles from "./background-run.module.css";

export type RunStatus = "queued" | "running" | "needs-input" | "done" | "failed" | "stopped";

export type RunChange = {
  /** How many. Shown in equal-width figures before the label. */
  count?: number;
  /** What happened, read after the count: "recipes updated". */
  label: string;
  /** @deprecated Not shown since 0.2.0; the open run keeps to one line per change. */
  detail?: string;
};

export type Run = {
  id: string;
  /** The task, as the person asked for it: "Plan Saturday’s shopping". */
  title: string;
  status: RunStatus;
  /** `Date.now()` values. They drive the elapsed and "4m ago" times. */
  queuedAt?: number;
  startedAt?: number;
  finishedAt?: number;
  /** `queued`: why it's waiting. Defaults to "Waiting to start". */
  detail?: string;
  /** `running`: what it's doing now, in words: "Checking stock at Acme". */
  step?: string;
  /** Steps finished out of the total, "3 of 7". Shown as a bar in the open run until it's done. */
  progress?: { done: number; total: number };
  /** `needs-input`: what the agent needs, and the button that takes the person there. */
  need?: {
    /** One sentence: "Needs your OK to send 12 messages from Postbox." */
    text: string;
    /** The button: "Review 1 request". */
    action: string;
    /** Render the button as a link to this page instead. */
    href?: string;
    /** When it started waiting, as `Date.now()`. */
    since?: number;
  };
  /** `done`: one line. Without it, the changes are joined: "4 recipes updated, 12 messages sent". */
  summary?: string;
  /** `done`: what changed. Otherwise what was finished so far. `[]` says nothing was. */
  changes?: RunChange[];
  /** `failed`: what happened, in words. */
  error?: string;
  /** Replaces the default note in the stop confirmation: "12 messages already went out." */
  stopNote?: string;
  /** Link "Review changes" to this page instead of calling `onReview`. */
  reviewHref?: string;
  /** The agent's actions, folded into one line in the open run. */
  steps?: ToolStep[];
};

type BackgroundRunProps = {
  run: Run;
  /** The agent's name, as the person knows it. */
  agent?: string;
  /** `false` marks the run as new, with a small dot by the time, until the person opens it. */
  seen?: boolean;
  /** Controlled open state. Leave out to let the run open and close itself. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** The person opened the run or used its main button. Set `seen` here. */
  onOpen?: (id: string) => void;
  /** `queued`, `running`, `needs-input`. Set `stopped` once the agent has stopped. Return a promise to show an error if it rejects. */
  onStop?: (id: string) => void | Promise<unknown>;
  /** `failed`: Retry. `stopped`: Run again. */
  onRetry?: (id: string) => void;
  /** `needs-input`: the main button. */
  onRespond?: (id: string) => void;
  /** `done`, and `failed` or `stopped` with changes: Review changes. */
  onReview?: (id: string) => void;
  /** Your router's link, for `need.href` and `reviewHref`. */
  linkAs?: ElementType;
  /** A shared clock, as `Date.now()`. Pass it to render times on the server or to tick many runs together. */
  now?: number;
  className?: string;
};

const ACTIVE: RunStatus[] = ["queued", "running", "needs-input"];

const STATUS_TEXT: Record<RunStatus, string> = {
  queued: "Queued",
  running: "Running",
  "needs-input": "Needs you",
  done: "Done",
  failed: "Failed",
  stopped: "Stopped",
};

/** The open run lists this many changes, then "and 3 more". */
const CHANGE_LIMIT = 4;

/** 12000 → "12s", 252000 → "4m 12s", 3840000 → "1h 4m". */
export function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

/** 20000 → "just now", 240000 → "4m ago", then hours, "yesterday", days. */
export function formatAgo(ms: number) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

function summarize(run: Run) {
  if (run.summary) return run.summary;
  if (!run.changes) return "Finished";
  if (run.changes.length === 0) return "Nothing needed changing";
  return run.changes.map((c) => (c.count === undefined ? c.label : `${c.count} ${c.label}`)).join(", ");
}

/** The one line under the title: what it's doing, or how it ended. */
function lineFor(run: Run, agent: string) {
  const progress = run.progress && run.progress.total > 0 ? run.progress : null;
  switch (run.status) {
    case "queued":
      return run.detail ?? "Waiting to start";
    case "running":
      return run.step ?? `${agent} is working`;
    case "needs-input":
      return run.need?.text ?? `${agent} is waiting for you`;
    case "done":
      return summarize(run);
    case "failed":
      return run.error ?? `${agent} couldn’t finish this`;
    case "stopped":
      return progress ? `Stopped after ${Math.min(progress.done, progress.total)} of ${progress.total} steps` : "Stopped";
  }
}

function said(run: Run, agent: string) {
  if (run.status === "needs-input" || run.status === "done" || run.status === "failed") {
    return `${run.title}, ${STATUS_TEXT[run.status].toLowerCase()}: ${lineFor(run, agent)}`;
  }
  return "";
}

/** The short time on the right, and what a screen reader hears for it. */
function timeFor(run: Run, now: number | null): { shown: string; spoken: string; at?: number } | null {
  if (now === null) return null;
  const { status, startedAt, finishedAt, queuedAt } = run;
  if (status === "running") {
    if (startedAt === undefined) return null;
    const d = formatDuration(now - startedAt);
    return { shown: d, spoken: `Running for ${d}` };
  }
  const at = status === "needs-input" ? run.need?.since : status === "queued" ? queuedAt : finishedAt;
  if (at === undefined) return null;
  const ago = formatAgo(now - at);
  return { shown: ago, spoken: `${STATUS_TEXT[status]} ${ago}`, at };
}

/** Ticks after mount only, so the server and the first client render agree. */
function useNow(shared: number | undefined, fast: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (shared !== undefined) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    // Twice a second while counting whole seconds; relative times only change by the minute.
    const id = window.setInterval(tick, fast ? 500 : 15000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [shared, fast]);
  return shared ?? now;
}

/** One small glyph per status; they cross-fade when it changes. */
function StatusMark({ status }: { status: RunStatus }) {
  return (
    <span className={styles.mark} data-status={status} aria-hidden="true">
      <svg data-for="queued" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" />
      </svg>
      <svg data-for="running" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" />
        <circle className={styles.pulse} cx="8" cy="8" r="2.25" fill="currentColor" />
      </svg>
      <svg data-for="needs-input" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.5" fill="currentColor" />
        <path d="M8 4.75v3.6" stroke="var(--ui-surface)" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" />
        <circle cx="8" cy="10.9" r="0.95" fill="var(--ui-surface)" />
      </svg>
      <svg data-for="done" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.5" fill="currentColor" />
        <path d="M5.25 8.25l1.9 1.9 3.6-3.9" fill="none" stroke="var(--ui-surface)" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg data-for="failed" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.5" fill="currentColor" />
        <path d="M5.9 5.9l4.2 4.2M10.1 5.9l-4.2 4.2" stroke="var(--ui-surface)" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" />
      </svg>
      <svg data-for="stopped" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" />
        <rect x="6.25" y="6.25" width="3.5" height="3.5" rx="0.75" fill="currentColor" />
      </svg>
    </span>
  );
}

const InList = createContext(false);

type RunListProps = {
  /** Names the list for screen readers: "Copper’s runs". */
  label: string;
  children?: ReactNode;
  /** Shown when there are no runs. */
  empty?: ReactNode;
  className?: string;
};

/** Runs as rows in one bordered list. Each `BackgroundRun` inside becomes a row. */
export function RunList({ label, children, empty, className }: RunListProps) {
  const cls = className ? `${styles.list} ${className}` : styles.list;
  if (Children.toArray(children).length === 0) {
    return (
      <div className={cls} role="group" aria-label={label}>
        {empty ?? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nothing running</p>
            <p className={styles.emptyNote}>Tasks you hand off keep going here while you do something else.</p>
          </div>
        )}
      </div>
    );
  }
  return (
    <ul className={cls} aria-label={label}>
      <InList.Provider value={true}>{children}</InList.Provider>
    </ul>
  );
}

function Changes({ changes, heading, none }: { changes: RunChange[]; heading: string; none: string }) {
  const headingId = useId();
  const shown = changes.length > CHANGE_LIMIT ? changes.slice(0, CHANGE_LIMIT - 1) : changes;
  const rest = changes.length - shown.length;
  if (changes.length === 0) return <p className={styles.note}>{none}</p>;
  return (
    <div className={styles.section}>
      <span id={headingId} className={styles.sectionLabel}>
        {heading}
      </span>
      <ul className={styles.changes} aria-labelledby={headingId}>
        {shown.map((change, i) => (
          <li key={`${i}-${change.label}`} className={styles.change}>
            {change.count === undefined ? <Icon name="check" className={styles.changeMark} /> : <span className={styles.count}>{change.count}</span>}
            <span className={styles.changeLabel}>{change.label}</span>
          </li>
        ))}
        {rest > 0 && (
          <li className={styles.change}>
            <span aria-hidden="true" />
            <span className={styles.changeMore}>and {rest} more</span>
          </li>
        )}
      </ul>
    </div>
  );
}

/** One agent task that runs while the person is elsewhere: a row that opens to what changed. */
export function BackgroundRun({
  run,
  agent = "The agent",
  seen = true,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  onOpen,
  onStop,
  onRetry,
  onRespond,
  onReview,
  linkAs,
  now: sharedNow,
  className,
}: BackgroundRunProps) {
  const inList = useContext(InList);
  const baseId = useId();
  const bodyId = `${baseId}-body`;
  const statusId = `${baseId}-status`;
  const lineId = `${baseId}-line`;
  const timeId = `${baseId}-time`;
  const confirmId = `${baseId}-confirm`;

  const rootRef = useRef<HTMLLIElement & HTMLDivElement>(null);
  const disclosureRef = useRef<HTMLButtonElement>(null);
  const stopRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded);
  const open = expanded ?? ownExpanded;
  const [confirming, setConfirming] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [stopFailed, setStopFailed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [changed, setChanged] = useState(false);

  const { status } = run;
  const active = ACTIVE.includes(status);
  const now = useNow(sharedNow, status === "running");

  // React to the parent's status once: announce what matters, drop a stop that's done.
  const [previous, setPrevious] = useState(status);
  if (previous !== status) {
    setPrevious(status);
    setChanged(true);
    const spoken = said(run, agent);
    if (spoken) setAnnouncement(spoken);
    if (!ACTIVE.includes(status)) {
      setStopping(false);
      setConfirming(false);
      setStopFailed(false);
    }
  }

  // Buttons come and go with the status; if focus was on one that left, keep it on this run.
  const focusWasInside = useRef(false);
  const lastStatus = useRef(status);
  useLayoutEffect(() => {
    if (lastStatus.current === status) return;
    lastStatus.current = status;
    const focused = document.activeElement;
    const lost = !focused || focused === document.body || Boolean(focused.closest("[inert]"));
    if (focusWasInside.current && lost) disclosureRef.current?.focus({ preventScroll: true });
  }, [status]);

  const wasConfirming = useRef(confirming);
  useLayoutEffect(() => {
    // The safe choice takes focus; cancelling or confirming hands it back to Stop.
    if (confirming && !wasConfirming.current) keepRef.current?.focus();
    else if (!confirming && wasConfirming.current && (!document.activeElement || document.activeElement === document.body)) stopRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  function setOpen(next: boolean) {
    setOwnExpanded(next);
    onExpandedChange?.(next);
    if (next) onOpen?.(run.id);
  }

  async function stop() {
    setConfirming(false);
    setStopFailed(false);
    setStopping(true);
    const result = onStop?.(run.id);
    if (!(result instanceof Promise)) return;
    try {
      await result;
    } catch {
      setStopping(false);
      setStopFailed(true);
    }
  }

  function askToStop() {
    // Nothing has run yet, so there's nothing to lose and nothing to confirm.
    if (status === "queued") stop();
    else setConfirming(true);
  }

  function onConfirmKey(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      setConfirming(false);
    }
  }

  const unread = seen === false;
  const time = timeFor(run, now);
  const line = lineFor(run, agent);
  const progress = run.progress && run.progress.total > 0 && status !== "done" ? run.progress : null;

  // ---- Buttons: at most two. The one that answers the agent shows even while closed.
  const linkProps = (href: string, onClick: () => void) => ({ href, as: linkAs, onClick });
  const respond = () => {
    onOpen?.(run.id);
    onRespond?.(run.id);
  };
  const toReview = () => {
    onOpen?.(run.id);
    onReview?.(run.id);
  };

  let primary: ReactNode = null;
  if (status === "needs-input" && run.need && (run.need.href || onRespond)) {
    primary = run.need.href ? (
      <ButtonLink key="respond" {...linkProps(run.need.href, respond)}>
        {run.need.action}
      </ButtonLink>
    ) : (
      <Button key="respond" onClick={respond}>
        {run.need.action}
      </Button>
    );
  } else if ((status === "failed" || status === "stopped") && onRetry) {
    primary = (
      <Button key="retry" variant={status === "failed" ? "primary" : "secondary"} onClick={() => onRetry(run.id)}>
        {status === "failed" ? "Retry" : "Run again"}
      </Button>
    );
  }

  const canReview = !active && (status === "done" || (run.changes?.length ?? 0) > 0) && (onReview || run.reviewHref);
  let secondary: ReactNode = null;
  if (canReview) {
    const variant = status === "done" ? "primary" : "secondary";
    secondary = run.reviewHref ? (
      <ButtonLink key="review" variant={variant} {...linkProps(run.reviewHref, toReview)}>
        Review changes
      </ButtonLink>
    ) : (
      <Button key="review" variant={variant} onClick={toReview}>
        Review changes
      </Button>
    );
  } else if (active && onStop) {
    secondary = (
      <Button
        key="stop"
        ref={stopRef}
        variant="ghost"
       
        busy={stopping}
        busyLabel="Stopping…"
        aria-expanded={status === "queued" ? undefined : confirming}
        aria-controls={confirming ? confirmId : undefined}
        onClick={askToStop}
      >
        Stop
      </Button>
    );
  }

  const shownButtons = open ? [primary, secondary].filter(Boolean) : status === "needs-input" && primary ? [primary] : [];
  const actionsOpen = shownButtons.length > 0 || stopFailed || (open && confirming);

  const stopNote =
    run.stopNote ??
    (status === "needs-input"
      ? "It won’t do what it’s waiting to do. What’s finished stays done."
      : "What’s finished stays done, and anything sent stays sent.");

  // ---- The open run: progress, what changed, steps. Nothing the row already says.
  const changesHeading = status === "done" ? "What changed" : "Done so far";
  const showChanges = run.changes !== undefined && (run.changes.length > 0 || status === "failed" || status === "stopped");
  const steps = run.steps && run.steps.length > 0 ? run.steps : null;
  const hasDetails = Boolean(progress || showChanges || steps);
  const detailsOpen = open && hasDetails;

  const Root = inList ? "li" : "div";

  return (
    <Root
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-status={status}
      data-open={open}
      data-unread={unread || undefined}
      data-in-list={inList || undefined}
      onFocusCapture={() => {
        focusWasInside.current = true;
      }}
      onBlurCapture={(e) => {
        if (e.relatedTarget) {
          focusWasInside.current = rootRef.current?.contains(e.relatedTarget as Node) ?? false;
          return;
        }
        // No next target: a click on the page, or the focused button was removed. Only the click leaves.
        const left = e.target;
        requestAnimationFrame(() => {
          if (left.isConnected && document.activeElement !== left) focusWasInside.current = false;
        });
      }}
    >
      <div className={styles.head}>
        <StatusMark status={status} />
        <button
          ref={disclosureRef}
          type="button"
          className={styles.disclosure}
          aria-expanded={open}
          aria-controls={bodyId}
          aria-describedby={`${statusId} ${lineId}${time ? ` ${timeId}` : ""}`}
          onClick={() => setOpen(!open)}
        >
          {unread && <span className={styles.srOnly}>New: </span>}
          <span className={styles.title}>{run.title}</span>
        </button>
        <span className={styles.time}>
          {unread && <span className={styles.unread} aria-hidden="true" />}
          {time && (
            <>
              <time id={timeId} className={styles.srOnly} dateTime={time.at === undefined ? undefined : new Date(time.at).toISOString()}>
                {time.spoken}
              </time>
              <span aria-hidden="true">{time.shown}</span>
            </>
          )}
          <Icon name={open ? "chevron-up" : "chevron-down"} className={styles.chevron} />
        </span>
        <span id={statusId} className={styles.srOnly}>
          {stopping && active ? "Stopping" : STATUS_TEXT[status]}
        </span>
        <p key={line} id={lineId} className={styles.line} data-enter={changed || undefined}>
          {line}
        </p>
      </div>

      <div id={bodyId} className={styles.panel} data-open={detailsOpen} inert={!detailsOpen || undefined}>
        <div className={styles.clip}>
          <AnimatedSize>
            <div className={styles.details}>
              {progress && (
                <Progress
                  value={Math.min(progress.done, progress.total)}
                  max={progress.total}
                  label="Steps"
                  valueText={`${Math.min(progress.done, progress.total)} of ${progress.total}`}
                  tone={status === "failed" ? "danger" : "neutral"}
                />
              )}
              {showChanges && run.changes && <Changes changes={run.changes} heading={changesHeading} none="Nothing was changed." />}
              {steps && <ToolSteps steps={steps} label={`Steps in ${run.title}`} defaultOpen={false} />}
            </div>
          </AnimatedSize>
        </div>
      </div>

      <div className={styles.panel} data-open={actionsOpen} inert={!actionsOpen || undefined}>
        <div className={styles.clip}>
          <AnimatedSize>
            <div className={styles.actions}>
              {open && confirming ? (
                <div
                  id={confirmId}
                  className={styles.confirm}
                  role="group"
                  aria-labelledby={`${confirmId}-title`}
                  aria-describedby={`${confirmId}-note`}
                  onKeyDown={onConfirmKey}
                >
                  <p>
                    <strong id={`${confirmId}-title`}>Stop this run?</strong> <span id={`${confirmId}-note`}>{stopNote}</span>
                  </p>
                  <div className={styles.buttons}>
                    <Button ref={keepRef} variant="secondary" onClick={() => setConfirming(false)}>
                      Keep going
                    </Button>
                    <Button variant="danger" onClick={stop}>
                      Stop run
                    </Button>
                  </div>
                </div>
              ) : (
                shownButtons.length > 0 && <div className={styles.buttons}>{shownButtons}</div>
              )}
              {stopFailed && (
                <p className={styles.error} role="alert">
                  {agent} didn’t stop. Try again.
                </p>
              )}
            </div>
          </AnimatedSize>
        </div>
      </div>

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </Root>
  );
}
