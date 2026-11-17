"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { BrandMark, type BrandName } from "../brand-marks/brand-marks";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./research-progress.module.css";

export type ResearchStatus = "searching" | "reading" | "done" | "failed" | "stopped";

export type ResearchQuery = {
  /** What the agent searched for, as it typed it: "nut-free autumn supper menu". */
  text: string;
  /** `running` while the search is out. Defaults to `done`. */
  status?: "running" | "done";
  /** How many results came back. Shown quietly after the query. */
  results?: number;
};

export type PageStatus = "queued" | "reading" | "read" | "skipped" | "failed";

export type ResearchPage = {
  url: string;
  /** The page's title. Falls back to its domain. */
  title?: string;
  /** The site's mark from `brand-marks`, for a site in the set: `"wikipedia"`, `"reddit"`. Wins over `favicon`. */
  brand?: BrandName;
  /** A favicon URL you already have, or your own mark as a node. Without either, the domain's first letter shows. Nothing is fetched. */
  favicon?: string | ReactNode;
  status: PageStatus;
  /** `skipped` or `failed`: why, in a few words: "Behind a paywall", "Didn’t load in 10s". */
  reason?: string;
};

type ResearchProgressProps = {
  status: ResearchStatus;
  /** Searches in the order the agent ran them. */
  queries: ResearchQuery[];
  /** Pages in the order the agent found them. Every page it means to read, read or not. */
  pages: ResearchPage[];
  /** `Date.now()` values. They drive the elapsed time and "in 48s". */
  startedAt?: number;
  finishedAt?: number;
  /** `failed`: what happened, in words, and what it means for the answer. */
  error?: string;
  /** The agent's name, as the person knows it. */
  agent?: string;
  /** Names the research for screen readers: "Research for the autumn menu". */
  label?: string;
  /** Controlled open state of the details. Leave out to let it open and close itself. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** While searching or reading: a Stop button. Set `status="stopped"` once the agent has stopped. */
  onStop?: () => void;
  /** `failed` and `stopped`: a button to run the research again. */
  onRetry?: () => void;
  /** A shared clock, as `Date.now()`. Pass it to render the time on the server or tick many together. */
  now?: number;
  className?: string;
};

const ACTIVE: ResearchStatus[] = ["searching", "reading"];
const MISSED: PageStatus[] = ["skipped", "failed"];
const STACK = 3;

const PAGE_STATUS: Record<PageStatus, string> = {
  queued: "Queued",
  reading: "Reading",
  read: "Read",
  skipped: "Skipped",
  failed: "Couldn’t read",
};

/** "https://www.seasonaltable.example/menus" → "seasonaltable.example". */
export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 12000 → "12s", 252000 → "4m 12s", 3840000 → "1h 4m". */
function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function tally(pages: ResearchPage[]) {
  const read = pages.filter((p) => p.status === "read").length;
  const missed = pages.filter((p) => MISSED.includes(p.status)).length;
  const reading = pages.some((p) => p.status === "reading");
  return { total: pages.length, read, missed, current: Math.min(pages.length, read + missed + (reading ? 1 : 0)) };
}

function summarize(status: ResearchStatus, pages: ResearchPage[], took: string) {
  const t = tally(pages);
  const inTime = took ? ` in ${took}` : "";
  switch (status) {
    case "searching":
      return "Searching…";
    case "reading":
      return `Reading ${t.current} of ${plural(t.total, "source")}`;
    case "done":
      if (t.read === 0) return `Found nothing to read${inTime}`;
      return t.missed ? `Read ${t.read} of ${plural(t.total, "source")}${inTime}` : `Read ${plural(t.read, "source")}${inTime}`;
    case "failed":
      return t.read ? `Failed after reading ${t.read} of ${t.total}` : "Research failed";
    case "stopped":
      return t.read ? `Stopped after reading ${t.read} of ${t.total}` : "Stopped while searching";
  }
}

function missedLine(pages: ResearchPage[]) {
  const n = pages.filter((p) => MISSED.includes(p.status)).length;
  if (!n) return "";
  return n === 1 ? "1 source couldn’t be read, so the answer leaves it out." : `${n} sources couldn’t be read, so the answer leaves them out.`;
}

/** Ticks after mount only, so the server and the first client render agree. */
function useNow(shared: number | undefined, running: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (shared !== undefined || !running) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    // Twice a second so whole-second labels never lag.
    const id = window.setInterval(tick, 500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [shared, running]);
  return shared ?? now;
}

/** A quiet arc, turning: the one thing in progress. */
function Spinner() {
  return (
    <svg className={styles.spinner} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" className={styles.track} />
      <circle cx="8" cy="8" r="5.5" className={styles.arc} pathLength={1} />
    </svg>
  );
}

