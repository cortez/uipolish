"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../icons/icons";
import styles from "./diff-view.module.css";

type Line = {
  type: "same" | "add" | "del";
  text: string;
  /** 1-based line numbers; null on the side the line isn't in. */
  oldNo: number | null;
  newNo: number | null;
  /** Changed span vs. the paired line, [start, end). */
  emph?: [number, number];
};

type Row = { kind: "line"; line: Line } | { kind: "fold"; id: string; lines: Line[] };

type DiffViewProps = {
  before: string;
  after: string;
  name?: string;
  /** Unchanged lines kept around each change. The rest fold away. */
  context?: number;
  /** `after` is still arriving: only whole lines show. */
  streaming?: boolean;
  maxHeight?: number;
  className?: string;
};

const MIN_FOLD = 4;

function splitLines(text: string, streaming: boolean) {
  const lines = text.split("\n");
  // A trailing newline isn't a line; while streaming, neither is the unfinished last one.
  if (lines.at(-1) === "" || streaming) lines.pop();
  return lines;
}

/** Myers' O(ND) diff over lines. Returns the edit script in order. */
function diffLines(a: string[], b: string[]): Line[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const v = new Int32Array(2 * max + 2);
  const trace: Int32Array[] = [];
  search: for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max]) ? v[k + 1 + max] : v[k - 1 + max] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[k + max] = x;
      if (x >= n && y >= m) break search;
    }
  }
  const out: Line[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const t = trace[d];
    const k = x - y;
    const prevK = k === -d || (k !== d && t[k - 1 + max] < t[k + 1 + max]) ? k + 1 : k - 1;
    const prevX = t[prevK + max];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      out.push({ type: "same", text: a[x - 1], oldNo: x, newNo: y });
      x--;
      y--;
    }
    if (d > 0) {
      if (x === prevX) out.push({ type: "add", text: b[y - 1], oldNo: null, newNo: y });
      else out.push({ type: "del", text: a[x - 1], oldNo: x, newNo: null });
    }
    x = prevX;
    y = prevY;
  }
  return out.reverse();
}

/** Removals before additions; marks paired lines' changed span. */
function tidy(lines: Line[]) {
  const out: Line[] = [];
  for (let i = 0; i < lines.length; ) {
    if (lines[i].type === "same") {
      out.push(lines[i++]);
      continue;
    }
    const dels: Line[] = [];
    const adds: Line[] = [];
    while (i < lines.length && lines[i].type !== "same") (lines[i].type === "del" ? dels : adds).push(lines[i++]);
    if (dels.length === adds.length) dels.forEach((d, j) => emphasize(d, adds[j]));
    out.push(...dels, ...adds);
  }
  return out;
}

function emphasize(del: Line, add: Line) {
  const a = del.text;
  const b = add.text;
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  const longest = Math.max(a.length, b.length);
  if (longest === 0 || (start + end) / longest < 0.3) return;
  if (a.length - end > start) del.emph = [start, a.length - end];
  if (b.length - end > start) add.emph = [start, b.length - end];
}

function toRows(lines: Line[], context: number): Row[] {
  const changed = lines.map((l) => l.type !== "same");
  const rows: Row[] = [];
  for (let i = 0; i < lines.length; ) {
    if (changed[i]) {
      rows.push({ kind: "line", line: lines[i++] });
      continue;
    }
    let j = i;
    while (j < lines.length && !changed[j]) j++;
    const keepStart = i === 0 ? 0 : context;
    const keepEnd = j === lines.length ? 0 : context;
    const hidden = j - i - keepStart - keepEnd;
    if (hidden < MIN_FOLD) {
      for (let k = i; k < j; k++) rows.push({ kind: "line", line: lines[k] });
    } else {
      for (let k = i; k < i + keepStart; k++) rows.push({ kind: "line", line: lines[k] });
      const folded = lines.slice(i + keepStart, j - keepEnd);
      // Keyed by the first folded line, stable while streaming.
      rows.push({ kind: "fold", id: `f${folded[0].oldNo}`, lines: folded });
      for (let k = j - keepEnd; k < j; k++) rows.push({ kind: "line", line: lines[k] });
    }
    i = j;
  }
  return rows;
}

const keyOf = (l: Line) => (l.type === "del" ? `o${l.oldNo}` : `n${l.newNo}`);

