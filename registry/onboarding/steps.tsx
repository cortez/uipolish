"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { BrandMark } from "../brand-marks/brand-marks";
import { Button } from "../button/button";
import { useDelayedBusy } from "../button/use-delayed-busy";
import { Icon } from "../icons/icons";
import { RadioGroup } from "../radio-group/radio-group";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import { Switch } from "../switch/switch";
import { TextField } from "../text-field/text-field";
import type {
  OnboardingChoice,
  OnboardingConnectResult,
  OnboardingFirstTask,
  OnboardingPermission,
  OnboardingTone,
  OnboardingTool,
  OnboardingValues,
} from "./types";
import styles from "./onboarding.module.css";

export type TaskState = { status: "idle" | "running" | "done" | "failed"; error?: string };

type HeadProps = {
  H: "h1";
  headingRef: Ref<HTMLHeadingElement>;
};

function StepHead({ H, headingRef, title, children }: HeadProps & { title: string; children: ReactNode }) {
  return (
    <div className={styles.head}>
      <H ref={headingRef} tabIndex={-1} className={styles.title}>
        {title}
      </H>
      <p className={styles.sub}>{children}</p>
    </div>
  );
}

/** The agent's tile: its mark on the accent's tint, or its first letter. */
export function AgentTile({ name, mark, size = "md" }: { name: string; mark?: ReactNode; size?: "sm" | "md" }) {
  return (
    <span className={styles.agentTile} data-size={size} aria-hidden="true">
      {mark ?? [...name.trim()][0]?.toLocaleUpperCase()}
    </span>
  );
}

function ToolTile({ tool }: { tool: OnboardingTool }) {
  return (
    <span className={styles.toolTile} aria-hidden="true">
      {tool.brand ? (
        <BrandMark name={tool.brand} size={20} />
      ) : tool.mark ? (
        tool.mark
      ) : (
        <span className={styles.toolLetter}>{[...tool.name.trim()][0]?.toLocaleUpperCase()}</span>
      )}
    </span>
  );
}

// ---------- 1. About you ----------

export function AboutStep({
  agentName,
  values,
  update,
  teamSizes,
  useCases,
  errors,
  ...head
}: HeadProps & {
  agentName: string;
  values: OnboardingValues;
  update: (patch: Partial<OnboardingValues>) => void;
  teamSizes: OnboardingChoice[];
  useCases: OnboardingChoice[];
  errors: { name: string | null; useCase: string | null };
}) {
  const sizeId = useId();
  return (
    <>
      <StepHead {...head} title="Set up your workspace">
        {agentName} writes invites, reminders and replies in your name. A few answers help it sound like you.
      </StepHead>
      <div className={styles.fields}>
        <TextField
          label="Workspace name"
          placeholder="Saturday Supper Club"
          hint="Guests see this on invites and reminders."
          autoComplete="organization"
          value={values.name}
          onChange={(e) => update({ name: e.currentTarget.value })}
          error={errors.name}
          maxLength={60}
          required
        />
        <div className={styles.field}>
          <p id={sizeId} className={styles.fieldLabel}>
            How many people host with you?
          </p>
          <SegmentedControl
            aria-labelledby={sizeId}
            value={values.teamSize}
            onValueChange={(teamSize) => update({ teamSize })}
            className={styles.sizes}
          >
            {teamSizes.map((s) => (
              <Segment key={s.value} value={s.value}>
                {s.label}
              </Segment>
            ))}
          </SegmentedControl>
        </div>
        <RadioGroup
          label="What do you host?"
          variant="cards"
          options={useCases}
          value={values.useCase}
          onValueChange={(useCase) => update({ useCase })}
          error={errors.useCase}
          required
        />
      </div>
    </>
  );
}

// ---------- 2. Tools ----------

type Phase = "idle" | "review" | "connecting" | "connected" | "failed";
type Conn = { phase: Phase; slow?: boolean; error?: string };

