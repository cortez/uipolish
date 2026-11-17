"use client";

import { useEffect, useRef, useState } from "react";
import { BackgroundRun, RunList, type Run } from "@registry/background-run/background-run";
import type { ToolStep } from "@registry/tool-steps/tool-steps";
import { Button } from "@registry/button/button";
import styles from "./preview.module.css";
import own from "./background-run.module.css";

const MIN = 60_000;

// Read only from timers and handlers.
const clock = () => Date.now();

const SHOPPING_STEPS = [
  "Reading Saturday’s menu from Acme",
  "Scaling 4 recipes to 14 guests",
  "Checking stock at Acme",
  "Pricing the shopping list",
  "Waiting for your OK",
  "Messaging 12 guests through Postbox",
  "Saving the shopping list",
];

const SHOPPING_CHANGES = [
  { count: 4, label: "recipes scaled to 14 guests" },
  { count: 12, label: "messages sent" },
  { count: 1, label: "shopping list saved" },
];

const RECIPE_STEPS: ToolStep[] = [
  { id: "a", title: "Read 4 recipes from Acme", status: "done", startedAt: 0, finishedAt: 2_100 },
  { id: "b", title: "Scaled each to 14 guests", status: "done", startedAt: 2_200, finishedAt: 9_800 },
  { id: "c", title: "Saved 4 recipes", status: "done", startedAt: 9_900, finishedAt: 12_400 },
];

type Item = { run: Run; seen: boolean; open: boolean };

function startList(t: number): Item[] {
  return [
    {
      run: {
        id: "live",
        title: "Plan Saturday’s shopping for 14 guests",
        status: "running",
        queuedAt: t,
        startedAt: t,
        step: SHOPPING_STEPS[0],
        progress: { done: 0, total: SHOPPING_STEPS.length },
        changes: [],
      },
      seen: true,
      open: false,
    },
    {
      run: {
        id: "recipes",
        title: "Scale the autumn recipes",
        status: "done",
        startedAt: t - 26 * MIN,
        finishedAt: t - 14 * MIN,
        summary: "Updated 4 recipes and checked allergens",
        changes: [{ count: 4, label: "recipes updated" }, { label: "Allergens checked" }],
        steps: RECIPE_STEPS,
      },
      seen: false,
      open: false,
    },
    {
      run: {
        id: "payments",
        title: "Reconcile last week’s payments",
        status: "failed",
        startedAt: t - 3 * 60 * MIN,
        finishedAt: t - 2 * 60 * MIN - 51 * MIN,
        progress: { done: 9, total: 14 },
        error: "Ledger asked to sign in again, so 5 payments weren’t matched.",
        changes: [{ count: 9, label: "payments matched" }],
      },
      seen: true,
      open: false,
    },
    {
      run: { id: "menu", title: "Draft the winter menu", status: "queued", queuedAt: t - 1 * MIN, detail: "Starts after the shopping" },
      seen: true,
      open: false,
    },
    {
      run: {
        id: "guests",
        title: "Tidy the guest list",
        status: "stopped",
        startedAt: t - 26 * 60 * MIN,
        finishedAt: t - 25 * 60 * MIN,
        progress: { done: 2, total: 5 },
        changes: [{ count: 3, label: "duplicate guests merged" }],
      },
      seen: true,
      open: false,
    },
  ];
}

/** The list shows this many until "Show all". */
const FIRST = 3;

