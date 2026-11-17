"use client";

import { useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Button } from "../button/button";
import { useDelayedBusy } from "../button/use-delayed-busy";
import { Icon } from "../icons/icons";
import { TextField } from "../text-field/text-field";
import {
  Counter,
  SourceTile,
  cx,
  messageOf,
  plural,
  type Formatters,
  type KnowledgeChunk,
  type KnowledgeSource,
  type KnowledgeTestResult,
} from "./shared";
import styles from "./knowledge-base.module.css";

type TestPanelProps = {
  onTest: (question: string) => Promise<KnowledgeTestResult>;
  sources: KnowledgeSource[];
  /** Questions to try, one tap each. */
  suggestions?: string[];
  /** Testing is off: why. */
  unavailable?: string;
  agent: string;
  f: Formatters;
  announce: (line: string) => void;
  headingLevel: number;
  titleId: string;
};

type State =
  | { kind: "idle" }
  | { kind: "busy"; question: string }
  | { kind: "done"; question: string; result: KnowledgeTestResult }
  | { kind: "failed"; question: string; error: string };

function Heading({ level, ...props }: { level: number; id?: string; className?: string; children: ReactNode }) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as "h2";
  return <Tag {...props} />;
}

/** Ask a question and see which passages the retriever picks, best first, with the words that matched marked. */
export function TestPanel({ onTest, sources, suggestions = [], unavailable, agent, f, announce, headingLevel, titleId }: TestPanelProps) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [missing, setMissing] = useState(false);
  const run = useRef(0);
  const fieldRef = useRef<HTMLInputElement>(null);
  const busy = state.kind === "busy";
  const busyShown = useDelayedBusy(busy);
  const ready = sources.filter((s) => s.status === "ready").length;

  async function ask(q: string) {
    const text = q.trim();
    if (!text) {
      setMissing(true);
      fieldRef.current?.focus();
      return;
    }
    if (busy || unavailable) return;
    const mine = ++run.current;
    setState({ kind: "busy", question: text });
    try {
      const result = await onTest(text);
      if (mine !== run.current) return;
      setState({ kind: "done", question: text, result });
      const n = result.chunks.length;
      const from = new Set(result.chunks.map((c) => c.sourceId)).size;
      announce(n ? `${n} ${plural(n, "passage")} from ${from} ${plural(from, "source")}. Best match first.` : `Nothing matched. ${agent} would say it doesn’t know.`);
    } catch (reason) {
      if (mine !== run.current) return;
      const error = messageOf(reason, "The search didn’t run. Try again.");
      setState({ kind: "failed", question: text, error });
      announce(error);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  let body: ReactNode;
  if (unavailable) {
    body = <p className={styles.testHint}>{unavailable}</p>;
  } else if (state.kind === "busy") {
    body = (
      <p className={styles.testHint}>
        {busyShown && (
          <span className={styles.sweep}>
            Searching {f.number(ready)} {plural(ready, "source")}…
          </span>
        )}
      </p>
    );
  } else if (state.kind === "failed") {
    body = (
      <div className={styles.testFail} role="alert">
        <p className={styles.testFailLine}>
          <Icon name="alert" className={styles.inlineIcon} />
          <span>{state.error}</span>
        </p>
        <Button variant="secondary" onClick={() => void ask(state.question)}>
          Try again
        </Button>
      </div>
    );
  } else if (state.kind === "done") {
    body = <Results question={state.question} result={state.result} sources={sources} agent={agent} f={f} level={headingLevel + 1} />;
  } else {
    body = (
      <p className={styles.testHint}>
        You’ll see the passages {agent} would read before answering, best match first, with the words that matched marked.
      </p>
    );
  }

  return (
    <section className={styles.test} aria-labelledby={titleId}>
      <div className={styles.testHead}>
        <Heading level={headingLevel} id={titleId} className={styles.panelTitle}>
          Test it
        </Heading>
        <p className={styles.panelLine}>Ask what a guest would ask.</p>
      </div>
      <form className={styles.testForm} onSubmit={submit} noValidate>
        <TextField
          ref={fieldRef}
          label="Question"
          placeholder="Is the menu nut-free?"
          value={question}
          autoComplete="off"
          disabled={!!unavailable}
          error={missing ? "Type a question first." : null}
          onChange={(e) => {
            setQuestion(e.currentTarget.value);
            setMissing(false);
          }}
        />
        <Button type="submit" variant="primary" busy={busy} busyLabel="Searching…" disabled={!!unavailable} className={styles.testSubmit}>
          Search
        </Button>
      </form>
      {suggestions.length > 0 && !unavailable && (
        <div className={styles.tries}>
          <span id={`${id}-try`} className={styles.triesLabel}>
            Try
          </span>
          <ul className={styles.triesList} aria-labelledby={`${id}-try`}>
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className={styles.try}
                  onClick={() => {
                    setQuestion(s);
                    setMissing(false);
                    void ask(s);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.testBody} aria-busy={busy || undefined}>
        {body}
      </div>
    </section>
  );
}

function Results({
  question,
  result,
  sources,
  agent,
  f,
  level,
}: {
  question: string;
  result: KnowledgeTestResult;
  sources: KnowledgeSource[];
  agent: string;
  f: Formatters;
  level: number;
}) {
  const { chunks, answer } = result;
  if (chunks.length === 0) {
    return (
      <div className={styles.none}>
        <p className={styles.noneTitle}>Nothing matched “{question}”</p>
        <p className={styles.testHint}>
          {agent} would say it doesn’t know rather than guess. Add a source that covers it, or ask in the words your documents use.
        </p>
      </div>
    );
  }
  const from = new Set(chunks.map((c) => c.sourceId)).size;
  return (
    <div className={styles.results}>
      {answer && (
        <div className={styles.answer}>
          <Heading level={level} className={styles.answerTitle}>
            {agent} would answer
          </Heading>
          <p className={styles.answerText}>{answer}</p>
        </div>
      )}
      <p className={styles.resultsLine}>
        {chunks.length} {plural(chunks.length, "passage")} from {from} {plural(from, "source")}, best match first
      </p>
      <ol className={styles.chunks}>
        {chunks.map((c, i) => (
          <Chunk key={c.id} chunk={c} rank={i + 1} source={sources.find((s) => s.id === c.sourceId)} f={f} />
        ))}
      </ol>
    </div>
  );
}

/** Splits text at the highlight ranges, merged and clamped, so overlapping ranges mark once. */
function marked(text: string, ranges: [number, number][] = []) {
  const sorted = ranges
    .map(([a, b]) => [Math.max(0, Math.min(a, text.length)), Math.max(0, Math.min(b, text.length))] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  const out: ReactNode[] = [];
  let at = 0;
  merged.forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a));
    out.push(<mark key={i}>{text.slice(a, b)}</mark>);
    at = b;
  });
  if (at < text.length) out.push(text.slice(at));
  return out;
}

function Chunk({ chunk, rank, source, f }: { chunk: KnowledgeChunk; rank: number; source?: KnowledgeSource; f: Formatters }) {
  const score = Math.min(Math.max(chunk.score, 0), 1);
  const strength = score >= 0.75 ? "strong" : score >= 0.5 ? "fair" : "weak";
  return (
    <li className={styles.chunk} data-strength={strength}>
      <div className={styles.chunkHead}>
        <SourceTile source={source ?? { kind: "file", name: "" }} size="sm" />
        <span className={styles.chunkSource}>
          <span className={styles.srOnly}>{rank}. </span>
          <span className={styles.chunkName}>{source?.name ?? "A removed source"}</span>
          {chunk.location && <span className={styles.chunkWhere}>{chunk.location}</span>}
        </span>
        <span className={styles.score} title="How closely this passage matches the question">
          <span className={styles.scoreBar} aria-hidden="true" style={{ "--kb-score": score } as CSSProperties} />
          <span className={styles.srOnly}>Match </span>
          <Counter className={styles.scoreValue} value={f.percent(score)} reserve="100%" />
        </span>
      </div>
      <blockquote className={cx(styles.snippet)}>
        <p>{marked(chunk.text, chunk.highlights)}</p>
      </blockquote>
    </li>
  );
}
