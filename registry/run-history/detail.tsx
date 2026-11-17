"use client";

import { useEffect, useId, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { Alert } from "../alert/alert";
import { Button } from "../button/button";
import { CodeBlock } from "../code-block/code-block";
import { EmptyState } from "../empty-state/empty-state";
import { Icon } from "../icons/icons";
import { useLoadingDelay } from "../skeleton/skeleton";
import { Counter, StatusGlyph, StatusTag, STATUS_TEXT, TriggerLabel } from "./parts";
import {
  copyText,
  elapsedOf,
  plural,
  useAction,
  widest,
  type Formatters,
  type Result,
  type RunDetail,
  type RunStep,
  type RunSummary,
} from "./shared";
import styles from "./run-history.module.css";

function Heading({ level, ...props }: { level: number } & ComponentProps<"h2">) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as "h2";
  return <Tag {...props} />;
}

/* ---------- Long text: collapsed, never cut ---------- */

/** Lines shown before "Show all". */
const FIRST_LINES = 12;
/** A single huge line (minified JSON, a pasted page) folds by length instead. */
const FIRST_CHARS = 1600;

function pretty(text: string): { code: string; json: boolean } {
  const t = text.trim();
  if (!/^[[{]/.test(t)) return { code: text, json: false };
  try {
    return { code: JSON.stringify(JSON.parse(t), null, 2), json: true };
  } catch {
    return { code: text, json: false };
  }
}

/**
 * A prompt, arguments, a result or an output. Short ones show whole; long
 * ones show their start with the count of what's folded and a button that
 * shows the rest. Lines wrap, so nothing runs off the side either.
 */
function LongText({ label, text, f }: { label: string; text: string; f: Formatters }) {
  const [all, setAll] = useState(false);
  const { code, json } = useMemo(() => pretty(text), [text]);
  const lines = useMemo(() => code.split("\n"), [code]);
  const byLines = lines.length > FIRST_LINES + 3;
  const byChars = !byLines && code.length > FIRST_CHARS * 1.25;
  const folded = !all && (byLines || byChars);

  let shown = code;
  if (folded && byLines) shown = lines.slice(0, FIRST_LINES).join("\n");
  else if (folded && byChars) {
    const cut = code.lastIndexOf(" ", FIRST_CHARS);
    shown = `${code.slice(0, cut > FIRST_CHARS / 2 ? cut : FIRST_CHARS)} …`;
  }
  const rest = byLines
    ? `${f.number(lines.length)} ${plural(lines.length, "line")}`
    : `${f.number(code.length)} ${plural(code.length, "character")}`;

  return (
    <div className={styles.longText} data-folded={folded || undefined}>
      {/* Unfolded, a very long one scrolls in its own box rather than making the page thousands of lines tall. */}
      <CodeBlock
        code={shown}
        language={json ? "json" : undefined}
        title={label}
        defaultWrap
        highlight={json}
        maxHeight={all ? "min(560px, 70vh)" : undefined}
      />
      {(byLines || byChars) && (
        <Button variant="ghost" className={styles.showAll} aria-expanded={all} onClick={() => setAll((a) => !a)}>
          <Icon name={all ? "chevron-up" : "chevron-down"} className={styles.buttonIcon} />
          {all ? "Show less" : `Show all ${rest}`}
        </Button>
      )}
    </div>
  );
}

/* ---------- Trace ---------- */

/** A round number of ms at or above `ms`, so the scale changes rarely while a run counts up. */
function niceCeil(ms: number) {
  const steps = [1, 1.5, 2, 3, 4, 5, 6, 8, 10];
  let base = 1000;
  while (base * 10 < ms) base *= 10;
  for (const s of steps) if (s * base >= ms) return s * base;
  return 10 * base;
}

function stepDuration(step: RunStep, runStart: number, now: number) {
  return step.durationMs ?? Math.max(0, now - runStart - step.startMs);
}

function kindLine(step: RunStep) {
  if (step.kind === "llm") return step.model ? `Model call · ${step.model}` : "Model call";
  return "Tool call";
}

function Step({
  step,
  index,
  total,
  scale,
  runStart,
  now,
  open,
  onToggle,
  f,
}: {
  step: RunStep;
  index: number;
  total: number;
  scale: number;
  runStart: number;
  now: number;
  open: boolean;
  onToggle: () => void;
  f: Formatters;
}) {
  const bodyId = useId();
  const dur = stepDuration(step, runStart, now);
  const left = Math.min(1, step.startMs / scale);
  const width = Math.min(1 - left, dur / scale);
  const tokens = step.tokens ? step.tokens.input + step.tokens.output : 0;
  const durText = f.duration(dur);

  return (
    <li className={styles.step} data-status={step.status} data-kind={step.kind} data-open={open || undefined} data-step-id={step.id}>
      <button type="button" className={styles.stepHead} aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <StatusGlyph status={step.status} className={styles.stepGlyph} />
        <span className={styles.stepName}>
          <span className={styles.srOnly}>
            Step {index + 1} of {total}, {STATUS_TEXT[step.status]}:{" "}
          </span>
          <span className={styles.stepTitle}>{step.name}</span>
          <span className={styles.stepKind}>
            {kindLine(step)}
            {step.attempt && step.attempt > 1 ? ` · attempt ${step.attempt}` : ""}
          </span>
        </span>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.bar} style={{ "--l": left, "--w": width } as CSSProperties} />
        </span>
        <span className={styles.stepDur}>
          <span className={styles.srOnly}>, took </span>
          <Counter value={durText} reserve={durText.length > 4 ? widest(durText) : "8.8s"} />
        </span>
        <Icon name={open ? "chevron-up" : "chevron-down"} className={styles.stepChevron} />
      </button>
      <div className={styles.stepBody} id={bodyId} inert={!open || undefined}>
        <div className={styles.stepInner}>
          <div className={styles.stepContent}>
            {step.error && (
              <div className={styles.stepError} data-tone={step.status === "retried" ? "warning" : "danger"}>
                <Icon name={step.status === "retried" ? "warning" : "alert"} className={styles.stepErrorIcon} />
                <div className={styles.stepErrorText}>
                  <p className={styles.stepErrorTitle}>
                    {step.status === "retried" ? "This attempt failed, so it was retried" : "This step failed"}
                  </p>
                  <p className={styles.wrapText}>{step.error}</p>
                </div>
              </div>
            )}
            <dl className={styles.stepFacts}>
              <div>
                <dt>Started</dt>
                <dd>{step.startMs < 1 ? "At the start" : `+${f.duration(step.startMs)}`}</dd>
              </div>
              <div>
                <dt>Took</dt>
                <dd>{step.status === "running" ? `${durText} so far` : durText}</dd>
              </div>
              {step.tokens && (
                <div>
                  <dt>Tokens</dt>
                  <dd>
                    {f.number(step.tokens.input)} in · {f.number(step.tokens.output)} out
                    {step.tokens.cached ? <span className={styles.factNote}>{f.number(step.tokens.cached)} of the input cached</span> : null}
                  </dd>
                </div>
              )}
              {step.cost !== undefined && (
                <div>
                  <dt>Cost</dt>
                  <dd>{f.cost(step.cost)}</dd>
                </div>
              )}
              {!step.tokens && tokens === 0 && step.kind === "tool" && step.cost === undefined && (
                <div>
                  <dt>Cost</dt>
                  <dd>None</dd>
                </div>
              )}
            </dl>
            {step.input && <LongText label={step.kind === "llm" ? "Prompt" : "Arguments"} text={step.input} f={f} />}
            {step.output && <LongText label={step.kind === "llm" ? "Completion" : "Result"} text={step.output} f={f} />}
            {!step.output && step.status === "running" && (
              <p className={styles.waiting}>
                <span className={styles.sweep}>{step.kind === "llm" ? "Waiting for the model…" : "Waiting for the tool…"}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function Trace({
  steps,
  run,
  now,
  f,
  open,
  setOpen,
}: {
  steps: RunStep[];
  run: RunSummary;
  now: number;
  f: Formatters;
  open: Set<string>;
  setOpen: (next: Set<string>) => void;
}) {
  const runStart = Date.parse(run.startedAt);
  const elapsed = elapsedOf(run, now);
  const end = Math.max(elapsed, ...steps.map((s) => s.startMs + stepDuration(s, runStart, now)));
  // Round numbers on the scale; a live run gets headroom, so it rescales rarely as it counts up.
  const scale = niceCeil(run.status === "running" ? end * 1.1 : end);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  if (steps.length === 0) {
    return (
      <p className={styles.traceEmpty}>
        {run.status === "running" ? <span className={styles.sweep}>Starting…</span> : "This run didn’t get as far as a first step."}
      </p>
    );
  }

  return (
    <div className={styles.trace}>
      <div className={styles.axis} aria-hidden="true">
        <span className={styles.axisLegend}>
          <span className={styles.legendItem} data-kind="llm">
            Model
          </span>
          <span className={styles.legendItem} data-kind="tool">
            Tool
          </span>
        </span>
        <span className={styles.axisScale}>
          {ticks.map((t) => (
            <span key={t} className={styles.tick} style={{ "--t": t } as CSSProperties}>
              {t === 0 ? "0" : f.duration(scale * t)}
            </span>
          ))}
        </span>
        <span />
      </div>
      <ol className={styles.steps}>
        {steps.map((step, i) => (
          <Step
            key={step.id}
            step={step}
            index={i}
            total={steps.length}
            scale={scale}
            runStart={runStart}
            now={now}
            open={open.has(step.id)}
            onToggle={() => {
              const next = new Set(open);
              if (next.has(step.id)) next.delete(step.id);
              else next.add(step.id);
              setOpen(next);
            }}
            f={f}
          />
        ))}
      </ol>
    </div>
  );
}

/* ---------- Tokens and cost ---------- */

function Breakdown({ steps, run, f }: { steps: RunStep[]; run: RunSummary; f: Formatters }) {
  const t = steps.reduce(
    (acc, s) => {
      if (!s.tokens) return acc;
      acc.cached += s.tokens.cached ?? 0;
      acc.input += s.tokens.input - (s.tokens.cached ?? 0);
      acc.output += s.tokens.output;
      return acc;
    },
    { input: 0, cached: 0, output: 0 },
  );
  const all = t.input + t.cached + t.output;
  const costed = steps.filter((s) => (s.cost ?? 0) > 0).sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
  const stepsCost = costed.reduce((sum, s) => sum + (s.cost ?? 0), 0);
  const totalCost = Math.max(run.cost, stepsCost);
  const top = costed.slice(0, 4);
  const restCost = costed.slice(4).reduce((sum, s) => sum + (s.cost ?? 0), 0);
  const restCount = costed.length - top.length;
  const parts = [
    { key: "input", label: "Input", value: t.input },
    { key: "cached", label: "Cached input", value: t.cached },
    { key: "output", label: "Output", value: t.output },
  ];

  return (
    <div className={styles.breakdown}>
      <div className={styles.tokenSplit}>
        <p className={styles.bigNumber}>
          {f.number(all)} <span className={styles.bigUnit}>tokens</span>
        </p>
        {all > 0 && (
          <span className={styles.split} aria-hidden="true">
            {parts.map((p) =>
              p.value > 0 ? <span key={p.key} data-part={p.key} style={{ flexGrow: p.value } as CSSProperties} /> : null,
            )}
          </span>
        )}
        <dl className={styles.splitLegend}>
          {parts.map((p) => (
            <div key={p.key} data-part={p.key}>
              <dt>{p.label}</dt>
              <dd>{f.number(p.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={styles.costList}>
        <p className={styles.bigNumber}>
          {f.cost(totalCost)} <span className={styles.bigUnit}>total</span>
        </p>
        {top.length > 0 ? (
          <ul className={styles.costRows}>
            {top.map((s) => {
              const share = totalCost > 0 ? (s.cost ?? 0) / totalCost : 0;
              return (
                <li key={s.id}>
                  <span className={styles.costName}>{s.name}</span>
                  <span className={styles.costValue}>{f.cost(s.cost ?? 0)}</span>
                  <span className={styles.costShare} aria-hidden="true">
                    <span style={{ "--share": share } as CSSProperties} />
                  </span>
                  <span className={styles.srOnly}>, {Math.round(share * 100)}% of the run</span>
                </li>
              );
            })}
            {restCount > 0 && (
              <li data-rest="">
                <span className={styles.costName}>
                  {restCount} more {plural(restCount, "step")}
                </span>
                <span className={styles.costValue}>{f.cost(restCost)}</span>
              </li>
            )}
          </ul>
        ) : (
          <p className={styles.quiet}>No step was charged yet.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Actions ---------- */

type Copied = "idle" | "copied" | "failed";

function useFlag() {
  const [state, setState] = useState<Copied>("idle");
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [
    state,
    (next: Copied) => {
      window.clearTimeout(timer.current);
      setState(next);
      if (next !== "idle") timer.current = window.setTimeout(() => setState("idle"), 2400);
    },
  ] as const;
}

/** A label that trades words without changing width: every word it can take sits underneath. */
function Swap({ words, shown }: { words: string[]; shown: string }) {
  return (
    <span className={styles.swap}>
      {words.map((w) => (
        <span key={w} aria-hidden={w !== shown || undefined} data-on={w === shown || undefined}>
          {w}
        </span>
      ))}
    </span>
  );
}

/* ---------- Screen ---------- */

export type RunDetailViewProps = {
  runId: string;
  run?: RunSummary;
  detail?: RunDetail;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  onBack?: () => void;
  backLabel: string;
  onRerun?: (run: RunSummary) => Result | string | Promise<string | void>;
  onOpenRun?: (id: string) => void;
  onShare?: (run: RunSummary) => string | Promise<string>;
  readOnly?: string;
  now: number;
  f: Formatters;
  level: number;
  announce: (line: string) => void;
};

export function RunDetailView({
  runId,
  run,
  detail,
  loading,
  error,
  onRetry,
  onBack,
  backLabel,
  onRerun,
  onOpenRun,
  onShare,
  readOnly,
  now,
  f,
  level,
  announce,
}: RunDetailViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const traceRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const rerun = useAction<string | void>();
  const share = useAction<string>();
  const [copied, setCopied] = useFlag();
  const [shared, setShared] = useFlag();
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const slow = useLoadingDelay(loading);

  const steps = useMemo(() => detail?.steps ?? [], [detail]);
  const failedIndex = steps.findIndex((s) => s.status === "failed");
  const failedStep = failedIndex === -1 ? undefined : steps[failedIndex];

  // The failed step starts open; anything else waits to be asked for.
  const [open, setOpen] = useState<Set<string>>(() => new Set(failedStep ? [failedStep.id] : []));
  const [seenFailed, setSeenFailed] = useState(failedStep?.id);
  if (seenFailed !== failedStep?.id) {
    setSeenFailed(failedStep?.id);
    if (failedStep) setOpen((o) => new Set(o).add(failedStep.id));
  }

  useEffect(() => {
    headingRef.current?.focus();
  }, [runId]);

  function showStep(id: string) {
    setOpen((o) => new Set(o).add(id));
    const el = traceRef.current?.querySelector<HTMLElement>(`[data-step-id="${CSS.escape(id)}"] button`);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }

  async function doRerun() {
    if (!run || !onRerun) return;
    const result = await rerun.run(() => onRerun(run) as string | void | Promise<string | void>, "The run didn’t start. Try again.");
    if (!result.ok) return;
    announce(result.value ? `Started ${result.value}.` : "Started a new run.");
    if (result.value && onOpenRun) onOpenRun(result.value);
  }

  async function copyId() {
    const ok = await copyText(runId);
    setCopied(ok ? "copied" : "failed");
    announce(ok ? `Copied ${runId}.` : "Couldn’t reach the clipboard. Select the run ID to copy it.");
  }

  async function doShare() {
    if (!run || !onShare) return;
    setSharedUrl(null);
    const result = await share.run(() => onShare(run), "Couldn’t make a link. Try again.");
    if (!result.ok || !result.value) return;
    const ok = await copyText(result.value);
    if (ok) {
      setShared("copied");
      announce("Link copied. Anyone in the workspace can open it.");
    } else {
      setSharedUrl(result.value);
      announce("Couldn’t reach the clipboard. The link is shown under the buttons.");
    }
  }

  const back = onBack && (
    <Button variant="ghost" className={styles.back} onClick={onBack}>
      <Icon name="arrow-left" className={styles.buttonIcon} />
      {backLabel}
    </Button>
  );

  /* ----- Not on this page and not loaded yet ----- */

  if (!run) {
    return (
      <div className={styles.detail}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          {back}
        </nav>
        <Heading level={level} ref={headingRef} tabIndex={-1} className={styles.title}>
          {loading ? "Loading run…" : error ? "This run didn’t load" : "Run not found"}
        </Heading>
        <div className={styles.placeholder}>
          {loading ? (
            <p className={styles.loadingLine} data-shown={slow || undefined}>
              <span className={styles.sweep}>Loading {runId}…</span>
            </p>
          ) : (
            <EmptyState
              art="unplugged"
              title={error ? "This run didn’t load" : `No run called ${runId}`}
              description={error ?? "It may have been deleted, or it belongs to another workspace."}
              titleAs="p"
              action={
                error && onRetry ? (
                  <Button variant="secondary" onClick={onRetry}>
                    Try again
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      </div>
    );
  }

  const elapsed = elapsedOf(run, now);
  const durText = f.duration(elapsed);
  const running = run.status === "running";
  const retried = steps.filter((s) => s.status === "retried").length;
  const models = [...new Set(steps.map((s) => s.model).filter((m): m is string => !!m))];
  const tokensIn = steps.reduce((n, s) => n + (s.tokens?.input ?? 0), 0);
  const tokensOut = steps.reduce((n, s) => n + (s.tokens?.output ?? 0), 0);
  const tokenText = f.number(run.tokens);
  const costText = f.cost(run.cost);

  /* ----- Banner: what went wrong, and where ----- */

  let banner: ReactNode = null;
  if (run.status === "failed") {
    banner = (
      <Alert
        tone="error"
        title={failedStep ? `Failed at step ${failedIndex + 1} of ${steps.length}: ${failedStep.name}` : "This run failed"}
        actions={
          failedStep ? (
            <Button variant="secondary" onClick={() => showStep(failedStep.id)}>
              Show step
            </Button>
          ) : null
        }
      >
        <p className={styles.wrapText}>{failedStep?.error ?? run.error ?? "The run stopped before it finished."}</p>
      </Alert>
    );
  } else if (run.status === "cancelled") {
    banner = (
      <Alert tone="info" title="This run was cancelled">
        <p>{detail?.cancelNote ?? "It stopped before it finished, so there’s no output."} Steps that finished are below.</p>
      </Alert>
    );
  }

  /* ----- Output ----- */

  let output: ReactNode;
  if (running) {
    output = (
      <p className={styles.quiet}>
        <span className={styles.sweep}>{run.agent} is still working. The output lands here when it’s done.</span>
      </p>
    );
  } else if (detail?.output) {
    output =
      detail.output.format === "json" ? (
        <LongText label="Output" text={detail.output.text} f={f} />
      ) : (
        <div className={styles.prose}>{detail.output.text}</div>
      );
  } else if (run.status === "failed") {
    output = (
      <p className={styles.quiet}>
        No output. The run stopped{failedStep ? ` at step ${failedIndex + 1}, ${failedStep.name}` : ""}, so nothing was saved or sent.
      </p>
    );
  } else {
    output = <p className={styles.quiet}>This run finished without output.</p>;
  }

  const traceId = `${baseId}-trace`;
  const outputId = `${baseId}-output`;
  const costId = `${baseId}-cost`;

  return (
    <div className={styles.detail} data-status={run.status}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        {back}
      </nav>

      <header className={styles.detailHead}>
        <div className={styles.detailText}>
          <StatusTag status={run.status} size="md" />
          <Heading level={level} ref={headingRef} tabIndex={-1} className={styles.detailTitle}>
            {run.title}
          </Heading>
          <p className={styles.detailMeta}>
            <span className={styles.runId}>{run.id}</span>
            <span>
              <span aria-hidden="true">· </span>
              {run.agent}
            </span>
            <span>
              <span aria-hidden="true">· </span>
              <TriggerLabel trigger={run.trigger} by={run.triggeredBy} />
            </span>
            <span>
              <span aria-hidden="true">· </span>
              <time dateTime={run.startedAt}>{f.full(run.startedAt)}</time>
            </span>
          </p>
        </div>
        <div className={styles.actions}>
          {onRerun && (
            <Button variant="secondary" busy={rerun.busy} busyLabel="Starting…" onClick={doRerun}>
              <Icon name="retry" className={styles.buttonIcon} />
              Re-run
            </Button>
          )}
          <Button variant="ghost" onClick={copyId}>
            <Icon name={copied === "copied" ? "check" : "copy"} className={styles.buttonIcon} />
            <Swap words={["Copy ID", "Copied"]} shown={copied === "copied" ? "Copied" : "Copy ID"} />
          </Button>
          {onShare && (
            <Button variant="ghost" busy={share.busy} busyLabel="Making link…" onClick={doShare}>
              <Icon name={shared === "copied" ? "check" : "link"} className={styles.buttonIcon} />
              <Swap words={["Share link", "Link copied"]} shown={shared === "copied" ? "Link copied" : "Share link"} />
            </Button>
          )}
        </div>
        {(rerun.error || share.error || sharedUrl || copied === "failed" || readOnly) && (
          <div className={styles.actionNotes}>
            {readOnly && <p className={styles.quietSmall}>{readOnly}</p>}
            {rerun.error && (
              <p className={styles.inlineError} role="alert">
                {rerun.error}
              </p>
            )}
            {share.error && (
              <p className={styles.inlineError} role="alert">
                {share.error}
              </p>
            )}
            {copied === "failed" && <p className={styles.inlineError}>Couldn’t reach the clipboard. Select the run ID above to copy it.</p>}
            {sharedUrl && (
              <p className={styles.quietSmall}>
                Copy this link: <span className={styles.selectable}>{sharedUrl}</span>
              </p>
            )}
          </div>
        )}
      </header>

      {banner}

      <dl className={styles.stats}>
        <div>
          <dt>Duration</dt>
          <dd>
            <Counter value={durText} reserve={running ? widest(durText) : durText} />
            {running && <span className={styles.statNote}>so far</span>}
          </dd>
        </div>
        <div>
          <dt>Tokens</dt>
          <dd>
            <Counter value={tokenText} reserve={widest(tokenText)} />
            {tokensIn + tokensOut > 0 && (
              <span className={styles.statNote}>
                {f.tokens(tokensIn)} in · {f.tokens(tokensOut)} out
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>
            <Counter value={costText} reserve={widest(costText)} />
          </dd>
        </div>
        <div>
          <dt>Steps</dt>
          <dd>
            <span className={styles.mono}>{detail ? steps.length : "–"}</span>
            {retried > 0 && (
              <span className={styles.statNote}>
                {retried} {plural(retried, "retry", "retries")}
              </span>
            )}
          </dd>
        </div>
        {models.length > 0 && (
          <div className={styles.statWide}>
            <dt>{plural(models.length, "Model")}</dt>
            <dd className={styles.models}>{models.join(", ")}</dd>
          </div>
        )}
      </dl>

      <section className={styles.section} aria-labelledby={traceId} ref={traceRef}>
        <div className={styles.sectionHead}>
          <Heading level={level + 1} id={traceId} className={styles.sectionTitle}>
            Trace
          </Heading>
          {detail && steps.length > 0 && (
            <div className={styles.sectionTools}>
              <Button
                variant="ghost"
               
                onClick={() => setOpen(open.size === steps.length ? new Set() : new Set(steps.map((s) => s.id)))}
              >
                <Swap words={["Expand all", "Collapse all"]} shown={open.size === steps.length ? "Collapse all" : "Expand all"} />
              </Button>
            </div>
          )}
        </div>
        {detail ? (
          <Trace steps={steps} run={run} now={now} f={f} open={open} setOpen={setOpen} />
        ) : (
          <div className={styles.tracePlaceholder} aria-busy={loading || undefined}>
            {error ? (
              <EmptyState
                art="unplugged"
                title="The trace didn’t load"
                description={error}
                titleAs="p"
                action={
                  onRetry && (
                    <Button variant="secondary" onClick={onRetry}>
                      Try again
                    </Button>
                  )
                }
              />
            ) : (
              <p className={styles.loadingLine} data-shown={slow || undefined}>
                <span className={styles.sweep}>Loading the trace…</span>
              </p>
            )}
          </div>
        )}
      </section>

      {detail && (
        <div className={styles.lower}>
          <section className={styles.section} aria-labelledby={outputId}>
            <Heading level={level + 1} id={outputId} className={styles.sectionTitle}>
              Output
            </Heading>
            {output}
          </section>
          <section className={styles.section} aria-labelledby={costId}>
            <Heading level={level + 1} id={costId} className={styles.sectionTitle}>
              Tokens and cost
            </Heading>
            <Breakdown steps={steps} run={run} f={f} />
          </section>
        </div>
      )}
    </div>
  );
}
