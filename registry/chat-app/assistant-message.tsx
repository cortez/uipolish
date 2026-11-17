"use client";

import { useMemo, type ReactNode } from "react";
import { Button } from "../button/button";
import { StreamingText } from "../message-thread/message-thread";
import { parse, renderBlocks, type RenderText } from "../message-thread/markdown";
import thread from "../message-thread/message-thread.module.css";
import { Reasoning } from "../reasoning/reasoning";
import { ResponseActions, type Rating } from "../response-actions/response-actions";
import { Citation, SourceList, Sources } from "../sources/sources";
import { ToolSteps } from "../tool-steps/tool-steps";
import type { ChatMessage } from "./chat-app";
import styles from "./chat-app.module.css";

/* An assistant turn: reasoning, then tool steps, then the answer with its sources, then
   the actions. Each part shows only when the message carries it. */

// "[2]" after a word, with any space before it.
const MARKER = /\s?\[(\d{1,2})\]/g;

/** The reply without citation markers: what Copy copies, and what streams. */
export function withoutCitations(text: string) {
  return text.replace(MARKER, "");
}

function citing(count: number): RenderText {
  return (text, start) => {
    const out: ReactNode[] = [];
    let last = 0;
    for (const match of text.matchAll(MARKER)) {
      const n = Number(match[1]);
      out.push(text.slice(last, match.index));
      if (n >= 1 && n <= count) out.push(<Citation key={start + match.index} n={n} />);
      last = match.index + match[0].length;
    }
    if (!out.length) return text;
    out.push(text.slice(last));
    return out;
  };
}

type AssistantMessageProps = {
  message: ChatMessage;
  author: string;
  /** The conversation says this reply failed, whatever the message says. */
  failed: boolean;
  onRetry?: () => void;
  onRetryStep?: (stepId: string) => void;
  onRate?: (rating: Rating) => void;
  onComment?: (comment: string) => void;
};

export function AssistantMessage({
  message,
  author,
  failed,
  onRetry,
  onRetryStep,
  onRate,
  onComment,
}: AssistantMessageProps) {
  const status = failed ? "error" : (message.status ?? "complete");
  const streaming = status === "streaming";
  const { text, reasoning, steps, sources = [] } = message;

  const plain = useMemo(() => withoutCitations(text), [text]);
  const rich = useMemo(
    () => (streaming || !text ? null : renderBlocks(parse(text), citing(sources.length))),
    [streaming, text, sources.length],
  );

  // While reasoning streams or a tool runs, those parts say what's happening;
  // the answer's own "Thinking" line would say it twice.
  const working =
    reasoning?.streaming || steps?.some((s) => s.status === "running" || s.status === "pending");

  let body: ReactNode = null;
  if (streaming) {
    if (text || !working) body = <StreamingText text={plain} streaming pendingLabel={`${author} is writing a reply…`} />;
  } else if (rich) {
    body = <div className={`${thread.prose} ${styles.settled}`}>{rich}</div>;
  }

  // Only once the answer has cited something: a reply cut off before its first
  // marker has nothing to point at.
  const showSources = !streaming && sources.length > 0 && /\[\d{1,2}\]/.test(text);
  const content = (
    <>
      {body}
      {showSources && <SourceList className={styles.sourceList} />}
    </>
  );

  return (
    <article
      className={`${thread.message} ${styles.assistant}`}
      data-from="assistant"
      data-status={status}
      aria-label={author}
      aria-busy={streaming || undefined}
    >
      <div className={`${thread.main} ${styles.turn}`}>
        {reasoning && (reasoning.text || reasoning.streaming) && (
          <Reasoning streaming={Boolean(reasoning.streaming) && streaming} duration={reasoning.duration} startedAt={reasoning.startedAt} steps={reasoning.steps}>
            {reasoning.text}
          </Reasoning>
        )}
        {steps && steps.length > 0 && (
          <ToolSteps
            steps={steps}
            label={`${author}’s steps`}
            onRetry={onRetryStep}
            className={styles.steps}
          />
        )}
        {sources.length > 0 ? <Sources sources={sources}>{content}</Sources> : content}

        {status === "stopped" && (
          <p className={thread.note}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" />
            </svg>
            You stopped this reply.
          </p>
        )}
        {status === "error" && (
          <div className={thread.error}>
            <p>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" />
                <path d="M8 4.75v3.75" stroke="currentColor" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.9" fill="currentColor" />
              </svg>
              {message.error ?? "The connection dropped before this reply finished."}
            </p>
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}
        {status !== "error" && (
          // Space held while streaming, so finishing doesn't push anything.
          <div className={styles.actions} data-hidden={streaming || undefined} data-rated={message.rating ? "" : undefined} inert={streaming}>
            <ResponseActions text={plain} rating={message.rating} onRate={onRate} onComment={onComment} onRetry={onRetry} />
          </div>
        )}
      </div>
    </article>
  );
}
