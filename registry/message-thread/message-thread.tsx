"use client";

import {
  Children,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Button } from "../button/button";
import { TextMorph } from "../text-morph/text-morph";
import { Icon } from "../icons/icons";
import { StreamingText } from "./streaming-text";
import { useStickToBottom } from "./use-stick-to-bottom";
import styles from "./message-thread.module.css";

export { StreamingText } from "./streaming-text";

export type MessageStatus = "complete" | "streaming" | "stopped" | "error";
export type Feedback = "up" | "down" | null;
export type MessageAttachment = { name: string; url?: string; type?: string; size?: number };

// Only messages mounted after the first paint animate in; history doesn't replay.
const ReadyContext = createContext(false);

type MessageThreadProps = Omit<ComponentProps<"div">, "children"> & {
  children?: ReactNode;
  /** Accessible name of the log. */
  label?: string;
  empty?: ReactNode;
};

export function MessageThread({ children, label = "Conversation", empty, className, ...props }: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { showJump, jumpToLatest } = useStickToBottom(scrollRef, contentRef);
  const [ready, setReady] = useState(false);
  // `{cond && list}` passes false; only real children count.
  const isEmpty = Children.toArray(children).length === 0;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={className ? `${styles.thread} ${className}` : styles.thread} {...props}>
      <div
        ref={scrollRef}
        className={styles.scroller}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={label}
        // Focusable so the conversation can be scrolled from the keyboard.
        tabIndex={0}
      >
        <div ref={contentRef} className={styles.content} data-empty={isEmpty || undefined}>
          <ReadyContext value={ready}>{isEmpty ? <div className={styles.empty}>{empty}</div> : children}</ReadyContext>
        </div>
      </div>
      <button
        type="button"
        className={styles.jump}
        data-visible={showJump || undefined}
        inert={!showJump}
        onClick={() => {
          jumpToLatest();
          scrollRef.current?.focus({ preventScroll: true });
        }}
      >
        <Icon className={styles.jumpArrow} name="arrow-right" />
        Jump to latest
      </button>
    </div>
  );
}

type MessageProps = {
  from: "user" | "assistant";
  /** Markdown-ish text; streams in place. */
  text?: string;
  /** Pre-rendered content; wins over `text`. */
  children?: ReactNode;
  status?: MessageStatus;
  /** Accessible author label. Defaults to "You" / "Assistant". */
  author?: string;
  /** An avatar element (an <img>, initials); none by default. */
  avatar?: ReactNode;
  attachments?: MessageAttachment[];
  /** What went wrong, for status="error". */
  error?: string;
  onRetry?: () => void;
  feedback?: Feedback;
  onFeedback?: (value: Feedback) => void;
  /** Text the Copy action copies. Defaults to `text`. */
  copyText?: string;
  /** The row under an assistant reply. Default: Copy, Retry and thumbs. `false`
   *  leaves it out; a node (such as `<ResponseActions />`) replaces it. */
  actions?: ReactNode | false;
  className?: string;
};

