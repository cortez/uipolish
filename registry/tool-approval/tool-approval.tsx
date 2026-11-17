"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { Checkbox } from "../checkbox/checkbox";
import { CodeBlock } from "../code-block/code-block";
import { Icon, type IconName } from "../icons/icons";
import { TextField } from "../text-field/text-field";
import styles from "./tool-approval.module.css";

/** What the call does to the world, from least to most weight. */
export type ToolEffect = "read" | "change" | "send" | "delete" | "spend";
export type ToolApprovalStatus = "waiting" | "allowed" | "denied" | "expired";
/** `once`: this call. `conversation`: this tool until the conversation ends. `tool`: this tool from now on. */
export type ToolApprovalScope = "once" | "conversation" | "tool";

export type ToolRequest = {
  id: string;
  /** The action, as a verb phrase: "Send a message to 12 guests". */
  title: string;
  /** Shown in mono as `server · tool`. */
  server: string;
  tool: string;
  effect: ToolEffect;
  /** One or two sentences in plain words: who, what, how much. */
  summary?: ReactNode;
  /** Replaces the effect's default note: "Charges $96.00 to the club card." */
  consequence?: string;
  /** The raw call. Objects are shown as indented JSON. */
  arguments?: unknown;
};

export type ToolDecision = {
  /** The request this answers; a queued one's id when decided from the queue. */
  id: string;
  decision: "allow" | "deny";
  /** Always `once` for a denial. */
  scope: ToolApprovalScope;
  /** What the person typed after "Tell Copper why". */
  reason?: string;
};

type ToolApprovalProps = {
  request: ToolRequest;
  /** The agent's name, as the person knows it. */
  agent?: string;
  /** Controlled. Set it as soon as `onDecide` fires. */
  status?: ToolApprovalStatus;
  /** With `allowed`: how far the permission reaches. */
  scope?: ToolApprovalScope;
  /** With `denied`: the reason the person gave. */
  reason?: string;
  /** With `expired`: how long the agent waited, "5 minutes". */
  waited?: string;
  /** Return a promise to show the choice as busy until it settles; a rejection shows an error. */
  onDecide: (decision: ToolDecision) => void | Promise<unknown>;
  /** Which "Always allow" scopes to offer. Default: both, or only `conversation` for sends, deletes and spends. `[]` hides it. */
  remember?: Exclude<ToolApprovalScope, "once">[];
  /** Offer "Tell Copper why" before denying. */
  askReason?: boolean;
  /** Other requests waiting behind this one, each with its own Deny and Allow once. */
  queue?: ToolRequest[];
  /** Default: focus the card only when nothing else on the page has focus. */
  autoFocus?: boolean;
  className?: string;
};

type Effect = { label: string; weighty: boolean; note?: string };

const EFFECTS: Record<ToolEffect, Effect> = {
  read: { label: "Reads", weighty: false },
  change: { label: "Changes", weighty: false },
  send: { label: "Sends", weighty: true, note: "Once it’s sent, it can’t be taken back." },
  delete: { label: "Deletes", weighty: true, note: "Deleted for good. It can’t be undone." },
  spend: { label: "Spends money", weighty: true, note: "The money moves as soon as you allow it." },
};

const SCOPE_TEXT: Record<ToolApprovalScope, string> = {
  once: "Allowed once",
  conversation: "Allowed for this conversation",
  tool: "Always allowed",
};

type Choice = `${string}:${"deny" | ToolApprovalScope}`;