export function ToolsStep({
  agentName,
  agentMark,
  productName,
  tools,
  connected,
  slowAfter,
  onConnect,
  onConnected,
  onDisconnect,
  ...head
}: HeadProps & {
  agentName: string;
  agentMark?: ReactNode;
  productName: string;
  tools: OnboardingTool[];
  connected: Record<string, string>;
  slowAfter: number;
  onConnect: (toolId: string) => Promise<OnboardingConnectResult>;
  onConnected: (toolId: string, account: string) => void;
  onDisconnect: (toolId: string) => void;
}) {
  const [conns, setConns] = useState<Record<string, Conn>>({});
  const [announce, setAnnounce] = useState("");
  // Bumped on every attempt and cancel, so a late answer for an abandoned attempt is dropped.
  const attempt = useRef<Record<string, number>>({});
  const timers = useRef<Record<string, number>>({});
  useEffect(() => {
    const all = timers.current;
    return () => Object.values(all).forEach((t) => window.clearTimeout(t));
  }, []);

  const count = Object.keys(connected).length;

  function set(id: string, conn: Conn) {
    setConns((all) => ({ ...all, [id]: conn }));
  }

  /** One consent open at a time: opening another closes any that's only being read. */
  function open(id: string) {
    setConns((all) => {
      const next: Record<string, Conn> = {};
      for (const [k, c] of Object.entries(all)) next[k] = c.phase === "review" || c.phase === "failed" ? { phase: "idle" } : c;
      next[id] = { phase: "review" };
      return next;
    });
  }

  function cancel(id: string) {
    attempt.current[id] = (attempt.current[id] ?? 0) + 1;
    window.clearTimeout(timers.current[id]);
    set(id, { phase: "idle" });
  }

  async function connect(tool: OnboardingTool) {
    const n = (attempt.current[tool.id] = (attempt.current[tool.id] ?? 0) + 1);
    const provider = tool.provider ?? tool.name;
    set(tool.id, { phase: "connecting" });
    setAnnounce(`Waiting for ${provider}.`);
    window.clearTimeout(timers.current[tool.id]);
    timers.current[tool.id] = window.setTimeout(() => {
      if (attempt.current[tool.id] === n) set(tool.id, { phase: "connecting", slow: true });
    }, slowAfter);

    let result: OnboardingConnectResult;
    try {
      result = await onConnect(tool.id);
    } catch {
      result = { ok: false };
    }
    if (attempt.current[tool.id] !== n) return;
    window.clearTimeout(timers.current[tool.id]);

    if (result.ok) {
      onConnected(tool.id, result.account ?? "");
      set(tool.id, { phase: "connected" });
      setAnnounce(`${tool.name} connected${result.account ? ` as ${result.account}` : ""}.`);
      // The line draws in and the check lands, then the consent folds away.
      timers.current[tool.id] = window.setTimeout(() => {
        if (attempt.current[tool.id] === n) set(tool.id, { phase: "idle" });
      }, 1100);
    } else if (result.reason === "cancelled") {
      set(tool.id, { phase: "review" });
      setAnnounce("");
    } else {
      const error = result.message ?? `${provider} didn’t finish connecting ${tool.name}. Try again, or skip it for now.`;
      set(tool.id, { phase: "failed", error });
      setAnnounce(error);
    }
  }

  return (
    <>
      <StepHead {...head} title="Connect your tools">
        {agentName} checks your calendar before it offers a date, and drafts from your inbox. Connect what you use; skip
        the rest.
      </StepHead>
      <ul className={styles.tools} aria-label={`Tools, ${count} connected`}>
        {tools.map((tool) => (
          <ToolRow
            key={tool.id}
            tool={tool}
            agentName={agentName}
            agentMark={agentMark}
            productName={productName}
            conn={conns[tool.id] ?? { phase: "idle" }}
            account={connected[tool.id]}
            onOpen={() => open(tool.id)}
            onCancel={() => cancel(tool.id)}
            onConfirm={() => connect(tool)}
            onDisconnect={() => {
              cancel(tool.id);
              onDisconnect(tool.id);
              setAnnounce(`${tool.name} disconnected.`);
            }}
          />
        ))}
      </ul>
      <p className={styles.srOnly} aria-live="polite">
        {announce}
      </p>
    </>
  );
}

