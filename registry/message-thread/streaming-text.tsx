"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { parse, renderBlocks, type RenderText } from "./markdown";
import styles from "./message-thread.module.css";

/* Animate by source offset, not mount order, so a word moving into a new parent doesn't
   replay. The aria-hidden animated tree becomes plain text at the end. */

type Batch = { from: number; to: number; at: number };
type View = { text: string; batches: Batch[] };

// Must cover the entrance (--ui-dur-base) plus the largest stagger, with room.
const BATCH_LIFE = 1000;
const MAX_STAGGER = 180;

function wholeWords(text: string, streaming: boolean) {
  if (!streaming) return text;
  for (let i = text.length - 1; i >= 0; i--) {
    if (/\s/.test(text[i])) return text.slice(0, i + 1);
  }
  return "";
}

function advance(prev: View, text: string, streaming: boolean, now: number): View {
  const next = wholeWords(text, streaming);
  if (next === prev.text) return prev;
  // Replaced, not extended (a regenerate): start over without animating.
  if (!next.startsWith(prev.text)) return { text: next, batches: [] };
  const batches = prev.batches.filter((b) => now - b.at < BATCH_LIFE);
  batches.push({ from: prev.text.length, to: next.length, at: now });
  return { text: next, batches };
}

const WORD = /\S+\s*|\s+/g;

function animatedText(batches: Batch[]): RenderText {
  return (text, start) => {
    if (!batches.length || start + text.length <= batches[0].from) return text;
    const out: ReactNode[] = [];
    let plain = "";
    for (const match of text.matchAll(WORD)) {
      const from = start + match.index;
      const to = from + match[0].length;
      const batch = batches.find((b) => to > b.from && to <= b.to);
      if (!batch) {
        plain += match[0];
        continue;
      }
      if (plain) out.push(plain);
      plain = "";
      const delay = Math.min(Math.max(0, from - batch.from) * 3, MAX_STAGGER);
      out.push(
        <span key={from} className={styles.word} style={{ "--delay": `${delay}ms` } as CSSProperties}>
          {match[0]}
        </span>,
      );
    }
    if (plain) out.push(plain);
    return out;
  };
}

type StreamingTextProps = {
  /** The reply so far. */
  text: string;
  streaming: boolean;
  /** Read to screen readers while the reply streams. */
  pendingLabel?: string;
  className?: string;
};

export function StreamingText({ text, streaming, pendingLabel = "Writing a reply…", className }: StreamingTextProps) {
  const [view, setView] = useState<View>(() => ({ text: wholeWords(text, streaming), batches: [] }));
  const [settledText, setSettledText] = useState<string | null>(streaming ? null : text);
  const latest = useRef({ text, streaming });
  const frame = useRef(0);

  // Coalesce updates to one per frame.
  useEffect(() => {
    latest.current = { text, streaming };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const { text, streaming } = latest.current;
      setView((prev) => advance(prev, text, streaming, performance.now()));
    });
  }, [text, streaming]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  useEffect(() => {
    if (streaming) return;
    const timer = setTimeout(() => setSettledText(text), BATCH_LIFE);
    return () => clearTimeout(timer);
  }, [streaming, text]);

  const live = streaming || settledText !== text;
  const shown = live ? view.text : text;
  const blocks = useMemo(() => parse(shown), [shown]);
  const classes = className ? `${styles.prose} ${className}` : styles.prose;

  if (!live) {
    return (
      <div key="done" className={classes}>
        {renderBlocks(blocks)}
      </div>
    );
  }

  return (
    <>
      <div key="live" className={classes} data-streaming="" aria-hidden="true">
        {blocks.length ? renderBlocks(blocks, animatedText(view.batches)) : <p className={styles.pending}>Thinking</p>}
      </div>
      {streaming && <span className={styles.srOnly}>{pendingLabel}</span>}
    </>
  );
}
