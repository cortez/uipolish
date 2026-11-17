"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Connections } from "../connections/connections";
import { Icon } from "../icons/icons";
import { ModelPicker, type ModelOption } from "../model-picker/model-picker";
import { NumberInput } from "../number-input/number-input";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import { Switch } from "../switch/switch";
import { UsageBreakdown, type UsageSegment } from "../usage-meter/usage-meter";
import styles from "./agent-settings.module.css";

export type AgentSettingsSection = "model" | "connections" | "permissions" | "usage" | "memory";

/** What a tool does to the world, as tool approval names it. */
export type ToolEffect = "read" | "change" | "send" | "delete" | "spend";

/** `ask`: every time. `allow`: without asking. */
export type AskPolicy = "ask" | "allow";

/** Only reads and changes can go without asking; sends, deletes and spends always ask. */
export type EffectPolicy = { read: AskPolicy; change: AskPolicy };

/** The values the person sets. Leave one out and its row (or section) goes with it. */
export type AgentSettingsValue = {
  /** The id of a model in `models`. */
  model?: string;
  policy?: EffectPolicy;
  /** In currency units: 10 is $10.00 with USD. */
  dailyLimit?: number;
  /** Whether the agent keeps notes between conversations. */
  remember?: boolean;
};

/** A tool the person chose "Always allow" for. */
export type AllowedTool = {
  id: string;
  /** The server's name, as Connections shows it: "Acme". Tools are grouped by it. */
  server: string;
  /** As the server names it: `list_bookings`. */
  tool: string;
  effect: ToolEffect;
  /** One line on what it does. */
  description?: string;
};

export type MemoryNote = {
  id: string;
  /** One remembered fact, as a sentence: "Ben Ito is vegetarian." */
  text: string;
};

export type AgentSpending = {
  /** Spent today, in currency units. */
  used: number;
  /** What it was spent on, as in the usage meter. */
  segments?: UsageSegment[];
};

type Result = void | Promise<unknown>;

type ConnectionsProps = Omit<ComponentProps<typeof Connections>, "agent" | "className">;

type AgentSettingsProps = {
  /** The agent's name, used in sentences: "Copper asks every time". */
  agent: string;
  /** Controlled. */
  settings: AgentSettingsValue;
  /** Called with the one value that changed. Return a promise to show "Saving…" until it settles; a rejection shows its message. */
  onChange?: (patch: Partial<AgentSettingsValue>) => Result;
  /** The models to choose from, as in the model picker. */
  models?: ModelOption[];
  /** Passed to the Connections component as they are. */
  connections?: ConnectionsProps;
  /** Tools set to "Always allow". */
  allowed?: AllowedTool[];
  /** Remove the tool from `allowed`. A rejection puts the row back with its message. */
  onRevoke?: (tool: AllowedTool) => Result;
  /** Undo a revoke: add the tool back where it was. Leave out to offer no Undo. */
  onRestore?: (tool: AllowedTool) => Result;
  /** Replaces the line under Reads, Changes, Sends, Deletes and Spends money. */
  effectNotes?: Partial<Record<ToolEffect, string>>;
  /** Today's spending, for the breakdown above the daily limit. */
  spending?: AgentSpending;
  /** The highest daily limit the field takes. Default 500. */
  maxDailyLimit?: number;
  /** ISO 4217 code. Default "USD". */
  currency?: string;
  /** Fixed so server and browser format numbers alike. Default "en-US". */
  locale?: string;
  /** What the agent remembers, newest first. */
  memories?: MemoryNote[];
  /** Clear every note, then pass `memories={[]}`. Leave out to hide Clear memory. */
  onClearMemory?: () => Result;
  /** Which sections to show, in this order. Default: all five, each when its values are there. */
  sections?: AgentSettingsSection[];
  /** Default "Copper settings", from `agent`. */
  title?: ReactNode;
  /** A line under the title. */
  description?: ReactNode;
  /** The title's level; sections are one below. Default 1. */
  headingLevel?: 1 | 2 | 3 | 4;
  /** Starts every section's id, so `#agent-settings-memory` links straight to it. */
  idPrefix?: string;
  className?: string;
};

