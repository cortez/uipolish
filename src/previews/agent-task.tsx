"use client";

import { useEffect, useRef, useState } from "react";
import {
  AgentTask,
  type AgentContext,
  type AgentPhase,
  type AgentRevisionPart,
  type AgentStatus,
  type AgentStep,
  type AgentTool,
} from "@registry/agent-task/agent-task";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import type { ModelOption } from "@registry/model-picker/model-picker";
import styles from "./preview.module.css";
import own from "./agent-task.module.css";

// A bug in Acme, the supper-club app: split bills come out a cent short.

const TASK = "Fix rounding in split bills";

const STEPS: AgentStep[] = [
  { id: "read", title: "Read split-bill.ts", status: "pending" },
  { id: "search", title: "Look up how others split cents", status: "pending" },
  { id: "plan", title: "Choose an approach", status: "pending" },
  { id: "write", title: "Write the fix", status: "pending" },
  { id: "review", title: "Run the tests and review", status: "pending" },
];

const TOOLS: AgentTool[] = [
  { id: "github", name: "GitHub", brand: "github" },
  { id: "files", name: "Files", icon: <Icon name="file" /> },
  { id: "figma", name: "Figma", brand: "figma" },
  { id: "linear", name: "Linear", brand: "linear" },
  { id: "npm", name: "npm", brand: "npm" },
];

const MODELS: ModelOption[] = [
  { id: "fast", name: "Fast", description: "Quick edits and small fixes" },
  { id: "balanced", name: "Balanced", description: "Everyday code, tests and review" },
  { id: "deep", name: "Deep", description: "Thinks longer on hard bugs" },
];

const FILE = [
  "// Each guest pays an equal share of the bill.",
  "export function splitBill(total: number, guests: number) {",
  "  const share = Math.round((total / guests) * 100) / 100;",
  "  return Array.from({ length: guests }, () => share);",
  "}",
];

const QUERY = "split money evenly, remainder cents";

const RESULTS = [
  { title: "allocate() spreads the remainder", source: "github.com/dinerojs/dinero.js", brand: "github" as const },
  { title: "Why not use floats for currency?", source: "stackoverflow.com", brand: "stackoverflow" as const },
  { title: "Largest remainder method", source: "en.wikipedia.org", brand: "wikipedia" as const },
];

const NOTES = ["Work in whole cents", "Leftover cents go to the first guests", "Shares must add up to the bill", "Keep splitBill’s signature"];

const FIX = `export function splitBill(total: number, guests: number) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / guests);
  const extra = cents - base * guests;
  return Array.from({ length: guests }, (_, i) =>
    (base + (i < extra ? 1 : 0)) / 100,
  );
}`;

const REVIEW: AgentRevisionPart[] = [
  "Each share was ",
  { removed: "rounded on its own" },
  " ",
  { added: "counted in whole cents" },
  ", so $100 for three ",
  { removed: "came to $99.99" },
  " ",
  { added: "splits $33.34, $33.33, $33.33" },
  ". 14 tests pass.",
];

const FAILURE = "npm test: 2 of 14 tests in split-bill.test.ts failed. They expect the extra cent on the last guest, not the first. The fix is written but not merged.";

type Run = {
  phase: AgentPhase;
  status: AgentStatus;
  steps: AgentStep[];
  context?: AgentContext;
  activeTool?: string;
  tokens: number;
  startedAt?: number;
  endedAt?: number;
  pausedMs: number;
  error?: string;
};

const fresh = (): Run => ({ phase: "reading", status: "running", steps: STEPS, tokens: 0, pausedMs: 0 });

const stepTo = (steps: AgentStep[], id: string, status: AgentStep["status"]) => steps.map((s) => (s.id === id ? { ...s, status } : s));

/** Step `id` starts; every step before it is done. */
const startStep = (r: Run, id: string): AgentStep[] => {
  const at = STEPS.findIndex((s) => s.id === id);
  return r.steps.map((s, i) => ({ ...s, status: i < at ? "done" : i === at ? "running" : "pending" }));
};

type Event = { wait: number; mark?: string; tokens?: number; apply: (r: Run) => Run };

