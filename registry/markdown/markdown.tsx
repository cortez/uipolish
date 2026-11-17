"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Checkbox } from "../checkbox/checkbox";
import { CodeBlock } from "../code-block/code-block";
import { parse, safeHref, type Block, type ListItem } from "./parse";
import styles from "./markdown.module.css";

export { parse, safeHref } from "./parse";
export type { Block, Section, ListItem, Align } from "./parse";

type MarkdownProps = Omit<ComponentProps<"div">, "children"> & {
  /** The reply so far. While streaming, pass the whole text each time. */
  source: string;
  /** Text is still arriving: unfinished syntax is held back or closed early, and a caret follows the last word. */
  streaming?: boolean;
  /** The tag a `#` heading renders as; deeper ones follow, up to h6. Default 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
};

export function Markdown({ source, streaming = false, headingLevel = 3, className, ...props }: MarkdownProps) {
  const sections = useMemo(() => parse(source, streaming), [source, streaming]);
  const last = sections.length - 1;

  return (
    <div
      {...props}
      className={className ? `${styles.root} ${className}` : styles.root}
      aria-busy={streaming || undefined}
    >
      {sections.map((s, i) => (
        <Section key={i} block={s.block} source={s.source} tail={streaming && i === last} level={headingLevel} />
      ))}
      {streaming && last < 0 && (
        <p>
          <Caret />
        </p>
      )}
    </div>
  );
}

// A finished block keeps its source, so it doesn't render again as text arrives below it.
const Section = memo(
  function Section({ block, tail, level }: { block: Block; source: string; tail: boolean; level: number }) {
    return renderBlock(block, tail, level, 0);
  },
  (a, b) => a.source === b.source && a.tail === b.tail && a.level === b.level,
);

function Caret() {
  return <span className={styles.caret} aria-hidden="true" />;
}

/** Inline content, with the caret after it when it's the last thing written. */
function Text({ text, tail }: { text: string; tail: boolean }) {
  return (
    <>
      {inline(text, tail)}
      {tail && <Caret />}
    </>
  );
}

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

function renderBlock(block: Block, tail: boolean, level: number, key: number): ReactNode {
  switch (block.type) {
    case "paragraph":
      return (
        <p key={key}>
          <Text text={block.text} tail={tail} />
        </p>
      );
    case "heading": {
      const Tag = HEADINGS[Math.min(level + block.depth - 2, 5)];
      return (
        <Tag key={key} className={styles.heading} data-depth={Math.min(block.depth, 4)}>
          <Text text={block.text} tail={tail} />
        </Tag>
      );
    }
    case "rule":
      return <hr key={key} className={styles.rule} />;
    case "code":
      return (
        <CodeBlock
          key={key}
          className={styles.code}
          code={block.code}
          language={block.language || undefined}
          streaming={tail && !block.closed}
        />
      );
    case "quote":
      return (
        <blockquote key={key} className={styles.quote}>
          {renderBlocks(block.children, tail, level)}
        </blockquote>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      const lastItem = block.items.length - 1;
      return (
        <List
          key={key}
          className={styles.list}
          start={block.ordered && block.start !== 1 ? block.start : undefined}
          data-tight={block.tight || undefined}
        >
          {block.items.map((item, i) => (
            <Item key={i} item={item} tight={block.tight} tail={tail && i === lastItem} level={level} />
          ))}
        </List>
      );
    }
    case "table":
      return <Table key={key} block={block} />;
  }
}

function renderBlocks(blocks: Block[], tail: boolean, level: number, tight = false) {
  const last = blocks.length - 1;
  return blocks.map((b, i) =>
    // In a tight list an item's paragraph is just its text.
    tight && b.type === "paragraph" ? (
      <Text key={i} text={b.text} tail={tail && i === last} />
    ) : (
      renderBlock(b, tail && i === last, level, i)
    ),
  );
}

function Item({ item, tight, tail, level }: { item: ListItem; tight: boolean; tail: boolean; level: number }) {
  const body = renderBlocks(item.children, tail, level, tight);
  if (item.checked === null) return <li className={styles.item}>{body}</li>;
  return (
    <li className={styles.item} data-task="">
      <Checkbox
        className={styles.task}
        checked={item.checked}
        readOnly
        tabIndex={-1}
        aria-label={item.checked ? "Done" : "Not done"}
      />
      <div className={styles.taskBody}>{body}</div>
    </li>
  );
}

function Table({ block }: { block: Extract<Block, { type: "table" }> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    const next = { start: left > 1, end: max - left > 1 };
    setEdge((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  const scrollable = edge.start || edge.end;
  return (
    <div
      ref={ref}
      className={styles.table}
      data-fade-start={edge.start || undefined}
      data-fade-end={edge.end || undefined}
      onScroll={measure}
      // Focusable only when it scrolls, so the keyboard can scroll it.
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable ? "region" : undefined}
      aria-label={scrollable ? "Table" : undefined}
    >
      <table>
        <thead>
          <tr>
            {block.head.map((c, i) => (
              <th key={i} scope="col" data-align={block.align[i] ?? undefined}>
                {inline(c, false)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((c, i) => (
                <td key={i} data-align={block.align[i] ?? undefined}>
                  {inline(c, false)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Inline ----------

const PUNCTUATION = /[!-/:-@[-`{-~]/;
const SPACE = /\s/;
const WORD = /[\p{L}\p{N}]/u;
const URL = /^https?:\/\/[^\s<]*[^\s<.,:;"'!?)\]*_~]/;
const AUTOLINK = /^<((?:https?:\/\/|mailto:)[^\s<>]+)>/;

const runOf = (text: string, i: number) => {
  let n = 1;
  while (text[i + n] === text[i]) n++;
  return n;
};

/** Where a code span opened at `i` with `n` backticks closes, or -1. */
function codeEnd(text: string, i: number, n: number) {
  for (let j = i + n; j < text.length; j++) {
    if (text[j] !== "`") continue;
    const m = runOf(text, j);
    if (m === n) return j;
    j += m - 1;
  }
  return -1;
}

/** Where `len` delimiters of `ch` close an emphasis opened before `from`, or -1. */
function closer(text: string, from: number, ch: string, len: number) {
  for (let j = from; j < text.length; j++) {
    const c = text[j];
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "`") {
      const n = runOf(text, j);
      const end = codeEnd(text, j, n);
      j = end < 0 ? j + n - 1 : end + n - 1;
      continue;
    }
    if (c !== ch) continue;
    const n = runOf(text, j);
    const before = text[j - 1];
    const after = text[j + n];
    const closes = j > from && !SPACE.test(before) && (ch !== "_" || after === undefined || !WORD.test(after));
    if (closes) {
      // The closing run's last delimiters close this span; any before them close a nested one.
      if (len === 1 && n !== 2) return j + n - 1;
      if (len === 2 && n >= 2) return j + n - 2;
      if (len === 3 && n >= 3) return j + n - 3;
    }
    j += n - 1;
  }
  return -1;
}

/** Index of the `]` that closes a `[` at `i`, or -1. */
function bracketEnd(text: string, i: number) {
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (c === "\\") j++;
    else if (c === "`") {
      const n = runOf(text, j);
      const end = codeEnd(text, j, n);
      j = end < 0 ? j + n - 1 : end + n - 1;
    } else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) return j;
  }
  return -1;
}

/** Index of the `)` that closes a `(` at `i`, or -1. */
function parenEnd(text: string, i: number) {
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (c === "\\") j++;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return j;
    else if (c === "\n") return -1;
  }
  return -1;
}

function Link({ href, children }: { href: string | null; children: ReactNode }) {
  // Unsafe or not yet complete: the words, styled as the link they'll be.
  if (!href) return <span className={styles.link}>{children}</span>;
  const external = /^https?:\/\//i.test(href);
  let host = "";
  if (external) {
    try {
      host = new globalThis.URL(href).host;
    } catch {}
  }
  return (
    <a
      className={styles.link}
      href={href}
      title={host || undefined}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

/**
 * Inline markdown as React nodes: code, strong, emphasis, strikethrough,
 * links and bare URLs. Text is only ever text, so HTML in the source shows
 * as written. With `open` (the end of a streaming reply), an unclosed span
 * runs to the end instead of showing its markers, and a link still being
 * typed shows its words.
 */
export function inline(text: string, open: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  let buf = "";
  let key = 0;
  const flush = () => {
    if (buf) out.push(buf);
    buf = "";
  };
  const push = (node: ReactNode) => {
    flush();
    out.push(node);
  };

  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const rest = text.length - i;

    if (c === "\\" && i + 1 < text.length && PUNCTUATION.test(text[i + 1])) {
      buf += text[i + 1];
      i += 2;
      continue;
    }

    if (c === "\n") {
      push(<br key={key++} />);
      i++;
      continue;
    }

    if (c === "`") {
      const n = runOf(text, i);
      const end = codeEnd(text, i, n);
      if (end >= 0 || open) {
        let code = text.slice(i + n, end >= 0 ? end : undefined).replace(/\n/g, " ");
        if (/^ .*[^ ].* $/.test(code)) code = code.slice(1, -1);
        if (code) push(<code key={key++} className={styles.inlineCode}>{code}</code>);
        i = end >= 0 ? end + n : text.length;
      } else {
        buf += text.slice(i, i + n);
        i += n;
      }
      continue;
    }

    if (c === "*" || c === "_" || c === "~") {
      const n = runOf(text, i);
      const after = text[i + n];
      const before = text[i - 1];
      const opens = after !== undefined && !SPACE.test(after) && (c !== "_" || before === undefined || !WORD.test(before));
      // A marker at the very end of a streaming reply may be about to open a span.
      if (open && after === undefined && (c !== "~" || n <= 2)) {
        i += n;
        continue;
      }
      if (!opens || (c === "~" && n !== 2)) {
        buf += text.slice(i, i + n);
        i += n;
        continue;
      }
      const len = c === "~" ? 2 : Math.min(n, 3);
      const end = closer(text, i + len, c, len);
      if (end < 0 && !open) {
        buf += c;
        i += 1;
        continue;
      }
      const inner = text.slice(i + len, end < 0 ? undefined : end);
      const kids = inline(inner, end < 0 && open);
      const k = key++;
      push(
        c === "~" ? (
          <del key={k}>{kids}</del>
        ) : len === 3 ? (
          <strong key={k}>
            <em>{kids}</em>
          </strong>
        ) : len === 2 ? (
          <strong key={k}>{kids}</strong>
        ) : (
          <em key={k}>{kids}</em>
        ),
      );
      i = end < 0 ? text.length : end + len;
      continue;
    }

    if (c === "[" || (c === "!" && text[i + 1] === "[")) {
      const image = c === "!";
      const s = image ? i + 1 : i;
      const close = bracketEnd(text, s);
      const label = text.slice(s + 1, close < 0 ? undefined : close);
      if (close >= 0 && text[close + 1] === "(") {
        const end = parenEnd(text, close + 1);
        if (end >= 0) {
          const dest = text.slice(close + 2, end).trim().replace(/\s+(["'(]).*$/, "");
          // An image is a link to it, never an <img>: a reply can't make the page fetch a URL.
          push(<Link key={key++} href={safeHref(dest)}>{image ? label || "Image" : inline(label, false)}</Link>);
          i = end + 1;
          continue;
        }
        if (open && !text.slice(close + 1).includes("\n")) {
          push(<Link key={key++} href={null}>{inline(label, false)}</Link>);
          i = text.length;
          continue;
        }
      }
      if (close < 0 && open && !label.includes("\n")) {
        // Still typing the label: show the words so far.
        push(<Fragment key={key++}>{inline(label, true)}</Fragment>);
        i = text.length;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    if (c === "<") {
      const m = AUTOLINK.exec(text.slice(i));
      if (m) {
        push(<Link key={key++} href={safeHref(m[1])}>{m[1].replace(/^mailto:/, "")}</Link>);
        i += m[0].length;
        continue;
      }
    }

    if (c === "h" && rest > 8 && (i === 0 || !WORD.test(text[i - 1]))) {
      const m = URL.exec(text.slice(i));
      if (m) {
        push(<Link key={key++} href={m[0]}>{m[0]}</Link>);
        i += m[0].length;
        continue;
      }
    }

    buf += c;
    i++;
  }
  flush();
  return out;
}