const ALL_SECTIONS: AgentSettingsSection[] = ["model", "connections", "permissions", "usage", "memory"];

const SECTION_TITLE: Record<AgentSettingsSection, string> = {
  model: "Model",
  connections: "Connections",
  permissions: "Permissions",
  usage: "Usage & budget",
  memory: "Memory",
};

const EFFECTS: Record<ToolEffect, { label: string; weighty: boolean; note: (agent: string) => string }> = {
  read: { label: "Reads", weighty: false, note: () => "Looking things up. Nothing changes." },
  change: { label: "Changes", weighty: false, note: () => "Edits that can be changed back, like a draft or a list." },
  send: {
    label: "Sends",
    weighty: true,
    note: (agent) => `Messages and posts can’t be taken back once they’re out, so ${agent} always asks.`,
  },
  delete: { label: "Deletes", weighty: true, note: (agent) => `Deleted things don’t come back, so ${agent} always asks.` },
  spend: {
    label: "Spends money",
    weighty: true,
    note: (agent) => `Money moves the moment a payment or refund runs, so ${agent} always asks.`,
  },
};

const EFFECT_ORDER: ToolEffect[] = ["read", "change", "send", "delete", "spend"];

/** How long "Saved" stays. */
const SAVED_FOR = 2400;
/** How long "Revoked · Undo" stays once nothing is on it. */
const UNDO_FOR = 6000;

function plural(n: number, one: string) {
  return `${n} ${n === 1 ? one : `${one}s`}`;
}

function messageOf(reason: unknown, fallback: string) {
  if (typeof reason === "string" && reason) return reason;
  if (reason instanceof Error && reason.message) return reason.message;
  return fallback;
}

function isPromise(value: unknown): value is Promise<unknown> {
  return !!value && typeof (value as Promise<unknown>).then === "function";
}

function Heading({ level, ...props }: { level: number } & ComponentProps<"h2">) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as "h2";
  return <Tag {...props} />;
}

/** One polite region for the whole screen. */
function useAnnouncer() {
  const [text, setText] = useState("");
  const said = useRef(0);
  const announce = useCallback((line: string) => {
    // A zero-width space on every other message, so saying the same thing twice is heard twice.
    setText(line + (said.current++ % 2 ? "​" : ""));
  }, []);
  return { text, announce };
}

type Save = { state: "saving" | "saved" | "failed"; message?: string };

/** Each row's save: "Saving…" past 300ms, "Saved" for a moment, or what went wrong. */
function useSaves(announce: (line: string) => void) {
  const [saves, setSaves] = useState<Partial<Record<string, Save>>>({});
  const runs = useRef(new Map<string, number>());
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const settle = useCallback((key: string, save: Save) => {
    setSaves((s) => ({ ...s, [key]: save }));
    window.clearTimeout(timers.current.get(key));
    if (save.state !== "saved") return;
    timers.current.set(
      key,
      window.setTimeout(() => setSaves((s) => ({ ...s, [key]: undefined })), SAVED_FOR),
    );
  }, []);

  const save = useCallback(
    (key: string, run: () => Result, said: string) => {
      const n = (runs.current.get(key) ?? 0) + 1;
      runs.current.set(key, n);
      const fail = (reason: unknown) => {
        const message = messageOf(reason, "Didn’t save. Try again.");
        settle(key, { state: "failed", message });
        announce(message);
      };
      let result: Result;
      try {
        result = run();
      } catch (reason) {
        fail(reason);
        return;
      }
      if (!isPromise(result)) {
        settle(key, { state: "saved" });
        announce(said);
        return;
      }
      settle(key, { state: "saving" });
      // Only the latest change to a row speaks for it.
      result.then(
        () => {
          if (runs.current.get(key) !== n) return;
          settle(key, { state: "saved" });
          announce(said);
        },
        (reason) => {
          if (runs.current.get(key) === n) fail(reason);
        },
      );
    },
    [announce, settle],
  );

  return { saves, save };
}

