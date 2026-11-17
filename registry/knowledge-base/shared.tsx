"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BrandMark } from "../brand-marks/brand-marks";
import { Icon } from "../icons/icons";
import styles from "./knowledge-base.module.css";

/* ---------- Data ---------- */

/** The apps a source can come from. Each shows its real mark. */
export type KnowledgeService = "googledrive" | "notion" | "dropbox";

/** Where a source came from: an uploaded file, a website (one page or a whole sitemap), or a connected app. */
export type KnowledgeSourceKind = "file" | "website" | KnowledgeService;

/** Where a source is on its way in. `reading`, `chunking` and `indexing` run in that order. */
export type KnowledgeStatus = "queued" | "reading" | "chunking" | "indexing" | "ready" | "failed";

export type KnowledgeSource = {
  id: string;
  /** What people call it: "Autumn tasting menu.pdf", "acme.co/help", "Venue FAQ". */
  name: string;
  kind: KnowledgeSourceKind;
  /** Where it lives, one line: "Shared drive › Copper › Menus", "Every page in acme.co/sitemap.xml". */
  location?: string;
  /** Opens the original, from the row's menu. */
  href?: string;
  status: KnowledgeStatus;
  /** 0 to 1 through the current stage, when you know it. Moves the line under the row. */
  progress?: number;
  /** `failed`: what went wrong and what fixes it. "Password protected. Upload a copy without one." */
  error?: string;
  /** Counts so far; they tick up while it's read. Leave out until known. */
  pages?: number;
  chunks?: number;
  tokens?: number;
  /** ISO time the last sync finished. */
  syncedAt?: string;
};

/** One passage the retriever picked for a test question. */
export type KnowledgeChunk = {
  id: string;
  /** The `id` of the source it came from. */
  sourceId: string;
  /** Where in the source: "Page 3", "Parking", "Row 14". */
  location?: string;
  /** The passage, in full. It's never cut. */
  text: string;
  /** `[start, end)` character ranges in `text` to mark: the words that matched. */
  highlights?: [number, number][];
  /** Similarity, 0 to 1. */
  score: number;
};

export type KnowledgeTestResult = {
  /** What the agent would say, if you generate it. Leave out to show only the passages. */
  answer?: string;
  /** Best match first. `[]`: nothing matched. */
  chunks: KnowledgeChunk[];
};

export type KnowledgeUsage = {
  used: number;
  limit: number;
  /** In sentences: "pages". Default "pages". */
  unit?: string;
};

/** Files you've just added, as one batch: the block shows them on one sheet while they're read. */
export type KnowledgeBatch = {
  /** The sources in the batch, in the order they were added. */
  sourceIds: string[];
  /** `Date.now()` when it started and, once settled, finished. */
  startedAt?: number;
  finishedAt?: number;
};

/** A callback's result: return a promise to show busy until it settles; a rejection shows its message. */
export type Result = void | Promise<unknown>;

/* ---------- Words ---------- */

export const SERVICES: Record<KnowledgeService, { title: string; what: string; noun: string }> = {
  googledrive: { title: "Google Drive", what: "Folders and shared drives. Docs, Sheets and PDFs inside stay in sync.", noun: "folder" },
  notion: { title: "Notion", what: "Pages and databases you share with the integration, and their sub-pages.", noun: "page" },
  dropbox: { title: "Dropbox", what: "Folders, including team folders. New files are picked up on each sync.", noun: "folder" },
};

export const STATUS_LABEL: Record<KnowledgeStatus, string> = {
  queued: "Queued",
  reading: "Reading",
  chunking: "Chunking",
  indexing: "Indexing",
  ready: "Ready",
  failed: "Failed",
};

export const RUNNING: KnowledgeStatus[] = ["queued", "reading", "chunking", "indexing"];
export const isRunning = (s: KnowledgeStatus) => RUNNING.includes(s);

/** How far along, 0 to 1, through reading, chunking and indexing. */
export function stageFraction(source: Pick<KnowledgeSource, "status" | "progress">) {
  const at = ["reading", "chunking", "indexing"].indexOf(source.status);
  if (source.status === "ready") return 1;
  if (at < 0) return 0;
  return (at + Math.min(Math.max(source.progress ?? 0, 0), 1)) / 3;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return n === 1 ? one : many;
}

export function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