export function Message({
  from,
  text = "",
  children,
  status = "complete",
  author = from === "user" ? "You" : "Assistant",
  avatar,
  attachments,
  error = "Something went wrong before the reply finished.",
  onRetry,
  feedback,
  onFeedback,
  copyText,
  actions,
  className,
}: MessageProps) {
  const ready = useContext(ReadyContext);
  const [enter] = useState(ready);
  const streaming = status === "streaming";

  let body: ReactNode;
  if (from === "user") {
    body = (children ?? text) ? <div className={styles.bubble}>{children ?? text}</div> : null;
  } else if (children) {
    body = (
      <div key={streaming ? "live" : "done"} className={styles.prose} aria-hidden={streaming || undefined}>
        {children}
      </div>
    );
  } else {
    body = <StreamingText text={text} streaming={streaming} />;
  }

  return (
    <article
      className={className ? `${styles.message} ${className}` : styles.message}
      data-from={from}
      data-status={status}
      data-enter={enter || undefined}
      data-avatar={avatar ? true : undefined}
      aria-label={author}
      aria-busy={streaming || undefined}
    >
      {avatar && <div className={styles.avatar}>{avatar}</div>}
      <div className={styles.main}>
        {attachments && attachments.length > 0 && <Attachments items={attachments} />}
        {body}
        {status === "stopped" && (
          <p className={styles.note}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" />
            </svg>
            You stopped this reply.
          </p>
        )}
        {status === "error" && (
          <div className={styles.error}>
            <p>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" />
                <path d="M8 4.75v3.75" stroke="currentColor" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.9" fill="currentColor" />
              </svg>
              {error}
            </p>
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}
        {from === "assistant" && status !== "error" && actions !== undefined && actions !== false && actions}
        {from === "assistant" && status !== "error" && actions === undefined && (
          <MessageActions
            hidden={streaming}
            copyText={copyText ?? text}
            onRetry={onRetry}
            feedback={feedback}
            onFeedback={onFeedback}
          />
        )}
      </div>
    </article>
  );
}

function Attachments({ items }: { items: MessageAttachment[] }) {
  return (
    <ul className={styles.attachments} aria-label="Attachments">
      {items.map((item, i) =>
        item.url && item.type?.startsWith("image/") ? (
          <li key={i} className={styles.attachment} data-kind="image">
            {/* eslint-disable-next-line @next/next/no-img-element -- user uploads, sizes are fixed */}
            <img src={item.url} alt={item.name} width={96} height={96} draggable={false} />
          </li>
        ) : (
          <li key={i} className={styles.attachment} data-kind="file">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M9.25 2H5a1.25 1.25 0 0 0-1.25 1.25v9.5A1.25 1.25 0 0 0 5 14h6a1.25 1.25 0 0 0 1.25-1.25V5L9.25 2Z" />
              <path d="M9.25 2v3h3" />
            </svg>
            <span className={styles.fileName} title={item.name}>
              {item.name}
            </span>
          </li>
        ),
      )}
    </ul>
  );
}

type MessageActionsProps = {
  /** Reserve the row's space without showing it (while streaming). */
  hidden?: boolean;
  copyText: string;
  onRetry?: () => void;
  feedback?: Feedback;
  onFeedback?: (value: Feedback) => void;
};

function MessageActions({ hidden, copyText, onRetry, feedback, onFeedback }: MessageActionsProps) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const [innerFeedback, setInnerFeedback] = useState<Feedback>(null);
  const current = feedback !== undefined ? feedback : innerFeedback;
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleCopy() {
    clearTimeout(timer.current);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(copyText);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
    timer.current = window.setTimeout(() => setCopy("idle"), 2000);
  }

  function rate(value: "up" | "down") {
    const next = current === value ? null : value;
    if (feedback === undefined) setInnerFeedback(next);
    onFeedback?.(next);
  }

  return (
    <div
      className={styles.actions}
      data-hidden={hidden || undefined}
      data-pinned={copy !== "idle" || current ? true : undefined}
      inert={hidden}
    >
      <button type="button" className={styles.action} data-copy={copy} aria-label="Copy" onClick={handleCopy}>
        <Icon name={copy === "copied" ? "check" : "copy"} />
        <span className={styles.actionLabel} aria-hidden="true">
          <TextMorph>{copy === "copied" ? " Copied" : copy === "failed" ? " Couldn’t copy" : ""}</TextMorph>
        </span>
      </button>
      {onRetry && (
        <button type="button" className={styles.action} aria-label="Retry" onClick={onRetry}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.75 8a5.25 5.25 0 1 0 1.6-3.78" />
            <path d="M2.75 2.75v3h3" />
          </svg>
        </button>
      )}
      <button
        type="button"
        className={styles.action}
        aria-label="Good response"
        aria-pressed={current === "up"}
        onClick={() => rate("up")}
      >
        <ThumbIcon />
      </button>
      <button
        type="button"
        className={styles.action}
        aria-label="Bad response"
        aria-pressed={current === "down"}
        onClick={() => rate("down")}
      >
        <ThumbIcon down />
      </button>
      <span role="status" className={styles.srOnly}>
        {copy === "copied" ? "Copied" : copy === "failed" ? "Couldn’t copy. Select the text instead." : ""}
      </span>
    </div>
  );
}

function ThumbIcon({ down }: { down?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" style={down ? { rotate: "180deg" } : undefined}>
      <path d="M5.25 7.25 7.6 2.5c.95 0 1.65.85 1.5 1.8l-.35 2.2h3.05a1.4 1.4 0 0 1 1.37 1.7l-.95 4.2a1.4 1.4 0 0 1-1.37 1.1H5.25Z" />
      <path d="M5.25 7.25h-1.5a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h1.5Z" />
    </svg>
  );
}