/** Beside a row's label. Keeps its last words while it fades. */
function Status({ save }: { save?: Save }) {
  const [last, setLast] = useState(save);
  if (save && save !== last) setLast(save);
  return (
    <span className={styles.status} data-state={last?.state} data-shown={save ? "" : undefined}>
      {last?.state === "saving" && <span className={styles.sweep}>Saving…</span>}
      {last?.state === "saved" && (
        <>
          <Icon name="check" className={styles.statusIcon} />
          Saved
        </>
      )}
      {last?.state === "failed" && (
        <>
          <Icon name="alert" className={styles.statusIcon} />
          {last.message}
        </>
      )}
    </span>
  );
}

type RowIds = { label: string; description: string };

function Row({
  label,
  description,
  save,
  control,
  align = "center",
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  save?: Save;
  control?: (ids: RowIds) => ReactNode;
  /** `field`: the label lines up with a 48px field instead of the row's middle. */
  align?: "center" | "field";
  children?: ReactNode;
}) {
  const id = useId();
  const ids = { label: `${id}-label`, description: `${id}-description` };
  return (
    <div className={styles.row} data-align={align}>
      <div className={styles.text}>
        <div className={styles.labelLine}>
          <span id={ids.label} className={styles.label}>
            {label}
          </span>
          <Status save={save} />
        </div>
        {description && (
          <p id={ids.description} className={styles.description}>
            {description}
          </p>
        )}
      </div>
      {control && <div className={styles.control}>{control(ids)}</div>}
      {children && <div className={styles.rowBody}>{children}</div>}
    </div>
  );
}

function Section({
  id,
  level,
  title,
  intro,
  children,
}: {
  id: string;
  level: number;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <div className={styles.sectionHead}>
        <Heading level={level} id={`${id}-title`} className={styles.sectionTitle}>
          {title}
        </Heading>
        {intro && <p className={styles.intro}>{intro}</p>}
      </div>
      {children}
    </section>
  );
}

/* ---------- Always allowed ---------- */

type Revoked = { tool: AllowedTool; index: number; closing: boolean };

type ToolRowProps = {
  tool: AllowedTool;
  agent: string;
  revoked: boolean;
  closing: boolean;
  error?: string;
  canUndo: boolean;
  onRevoke: (tool: AllowedTool) => void;
  onUndo: (tool: AllowedTool) => void;
  onExpire: (id: string) => void;
  onGone: (id: string) => void;
};