export function BackgroundRunPreview() {
  // One clock for the demo data. The runs don't print a time until they've mounted, so this can differ on the server.
  const [items, setItems] = useState(() => startList(Date.now()));
  const [all, setAll] = useState(false);
  const [round, setRound] = useState(0);
  const timers = useRef<number[]>([]);
  const at = useRef(0);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function patch(id: string, change: Partial<Run>) {
    setItems((list) =>
      list.map((item) => {
        if (item.run.id !== id) return item;
        // Finished or blocked while the person wasn't looking: new until they open it.
        const away = change.status && change.status !== item.run.status && ["needs-input", "done", "failed"].includes(change.status) && !item.open;
        return { ...item, run: { ...item.run, ...change }, seen: away ? false : item.seen };
      }),
    );
  }

  // The first run moves one step every 1.8 seconds and stops at step 5 for an OK.
  function advance(index: number) {
    at.current = index;
    if (index === 4) {
      patch("live", {
        status: "needs-input",
        step: undefined,
        progress: { done: 4, total: SHOPPING_STEPS.length },
        need: { text: "Needs your OK to message 12 guests from Postbox.", action: "Review request", since: clock() },
        changes: SHOPPING_CHANGES.slice(0, 1),
        stopNote: "4 recipes are already scaled. No messages have gone out.",
      });
      return;
    }
    if (index >= SHOPPING_STEPS.length) {
      patch("live", { status: "done", step: undefined, need: undefined, finishedAt: clock(), summary: "Scaled 4 recipes, sent 12 messages", changes: SHOPPING_CHANGES });
      return;
    }
    patch("live", {
      status: "running",
      step: SHOPPING_STEPS[index],
      progress: { done: index, total: SHOPPING_STEPS.length },
      need: undefined,
      changes: index >= 2 ? SHOPPING_CHANGES.slice(0, 1) : [],
    });
    later(() => advance(index + 1), 1800);
  }

  useEffect(() => {
    const list = timers.current;
    const id = window.setTimeout(() => advance(1), 1800);
    return () => {
      clearTimeout(id);
      list.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function again() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setItems(startList(Date.now()));
    setRound((r) => r + 1);
  }

  function update(id: string, fn: (item: Item) => Item) {
    setItems((list) => list.map((item) => (item.run.id === id ? fn(item) : item)));
  }

  const shown = all ? items : items.slice(0, FIRST);

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={own.head}>
          <h2 className={styles.label}>Copper’s runs</h2>
          <Button variant="ghost" onClick={again} data-demo-controls="">
            Start over
          </Button>
        </div>
        <div className={own.sidebar}>
          <RunList label="Copper’s runs">
            {shown.map(({ run, seen, open }) => (
              <BackgroundRun
                key={run.id}
                run={run}
                agent="Copper"
                seen={seen}
                expanded={open}
                onExpandedChange={(next) => update(run.id, (item) => ({ ...item, open: next }))}
                onOpen={(id) => update(id, (item) => ({ ...item, seen: true }))}
                onRespond={() => later(() => advance(5), 400)}
                onReview={() => {}}
                onRetry={(id) => {
                  if (id === "live") return advance(at.current >= 4 ? 5 : at.current);
                  patch(id, { status: "running", startedAt: Date.now(), finishedAt: undefined, error: undefined, step: "Matching the last 5 payments", progress: { done: 9, total: 14 } });
                  later(() => patch(id, { status: "done", finishedAt: Date.now(), summary: "Matched all 14 payments", changes: [{ count: 14, label: "payments matched" }] }), 3000);
                }}
                onStop={(id) =>
                  new Promise<void>((resolve) => {
                    if (id === "live") {
                      timers.current.forEach(clearTimeout);
                      timers.current = [];
                    }
                    later(() => {
                      patch(id, { status: "stopped", step: undefined, need: undefined, finishedAt: Date.now() });
                      resolve();
                    }, 1200);
                  })
                }
              />
            ))}
          </RunList>
          {items.length > FIRST && (
            <Button variant="ghost" className={own.more} aria-expanded={all} onClick={() => setAll(!all)}>
              {all ? "Show fewer" : `Show ${items.length - FIRST} more`}
            </Button>
          )}
        </div>
        <p className={styles.note}>The first run moves a step every two seconds and stops halfway for your OK. Leave it closed and it gets a dot when it needs you.</p>
      </section>
    </div>
  );
}