/** The whole run as a list of small changes, each after a wait. `mark` names a moment for "Every state". */
function script(failing: boolean): Event[] {
  const events: Event[] = [];
  const add = (wait: number, apply: (r: Run) => Run, extra: Partial<Event> = {}) => events.push({ wait, apply, ...extra });

  add(0, (r) => ({ ...r, phase: "reading", steps: startStep(r, "read"), activeTool: "files", context: { kind: "file", path: "lib/split-bill.ts" } }));
  add(900, (r) => ({ ...r, context: { kind: "file", path: "lib/split-bill.ts", lines: FILE, startLine: 12 } }), { mark: "reading", tokens: 1800 });

  add(1500, (r) => ({ ...r, phase: "searching", steps: startStep(r, "search"), activeTool: "github", context: { kind: "search", query: "", results: [], running: true } }));
  for (let i = 1; i <= QUERY.length; i++)
    add(40, (r) => ({ ...r, context: { kind: "search", query: QUERY.slice(0, i), results: [], running: true } }));
  RESULTS.forEach((_, i) =>
    add(i ? 450 : 600, (r) => ({ ...r, context: { kind: "search", query: QUERY, results: RESULTS.slice(0, i + 1), running: i < RESULTS.length - 1 } }), i === 2 ? { mark: "searching", tokens: 2400 } : {}),
  );

  add(1000, (r) => ({ ...r, phase: "thinking", steps: startStep(r, "plan"), activeTool: "linear", context: { kind: "notes", notes: NOTES.slice(0, 1) } }));
  for (let i = 2; i <= NOTES.length; i++)
    add(700, (r) => ({ ...r, context: { kind: "notes", notes: NOTES.slice(0, i) } }), i === NOTES.length ? { mark: "thinking", tokens: 1600 } : {});

  add(1000, (r) => ({ ...r, phase: "writing", steps: startStep(r, "write"), activeTool: "files", context: { kind: "writing", path: "lib/split-bill.ts", text: "", streaming: true, code: true } }));
  const chunks = Math.ceil(FIX.length / 4);
  for (let c = 1; c <= chunks; c++) {
    const text = FIX.slice(0, c * 4);
    add(36, (r) => ({ ...r, context: { kind: "writing", path: "lib/split-bill.ts", text, streaming: true, code: true } }), c === Math.floor(chunks * 0.7) ? { mark: "writing" } : {});
  }
  add(500, (r) => ({ ...r, context: { kind: "writing", path: "lib/split-bill.ts", text: FIX, streaming: false, code: true } }), { tokens: 3200 });

  add(900, (r) => ({ ...r, phase: "reviewing", steps: startStep(r, "review"), activeTool: "npm", context: { kind: "review", path: "split-bill.ts", note: "revised", parts: [] } }));
  const parts = failing ? REVIEW.slice(0, 4) : REVIEW;
  parts.forEach((_, i) =>
    add(i === 0 ? 300 : typeof parts[i] === "string" ? 250 : 550, (r) => ({ ...r, context: { kind: "review", path: "split-bill.ts", note: "revised", parts: parts.slice(0, i + 1) } }), i === parts.length - 1 && !failing ? { mark: "reviewing", tokens: 1400 } : {}),
  );

  if (failing) {
    add(1200, (r) => ({ ...r, status: "failed", steps: stepTo(r.steps, "review", "failed"), activeTool: undefined, endedAt: Date.now(), error: FAILURE }), { mark: "failed" });
  } else {
    add(1000, (r) => ({
      ...r,
      status: "done",
      steps: r.steps.map((s) => ({ ...s, status: "done" })),
      activeTool: undefined,
      endedAt: Date.now(),
      context: { kind: "summary", title: "Split bills add up to the cent" },
    }), { mark: "done" });
  }
  return events;
}

const PER_TICK = 140;