const NODE_ICON = { idle: "link", review: "link", connecting: "link", connected: "check", failed: "close" } as const;

function ToolRow({
  tool,
  agentName,
  agentMark,
  productName,
  conn,
  account,
  onOpen,
  onCancel,
  onConfirm,
  onDisconnect,
}: {
  tool: OnboardingTool;
  agentName: string;
  agentMark?: ReactNode;
  productName: string;
  conn: Conn;
  account: string | undefined;
  onOpen: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onDisconnect: () => void;
}) {
  const consentId = useId();
  const provider = tool.provider ?? tool.name;
  const isConnected = account !== undefined;
  const expanded = conn.phase !== "idle";
  const action = expanded && conn.phase !== "connected" ? "cancel" : isConnected ? "disconnect" : "connect";

  const connectRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const focusInRow = useRef(false);

  // The button pressed goes away, so focus follows to where the next step is.
  const prevPhase = useRef(conn.phase);
  useEffect(() => {
    const from = prevPhase.current;
    prevPhase.current = conn.phase;
    if (from === conn.phase) return;
    // Only when focus was in this row (the button that held it may be gone by now).
    if (!focusInRow.current) return;
    if (conn.phase === "review" && from === "idle") confirmRef.current?.focus();
    else if (conn.phase === "idle" && from === "connected") textRef.current?.focus();
    else if (conn.phase === "idle") connectRef.current?.focus();
  }, [conn.phase]);

  return (
    <li
      className={styles.tool}
      data-phase={conn.phase}
      data-connected={isConnected || undefined}
      onFocus={() => (focusInRow.current = true)}
      onBlur={(e) => (focusInRow.current = e.currentTarget.contains(e.relatedTarget as Node | null))}
    >
      <div className={styles.toolRow}>
        <ToolTile tool={tool} />
        <div ref={textRef} className={styles.toolText} tabIndex={-1}>
          <p className={styles.toolName}>{tool.name}</p>
          {isConnected ? (
            <p className={styles.toolAccount}>
              <Icon name="check" className={styles.inlineIcon} />
              <span>{account ? `Connected as ${account}` : "Connected"}</span>
            </p>
          ) : (
            <p className={styles.toolDesc}>{tool.description}</p>
          )}
        </div>
        {/* All three stay laid out, so the row keeps the widest one's width and nothing beside it moves. */}
        <div className={styles.toolAction}>
          <Button
            ref={connectRef}
            variant="secondary"
            data-shown={action === "connect" || undefined}
            aria-expanded={false}
            aria-controls={consentId}
            aria-label={`Connect ${tool.name}`}
            onClick={onOpen}
          >
            Connect
          </Button>
          <Button
            variant="ghost"
            data-shown={action === "cancel" || undefined}
            aria-expanded={true}
            aria-controls={consentId}
            aria-label={`Cancel connecting ${tool.name}`}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="ghost"
            data-shown={action === "disconnect" || undefined}
            aria-label={`Disconnect ${tool.name}`}
            onClick={onDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </div>

      <AnimatedSize className={styles.consentSize}>
        {expanded && (
          <div id={consentId} className={styles.consent} data-phase={conn.phase}>
            <div className={styles.link} aria-hidden="true">
              <AgentTile name={agentName} mark={agentMark} size="sm" />
              <span className={styles.linkLine} />
              <span className={styles.linkNode}>
                <Icon name={NODE_ICON[conn.phase]} />
              </span>
              <span className={styles.linkLine} />
              <ToolTile tool={tool} />
            </div>
            <p className={styles.consentLead}>
              {agentName} will be able to
            </p>
            <ul className={styles.scopes}>
              {tool.scopes.map((s) => (
                <li key={s.title} className={styles.scope}>
                  <Icon name={s.access === "write" ? "pencil" : "eye"} className={styles.scopeIcon} />
                  <span className={styles.scopeTitle}>{s.title}</span>
                  <span className={styles.scopeAccess} data-access={s.access}>
                    {s.access === "write" ? "Can change" : "Read only"}
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.consentFoot}>
              <p className={styles.consentNote} data-tone={conn.phase === "failed" ? "danger" : conn.phase === "connected" ? "success" : conn.slow ? "warning" : undefined}>
                {conn.phase === "failed" ? (
                  <>
                    <Icon name="alert" className={styles.inlineIcon} />
                    <span>{conn.error}</span>
                  </>
                ) : conn.phase === "connected" ? (
                  <>
                    <Icon name="check" className={styles.inlineIcon} />
                    <span>{account ? `Connected as ${account}` : `${tool.name} is connected`}</span>
                  </>
                ) : conn.slow ? (
                  <span>
                    Still waiting on {provider}. Finish signing in in the window it opened, or cancel and try again.
                  </span>
                ) : (
                  <span>
                    You’ll sign in to {provider} in a new window. {productName} never sees your password.
                  </span>
                )}
              </p>
              <Button
                ref={confirmRef}
                variant={conn.phase === "failed" || conn.phase === "connected" ? "secondary" : "primary"}
                busy={conn.phase === "connecting"}
                busyLabel={`Waiting for ${provider}…`}
                aria-disabled={conn.phase === "connected" || undefined}
                onClick={conn.phase === "connected" ? undefined : onConfirm}
                className={styles.consentButton}
              >
                {conn.phase === "failed" ? "Try again" : conn.phase === "connected" ? "Connected" : `Continue to ${provider}`}
              </Button>
            </div>
          </div>
        )}
      </AnimatedSize>
    </li>
  );
}

// ---------- 3. The agent ----------

export function AgentStep({
  agentName,
  tones,
  permissions,
  tools,
  values,
  update,
  onConnectTools,
  ...head
}: HeadProps & {
  agentName: string;
  tones: OnboardingTone[];
  permissions: OnboardingPermission[];
  tools: OnboardingTool[];
  values: OnboardingValues;
  update: (patch: Partial<OnboardingValues>) => void;
  onConnectTools: () => void;
}) {
  const toneId = useId();
  const sampleId = useId();
  const allowed = permissions.filter((p) => values.permissions[p.id] && (!p.requires || p.requires in values.connected));

  return (
    <>
      <StepHead {...head} title={`How ${agentName} works for you`}>
        Pick its voice, and what it can do without checking with you first. You can change these any time.
      </StepHead>
      <div className={styles.fields}>
        <div className={styles.field}>
          <p id={toneId} className={styles.fieldLabel}>
            Voice
          </p>
          <SegmentedControl
            aria-labelledby={toneId}
            aria-describedby={sampleId}
            value={values.tone}
            onValueChange={(tone) => update({ tone })}
          >
            {tones.map((t) => (
              <Segment key={t.value} value={t.value}>
                {t.label}
              </Segment>
            ))}
          </SegmentedControl>
          {/* Every sample is laid out in one cell, so the card is as tall as the longest and nothing below moves. */}
          <div className={styles.sample} id={sampleId}>
            <p className={styles.sampleAsk}>A guest asks if there’s parking nearby. {agentName} replies:</p>
            <div className={styles.sampleStack}>
              {tones.map((t) => (
                <p key={t.value} className={styles.sampleText} data-shown={t.value === values.tone || undefined} aria-hidden={t.value !== values.tone || undefined}>
                  {t.sample}
                </p>
              ))}
            </div>
          </div>
        </div>

        <fieldset className={styles.perms}>
          <legend className={styles.fieldLabel}>
            Without asking, {agentName} can
            <span className={styles.permCount}>
              {` · ${allowed.length} of ${permissions.length} on`}
            </span>
          </legend>
          <ul className={styles.permList}>
            {permissions.map((p) => {
              const needs = p.requires && !(p.requires in values.connected) ? tools.find((t) => t.id === p.requires) : undefined;
              return (
                <li key={p.id} className={styles.perm}>
                  <Switch
                    side="end"
                    label={p.title}
                    description={p.description}
                    checked={needs ? false : Boolean(values.permissions[p.id])}
                    disabled={Boolean(needs)}
                    onCheckedChange={(on) => update({ permissions: { ...values.permissions, [p.id]: on } })}
                    className={styles.permSwitch}
                  />
                  {needs && (
                    <p className={styles.permNeeds}>
                      Needs {needs.name}.{" "}
                      <button type="button" className={styles.textButton} onClick={onConnectTools}>
                        Connect {needs.name}
                      </button>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <p className={styles.always}>
            <Icon name="info" className={styles.inlineIcon} />
            <span>
              {agentName} always asks before it charges a card or writes to a whole guest list.
            </span>
          </p>
        </fieldset>
      </div>
    </>
  );
}

// ---------- 4. First task ----------

export function FirstTaskStep({
  agentName,
  agentMark,
  firstTask,
  draft,
  task,
  onStart,
  onStop,
  ...head
}: HeadProps & {
  agentName: string;
  agentMark?: ReactNode;
  firstTask: OnboardingFirstTask;
  draft: string;
  task: TaskState;
  onStart: () => void;
  onStop: () => void;
}) {
  // Starts on arrival, so the first thing on this step is the agent at work. Leaving stops it.
  const startRef = useRef({ onStart, onStop, idle: task.status === "idle" && !draft });
  useEffect(() => {
    const { onStart: start, onStop: stop, idle } = startRef.current;
    if (idle) start();
    return () => stop();
  }, []);

  const running = task.status === "running";
  const waiting = useDelayedBusy(running && draft === "");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  const status =
    task.status === "running" ? "Writing" : task.status === "done" ? "Draft ready" : task.status === "failed" ? "Stopped" : "Not started";

  return (
    <>
      <StepHead {...head} title={`${agentName}’s first job`}>
        Here’s an invite for your next supper, drafted from your answers. Nothing is sent until you send it.
      </StepHead>
      <article className={styles.draft} data-status={task.status} aria-busy={running || undefined} aria-label={firstTask.title}>
        <header className={styles.draftHead}>
          <AgentTile name={agentName} mark={agentMark} size="sm" />
          <div className={styles.draftTitles}>
            <p className={styles.draftTitle}>{firstTask.title}</p>
            {firstTask.detail && <p className={styles.draftDetail}>{firstTask.detail}</p>}
          </div>
          <p className={styles.draftStatus} data-status={task.status}>
            <span className={styles.statusGlyph} aria-hidden="true">
              {running ? (
                <svg viewBox="0 0 16 16" className={styles.spinner}>
                  <circle cx="8" cy="8" r="5.5" fill="none" className={styles.spinTrack} />
                  <path d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" strokeLinecap="round" className={styles.spinArc} />
                </svg>
              ) : (
                <Icon name={task.status === "done" ? "check" : task.status === "failed" ? "alert" : "pencil"} />
              )}
            </span>
            {/* Holds the widest label's width, so the title beside it never reflows. */}
            <span className={styles.statusText}>
              <span className={styles.statusReserve} aria-hidden="true">
                Draft ready
              </span>
              <span className={styles.statusLabel}>{status}</span>
            </span>
          </p>
        </header>
        <div className={styles.draftBody}>
          {draft ? (
            <p className={styles.draftText}>
              {draft}
              {running && <span className={styles.caret} aria-hidden="true" />}
            </p>
          ) : running ? (
            <p className={styles.reading} data-shown={waiting || undefined}>
              Reading your answers…
            </p>
          ) : null}
        </div>
        <AnimatedSize>
          {task.status === "done" && (
            <footer className={styles.draftFoot}>
              <p className={styles.draftNote}>Saved to Drafts. Nothing has been sent.</p>
              <div className={styles.draftActions}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    void navigator.clipboard?.writeText(draft).then(() => setCopied(true), () => {});
                  }}
                >
                  <Icon name={copied ? "check" : "copy"} />
                  Copy
                </Button>
                <Button variant="secondary" onClick={onStart}>
                  <Icon name="retry" />
                  Write another
                </Button>
              </div>
              <p className={styles.srOnly} aria-live="polite">
                {copied ? "Copied" : ""}
              </p>
            </footer>
          )}
          {task.status === "failed" && (
            <footer className={styles.draftFoot} role="alert">
              <p className={styles.draftError}>
                <Icon name="alert" className={styles.inlineIcon} />
                <span>{task.error ?? `${agentName} couldn’t finish the draft.`} Try again, or skip and draft it later.</span>
              </p>
              <div className={styles.draftActions}>
                <Button variant="secondary" onClick={onStart}>
                  <Icon name="retry" />
                  Try again
                </Button>
              </div>
            </footer>
          )}
        </AnimatedSize>
      </article>
    </>
  );
}

// ---------- Done ----------

export function DoneStep({
  agentName,
  productName,
  skipped,
  values,
  teamSizes,
  useCases,
  tools,
  tones,
  permissions,
  H,
  headingRef,
}: HeadProps & {
  agentName: string;
  productName: string;
  skipped: boolean;
  values: OnboardingValues;
  teamSizes: OnboardingChoice[];
  useCases: OnboardingChoice[];
  tools: OnboardingTool[];
  tones: OnboardingTone[];
  permissions: OnboardingPermission[];
}) {
  const linked = tools.filter((t) => t.id in values.connected);
  const allowed = permissions.filter((p) => values.permissions[p.id] && (!p.requires || p.requires in values.connected));
  const size = teamSizes.find((s) => s.value === values.teamSize)?.label;
  const use = useCases.find((u) => u.value === values.useCase)?.label;
  const tone = tones.find((t) => t.value === values.tone)?.label;

  const rows: { label: string; value: ReactNode; empty?: boolean }[] = [
    {
      label: "Workspace",
      value: values.name.trim() ? [values.name.trim(), use, size && `${size} hosting`].filter(Boolean).join(" · ") : "Not named yet",
      empty: !values.name.trim(),
    },
    {
      label: "Tools",
      value: linked.length ? (
        <span className={styles.summaryTools}>
          {linked.map((t) => (
            <span key={t.id} className={styles.summaryTool}>
              <ToolTile tool={t} />
              {t.name}
            </span>
          ))}
        </span>
      ) : (
        "None connected"
      ),
      empty: !linked.length,
    },
    {
      label: agentName,
      value: `${tone ? `${tone} voice · ` : ""}${allowed.length ? `${allowed.length} thing${allowed.length === 1 ? "" : "s"} without asking` : "Asks before everything"}`,
    },
    {
      label: "First invite",
      value: values.draft ? "Drafted, waiting in Drafts" : "Not drafted yet",
      empty: !values.draft,
    },
  ];

  return (
    <>
      <div className={styles.doneHead}>
        <span className={styles.doneTile} data-skipped={skipped || undefined} aria-hidden="true">
          {skipped ? (
            <Icon name="arrow-right" />
          ) : (
            <svg viewBox="0 0 24 24">
              <path className={styles.doneTick} d="M6.5 12.5l3.75 3.75L17.5 8.5" pathLength={1} />
            </svg>
          )}
        </span>
        <H ref={headingRef} tabIndex={-1} className={styles.title}>
          {skipped ? "Setup skipped" : `${agentName} is ready`}
        </H>
        <p className={styles.sub}>
          {skipped
            ? `${agentName} starts on safe defaults: it drafts, and asks before it sends anything. Finish setup any time in Settings.`
            : `Here’s what it’s working with. Change any of it in Settings, or go and see your first draft in ${productName}.`}
        </p>
      </div>
      <dl className={styles.summary}>
        {rows.map((r, i) => (
          <div key={r.label} className={styles.summaryRow} style={{ "--i": i } as CSSProperties}>
            <dt className={styles.summaryLabel}>{r.label}</dt>
            <dd className={styles.summaryValue} data-empty={r.empty || undefined}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
