"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import { canTokenize, tokenizeLine, type LineState, type Token } from "./tokenize";
import styles from "./code-block.module.css";

export { tokenizeLine, canTokenize } from "./tokenize";
export type { Token, TokenType, LineState } from "./tokenize";

const LANGUAGE_NAMES: Record<string, string> = {
  ts: "TypeScript", tsx: "TSX", typescript: "TypeScript",
  js: "JavaScript", jsx: "JSX", javascript: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  py: "Python", python: "Python",
  sh: "Shell", bash: "Bash", shell: "Shell", zsh: "Zsh", console: "Terminal",
  json: "JSON", jsonc: "JSON",
  css: "CSS",
};

type CodeBlockProps = {
  /** The source. While streaming, pass the text so far; only append. */
  code: string;
  /** `ts`, `py`, `sh`, `json`… */
  language?: string;
  /** Header text instead of the language name, e.g. a file name. */
  title?: string;
  lineNumbers?: boolean;
  defaultWrap?: boolean;
  /** Text is still arriving; sets `aria-busy`. */
  streaming?: boolean;
  /** Use the built-in tokenizer when the language is supported. */
  highlight?: boolean;
  /** Trusted HTML per line from your highlighter; same lines as `code`. */
  lineHtml?: string[];
  maxHeight?: CSSProperties["maxHeight"];
  className?: string;
};

// Stable token arrays let memoized lines skip re-rendering.
const tokenCache = new Map<string, { tokens: Token[]; state: LineState }>();

function cachedTokens(text: string, language: string, state: LineState) {
  const key = `${language}\u0000${state}\u0000${text}`;
  let hit = tokenCache.get(key);
  if (!hit) {
    if (tokenCache.size > 5000) tokenCache.clear();
    hit = tokenizeLine(text, language, state);
    tokenCache.set(key, hit);
  }
  return hit;
}

type CopyState = "idle" | "copied" | "failed";

export function CodeBlock({
  code,
  language,
  title,
  lineNumbers = false,
  defaultWrap = false,
  streaming = false,
  highlight = true,
  lineHtml,
  maxHeight,
  className,
}: CodeBlockProps) {
  const [wrap, setWrap] = useState(defaultWrap);
  const [copy, setCopy] = useState<CopyState>("idle");
  const [overflow, setOverflow] = useState({ start: false, end: false, y: false });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const copyTimer = useRef(0);

  const name = title ?? (language ? (LANGUAGE_NAMES[language.toLowerCase()] ?? language) : "Code");
  // While streaming, show only whole words.
  const shown = streaming ? code.slice(0, code.search(/\s\S*$/) + 1) : code;
  const lines = useMemo(() => shown.split("\n"), [shown]);
  const tokenize = highlight && !lineHtml && canTokenize(language);

  const lineTokens = useMemo(() => {
    if (!tokenize) return null;
    let state: LineState = "";
    return lines.map((text, i) => {
      // Not cached: the last line is still being written.
      const hit = i < lines.length - 1 ? cachedTokens(text, language!, state) : tokenizeLine(text, language!, state);
      state = hit.state;
      return hit.tokens;
    });
  }, [tokenize, lines, language]);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = Math.abs(el.scrollLeft);
    const next = { start: left > 1, end: max - left > 1, y: el.scrollHeight - el.clientHeight > 1 };
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    setOverflow((prev) => (prev.start === next.start && prev.end === next.end && prev.y === next.y ? prev : next));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el && maxHeight !== undefined && streaming && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [code, maxHeight, streaming]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function handleCopy() {
    clearTimeout(copyTimer.current);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
    copyTimer.current = window.setTimeout(() => setCopy("idle"), 2000);
  }

  const scrollable = (!wrap && (overflow.start || overflow.end)) || overflow.y;
  const digits = String(lines.length).length;

  return (
    <div className={className ? `${styles.block} ${className}` : styles.block} aria-busy={streaming || undefined}>
      <div className={styles.header}>
        <span className={styles.name} title={name}>
          {name}
        </span>
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            className={styles.action}
            aria-pressed={wrap}
            onClick={() => setWrap((w) => !w)}
          >
            Wrap
          </Button>
          <Button variant="ghost" size="sm" className={styles.action} onClick={handleCopy} aria-label={`Copy ${name} code`}>
            <Icon name={copy === "copied" ? "check" : "copy"} />
            <TextMorph>{copy === "copied" ? "Copied" : copy === "failed" ? "Copy failed" : "Copy"}</TextMorph>
          </Button>
          <span role="status" className={styles.srOnly}>
            {copy === "copied" ? "Copied to clipboard" : copy === "failed" ? "Couldn’t copy. Select the code and copy it manually." : ""}
          </span>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className={styles.scroller}
        data-wrap={wrap || undefined}
        data-fade-start={(!wrap && overflow.start) || undefined}
        data-fade-end={(!wrap && overflow.end) || undefined}
        style={{ maxHeight }}
        onScroll={measure}
        // Focusable only when scrollable, so the keyboard can scroll it.
        tabIndex={scrollable ? 0 : undefined}
        role={scrollable ? "region" : undefined}
        aria-label={scrollable ? `${name} code` : undefined}
      >
        <pre className={styles.pre} data-numbers={lineNumbers || undefined} style={{ "--digits": digits } as CSSProperties}>
          <code className={styles.code}>
            {lines.map((text, i) => (
              <Line
                key={i}
                text={text}
                tokens={lineTokens?.[i]}
                html={lineHtml?.[i]}
                live={streaming && i === lines.length - 1}
              />
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

type LineProps = { text: string; tokens?: Token[]; html?: string; live: boolean };

// Per-word spans keyed by offset, so each word fades in once.
const WORD = /\S+\s*|\s+/g;

const Line = memo(function Line({ text, tokens, html, live }: LineProps) {
  let offset = 0;
  const words = (t: Token) => {
    const from = offset;
    offset += t.text.length;
    return Array.from(t.text.matchAll(WORD), (m) => (
      <span key={from + m.index} className={t.type === "plain" ? undefined : styles[t.type]}>
        {m[0]}
      </span>
    ));
  };
  return (
    <span className={styles.line}>
      <span>
        {html !== undefined ? (
          <span dangerouslySetInnerHTML={{ __html: html }} />
        ) : tokens && live ? (
          tokens.flatMap(words)
        ) : tokens ? (
          tokens.map((t, i) =>
            t.type === "plain" ? (
              t.text
            ) : (
              <span key={i} className={styles[t.type]}>
                {t.text}
              </span>
            ),
          )
        ) : (
          text
        )}
      </span>
    </span>
  );
});
