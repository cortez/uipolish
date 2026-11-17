"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "../button/button";
import { DropdownMenu } from "../dropdown-menu/dropdown-menu";
import { FileChip, type FileChange } from "../file-changes/file-changes";
import { Icon, type IconName } from "../icons/icons";
import { Markdown } from "../markdown/markdown";
import { TextMorph } from "../text-morph/text-morph";
import { formatElapsed, ToolSteps, type ToolStep } from "../tool-steps/tool-steps";
import { Tooltip } from "../tooltip/tooltip";
import styles from "./turn-summary.module.css";

/** A tool step, with the glyph the summary line shows for its kind of tool. */
export type TurnStep = ToolStep & { icon?: IconName };

/** What an agent did between a prompt and its answer, in order. */
export type TurnItem =
  /** A short note the agent wrote while it worked ("Found it: the cache key ignores the locale."). Markdown. */
  | { kind: "message"; id: string; text: string }
  /** A run of tool calls between two notes. */
  | { kind: "steps"; id: string; steps: TurnStep[]; label?: string };

/** "17 tool calls, 3 messages". */
export function describeTurn(items: TurnItem[]) {
  const calls = items.reduce((n, i) => n + (i.kind === "steps" ? i.steps.length : 0), 0);
  const notes = items.filter((i) => i.kind === "message").length;
  const parts = [
    calls > 0 && `${calls} tool ${calls === 1 ? "call" : "calls"}`,
    notes > 0 && `${notes} ${notes === 1 ? "message" : "messages"}`,
  ].filter(Boolean);
  return parts.join(", ") || "No tool calls";
}

/** The first few distinct glyphs, in the order the tools ran. */
function glyphsOf(items: TurnItem[], max = 4) {
  const seen: IconName[] = [];
  for (const item of items) {
    if (item.kind !== "steps") continue;
    for (const step of item.steps) {
      if (step.icon && !seen.includes(step.icon)) seen.push(step.icon);
      if (seen.length === max) return seen;
    }
  }
  return seen;
}

/* ---------- The summary ---------- */

type TurnSummaryProps = {
  items: TurnItem[];
  /** The agent is still on this turn: the line shimmers and counts up as calls arrive. */
  working?: boolean;
  /** Controlled open state. Folded by default: the answer below is what most people read. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** A failed step's Retry. */
  onRetry?: (stepId: string) => void;
  /** Names the opened work for screen readers. */
  label?: string;
  className?: string;
};

/** One quiet line, "› 17 tool calls, 3 messages", that opens to the notes and tool calls behind an answer. */
export function TurnSummary({
  items,
  working = false,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  onRetry,
  label = "Agent work",
  className,
}: TurnSummaryProps) {
  const panelId = useId();
  const [inner, setInner] = useState(defaultOpen);
  const open = controlled ?? inner;
  const setOpen = (next: boolean) => {
    if (controlled === undefined) setInner(next);
    onOpenChange?.(next);
  };
  const glyphs = useMemo(() => glyphsOf(items), [items]);
  const failed = items.some((i) => i.kind === "steps" && i.steps.some((s) => s.status === "failed"));
  const text = working && items.length === 0 ? "Getting started" : describeTurn(items);

  return (
    <div className={className ? `${styles.summary} ${className}` : styles.summary} data-open={open || undefined}>
      <button type="button" className={styles.line} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        {/* Leading a short inline label, the chevron points right and turns a quarter to open downward. */}
        <Icon name="chevron-right" className={styles.chevron} data-turn={open ? "open" : ""} />
        <span className={working ? `${styles.label} ${styles.working}` : styles.label}>
          <TextMorph>{text}</TextMorph>
        </span>
        {glyphs.length > 0 && (
          <span className={styles.glyphs} aria-hidden="true">
            {glyphs.map((g) => (
              <Icon key={g} name={g} className={styles.glyph} />
            ))}
          </span>
        )}
        {failed && (
          <span className={styles.failed}>
            <Icon name="alert" className={styles.glyph} />A step failed
          </span>
        )}
      </button>
      <div id={panelId} className={styles.panel} inert={!open} role="group" aria-label={label}>
        <div className={styles.clip}>
          <div className={styles.items}>
            {items.map((item) =>
              item.kind === "message" ? (
                <Markdown key={item.id} source={item.text} className={styles.note} />
              ) : (
                <ToolSteps key={item.id} steps={item.steps} label={item.label ?? "Tool calls"} onRetry={onRetry} defaultOpen className={styles.steps} />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- The footer ---------- */

type TurnFooterProps = {
  /** `Date.now()` when the turn started; with `finishedAt`, the footer says how long it took. */
  startedAt?: number;
  finishedAt?: number;
  /** Still working: the time counts up, and Copy and More wait for the answer. */
  working?: boolean;
  /** What Copy puts on the clipboard: the answer. Leave it out for no Copy. */
  copyText?: string;
  /** The files this turn changed, as chips with their diff stats. */
  files?: FileChange[];
  /** A chip was pressed: open that file's diff. Without it the chips are plain text. */
  onOpenFile?: (path: string) => void;
  /** Menu items for More (Dropdown menu's `MenuItem`s). Leave it out for no menu. */
  menu?: ReactNode;
  className?: string;
};

/** The line under an answer: the files it changed, how long it took, Copy and More. */
export function TurnFooter({ startedAt, finishedAt, working = false, copyText, files = [], onOpenFile, menu, className }: TurnFooterProps) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef(0);
  const [now, setNow] = useState(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Counts whole seconds while working; twice a second so it never lags a second behind.
  useEffect(() => {
    if (!working) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [working]);

  const end = working ? now : finishedAt;
  const elapsed = startedAt !== undefined && end ? formatElapsed(Math.max(0, end - startedAt)) : null;

  async function onCopy() {
    window.clearTimeout(timer.current);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(copyText ?? "");
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
    timer.current = window.setTimeout(() => setCopy("idle"), 2000);
  }

  return (
    <div className={className ? `${styles.footer} ${className}` : styles.footer}>
      {files.length > 0 && (
        <ul className={styles.files} aria-label="Files changed">
          {files.map((f) => (
            <li key={f.path}>
              <FileChip path={f.path} kind={f.kind} added={f.added} removed={f.removed} onClick={onOpenFile ? () => onOpenFile(f.path) : undefined} />
            </li>
          ))}
        </ul>
      )}
      <div className={styles.meta}>
        {elapsed && (
          <span className={styles.time} data-working={working || undefined}>
            {working ? `Working · ${elapsed}` : `Took ${elapsed}`}
          </span>
        )}
        {copyText !== undefined && !working && (
          <Tooltip content={copy === "copied" ? "Copied" : "Copy answer"} describe={false}>
            <Button variant="ghost" size="sm" className={styles.action} aria-label="Copy answer" onClick={onCopy}>
              <Icon name={copy === "copied" ? "check" : "copy"} />
            </Button>
          </Tooltip>
        )}
        {menu && !working && (
          <DropdownMenu
            align="start"
            trigger={
              <Button variant="ghost" size="sm" className={styles.action} aria-label="More for this answer">
                <Icon name="more" />
              </Button>
            }
          >
            {menu}
          </DropdownMenu>
        )}
        {copy === "failed" && <span className={styles.copyFailed} aria-hidden="true">Couldn’t copy. Select the text instead.</span>}
        <span role="status" className={styles.srOnly}>
          {copy === "copied" ? "Copied" : copy === "failed" ? "Couldn’t copy. Select the text instead." : ""}
        </span>
      </div>
    </div>
  );
}