/** Plays the script; pause holds it where it is, stop ends it there. */
function useRun(failing: boolean, round: number) {
  const [run, setRun] = useState<Run>(fresh);
  const at = useRef(0);
  const timer = useRef(0);
  const pausedAt = useRef<number | null>(null);
  const events = useRef<Event[]>([]);

  function next() {
    const e = events.current[at.current];
    if (!e) return;
    timer.current = window.setTimeout(() => {
      at.current += 1;
      setRun((r) => {
        const out = e.apply(r);
        return { ...out, tokens: out.tokens + (e.tokens ?? 0) };
      });
      next();
    }, e.wait);
  }

  useEffect(() => {
    events.current = script(failing);
    at.current = 0;
    pausedAt.current = null;
    const start = window.setTimeout(() => {
      setRun({ ...fresh(), startedAt: Date.now() });
      next();
    }, 400);
    return () => {
      clearTimeout(start);
      clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, failing]);

  // Tokens stream in while it works.
  useEffect(() => {
    if (run.status !== "running" || run.startedAt === undefined) return;
    const id = window.setInterval(() => setRun((r) => (r.status === "running" ? { ...r, tokens: r.tokens + PER_TICK + Math.round(Math.random() * 90) } : r)), 250);
    return () => clearInterval(id);
  }, [run.status, run.startedAt]);

  return {
    run,
    pause() {
      clearTimeout(timer.current);
      pausedAt.current = Date.now();
      setRun((r) => ({ ...r, status: "paused" }));
    },
    resume() {
      const held = pausedAt.current ? Date.now() - pausedAt.current : 0;
      pausedAt.current = null;
      setRun((r) => ({ ...r, status: "running", pausedMs: r.pausedMs + held }));
      next();
    },
    stop() {
      clearTimeout(timer.current);
      const held = pausedAt.current ? Date.now() - pausedAt.current : 0;
      pausedAt.current = null;
      setRun((r) => ({
        ...r,
        status: "stopped",
        endedAt: Date.now(),
        pausedMs: r.pausedMs + held,
        activeTool: undefined,
        // What it was in the middle of didn't finish.
        steps: r.steps.map((s) => (s.status === "running" ? { ...s, status: "pending" } : s)),
        context:
          r.context?.kind === "writing" ? { ...r.context, streaming: false } : r.context?.kind === "search" ? { ...r.context, running: false } : r.context,
      }));
    },
  };
}

const COST_PER_TOKEN = 3 / 1_000_000;

function Live() {
  const [round, setRound] = useState(0);
  const [failing, setFailing] = useState(false);
  const [model, setModel] = useState("balanced");
  const { run, pause, resume, stop } = useRun(failing, round);

  function again(withFailure: boolean) {
    setFailing(withFailure);
    setRound((r) => r + 1);
  }

  return (
    <section className={styles.group}>
      <div className={own.head}>
        <h2 className={styles.label}>An agent fixing a bug in Acme</h2>
        <div className={own.actions} data-demo-controls="">
          <Button variant="secondary" onClick={() => again(false)} data-demo-controls="">
            Replay
          </Button>
          <Button variant="secondary" onClick={() => again(true)} data-demo-controls="">
            Replay with failing tests
          </Button>
        </div>
      </div>
      <div className={own.frame}>
        <AgentTask
          agent="Coding agent"
          task={TASK}
          phase={run.phase}
          status={run.status}
          steps={run.steps}
          context={run.context}
          error={run.error}
          tools={TOOLS}
          activeTool={run.activeTool}
          usage={{ tokens: run.tokens, cost: run.tokens * COST_PER_TOKEN, startedAt: run.startedAt, endedAt: run.endedAt, pausedMs: run.pausedMs }}
          model={model}
          models={MODELS}
          onModelChange={setModel}
          onPause={pause}
          onResume={resume}
          onStop={stop}
          onRunAgain={() => again(failing)}
        />
      </div>
      <p className={styles.note}>
        {failing
          ? "This time two tests fail in review. The card turns red at that step and says what to do next."
          : "Five steps: reading the file, searching, weighing the options, writing the fix and reviewing it. Pause holds the clock; Stop ends the run where it is."}
      </p>
    </section>
  );
}

type Frozen = "reading" | "searching" | "thinking" | "writing" | "reviewing" | "paused" | "done" | "failed" | "stopped";

const FROZEN: { id: Frozen; label: string }[] = [
  { id: "reading", label: "Reading" },
  { id: "searching", label: "Searching" },
  { id: "thinking", label: "Thinking" },
  { id: "writing", label: "Writing" },
  { id: "reviewing", label: "Reviewing" },
  { id: "paused", label: "Paused" },
  { id: "done", label: "Complete" },
  { id: "failed", label: "Failed" },
  { id: "stopped", label: "Stopped" },
];

/** The script played up to a mark, at once. */
function frozen(state: Frozen, t: number): Run {
  const failing = state === "failed";
  const mark = state === "paused" ? "writing" : state === "stopped" ? "thinking" : state;
  let run: Run = { ...fresh(), startedAt: t };
  let ms = 0;
  for (const e of script(failing)) {
    ms += e.wait;
    const out = e.apply(run);
    run = { ...out, tokens: out.tokens + (e.tokens ?? 0) + Math.round(e.wait / 250) * (PER_TICK + 45) };
    if (e.mark === mark) break;
  }
  run = { ...run, startedAt: t - ms };
  if (run.endedAt !== undefined) run.endedAt = t;
  if (state === "paused") run = { ...run, status: "paused", endedAt: t };
  if (state === "stopped")
    run = { ...run, status: "stopped", endedAt: t, activeTool: undefined, steps: run.steps.map((s) => (s.status === "running" ? { ...s, status: "pending" } : s)) };
  return run;
}

function Every() {
  const [t0] = useState(() => Date.now());
  const [state, setState] = useState<Frozen>("reviewing");
  const [model, setModel] = useState("deep");
  const run = frozen(state, t0);
  return (
    <section className={styles.group}>
      <h2 className={styles.label}>Every state</h2>
      <div className={own.actions} role="group" aria-label="Show state">
        {FROZEN.map((s) => (
          <Button key={s.id} variant={s.id === state ? "primary" : "secondary"} aria-pressed={s.id === state} onClick={() => setState(s.id)}>
            {s.label}
          </Button>
        ))}
      </div>
      <div className={own.frame}>
        <AgentTask
          agent="Coding agent"
          task={TASK}
          phase={run.phase}
          status={run.status}
          steps={run.steps}
          context={run.context}
          error={run.error}
          tools={TOOLS}
          activeTool={run.activeTool}
          usage={{ tokens: run.tokens, cost: run.tokens * COST_PER_TOKEN, startedAt: run.startedAt, endedAt: run.endedAt, pausedMs: run.pausedMs }}
          model={model}
          models={MODELS}
          onModelChange={setModel}
          onPause={() => setState("paused")}
          onResume={() => setState("writing")}
          onStop={() => setState("stopped")}
          onRunAgain={() => setState("reading")}
        />
      </div>
    </section>
  );
}

export function AgentTaskPreview() {
  return (
    <div className={styles.stack}>
      <Live />
      <Every />
    </div>
  );
}
