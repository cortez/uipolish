"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { useStickToBottom } from "../message-thread/use-stick-to-bottom";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./voice-session.module.css";

/** One line of the call: something said, or a tool the agent ran. `at` is ms from the start of the call. */
export type VoiceTranscriptItem =
  /** What the user said. `final: false` while speech recognition may still revise it. */
  | { id: string; role: "user"; text: string; final?: boolean; at?: number }
  /**
   * What the agent says. Pass the whole reply as `text` and how many characters
   * the voice has reached as `spoken`; words appear as they're said. Set
   * `interrupted` when the user talked over it: what was never said stays unsaid.
   */
  | { id: string; role: "agent"; text: string; spoken?: number; interrupted?: boolean; at?: number }
  /** A lookup the agent made. Title it as a person would: "Checking the guest list", then "Checked the guest list". */
  | { id: string; role: "tool"; title: string; status: "running" | "done" | "failed"; detail?: string; at?: number };

/** 42000 → "0:42", 754000 → "12:34", 3840000 → "1:04:00". */
export function formatCallTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

type Word = { text: string; end: number };

function words(text: string): Word[] {
  return Array.from(text.matchAll(/\S+\s*/g), (m) => ({ text: m[0], end: (m.index ?? 0) + m[0].trimEnd().length }));
}

/** The agent's words, each shown once the voice reaches it. Only words that arrive after mount fade in. */
function Spoken({ text, spoken, interrupted }: { text: string; spoken?: number; interrupted?: boolean }) {
  const all = useMemo(() => words(text), [text]);
  const count = spoken === undefined ? all.length : all.filter((w) => w.end <= spoken).length;
  const [initial] = useState(count);
  return (
    <>
      {all.slice(0, count).map((w, i) => (
        <span key={i} className={styles.word} data-enter={i >= initial || undefined}>
          {w.text}
        </span>
      ))}
      {interrupted && (
        <span className={styles.cut}>
          <span className={styles.srOnly}>, </span>
          Interrupted
        </span>
      )}
    </>
  );
}

function ToolGlyph({ status }: { status: "running" | "done" | "failed" }) {
  return (
    <span className={styles.toolGlyph} data-status={status} aria-hidden="true">
      <svg data-icon="running" viewBox="0 0 16 16">
        <circle className={styles.spinTrack} cx="8" cy="8" r="5.25" fill="none" />
        <path className={styles.spinArc} d="M8 2.75a5.25 5.25 0 0 1 5.25 5.25" fill="none" strokeLinecap="round" />
      </svg>
      <svg data-icon="done" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.5" fill="currentColor" />
        <path className={styles.tick} d="M5.4 8.2l1.8 1.8 3.4-3.7" pathLength={1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg data-icon="failed" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.5" fill="currentColor" />
        <path d="M8 5v3.3" stroke="var(--ui-on-danger)" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinecap="round" />
        <circle cx="8" cy="10.75" r="0.9" fill="var(--ui-on-danger)" />
      </svg>
    </span>
  );
}

const TOOL_STATUS = { running: "In progress", done: "Done", failed: "Failed" } as const;

type TranscriptProps = {
  items: VoiceTranscriptItem[];
  agentName: string;
  /** Shown with no lines yet. */
  empty: string;
  /** Static: no following, no new-line control. For the summary. */
  still?: boolean;
};

/** The call in words: both sides, the agent's lookups inline. Follows the newest line until the reader scrolls up. */
export function Transcript({ items, agentName, empty, still }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLOListElement>(null);
  const noScroll = useRef<HTMLDivElement>(null);
  const { showJump, jumpToLatest } = useStickToBottom(still ? noScroll : scrollRef, contentRef);
  const initialIds = useState(() => new Set(items.map((i) => i.id)))[0];

  const lines = items.map((item, i) => {
    // A name heads each change of speaker; tools sit inside the agent's turn.
    const prev = items.slice(0, i).reverse().find((p) => p.role !== "tool");
    const speakerRole = item.role === "tool" ? "agent" : item.role;
    const showName = item.role !== "tool" && (!prev || prev.role !== item.role);
    const enter = !initialIds.has(item.id) || undefined;
    const name = speakerRole === "user" ? "You" : agentName;

    if (item.role === "tool") {
      return (
        <li key={item.id} className={styles.tool} data-from="tool" data-status={item.status} data-enter={enter}>
          <ToolGlyph status={item.status} />
          <span className={styles.toolText}>
            <span className={styles.srOnly}>{TOOL_STATUS[item.status]}: </span>
            <span className={styles.toolTitle}>
              <TextMorph>{item.title}</TextMorph>
            </span>
            {item.detail && <span className={styles.toolDetail}>{item.detail}</span>}
          </span>
        </li>
      );
    }

    return (
      <li key={item.id} className={styles.line} data-from={item.role} data-enter={enter} data-first={showName || undefined}>
        {showName ? (
          <p className={styles.who}>
            <span className={styles.whoName}>{name}</span>
            {item.at !== undefined && <span className={styles.whoTime}>{formatCallTime(item.at)}</span>}
          </p>
        ) : (
          <span className={styles.srOnly}>{name}: </span>
        )}
        {item.role === "user" ? (
          <p className={styles.said} data-interim={item.final === false || undefined}>
            {item.text}
            {item.final === false && <span className={styles.srOnly}> (still listening)</span>}
          </p>
        ) : (
          <p className={styles.said} aria-busy={(item.spoken !== undefined && item.spoken < item.text.length && !item.interrupted) || undefined}>
            <Spoken text={item.text} spoken={item.spoken} interrupted={item.interrupted} />
          </p>
        )}
      </li>
    );
  });

  return (
    <div className={styles.transcript} data-still={still || undefined}>
      <div
        ref={scrollRef}
        className={styles.scroller}
        role="log"
        aria-label="Transcript"
        aria-live="off"
        tabIndex={still ? undefined : 0}
      >
        {items.length === 0 && <p className={styles.emptyLog}>{empty}</p>}
        <ol ref={contentRef} className={styles.lines}>
          {lines}
        </ol>
      </div>
      {!still && (
        <div className={styles.jump} data-visible={showJump || undefined} inert={!showJump}>
          <Button variant="secondary" onClick={jumpToLatest}>
            {[<Icon key="i" name="arrow-down" />, <span key="l">Latest</span>]}
          </Button>
        </div>
      )}
    </div>
  );
}
