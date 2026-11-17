"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { MenuItem } from "@registry/dropdown-menu/dropdown-menu";
import type { FileChange } from "@registry/file-changes/file-changes";
import { Markdown } from "@registry/markdown/markdown";
import { TurnFooter, TurnSummary, type TurnItem, type TurnStep } from "@registry/turn-summary/turn-summary";
import styles from "./preview.module.css";
import own from "./turn-summary.module.css";

/* One turn of a coding agent, played in real time: a note, a run of reads
   and a search, what it found, the edits, the tests, then the answer and
   the files it changed. The work stays folded to one line unless you open
   it. Replay runs it again; "With a failure" makes the test step fail. */

type Beat = { wait: number; apply: (s: State, now: number) => State };
type State = { items: TurnItem[]; reply: string; files: FileChange[]; finishedAt?: number };

const EMPTY: State = { items: [], reply: "", files: [] };

function upsertStep(items: TurnItem[], group: string, step: TurnStep): TurnItem[] {
  const at = items.findIndex((i) => i.kind === "steps" && i.id === group);
  if (at === -1) return [...items, { kind: "steps", id: group, steps: [step] }];
  return items.map((i, k) =>
    k === at && i.kind === "steps" ? { ...i, steps: i.steps.some((s) => s.id === step.id) ? i.steps.map((s) => (s.id === step.id ? step : s)) : [...i.steps, step] } : i,
  );
}

function script(fail: boolean): Beat[] {
  const beats: Beat[] = [];
  const note = (id: string, text: string) => beats.push({ wait: 300, apply: (s) => ({ ...s, items: [...s.items, { kind: "message", id, text }] }) });
  const step = (group: string, id: string, icon: TurnStep["icon"], running: string, done: string, detail: string, ms: number, failed = false) => {
    let start = 0;
    beats.push({ wait: 150, apply: (s, now) => ((start = now), { ...s, items: upsertStep(s.items, group, { id, icon, title: running, status: "running", startedAt: now }) }) });
    beats.push({
      wait: ms,
      apply: (s, now) => ({
        ...s,
        items: upsertStep(s.items, group, failed
          ? { id, icon, title: running.replace("Running", "Ran"), status: "failed", error: "2 of 20 runs failed: Pay stayed disabled for 5s", startedAt: start, finishedAt: now }
          : { id, icon, title: done, status: "done", detail, startedAt: start, finishedAt: now }),
      }),
    });
  };
  note("n1", "I'll start with the checkout flow and its E2E test.");
  step("g1", "s1", "file", "Reading checkout.spec.ts", "Read checkout.spec.ts", "tests/e2e/checkout.spec.ts", 500);
  step("g1", "s2", "file", "Reading use-cart-total.ts", "Read use-cart-total.ts", "src/checkout/use-cart-total.ts", 450);
  step("g1", "s3", "search", "Searching for “waitForTimeout”", "Searched for “waitForTimeout”", "3 matches in 2 files", 600);
  note("n2", "Found it: the test clicks **Pay** after a fixed `waitForTimeout(500)`, but the button waits for the tax quote.");
  step("g2", "s4", "pencil", "Editing checkout.spec.ts", "Edited checkout.spec.ts", "+3 −2", 500);
  step("g2", "s5", "pencil", "Editing use-cart-total.ts", "Edited use-cart-total.ts", "+14 −7", 500);
  step("g2", "s6", "terminal", "Running pnpm test:e2e", "Ran pnpm test:e2e", "20 passed", 1400, fail);
  const reply = fail
    ? "The fix is in, but the E2E test still failed twice in 20 runs: **Pay** stayed disabled for 5s. The tax quote must be failing, not slow. I'll look at `quoteTax` next."
    : "The test was racing the tax quote. It now waits for **Pay** to be enabled instead of sleeping, and `useCartTotal` cancels a stale quote.\n\n- `checkout.spec.ts`: waits for the button, not 500ms.\n- `use-cart-total.ts`: returns `loading`, `ready` or `failed`.\n\nPassed 20 runs in a row. Committed as `54af87d`.";
  for (const piece of reply.match(/\S+\s*/g) ?? []) beats.push({ wait: 28, apply: (s) => ({ ...s, reply: s.reply + piece }) });
  beats.push({
    wait: 100,
    apply: (s, now) => ({
      ...s,
      finishedAt: now,
      files: [
        { path: "tests/e2e/checkout.spec.ts", kind: "modified", added: 3, removed: 2 },
        { path: "src/checkout/use-cart-total.ts", kind: "modified", added: 14, removed: 7 },
      ],
    }),
  });
  return beats;
}

export function TurnSummaryPreview() {
  const [run, setRun] = useState({ n: 0, fail: false });
  const [state, setState] = useState<State>(EMPTY);
  const [startedAt, setStartedAt] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const beats = script(run.fail);
    let t = 0;
    const start = Date.now();
    timers.current = [window.setTimeout(() => (setState(EMPTY), setStartedAt(start)), 0)];
    for (const beat of beats) {
      t += beat.wait;
      timers.current.push(window.setTimeout(() => setState((s) => beat.apply(s, Date.now())), t));
    }
    return () => timers.current.forEach((id) => window.clearTimeout(id));
  }, [run]);

  const working = state.finishedAt === undefined;

  return (
    <div className={styles.stack}>
      <article className={own.turn}>
        <p className={own.prompt}>The checkout E2E test fails about one run in five. Find out why and fix it.</p>
        <div className={own.answer}>
          <TurnSummary items={state.items} working={working} />
          {state.reply && <Markdown source={state.reply} streaming={working} />}
          <TurnFooter
            startedAt={startedAt || undefined}
            finishedAt={state.finishedAt}
            working={working}
            copyText={state.reply}
            files={state.files}
            onOpenFile={() => {}}
            menu={<MenuItem onSelect={() => setRun((r) => ({ n: r.n + 1, fail: r.fail }))}>Run again</MenuItem>}
          />
        </div>
      </article>
      <div className={styles.row}>
        <Button variant="secondary" onClick={() => setRun((r) => ({ n: r.n + 1, fail: false }))}>
          Replay
        </Button>
        <Button variant="ghost" onClick={() => setRun((r) => ({ n: r.n + 1, fail: true }))}>
          With a failure
        </Button>
      </div>
    </div>
  );
}
