"use client";

import { useEffect, useRef, useState } from "react";
import { ToolSteps, type ToolStep } from "@registry/tool-steps/tool-steps";
import { Button } from "@registry/button/button";
import styles from "./preview.module.css";
import own from "./tool-steps.module.css";

type Script = {
  id: string;
  running: string;
  done: string;
  detail?: string;
  input: string;
  output: string;
  ms: number;
};

const READ: Script = {
  id: "read",
  running: "Reading shopping-list.pdf",
  done: "Read shopping-list.pdf",
  detail: "Saturday supper, 2 pages, 18 items",
  input: `read_file({ "path": "events/saturday-supper/shopping-list.pdf" })`,
  output: `Shopping list #212 for Saturday supper, 12 guests
Lamb shoulder, 2.4 kg             $84.46
White beans, 4 jars               $18.40
Sourdough, 2 loaves               $14.00
Lemon tarts, 2                    $52.00
…14 more lines`,
  ms: 1600,
};

const SEARCH: Script = {
  id: "search",
  running: "Searching 3 grocers",
  done: "Searched 3 grocers",
  detail: "Lamb shoulder, 2.8 kg, delivery to 14 Alder Lane",
  input: `search_prices({
  "item": "lamb shoulder, bone-in",
  "stores": ["market.example.com", "grocer.example.org", "butcher.example.com"]
})`,
  output: `market.example.com    $38.00 / kg   in stock
grocer.example.org    $39.50 / kg   next day
butcher.example.com   $41.20 / kg   in stock
Lowest in stock: $38.00, up 8% from $35.19 last month`,
  ms: 2200,
};

const FEES: Script = {
  id: "fees",
  running: "Checking the permit fee",
  done: "Checked the permit fee",
  detail: "Ticketed dinners over 10 guests need a permit",
  input: `fetch("https://county.example.org/health/fees.json")`,
  output: `Home kitchen, up to 30 meals a day: $412 a year (unchanged since January)`,
  ms: 1500,
};

const UPDATE: Script = {
  id: "update",
  running: "Updating the shopping list",
  done: "Updated 4 items",
  detail: "Lamb, beans, bread, total",
  input: `update_lines({
  "list": 212,
  "lines": [
    { "id": 1, "quantity": 2.8, "unit": 38.00 },
    { "id": 2, "quantity": 5 },
    { "id": 3, "quantity": 3 },
    { "id": 18, "recalculate": true }
  ]
})`,
  output: `4 items updated. New total $236.00 (was $212.00)`,
  ms: 2000,
};

const SAVE: Script = {
  id: "save",
  running: "Saving shopping list v3",
  done: "Saved shopping list v3",
  input: `save_version({ "list": 212, "note": "Two more guests" })`,
  output: `Saved as saturday-supper-list-v3.pdf`,
  ms: 1100,
};

const PLAN = [READ, SEARCH, FEES];
const LATER = [UPDATE, SAVE];

const FEE_ERROR = "county.example.org didn’t respond within 10 seconds. The fee table may be down for maintenance.";

function finished(s: Script): ToolStep {
  return { ...toStep(s), status: "done", title: s.done, output: s.output, startedAt: 0, finishedAt: s.ms };
}

/** The demo's tallest states, laid out invisibly to hold its space. */
const GHOSTS: ToolStep[][] = [
  [finished(READ), finished(SEARCH), { ...toStep(FEES), status: "failed", startedAt: 0, finishedAt: FEES.ms, error: FEE_ERROR }, ...LATER.map(toStep)],
  [...PLAN, ...LATER].map(finished),
];

function toStep(s: Script): ToolStep {
  return { id: s.id, title: s.running, status: "pending", detail: s.detail, input: s.input };
}

export function ToolStepsPreview() {
  const [steps, setSteps] = useState<ToolStep[]>(() => PLAN.map(toStep));
  const [run, setRun] = useState(0);
  const timers = useRef<number[]>([]);
  const failedOnce = useRef(false);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function patch(id: string, change: Partial<ToolStep>) {
    setSteps((all) => all.map((s) => (s.id === id ? { ...s, ...change } : s)));
  }

  // Runs the script from `index`: start the step, finish it after its time,
  // move on. The permit fee lookup fails the first time through.
  function runFrom(index: number) {
    const all = [...PLAN, ...LATER];
    const script = all[index];
    if (!script) return;
    patch(script.id, { status: "running", title: script.running, startedAt: Date.now(), finishedAt: undefined, error: undefined });
    later(() => {
      if (script.id === "fees" && !failedOnce.current) {
        failedOnce.current = true;
        patch(script.id, {
          status: "failed",
          finishedAt: Date.now(),
          error: FEE_ERROR,
        });
        return;
      }
      patch(script.id, { status: "done", title: script.done, output: script.output, finishedAt: Date.now() });
      // The plan grows once the agent knows what changed.
      if (script.id === "search") setSteps((s) => [...s, ...LATER.map(toStep)]);
      later(() => runFrom(index + 1), 250);
    }, script.ms);
  }

  useEffect(() => {
    const id = window.setTimeout(() => runFrom(0), 600);
    const list = timers.current;
    return () => {
      clearTimeout(id);
      list.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  function retry(id: string) {
    const index = [...PLAN, ...LATER].findIndex((s) => s.id === id);
    runFrom(index);
  }

  function again() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    failedOnce.current = false;
    setSteps(PLAN.map(toStep));
    setRun((r) => r + 1);
  }

  const t = 1_700_000_000_000;
  const stopped: ToolStep[] = [
    {
      id: "a",
      title: "Read the cancellation policy",
      status: "done",
      detail: "policies/cancellations.md",
      input: `read_file({ "path": "policies/cancellations.md" })`,
      output: "Cancelled 48 hours ahead: full refund. Later: half refund.",
      startedAt: t,
      finishedAt: t + 900,
    },
    {
      id: "b",
      title: "Looked up Ben’s booking",
      status: "done",
      detail: "2 seats, cancelled 3 days ahead",
      startedAt: t + 1000,
      finishedAt: t + 2400,
    },
    {
      id: "c",
      title: "Ask Ben for a reason",
      status: "skipped",
      detail: "Ben already explained in his message",
    },
    {
      id: "d",
      title: "Issue the refund",
      status: "cancelled",
      detail: "Stopped by you before sending",
    },
  ];

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={own.head}>
          <h2 className={styles.label}>Updating the shopping list for Saturday supper</h2>
          <Button variant="secondary" onClick={again} data-demo-controls="">
            Run again
          </Button>
        </div>
        {/* The run's tallest moments (failed with its message, and all done
            after a retry) sit invisibly in the same cell, so steps arriving
            and the error appearing never move what follows. */}
        <div className={own.reserve}>
          {GHOSTS.map((ghost, i) => (
            <div key={i} className={own.ghost} aria-hidden="true" inert>
              <ToolSteps steps={ghost} onRetry={() => {}} label="" />
            </div>
          ))}
          <ToolSteps key={run} steps={steps} onRetry={retry} label="Steps for the Saturday supper shopping list" />
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Skipped and cancelled</h2>
        <div className={own.reserve}>
          <ToolSteps steps={stopped} defaultOpen label="Steps for Ben’s refund" />
        </div>
      </section>
    </div>
  );
}