function formatArguments(args: unknown) {
  if (args === undefined) return null;
  if (typeof args === "string") return args;
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

function settledLabel(status: ToolApprovalStatus, scope: ToolApprovalScope, agent: string, waited?: string) {
  if (status === "allowed") return SCOPE_TEXT[scope];
  if (status === "denied") return "Denied";
  return waited ? `${agent} stopped waiting after ${waited}` : `${agent} stopped waiting`;
}

const SETTLED_ICON: Record<ToolApprovalStatus, IconName> = {
  waiting: "info",
  allowed: "check",
  denied: "close",
  expired: "minus",
};

function Disclosure({ open, controls, onToggle, children }: { open: boolean; controls: string; onToggle: () => void; children: string }) {
  return (
    <button type="button" className={styles.disclosure} aria-expanded={open} aria-controls={controls} onClick={onToggle}>
      {children}
      <Icon className={styles.chevron} name="chevron-right" data-turn={open ? "open" : ""} />
    </button>
  );
}

/** Opens with height, like the steps and arguments in tool steps. */
function Panel({ id, open, children }: { id: string; open: boolean; children: ReactNode }) {
  return (
    <div id={id} className={styles.panel} data-open={open} inert={!open}>
      <div className={styles.clip}>{children}</div>
    </div>
  );
}

function Details({ request, argsOpen, onToggleArgs }: { request: ToolRequest; argsOpen: boolean; onToggleArgs: () => void }) {
  const argsId = useId();
  const effect = EFFECTS[request.effect];
  const note = request.consequence ?? effect.note;
  const args = formatArguments(request.arguments);
  return (
    <>
      {request.summary && <div className={styles.summary}>{request.summary}</div>}
      {note && (
        <p className={styles.note} data-weighty={effect.weighty || undefined}>
          {effect.weighty && <Icon name="warning" />}
          {note}
        </p>
      )}
      <div className={styles.args}>
        <Disclosure open={argsOpen} controls={argsId} onToggle={onToggleArgs}>
          Details
        </Disclosure>
        <Panel id={argsId} open={argsOpen}>
          <div className={styles.argsInner}>
            <ToolName request={request} />
            {args !== null && <CodeBlock code={args} language="json" title={`${request.tool} arguments`} maxHeight={220} defaultWrap />}
          </div>
        </Panel>
      </div>
    </>
  );
}

function ToolName({ request }: { request: ToolRequest }) {
  return (
    <code className={styles.tool}>
      {request.server} · {request.tool}
    </code>
  );
}

/** An agent asking to run one tool call, settling into a line once answered. */
export function ToolApproval({
  request,
  agent = "The agent",
  status = "waiting",
  scope = "once",
  reason,
  waited,
  onDecide,
  remember,
  askReason = true,
  queue = [],
  autoFocus,
  className,
}: ToolApprovalProps) {
  const eyebrowId = useId();
  const titleId = useId();
  const whyId = useId();
  const queueId = useId();
  const detailsId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const lineRef = useRef<HTMLButtonElement>(null);
  const whyRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  const [argsOpen, setArgsOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [queueOpen, setQueueOpen] = useState(false);
  const [reopened, setReopened] = useState(false);
  const [pending, setPending] = useState<Choice | null>(null);
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // Only a card that arrives waiting animates in; history doesn't replay.
  const [entering] = useState(status === "waiting");

  const effect = EFFECTS[request.effect];
  const settled = status !== "waiting";
  const offered = remember ?? (effect.weighty ? ["conversation"] : ["conversation", "tool"]);
  const label = settledLabel(status, scope, agent, waited);
  const rememberScope: Exclude<ToolApprovalScope, "once"> | null = offered.includes("conversation")
    ? "conversation"
    : offered.includes("tool")
      ? "tool"
      : null;
  const [rememberIt, setRememberIt] = useState(false);
  const allowScope: ToolApprovalScope = rememberIt && rememberScope ? rememberScope : "once";

  // Say what happened once, when it happens.
  const [previous, setPrevious] = useState(status);
  if (previous !== status) {
    setPrevious(status);
    if (settled) setAnnouncement(`${label}: ${request.tool}.`);
  }

  // Announced a beat after mount, so the live region exists before it changes.
  useEffect(() => {
    if (!entering) return;
    const id = window.setTimeout(() => setAnnouncement(`${agent} needs your OK: ${request.title}.`), 150);
    const active = document.activeElement;
    // Don't take focus from the prompt or anything else the person is in.
    if (autoFocus ?? (!active || active === document.body)) titleRef.current?.focus({ preventScroll: autoFocus === undefined });
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The buttons are gone once it settles; if focus was on them, it moves to the line.
  const wasSettled = useRef(settled);
  useLayoutEffect(() => {
    if (settled && !wasSettled.current) {
      const active = document.activeElement;
      if (!active || active === document.body || rootRef.current?.contains(active)) lineRef.current?.focus({ preventScroll: true });
    }
    wasSettled.current = settled;
  }, [settled]);

  function decide(choice: Omit<ToolDecision, "id">, id = request.id) {
    if (pending) return;
    setFailed(false);
    const result: unknown = onDecide({ id, ...choice });
    if (result instanceof Promise) {
      setPending(`${id}:${choice.decision === "deny" ? "deny" : choice.scope}`);
      result.then(
        () => setPending(null),
        () => {
          setPending(null);
          setFailed(true);
        },
      );
    }
  }

  function deny() {
    const text = why.trim();
    decide({ decision: "deny", scope: "once", reason: whyOpen && text ? text : undefined });
  }

  function toggleWhy() {
    const next = !whyOpen;
    setWhyOpen(next);
    // After the panel stops being inert.
    if (next) requestAnimationFrame(() => fieldRef.current?.focus());
  }

  function onFieldKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      deny();
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setWhyOpen(false);
      whyRef.current?.focus();
    }
  }

  const busy = (choice: string) => pending === `${request.id}:${choice}`;

  return (
    <div
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-status={status}
      data-enter={entering || undefined}
    >
      <div className={styles.grow}>
        <AnimatedSize>
          {settled ? (
            <div key="line" className={styles.settled} data-enter>
              <button
                ref={lineRef}
                type="button"
                className={styles.line}
                aria-expanded={reopened}
                aria-controls={detailsId}
                onClick={() => setReopened((o) => !o)}
              >
                <Icon className={styles.lineIcon} name={SETTLED_ICON[status]} />
                <span className={styles.lineText}>
                  <span className={styles.lineLabel}>{label}</span>
                  {status === "denied" && reason ? (
                    <span className={styles.lineDetail}> · you said: {reason}</span>
                  ) : (
                    <span className={styles.lineDetail}>
                      {" · "}
                      <code className={styles.lineTool}>{request.tool}</code>
                    </span>
                  )}
                </span>
                <Icon className={styles.chevron} name="chevron-right" data-turn={reopened ? "open" : ""} />
              </button>
              <Panel id={detailsId} open={reopened}>
                <div className={styles.reopened}>
                  <div className={styles.heading}>
                    <p className={styles.title}>{request.title}</p>
                    <ToolName request={request} />
                  </div>
                  <Details request={request} argsOpen={argsOpen} onToggleArgs={() => setArgsOpen((o) => !o)} />
                  {status === "denied" && reason && <p className={styles.quote}>You told {agent}: “{reason}”</p>}
                </div>
              </Panel>
            </div>
          ) : (
            <div
              key="card"
              className={styles.card}
              data-weighty={effect.weighty || undefined}
              role="group"
              aria-labelledby={`${eyebrowId} ${titleId}`}
            >
              <div className={styles.heading}>
                <span id={eyebrowId} className={styles.eyebrow}>
                  {agent} needs your OK
                </span>
                <p ref={titleRef} id={titleId} className={styles.title} tabIndex={-1}>
                  {request.title}
                </p>
              </div>

              <Details request={request} argsOpen={argsOpen} onToggleArgs={() => setArgsOpen((o) => !o)} />

              <div className={styles.decide}>
              {askReason && (
                <Panel id={whyId} open={whyOpen}>
                  <div className={styles.why}>
                    <TextField
                      ref={fieldRef}
                      label="Why not?"
                      hint={`Enter denies and sends this to ${agent}.`}
                      placeholder="Not yet"
                      maxLength={200}
                      autoComplete="off"
                      value={why}
                      onChange={(e) => setWhy(e.currentTarget.value)}
                      onKeyDown={onFieldKey}
                    />
                  </div>
                </Panel>
              )}

              {failed && (
                <p className={styles.error} role="alert">
                  <Icon name="alert" />
                  {agent} didn’t get your answer. Try again.
                </p>
              )}

              <div className={styles.footer}>
                {(rememberScope || askReason) && (
                  <div className={styles.options}>
                    {rememberScope && (
                      <Checkbox
                        className={styles.remember}
                        label={rememberScope === "conversation" ? "Don’t ask again in this chat" : `Don’t ask again for ${request.tool}`}
                        checked={rememberIt}
                        onCheckedChange={setRememberIt}
                      />
                    )}
                    {askReason && (
                      <button
                        ref={whyRef}
                        type="button"
                        className={`${styles.disclosure} ${styles.whyToggle}`}
                        aria-expanded={whyOpen}
                        aria-controls={whyId}
                        onClick={toggleWhy}
                      >
                        Tell {agent} why
                        <Icon className={styles.chevron} name="chevron-right" data-turn={whyOpen ? "open" : ""} />
                      </button>
                    )}
                  </div>
                )}
                <div className={styles.actions}>
                  <Button variant="secondary" className={styles.deny} busy={busy("deny")} onClick={deny}>
                    Deny
                  </Button>
                  <Button
                    variant={request.effect === "delete" ? "danger" : "primary"}
                    className={styles.allow}
                    busy={busy(allowScope)}
                    onClick={() => decide({ decision: "allow", scope: allowScope })}
                  >
                    Allow
                  </Button>
                </div>
              </div>
              </div>

              {queue.length > 0 && (
                <div className={styles.queue}>
                  <Disclosure open={queueOpen} controls={queueId} onToggle={() => setQueueOpen((o) => !o)}>
                    {`${queue.length} more waiting`}
                  </Disclosure>
                  <Panel id={queueId} open={queueOpen}>
                    <AnimatedSize>
                      <ul className={styles.queued} aria-label={`More requests from ${agent}`}>
                        {queue.map((item) => (
                          <QueuedRow
                            key={item.id}
                            request={item}
                            pending={pending}
                            onDecide={(decision) => decide({ decision, scope: "once" }, item.id)}
                          />
                        ))}
                      </ul>
                    </AnimatedSize>
                  </Panel>
                </div>
              )}
            </div>
          )}
        </AnimatedSize>
      </div>

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}

function QueuedRow({
  request,
  pending,
  onDecide,
}: {
  request: ToolRequest;
  pending: Choice | null;
  onDecide: (decision: "allow" | "deny") => void;
}) {
  const titleId = useId();
  const effect = EFFECTS[request.effect];
  return (
    <li className={styles.row}>
      <div className={styles.rowText}>
        <span id={titleId} className={styles.rowTitle}>
          {request.title}
        </span>
        {effect.weighty && <span className={styles.rowMeta}>{effect.label}</span>}
      </div>
      <div className={styles.rowActions}>
        <Button variant="secondary" aria-describedby={titleId} busy={pending === `${request.id}:deny`} onClick={() => onDecide("deny")}>
          Deny
        </Button>
        <Button
          variant={request.effect === "delete" ? "danger" : "primary"}
          aria-describedby={titleId}
          busy={pending === `${request.id}:once`}
          onClick={() => onDecide("allow")}
        >
          Allow
        </Button>
      </div>
    </li>
  );
}