/** The site's brand mark or favicon, or its first letter. */
function Mark({ page, enter }: { page: ResearchPage; enter?: boolean }) {
  const [broken, setBroken] = useState(false);
  const domain = domainOf(page.url);
  const letter = (domain.match(/[a-z0-9]/i)?.[0] ?? "?").toUpperCase();
  let mark: ReactNode;
  if (page.brand) mark = <BrandMark name={page.brand} size={16} className={styles.glyph} />;
  else if (typeof page.favicon === "string" && page.favicon && !broken)
    mark = (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={styles.glyph} src={page.favicon} alt="" width={16} height={16} draggable={false} onError={() => setBroken(true)} />
    );
  else if (page.favicon && typeof page.favicon !== "string") mark = <span className={styles.glyph}>{page.favicon}</span>;
  else mark = <span className={styles.letter}>{letter}</span>;
  return (
    <span className={styles.mark} data-status={page.status} data-enter={enter || undefined} aria-hidden="true">
      {mark}
    </span>
  );
}

/** The live view of an agent researching the web: what it searched, which pages it's reading, and what it got. */
export function ResearchProgress({
  status,
  queries,
  pages,
  startedAt,
  finishedAt,
  error,
  agent = "The agent",
  label = "Research",
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  onStop,
  onRetry,
  now: sharedNow,
  className,
}: ResearchProgressProps) {
  const baseId = useId();
  const listId = `${baseId}-details`;
  const descId = `${baseId}-desc`;

  const rootRef = useRef<HTMLDivElement>(null);
  const disclosureRef = useRef<HTMLButtonElement>(null);

  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded);
  const open = expanded ?? ownExpanded;
  const active = ACTIVE.includes(status);
  const now = useNow(sharedNow, active);

  // What was there on mount shows as it is; only what arrives later fades in.
  const [initial] = useState(() => new Set([...queries.map((q) => `q:${q.text}`), ...pages.map((p) => `p:${p.url}`)]));

  const took = startedAt !== undefined && finishedAt !== undefined ? formatDuration(finishedAt - startedAt) : "";
  const summary = summarize(status, pages, took);

  // Milestones only: starting to read, and how it ended. Never each page.
  const [announcement, setAnnouncement] = useState("");
  const [changed, setChanged] = useState(false);
  const [previous, setPrevious] = useState(status);
  if (previous !== status) {
    setPrevious(status);
    setChanged(true);
    const t = tally(pages);
    if (status === "searching") setAnnouncement(`${agent} is searching the web`);
    else if (status === "reading") setAnnouncement(`${agent} found ${plural(t.total, "source")} to read`);
    else if (status === "done") setAnnouncement(`${summary}. ${missedLine(pages)}`.trim());
    else if (status === "failed") setAnnouncement(`${summary}${error ? `: ${error}` : ""}`);
    else setAnnouncement(summary);
  }

  // Stop and Retry leave with the status; if focus was on one, keep it on this research.
  const focusWasInside = useRef(false);
  const lastStatus = useRef(status);
  useLayoutEffect(() => {
    if (lastStatus.current === status) return;
    lastStatus.current = status;
    const focused = document.activeElement;
    const lost = !focused || focused === document.body || Boolean(focused.closest("[inert]"));
    if (focusWasInside.current && lost) disclosureRef.current?.focus({ preventScroll: true });
  }, [status]);

  function setOpen(next: boolean) {
    setOwnExpanded(next);
    onExpandedChange?.(next);
  }

  const elapsed = active && startedAt !== undefined && now !== null ? formatDuration(now - startedAt) : "";

  // What a screen reader hears after the line: what it's on now, or what it missed.
  let description = "";
  if (status === "searching") {
    const running = [...queries].reverse().find((q) => q.status === "running");
    description = running ? `Searching for “${running.text}”` : "";
  } else if (status === "reading") {
    const page = pages.find((p) => p.status === "reading");
    description = page ? `Reading ${page.title ?? domainOf(page.url)}, ${domainOf(page.url)}` : "";
  } else if (status === "done") {
    description = missedLine(pages);
  }

  // A few of the sites, in the order found: while it works, the ones found; after, the ones read.
  const seen = new Set<string>();
  const stack = pages
    .filter((p) => (active ? true : p.status === "read"))
    .filter((p) => {
      const d = domainOf(p.url);
      if (seen.has(d)) return false;
      seen.add(d);
      return true;
    })
    .slice(0, STACK);

  const retry = (status === "failed" || status === "stopped") && onRetry;
  const note = status === "failed" ? (error ?? `${agent} couldn’t finish the research.`) : "";

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-status={status}
      data-open={open}
      onFocusCapture={() => {
        focusWasInside.current = true;
      }}
      onBlurCapture={(e) => {
        if (e.relatedTarget) {
          focusWasInside.current = rootRef.current?.contains(e.relatedTarget as Node) ?? false;
          return;
        }
        // No next target: a click on the page, or the focused button was removed. Only the click leaves.
        const left = e.target;
        requestAnimationFrame(() => {
          if (left.isConnected && document.activeElement !== left) focusWasInside.current = false;
        });
      }}
    >
      <div className={styles.head}>
        <button
          ref={disclosureRef}
          type="button"
          className={styles.disclosure}
          aria-expanded={open}
          aria-controls={listId}
          aria-describedby={description || note ? descId : undefined}
          onClick={() => setOpen(!open)}
        >
          {/* Live, the count ticks in place on one line. Settled, the summary fades in. */}
          {active ? (
            <span className={styles.sweep}>
              <TextMorph className={styles.summary}>{summary}</TextMorph>
            </span>
          ) : (
            <span key={status} className={styles.summary} data-enter={changed || undefined}>
              {summary}
            </span>
          )}
          <Icon name="chevron-right" data-turn={open ? "open" : ""} className={styles.chevron} />
        </button>
        <span className={styles.aside}>
          {stack.length > 0 && (
            <span className={styles.stack} aria-hidden="true">
              {stack.map((p) => (
                <Mark key={p.url} page={p} enter={!initial.has(`p:${p.url}`)} />
              ))}
            </span>
          )}
          {elapsed && (
            <span className={styles.time}>
              <span className={styles.srOnly}>Elapsed: </span>
              {elapsed}
            </span>
          )}
          {active && onStop && (
            <Button variant="ghost" className={styles.stop} onClick={onStop}>
              <Icon name="stop" className={styles.stopIcon} />
              <span className={styles.stopLabel}>Stop</span>
            </Button>
          )}
        </span>
      </div>

      {(note || retry) && (
        <div className={styles.note} data-enter={changed || undefined}>
          {note && (
            <p id={descId} className={styles.noteText}>
              {note}
            </p>
          )}
          {retry && (
            <Button variant="secondary" onClick={onRetry}>
              {status === "failed" ? "Try again" : "Search again"}
            </Button>
          )}
        </div>
      )}
      {description && !note && (
        <span id={descId} className={styles.srOnly}>
          {description}
        </span>
      )}

      <div id={listId} className={styles.panel} data-open={open} inert={!open || undefined}>
        <div className={styles.clip}>
          <AnimatedSize>
            <div className={styles.body}>
              {queries.length > 0 && (
                <ol className={styles.queries} aria-label="Searches">
                  {queries.map((q, i) => (
                    <li key={`${i}-${q.text}`} className={styles.query} data-running={q.status === "running" || undefined} data-enter={!initial.has(`q:${q.text}`) || undefined}>
                      <Icon name="search" className={styles.queryIcon} />
                      <span className={styles.queryText}>
                        <span className={q.status === "running" ? styles.sweep : undefined}>{q.text}</span>
                      </span>
                      <span className={styles.queryCount}>
                        {q.results !== undefined && q.status !== "running" && (
                          <>
                            <span className={styles.srOnly}>, </span>
                            {plural(q.results, "result")}
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {pages.length > 0 ? (
                <ol className={styles.pages} aria-label="Sources">
                  {pages.map((p) => {
                    const missed = MISSED.includes(p.status);
                    const word = p.status === "queued" && !active ? "Not read" : PAGE_STATUS[p.status];
                    return (
                      <li key={p.url} className={styles.item} data-enter={!initial.has(`p:${p.url}`) || undefined}>
                        <a className={styles.page} data-status={p.status} href={p.url} target="_blank" rel="noopener noreferrer">
                          <Mark page={p} />
                          <span className={styles.pageText}>
                            <span className={styles.pageTitle}>{p.title ?? domainOf(p.url)}</span>
                            {/* An en space: it doesn't collapse, and it stays on the title's line when the site wraps. */}
                            {"\u2002"}
                            <span className={styles.srOnly}>, </span>
                            <span className={styles.pageDomain}>{domainOf(p.url)}</span>
                            {missed && (
                              <span className={styles.pageReason}>
                                <span className={styles.srOnly}>, </span>
                                {p.reason ? `${word}: ${p.reason}` : word}
                              </span>
                            )}
                          </span>
                          <span className={styles.pageStatus}>
                            {p.status === "read" && <Icon name="check" className={styles.pageCheck} />}
                            {p.status === "reading" && <Spinner />}
                            {!missed && (
                              <span className={styles.srOnly}>
                                , {word}
                              </span>
                            )}
                            <span className={styles.srOnly}> (opens in new tab)</span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className={styles.none}>{active ? "No sources found yet." : "No sources were found."}</p>
              )}
            </div>
          </AnimatedSize>
        </div>
      </div>

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}