export function DiffView({ before, after, name, context = 3, streaming = false, maxHeight, className }: DiffViewProps) {
  const id = useId();
  const { rows, added, removed, digits } = useMemo(() => {
    const lines = tidy(diffLines(splitLines(before, false), splitLines(after, streaming)));
    // Removals past the last line received may still come back.
    if (streaming) while (lines.at(-1)?.type === "del") lines.pop();
    const hasChange = lines.some((l) => l.type !== "same");
    return {
      rows: hasChange ? toRows(lines, context) : [],
      added: lines.filter((l) => l.type === "add").length,
      removed: lines.filter((l) => l.type === "del").length,
      digits: String(Math.max(lines.at(-1)?.oldNo ?? 0, lines.at(-1)?.newNo ?? 0, before.split("\n").length)).length,
    };
  }, [before, after, streaming, context]);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [overflowing, setOverflowing] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);

  // Only lines that arrive while streaming fade in.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const nodes = scroller.querySelectorAll<HTMLElement>("[data-key]");
    const previous = seen.current;
    const next = new Set<string>();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const style = getComputedStyle(scroller);
    const raw = style.getPropertyValue("--ui-dur-fast").trim();
    const duration = raw.endsWith("ms") ? parseFloat(raw) : parseFloat(raw) * 1000 || 200;
    const easing = style.getPropertyValue("--ui-ease-enter").trim() || "ease-out";
    for (const el of nodes) {
      const key = el.dataset.key!;
      next.add(key);
      if (previous && streaming && !reduce && !previous.has(key)) {
        el.animate({ opacity: [0, 1] }, { duration, easing });
      }
    }
    seen.current = next;
  }, [rows, streaming]);

  // Focusable only when scrollable.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, []);

  function toggle(foldId: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(foldId)) next.delete(foldId);
      else next.add(foldId);
      return next;
    });
  }

  const empty = rows.length === 0;

  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      data-streaming={streaming || undefined}
      aria-busy={streaming || undefined}
      style={{ "--digits": digits } as CSSProperties}
    >
      <div className={styles.header}>
        <span className={styles.name}>
          <span className={streaming ? styles.nameSweep : undefined}>{name ?? "Changes"}</span>
        </span>
        <span className={styles.stats}>
          <span className={styles.added} aria-hidden="true">
            +{added}
          </span>
          <span className={styles.removed} aria-hidden="true">
            −{removed}
          </span>
          <span className={styles.srOnly}>
            {added} {added === 1 ? "line" : "lines"} added, {removed} removed
          </span>
        </span>
      </div>

      <div
        ref={scrollerRef}
        className={styles.scroller}
        style={{ maxHeight }}
        tabIndex={overflowing ? 0 : undefined}
        role={overflowing ? "region" : undefined}
        aria-label={overflowing ? `Diff of ${name ?? "changes"}` : undefined}
      >
        <div className={styles.lines}>
          {empty && !streaming && <p className={styles.empty}>No changes. Both versions are the same.</p>}
          {rows.map((row) =>
            row.kind === "line" ? (
              <DiffLine key={keyOf(row.line)} line={row.line} />
            ) : (
              <Fold key={row.id} id={`${id}-${row.id}`} lines={row.lines} open={open.has(row.id)} onToggle={() => toggle(row.id)} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function Fold({ id, lines, open, onToggle }: { id: string; lines: Line[]; open: boolean; onToggle: () => void }) {
  const count = lines.length;
  return (
    <div className={styles.fold}>
      <button type="button" className={styles.foldButton} aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className={styles.foldContent}>
          <span className={styles.foldGutter} aria-hidden="true">
            <Icon name={open ? "chevron-up" : "chevron-down"} />
          </span>
          <span className={styles.foldLabel}>
            Unchanged lines
            <span className={styles.count}>{count}</span>
          </span>
        </span>
      </button>
      <div id={id} className={styles.foldBody} data-open={open || undefined} inert={!open}>
        <div className={styles.foldInner}>
          {lines.map((line) => (
            <DiffLine key={keyOf(line)} line={line} />
          ))}
        </div>
      </div>
    </div>
  );
}

const MARK = { same: " ", add: "+", del: "−" } as const;
const SPOKEN = { same: "", add: "Added: ", del: "Removed: " } as const;

function DiffLine({ line }: { line: Line }) {
  let text: ReactNode = line.text;
  if (line.emph) {
    const [s, e] = line.emph;
    text = (
      <>
        {line.text.slice(0, s)}
        <span className={styles.emph}>{line.text.slice(s, e)}</span>
        {line.text.slice(e)}
      </>
    );
  }
  const Tag = line.type === "add" ? "ins" : line.type === "del" ? "del" : "span";
  return (
    <div className={styles.line} data-type={line.type} data-key={keyOf(line)}>
      <span className={styles.gutter} aria-hidden="true">
        <span className={styles.number}>{line.oldNo ?? ""}</span>
        <span className={styles.number}>{line.newNo ?? ""}</span>
        <span className={styles.mark}>{MARK[line.type]}</span>
      </span>
      <Tag className={styles.code}>
        {SPOKEN[line.type] && <span className={styles.srOnly}>{SPOKEN[line.type]}</span>}
        {text}
        {/* Keeps an empty line one line tall and selectable. */}
        {line.text === "" && "​"}
      </Tag>
    </div>
  );
}
