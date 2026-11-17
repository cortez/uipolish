"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "../icons/icons";
import { Tooltip } from "../tooltip/tooltip";
import styles from "./response-actions.module.css";

export type Rating = "up" | "down" | null;

type ResponseActionsProps = {
  /** What Copy puts on the clipboard. */
  text: string;
  /** Controlled rating. */
  rating?: Rating;
  onRate?: (rating: Rating) => void;
  /** Pass to ask "What went wrong?" after a thumbs down. */
  onComment?: (comment: string) => void;
  /** Shows the retry button. */
  onRetry?: () => void;
  className?: string;
};

type Note = { text: string; tone?: "danger" } | null;

const NOTE_MS = 3000;
const COPIED_MS = 2000;

export function ResponseActions({ text, rating, onRate, onComment, onRetry, className }: ResponseActionsProps) {
  const id = useId();
  const [innerRating, setInnerRating] = useState<Rating>(null);
  const current = rating !== undefined ? rating : innerRating;
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  // The note keeps its last text while it fades out, so it never empties mid-fade.
  const [note, setNote] = useState<{ text: string; tone?: "danger"; shown: boolean }>({ text: "", shown: false });
  const [announcement, setAnnouncement] = useState("");
  const fieldRef = useRef<HTMLInputElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef(0);
  const noteTimer = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(copyTimer.current);
      window.clearTimeout(noteTimer.current);
    },
    [],
  );

  function showNote(next: Note) {
    window.clearTimeout(noteTimer.current);
    if (!next) {
      setNote((n) => ({ ...n, shown: false }));
      return;
    }
    setNote({ ...next, shown: true });
    setAnnouncement(next.text);
    noteTimer.current = window.setTimeout(() => setNote((n) => ({ ...n, shown: false })), NOTE_MS);
  }

  async function copy() {
    window.clearTimeout(copyTimer.current);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setAnnouncement("Copied");
      copyTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setCopied(false);
      showNote({ text: "Couldn’t copy. Select the text instead.", tone: "danger" });
    }
  }

  function rate(value: "up" | "down") {
    const next = current === value ? null : value;
    if (rating === undefined) setInnerRating(next);
    onRate?.(next);
    const ask = next === "down" && !!onComment;
    setAsking(ask);
    if (ask) {
      showNote(null);
      // Wait a frame: the field is only being revealed by this press.
      requestAnimationFrame(() => fieldRef.current?.focus({ preventScroll: true }));
    } else {
      showNote(next ? { text: "Thanks for the feedback" } : null);
    }
  }

  function closeField(focusThumb: boolean) {
    setAsking(false);
    if (focusThumb) downRef.current?.focus();
  }

  function send(event: FormEvent) {
    event.preventDefault();
    const value = comment.trim();
    if (!value) return;
    onComment?.(value);
    setComment("");
    closeField(true);
    showNote({ text: "Thanks for the feedback" });
  }

  function onFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeField(true);
  }

  const panelId = `${id}-feedback`;
  const canSend = comment.trim() !== "";

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      <div className={styles.row} role="group" aria-label="Response actions">
        <Tooltip content={copied ? "Copied" : "Copy"} describe={false}>
          <button type="button" className={styles.action} aria-label="Copy response" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} />
          </button>
        </Tooltip>
        <Tooltip content="Good response" describe={false}>
          <button
            type="button"
            className={styles.action}
            aria-label="Good response"
            aria-pressed={current === "up"}
            onClick={() => rate("up")}
          >
            <ThumbIcon />
          </button>
        </Tooltip>
        <Tooltip content="Bad response" describe={false}>
          <button
            ref={downRef}
            type="button"
            className={styles.action}
            aria-label="Bad response"
            aria-pressed={current === "down"}
            aria-expanded={onComment ? asking : undefined}
            aria-controls={onComment ? panelId : undefined}
            onClick={() => rate("down")}
          >
            <ThumbIcon down />
          </button>
        </Tooltip>
        {onRetry && (
          <Tooltip content="Retry" describe={false}>
            <button type="button" className={styles.action} aria-label="Retry" onClick={onRetry}>
              <RetryIcon />
            </button>
          </Tooltip>
        )}
        <span className={styles.note} data-shown={note.shown || undefined} data-tone={note.tone} aria-hidden="true">
          {note.text}
        </span>
      </div>

      {onComment && (
        <div id={panelId} className={styles.panel} data-open={asking || undefined} inert={!asking}>
          <div className={styles.panelInner}>
            <form className={styles.form} onSubmit={send}>
              <div className={styles.field}>
                <input
                  ref={fieldRef}
                  className={styles.input}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={onFieldKeyDown}
                  placeholder="What went wrong?"
                  aria-label="What went wrong with this response"
                  enterKeyHint="send"
                  maxLength={500}
                />
                <button
                  type="submit"
                  className={styles.send}
                  data-ready={canSend || undefined}
                  aria-disabled={!canSend || undefined}
                >
                  Send
                </button>
              </div>
              <button
                type="button"
                className={styles.action}
                aria-label="Skip feedback"
                onClick={() => closeField(true)}
              >
                <Icon name="close" />
              </button>
            </form>
          </div>
        </div>
      )}

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}

/** Thumb up; `down` turns it over. */
function ThumbIcon({ down }: { down?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
      className={styles.thumb}
      style={down ? { rotate: "180deg" } : undefined}
    >
      <path d="M5.25 7.25 7.6 2.5c.95 0 1.65.85 1.5 1.8l-.35 2.2h3.05a1.4 1.4 0 0 1 1.37 1.7l-.95 4.2a1.4 1.4 0 0 1-1.37 1.1H5.25Z" />
      <path d="M5.25 7.25h-1.5a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h1.5Z" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" className={styles.glyph}>
      <path d="M2.75 8a5.25 5.25 0 1 0 1.6-3.78" />
      <path d="M2.75 2.75v3h3" />
    </svg>
  );
}