/** "allergens.final.PDF" → "pdf"; no extension → "". */
export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function formatBytes(bytes: number) {
  const units = ["bytes", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return `${u === 0 ? n : n.toFixed(n < 10 ? 1 : 0)} ${units[u]}`;
}

export type Formatters = {
  number: (n: number) => string;
  compact: (n: number) => string;
  ago: (iso: string) => string;
  percent: (fraction: number) => string;
};

/** Fixed locale and a fixed "now", so server and browser say the same thing. */
export function useFormatters(locale: string, now: number): Formatters {
  return useMemo(() => {
    const number = new Intl.NumberFormat(locale);
    const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
    const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
    const rel = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const day = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
    return {
      number: (n) => number.format(n),
      // 38,240 → "38.2K" reads as a figure, not a word; lower-case it like the rest of the line.
      compact: (n) => (n < 10_000 ? number.format(n) : compact.format(n).toLowerCase()),
      percent: (f) => percent.format(f),
      ago: (iso) => {
        const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
        const abs = Math.abs(seconds);
        if (abs < 60) return "just now";
        if (abs < 3600) return rel.format(Math.round(seconds / 60), "minute");
        if (abs < 86_400) return rel.format(Math.round(seconds / 3600), "hour");
        if (abs < 86_400 * 7) return rel.format(Math.round(seconds / 86_400), "day");
        return `on ${day.format(new Date(iso))}`;
      },
    };
  }, [locale, now]);
}

/** One polite region for the whole screen. */
export function useAnnouncer() {
  const [text, setText] = useState("");
  const said = useRef(0);
  const announce = useCallback((line: string) => {
    // A zero-width space on every other message, so saying the same thing twice is heard twice.
    setText(line + (said.current++ % 2 ? "​" : ""));
  }, []);
  return { text, announce };
}

function isPromise(value: unknown): value is Promise<unknown> {
  return !!value && typeof (value as Promise<unknown>).then === "function";
}

export function messageOf(reason: unknown, fallback: string) {
  if (typeof reason === "string" && reason) return reason;
  if (reason instanceof Error && reason.message) return reason.message;
  return fallback;
}

/** Runs a callback that may return a promise: busy while it's pending, the message when it fails. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => Result, fallback: string): Promise<boolean> => {
    setError(null);
    let result: Result;
    try {
      result = fn();
    } catch (reason) {
      setError(messageOf(reason, fallback));
      return false;
    }
    if (!isPromise(result)) return true;
    setBusy(true);
    try {
      await result;
      return true;
    } catch (reason) {
      setError(messageOf(reason, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}

/* ---------- Small parts ---------- */

/** The same string with every digit as an 8: the widest a number of that shape gets. */
export const widest = (s: string) => s.replace(/\d/g, "8");

/** A number that holds its width: the reserve sits under it, hidden, and sets the box. */
export function Counter({ value, reserve, className }: { value: string; reserve?: string; className?: string }) {
  if (!reserve) return <span className={cx(styles.num, className)}>{value}</span>;
  return (
    <span className={cx(styles.counter, className)}>
      <span className={styles.reserve} aria-hidden="true">
        {reserve}
      </span>
      <span className={styles.num}>{value}</span>
    </span>
  );
}

/** The tile at the start of a row: the service's mark, a globe for a website, the file's extension. */
export function SourceTile({ source, size = "md" }: { source: Pick<KnowledgeSource, "kind" | "name">; size?: "sm" | "md" }) {
  const { kind } = source;
  let inner;
  if (kind === "file" && size === "sm") {
    inner = <Icon name="file" className={styles.glyph} />;
  } else if (kind === "file") {
    const ext = extensionOf(source.name);
    inner = <span className={styles.tileExt}>{(ext && ext.length <= 4 ? ext : "file").toUpperCase()}</span>;
  } else if (kind === "website") {
    inner = <GlobeGlyph />;
  } else {
    inner = <BrandMark name={kind} size={size === "sm" ? 14 : 18} />;
  }
  return (
    <span className={styles.tile} data-size={size} data-kind={kind} aria-hidden="true">
      {inner}
    </span>
  );
}

/** A globe on the icon set's 16px grid and stroke, for websites. */
export function GlobeGlyph() {
  return (
    <svg className={styles.glyph} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M1.75 8h12.5" />
      <path d="M8 1.75c1.7 1.8 2.5 3.9 2.5 6.25S9.7 12.45 8 14.25C6.3 12.45 5.5 10.35 5.5 8S6.3 3.55 8 1.75Z" />
    </svg>
  );
}

/** The status glyph: a dot waiting, a turning arc while it works, a check, a mark for a failure. */
export function StatusGlyph({ status }: { status: KnowledgeStatus }) {
  if (status === "ready") return <Icon name="check" className={styles.statusIcon} />;
  if (status === "failed") return <Icon name="alert" className={styles.statusIcon} />;
  if (status === "queued")
    return (
      <svg className={styles.statusIcon} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="2.5" fill="currentColor" />
      </svg>
    );
  return (
    <svg className={cx(styles.statusIcon, styles.spinner)} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle className={styles.spinTrack} cx="8" cy="8" r="5.5" />
      <circle className={styles.spinArc} cx="8" cy="8" r="5.5" pathLength={1} />
    </svg>
  );
}