function ToolRow({ tool, agent, revoked, closing, error, canUndo, onRevoke, onUndo, onExpire, onGone }: ToolRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  const revokeRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const revokedRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const refocus = useRef(false);
  const effect = EFFECTS[tool.effect];

  // Undo waits while it's being looked at or reached for.
  const held = focused || hovered;
  useEffect(() => {
    if (!revoked || closing || held) return;
    const timer = window.setTimeout(() => onExpire(tool.id), UNDO_FOR);
    return () => window.clearTimeout(timer);
  }, [revoked, closing, held, onExpire, tool.id]);

  // Gone once its space has closed; the timer covers reduced motion and missed events.
  useEffect(() => {
    if (!closing) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => onGone(tool.id), reduce ? 0 : 700);
    return () => window.clearTimeout(timer);
  }, [closing, onGone, tool.id]);

  // The button pressed is replaced by the other one; focus follows.
  useLayoutEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    if (revoked) (undoRef.current ?? revokedRef.current)?.focus();
    else revokeRef.current?.focus();
  }, [revoked]);

  function act(fn: () => void) {
    refocus.current = !!rowRef.current?.contains(document.activeElement);
    fn();
  }

  const description = error ?? (revoked ? `${agent} asks before using it again.` : tool.description);

  return (
    <li
      ref={rowRef}
      className={styles.toolRow}
      data-revoked={revoked || undefined}
      data-closing={closing || undefined}
      inert={closing || undefined}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onTransitionEnd={(e) => {
        if (closing && e.target === e.currentTarget && e.propertyName === "grid-template-rows") onGone(tool.id);
      }}
    >
      <div className={styles.clip}>
        <div className={styles.toolInner}>
          <div className={styles.toolText}>
            <div className={styles.toolLine}>
              <code className={styles.toolName}>{tool.tool}</code>
              <Badge size="sm" tone={effect.weighty ? "warning" : "neutral"} dot={effect.weighty} className={styles.toolBadge}>
                {effect.label}
              </Badge>
            </div>
            {description && (
              <p className={styles.toolDescription} data-error={error ? "" : undefined}>
                {description}
              </p>
            )}
          </div>
          <div className={styles.toolAction}>
            {revoked ? (
              <span key="revoked" className={styles.revoked} data-enter>
                <span ref={revokedRef} tabIndex={-1} className={styles.revokedText}>
                  Revoked
                </span>
                {canUndo && (
                  <>
                    <span className={styles.dot} aria-hidden="true">
                      ·
                    </span>
                    <Button
                      ref={undoRef}
                      variant="ghost"
                      className={styles.undo}
                      aria-label={`Undo revoking ${tool.tool}`}
                      onClick={() => act(() => onUndo(tool))}
                    >
                      Undo
                    </Button>
                  </>
                )}
              </span>
            ) : (
              <Button
                key="revoke"
                ref={revokeRef}
                variant="ghost"
                className={styles.revoke}
                aria-label={`Revoke ${tool.tool}`}
                onClick={() => act(() => onRevoke(tool))}
              >
                Revoke
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function AllowedTools({
  agent,
  allowed,
  onRevoke,
  onRestore,
  announce,
}: {
  agent: string;
  allowed: AllowedTool[];
  onRevoke?: (tool: AllowedTool) => Result;
  onRestore?: (tool: AllowedTool) => Result;
  announce: (line: string) => void;
}) {
  const baseId = useId();
  // Revoked tools stay in place, with Undo, until they time out and close.
  const [revoked, setRevoked] = useState<Revoked[]>([]);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const groups = useMemo(() => {
    const ids = new Set(allowed.map((t) => t.id));
    const rows = [...allowed];
    for (const r of [...revoked].sort((a, b) => a.index - b.index)) {
      if (!ids.has(r.tool.id)) rows.splice(Math.min(r.index, rows.length), 0, r.tool);
    }
    const byServer = new Map<string, AllowedTool[]>();
    for (const tool of rows) byServer.set(tool.server, [...(byServer.get(tool.server) ?? []), tool]);
    return [...byServer.entries()];
  }, [allowed, revoked]);

  const find = (id: string) => revoked.find((r) => r.tool.id === id);
  const drop = (id: string) => setRevoked((r) => r.filter((x) => x.tool.id !== id));
  const clearError = (id: string) => setErrors((e) => ({ ...e, [id]: undefined }));

  function revoke(tool: AllowedTool) {
    const index = allowed.findIndex((t) => t.id === tool.id);
    clearError(tool.id);
    setRevoked((r) => [...r.filter((x) => x.tool.id !== tool.id), { tool, index, closing: false }]);
    announce(`Revoked ${tool.tool}. ${agent} will ask before using it.`);
    const fail = (reason: unknown) => {
      drop(tool.id);
      const message = messageOf(reason, `Couldn’t revoke ${tool.tool}. Try again.`);
      setErrors((e) => ({ ...e, [tool.id]: message }));
      announce(message);
    };
    try {
      const result = onRevoke?.(tool);
      if (isPromise(result)) result.catch(fail);
    } catch (reason) {
      fail(reason);
    }
  }

  function undo(tool: AllowedTool) {
    const was = find(tool.id);
    drop(tool.id);
    announce(`${tool.tool} is always allowed again.`);
    const fail = (reason: unknown) => {
      if (was) setRevoked((r) => [...r.filter((x) => x.tool.id !== tool.id), was]);
      const message = messageOf(reason, `Couldn’t undo. ${tool.tool} is still revoked.`);
      announce(message);
    };
    try {
      const result = onRestore?.(tool);
      if (isPromise(result)) result.catch(fail);
    } catch (reason) {
      fail(reason);
    }
  }

  const expire = useCallback(
    (id: string) => setRevoked((r) => r.map((x) => (x.tool.id === id ? { ...x, closing: true } : x))),
    [],
  );
  const gone = useCallback((id: string) => setRevoked((r) => r.filter((x) => x.tool.id !== id)), []);

  if (groups.length === 0) {
    return (
      <p className={styles.empty}>
        Nothing yet. When {agent} asks to use a tool, choose Always allow and it shows up here.
      </p>
    );
  }

  return (
    <div className={styles.groups}>
      {groups.map(([server, tools], i) => {
        const labelId = `${baseId}-${i}`;
        const closing = tools.every((t) => find(t.id)?.closing);
        return (
          <div key={server} className={styles.group} data-closing={closing || undefined} inert={closing || undefined}>
            <div className={styles.clip}>
              <div className={styles.groupInner}>
                <p id={labelId} className={styles.groupLabel}>
                  {server}
                </p>
                <ul className={styles.tools} aria-labelledby={labelId}>
                  {tools.map((tool) => {
                    const state = find(tool.id);
                    return (
                      <ToolRow
                        key={tool.id}
                        tool={tool}
                        agent={agent}
                        revoked={!!state}
                        closing={!!state?.closing}
                        error={errors[tool.id]}
                        canUndo={!!onRestore}
                        onRevoke={revoke}
                        onUndo={undo}
                        onExpire={expire}
                        onGone={gone}
                      />
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Memory ---------- */

function Memory({
  agent,
  remember,
  memories,
  onClear,
  save,
  rememberSave,
  announce,
}: {
  agent: string;
  remember?: boolean;
  memories?: MemoryNote[];
  onClear?: () => Result;
  save?: (on: boolean) => void;
  rememberSave?: Save;
  announce: (line: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const cleared = useRef(false);
  const count = memories?.length ?? 0;

  // Nothing left to clear: the confirm closes on its own.
  if (confirming && count === 0) setConfirming(false);

  const wasConfirming = useRef(confirming);
  useLayoutEffect(() => {
    // The safe choice takes focus.
    if (confirming && !wasConfirming.current) cancelRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  // Clear memory is gone with the notes; focus lands on what replaced them.
  useLayoutEffect(() => {
    if (count === 0 && cleared.current) {
      cleared.current = false;
      emptyRef.current?.focus({ preventScroll: true });
    }
  }, [count]);

  function cancel() {
    setConfirming(false);
    setFailure(null);
    requestAnimationFrame(() => clearRef.current?.focus());
  }

  async function clear() {
    setFailure(null);
    const said = `Memory cleared. ${agent} forgot ${plural(count, "note")}.`;
    let result: Result;
    try {
      result = onClear?.();
    } catch (reason) {
      setFailure(messageOf(reason, "Couldn’t clear memory. Try again."));
      return;
    }
    cleared.current = true;
    if (!isPromise(result)) {
      announce(said);
      return;
    }
    setBusy(true);
    try {
      await result;
      announce(said);
    } catch (reason) {
      cleared.current = false;
      setFailure(messageOf(reason, "Couldn’t clear memory. Try again."));
    }
    setBusy(false);
  }

  function onConfirmKey(event: KeyboardEvent) {
    if (event.key === "Escape" && !busy) {
      event.stopPropagation();
      cancel();
    }
  }

  let notesLine: string;
  if (count === 0) notesLine = remember === false ? `${agent} isn’t keeping notes.` : `Nothing yet. Notes show up here as ${agent} makes them.`;
  else if (remember === false) notesLine = `${plural(count, "note")}, kept while remembering is off. Clear them to forget them.`;
  else notesLine = `${plural(count, "note")}, newest first.`;

  return (
    <div className={styles.rows}>
      {remember !== undefined && save && (
        <Row
          label="Remember between conversations"
          description={`${agent} keeps short notes, like names and preferences, and uses them in new conversations.`}
          save={rememberSave}
          control={(ids) => (
            <Switch
              checked={remember}
              aria-labelledby={ids.label}
              aria-describedby={ids.description}
              onChange={(e) => save(e.currentTarget.checked)}
            />
          )}
        />
      )}
      {memories && (
        <Row
          label={`What ${agent} remembers`}
          description={
            <span ref={emptyRef} tabIndex={-1} className={styles.focusTarget}>
              {notesLine}
            </span>
          }
          control={
            onClear && count > 0 && !confirming
              ? () => (
                  <Button ref={clearRef} variant="secondary" onClick={() => setConfirming(true)}>
                    Clear memory
                  </Button>
                )
              : undefined
          }
        >
          {(count > 0 || confirming) && (
            <AnimatedSize>
              {count > 0 && (
                <ul className={styles.notes} aria-label={`What ${agent} remembers`}>
                  {memories.map((note) => (
                    <li key={note.id}>{note.text}</li>
                  ))}
                </ul>
              )}
              {confirming && (
                <div
                  className={styles.confirm}
                  data-enter
                  role="group"
                  aria-label={`Clear everything ${agent} remembers?`}
                  onKeyDown={onConfirmKey}
                >
                  <p>
                    <strong>Clear everything {agent} remembers?</strong> {agent} forgets{" "}
                    {count === 1 ? "this note" : `these ${count} notes`} for good. Your conversations stay.
                  </p>
                  {failure && (
                    <p className={styles.failure} role="alert">
                      {failure}
                    </p>
                  )}
                  <div className={styles.confirmActions}>
                    <Button ref={cancelRef} variant="secondary" onClick={cancel} disabled={busy}>
                      Cancel
                    </Button>
                    <Button variant="danger" busy={busy} busyLabel="Clearing…" onClick={clear}>
                      Clear memory
                    </Button>
                  </div>
                </div>
              )}
            </AnimatedSize>
          )}
        </Row>
      )}
    </div>
  );
}

/* ---------- Section nav ---------- */

/** The section whose top has passed just under the sticky nav, or the last one at the end of the page. */
/** `idList` is the sections' ids, space-separated, so the effect reruns only when they change. */
function useCurrentSection(navRef: RefObject<HTMLUListElement | null>, idList: string) {
  const [current, setCurrent] = useState<string | null>(null);
  const chosen = useRef<string | null>(null);

  useEffect(() => {
    const ids = idList ? idList.split(" ") : [];
    let frame = 0;
    const update = () => {
      frame = 0;
      const nav = navRef.current;
      // Only the sticky nav on wide screens marks where you are.
      if (!nav || getComputedStyle(nav).position !== "sticky") {
        setCurrent(null);
        return;
      }
      // Just under where the nav sticks, so a section counts once it reaches the top.
      const line = (parseFloat(getComputedStyle(nav).top) || 0) + 96;
      const tops = ids.map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? Infinity);
      // A section just jumped to keeps the mark while its top is still in view.
      const picked = chosen.current ? ids.indexOf(chosen.current) : -1;
      if (picked !== -1 && tops[picked] > -1 && tops[picked] < innerHeight * 0.6) {
        setCurrent(chosen.current);
        return;
      }
      chosen.current = null;
      const scroller = document.scrollingElement;
      const atEnd = !!scroller && Math.ceil(scroller.scrollTop + innerHeight) >= scroller.scrollHeight - 2;
      let index = 0;
      tops.forEach((top, i) => {
        if (top <= line || (atEnd && top < innerHeight)) index = i;
      });
      setCurrent(ids[index] ?? null);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    // Captured, so a scrolling pane anywhere above the screen counts too.
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [navRef, idList]);

  const choose = useCallback((id: string) => {
    chosen.current = id;
  }, []);

  return { current, choose };
}

/* ---------- Screen ---------- */

/** A whole settings screen for an agent: model, connections, permissions, budget and memory. */
export function AgentSettings({
  agent,
  settings,
  onChange,
  models,
  connections,
  allowed,
  onRevoke,
  onRestore,
  effectNotes,
  spending,
  maxDailyLimit = 500,
  currency = "USD",
  locale = "en-US",
  memories,
  onClearMemory,
  sections = ALL_SECTIONS,
  title,
  description,
  headingLevel = 1,
  idPrefix = "agent-settings",
  className,
}: AgentSettingsProps) {
  const { text: announcement, announce } = useAnnouncer();
  const { saves, save } = useSaves(announce);
  const navRef = useRef<HTMLUListElement>(null);
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency }), [locale, currency]);
  const moneyFormat = useMemo(() => ({ style: "currency" as const, currency }), [currency]);

  const available: Record<AgentSettingsSection, boolean> = {
    model: settings.model !== undefined && !!models?.length,
    connections: connections !== undefined,
    permissions: settings.policy !== undefined || allowed !== undefined,
    usage: settings.dailyLimit !== undefined || spending !== undefined,
    memory: settings.remember !== undefined || memories !== undefined,
  };
  const shown = sections.filter((s, i) => available[s] && sections.indexOf(s) === i);
  const sectionId = (s: AgentSettingsSection) => `${idPrefix}-${s}`;
  const { current, choose } = useCurrentSection(navRef, shown.map(sectionId).join(" "));

  const level = headingLevel;
  const change = (key: string, patch: Partial<AgentSettingsValue>, said: string) => save(key, () => onChange?.(patch), said);

  const { policy, dailyLimit } = settings;
  const used = spending?.used ?? 0;
  const reached = dailyLimit !== undefined && spending !== undefined && used >= dailyLimit;

  function body(section: AgentSettingsSection) {
    switch (section) {
      case "model": {
        const list = models ?? [];
        return (
          <div className={styles.rows}>
            <Row
              label="Default model"
              description="Used for new conversations. Ones already started keep the model they began with."
              save={saves.model}
              control={() => (
                <ModelPicker
                  models={list}
                  value={settings.model!}
                  align="end"
                  className={styles.model}
                  label="Model for new conversations"
                  onValueChange={(id) => {
                    const name = list.find((m) => m.id === id)?.name ?? id;
                    change("model", { model: id }, `Saved. New conversations use ${name}.`);
                  }}
                />
              )}
            />
          </div>
        );
      }

      case "connections":
        return <Connections agent={agent} {...connections!} className={styles.connections} />;

      case "permissions":
        return (
          <div className={styles.subsections}>
            {allowed !== undefined && (
              <div className={styles.subsection}>
                <div className={styles.subHead}>
                  <Heading level={level + 2} className={styles.subTitle}>
                    Always allowed
                  </Heading>
                  <p className={styles.intro}>Tools you chose Always allow for. Revoke one and {agent} asks again next time.</p>
                </div>
                <AllowedTools agent={agent} allowed={allowed} onRevoke={onRevoke} onRestore={onRestore} announce={announce} />
              </div>
            )}
            {policy && (
              <div className={styles.subsection}>
                <div className={styles.subHead}>
                  <Heading level={level + 2} className={styles.subTitle}>
                    Everything else
                  </Heading>
                  <p className={styles.intro}>For every other tool, by what it does.</p>
                </div>
                <div className={styles.rows}>
                  {EFFECT_ORDER.map((effect) => {
                    const { label, weighty, note } = EFFECTS[effect];
                    const value = effect === "read" || effect === "change" ? policy[effect] : "ask";
                    return (
                      <Row
                        key={effect}
                        label={label}
                        description={effectNotes?.[effect] ?? note(agent)}
                        save={saves[`policy-${effect}`]}
                        control={(ids) => (
                          <SegmentedControl
                            aria-labelledby={ids.label}
                            aria-describedby={ids.description}
                            value={value}
                            widths="content"
                            className={styles.policy}
                            onValueChange={(next) => {
                              if (effect !== "read" && effect !== "change") return;
                              const to = next as AskPolicy;
                              change(
                                `policy-${effect}`,
                                { policy: { ...policy, [effect]: to } },
                                `Saved. ${label}: ${to === "allow" ? "allowed without asking" : "ask every time"}.`,
                              );
                            }}
                          >
                            <Segment value="ask">Ask every time</Segment>
                            <Segment value="allow" disabled={weighty}>
                              Allow
                            </Segment>
                          </SegmentedControl>
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case "usage": {
        const limitText = dailyLimit !== undefined ? money.format(dailyLimit) : "";
        const left = dailyLimit !== undefined ? money.format(Math.max(dailyLimit - used, 0)) : "";
        return (
          <div className={styles.rows}>
            {spending && dailyLimit !== undefined && (
              <div className={styles.block}>
                <UsageBreakdown
                  kind="money"
                  label="Spent today"
                  period="today"
                  agent={agent}
                  used={used}
                  limit={dailyLimit}
                  segments={spending.segments}
                  currency={currency}
                  locale={locale}
                  messages={
                    reached
                      ? { danger: `Limit reached. ${agent} stops and asks before spending more today.` }
                      : {
                          warning: `${left} left. ${agent} stops and asks at ${limitText}.`,
                          danger: `Only ${left} left. ${agent} stops and asks at ${limitText}.`,
                        }
                  }
                />
              </div>
            )}
            {dailyLimit !== undefined && (
              <Row
                label="Daily limit"
                align="field"
                description={
                  reached
                    ? `${agent} reached ${limitText} today and is waiting for you. Raise the limit to let it carry on.`
                    : `${agent} stops and asks when it reaches ${limitText} today.`
                }
                save={saves.limit}
                control={() => (
                  <NumberInput
                    label="Daily limit"
                    hideLabel
                    className={styles.limit}
                    value={dailyLimit}
                    min={1}
                    max={maxDailyLimit}
                    hint={`Up to ${money.format(maxDailyLimit)}`}
                    format={moneyFormat}
                    locale={locale}
                    steppers={false}
                    onValueChange={(next) => change("limit", { dailyLimit: next }, `Saved. Daily limit ${money.format(next)}.`)}
                  />
                )}
              />
            )}
          </div>
        );
      }

      case "memory":
        return (
          <Memory
            agent={agent}
            remember={settings.remember}
            memories={memories}
            onClear={onClearMemory}
            rememberSave={saves.remember}
            save={(on) =>
              change(
                "remember",
                { remember: on },
                on ? `Saved. ${agent} remembers between conversations.` : `Saved. ${agent} won’t remember anything new.`,
              )
            }
            announce={announce}
          />
        );
    }
  }

  const INTRO: Partial<Record<AgentSettingsSection, string>> = {
    connections: `MCP servers give ${agent} its tools. Turning one off keeps its sign-in.`,
    permissions: `What ${agent} may do without asking you first.`,
    usage: `What ${agent} has spent today, and where it stops.`,
    memory: `What ${agent} carries from one conversation to the next.`,
  };

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      <header className={styles.header}>
        <Heading level={level} className={styles.title}>
          {title ?? `${agent} settings`}
        </Heading>
        {description && <p className={styles.lede}>{description}</p>}
      </header>

      <div className={styles.layout}>
        {shown.length > 1 && (
          <nav className={styles.nav} aria-label="Settings sections">
            <ul ref={navRef} className={styles.navList}>
              {shown.map((s) => (
                <li key={s}>
                  <a
                    href={`#${sectionId(s)}`}
                    className={styles.navLink}
                    aria-current={current === sectionId(s) ? "true" : undefined}
                    onClick={() => choose(sectionId(s))}
                  >
                    {SECTION_TITLE[s]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className={styles.content}>
          {shown.map((s) => (
            <Section key={s} id={sectionId(s)} level={level + 1} title={SECTION_TITLE[s]} intro={INTRO[s]}>
              {body(s)}
            </Section>
          ))}
        </div>
      </div>

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}
