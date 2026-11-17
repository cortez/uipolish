"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../button/button";
import { Icon, type IconName } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./merge-status.module.css";

export type MergeState = "draft" | "checks-running" | "checks-failed" | "conflicts" | "ready" | "merged" | "closed";

export type MergeChecks = { passed: number; failed?: number; total: number };

type MergeStatusProps = {
  /** The pull request's number: 8376. */
  number: number;
  /** Where the number links: the pull request on GitHub, GitLab… Opens in a new tab. */
  href?: string;
  state: MergeState;
  /** Check runs so far, for "Checks running · 3 of 7" and "2 checks failed". */
  checks?: MergeChecks;
  /** The branch it merges into, for "Conflicts with main" and "Merged into main". */
  base?: string;
  /** Merge it. Return a promise and the button holds its busy state until it settles; a rejection's message shows in the bar. */
  onMerge?: () => void | Promise<unknown>;
  /** The button's label: "Merge", or "Squash and merge" for a squash-only repository. */
  mergeLabel?: string;
  /** Takes the Merge button's place: "Ready for review" on a draft, "Fix checks" when one failed. */
  action?: ReactNode;
  className?: string;
};

type Tone = "neutral" | "working" | "success" | "warning" | "danger";
type Look = { mark: IconName | "working" | "draft"; tone: Tone; text: string };

function look(state: MergeState, checks: MergeChecks | undefined, base: string): Look {
  switch (state) {
    case "draft":
      return { mark: "draft", tone: "neutral", text: "Draft" };
    case "checks-running": {
      const settled = checks ? checks.passed + (checks.failed ?? 0) : 0;
      return { mark: "working", tone: "working", text: checks?.total ? `Checks running · ${settled} of ${checks.total}` : "Checks running" };
    }
    case "checks-failed": {
      const n = checks?.failed || 1;
      return { mark: "alert", tone: "danger", text: `${n} ${n === 1 ? "check" : "checks"} failed` };
    }
    case "conflicts":
      return { mark: "warning", tone: "warning", text: `Conflicts with ${base}` };
    case "ready":
      return { mark: "check-circle", tone: "success", text: "Ready to merge" };
    case "merged":
      return { mark: "check-circle", tone: "neutral", text: `Merged into ${base}` };
    case "closed":
      return { mark: "close", tone: "neutral", text: "Closed" };
  }
}

/** A pull request in one line: its number, where it stands, and the move it's waiting for. */
export function MergeStatus({ number, href, state, checks, base = "main", onMerge, mergeLabel = "Merge", action, className }: MergeStatusProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A new state from outside clears an old failure.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setError(null);
  }
  const shown = look(state, checks, base);
  const { mark, text } = error ? { mark: "alert" as const, text: error } : shown;
  const tone: Tone = error ? "danger" : shown.tone;

  async function merge() {
    if (!onMerge || busy || state !== "ready") return;
    setError(null);
    let result: unknown;
    try {
      result = onMerge();
      if (result instanceof Promise) {
        setBusy(true);
        await result;
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn’t merge. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // Merge shows while there's something to merge; it can be pressed once the pull request is ready.
  const open = state !== "merged" && state !== "closed" && state !== "draft";
  const button =
    action ??
    (onMerge && open && (
      <Button
        // Until it's ready, a quiet outline: the state beside it says why it waits.
        variant={state === "ready" || busy ? "primary" : "secondary"}
        className={styles.merge}
        data-ready={state === "ready" || undefined}
        onClick={merge}
        disabled={state !== "ready" && !busy}
        busy={busy}
        busyLabel="Merging…"
      >
        {mergeLabel}
      </Button>
    ));

  return (
    <div className={className ? `${styles.bar} ${className}` : styles.bar} data-tone={tone}>
      {href ? (
        <a className={styles.number} href={href} target="_blank" rel="noreferrer">
          #{number}
          <Icon name="external" className={styles.external} />
          <span className={styles.srOnly}> (opens in a new tab)</span>
        </a>
      ) : (
        <span className={styles.number}>#{number}</span>
      )}
      <span className={styles.dot} aria-hidden="true">
        ·
      </span>
      <span className={styles.state} role="status">
        <StateMark mark={mark} />
        <TextMorph className={styles.text}>{text}</TextMorph>
      </span>
      {button && <span className={styles.action}>{button}</span>}
    </div>
  );
}

/** The icon set's status glyphs; a dashed ring for a draft, and Tool steps' working mark (a dot breathing in a ring). */
function StateMark({ mark }: { mark: Look["mark"] }) {
  if (mark === "working" || mark === "draft") {
    return (
      <svg viewBox="0 0 16 16" className={styles.glyph} data-mark={mark} aria-hidden="true">
        <circle cx="8" cy="8" r="5.25" className={styles.ring} pathLength={24} />
        {mark === "working" && <circle cx="8" cy="8" r="2.5" className={styles.pulse} />}
      </svg>
    );
  }
  return <Icon name={mark} className={styles.glyph} />;
}
