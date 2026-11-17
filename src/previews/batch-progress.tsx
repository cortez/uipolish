"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BatchProgress, type BatchItem } from "@registry/batch-progress/batch-progress";
import { Button } from "@registry/button/button";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import styles from "./preview.module.css";
import own from "./batch-progress.module.css";

type Mode = "receipts" | "rows" | "thousand";

const RECEIPTS: [string, string][] = [
  ["Greengrocer, Mar 2", "$38.40 · Produce"],
  ["Butcher, Mar 2", "$112.00 · Meat"],
  ["Wine shop, Mar 3", "$286.50 · Wine"],
  ["Bakery, Mar 3", "$24.75 · Bread"],
  ["Fishmonger, Mar 5", "$94.20 · Fish"],
  ["Cheese counter, Mar 5", "$61.30 · Dairy"],
  ["Flowers, Mar 6", "$75.00 · Decor"],
  ["Ice delivery, Mar 6", "$18.00 · Supplies"],
  ["Linen hire, Mar 7", ""],
  ["Candles, Mar 7", "$32.90 · Decor"],
  ["Greengrocer, Mar 9", "$41.15 · Produce"],
  ["Butcher, Mar 9", "$98.60 · Meat"],
  ["Bakery, Mar 10", "$19.50 · Bread"],
  ["Wine shop, Mar 10", "$142.00 · Wine"],
  ["Spice market, Mar 12", "$27.80 · Pantry"],
  ["Taxi to market, Mar 12", "$16.40 · Travel"],
  ["Glassware, Mar 13", "$58.00 · Supplies"],
  ["Greengrocer, Mar 14", "$36.25 · Produce"],
  ["Coffee beans, Mar 14", "$22.00 · Pantry"],
  ["Dessert plates, Mar 15", "$44.90 · Supplies"],
];

// A small seeded random, so the demo runs the same way every time.
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

type Script = { id: string; name: string; ms: number; fails?: string; detail?: string; skip?: string };

const BATCHES: Record<
  Mode,
  {
    script: () => Omit<Script, "id" | "ms">[];
    seed: number;
    ms: [number, number];
    lanes: number;
  }
> = {
  receipts: {
    script: () =>
      RECEIPTS.map(([n, d], i) => ({
        name: `${n}.pdf`,
        detail: d,
        fails: i === 8 ? "Password protected" : i === 15 ? "Too blurry to read the total" : undefined,
      })),
    seed: 7,
    ms: [700, 1300],
    lanes: 3,
  },
  rows: {
    script: () =>
      Array.from({ length: 240 }, (_, i) => ({
        name: `Guest row ${i + 2}`,
        detail: "Email verified",
        fails: i === 57 || i === 181 ? "No email address" : undefined,
        skip: i === 120 ? "Duplicate of row 64" : undefined,
      })),
    seed: 11,
    ms: [120, 260],
    lanes: 6,
  },
  thousand: {
    script: () =>
      Array.from({ length: 1000 }, (_, i) => ({
        name: `Photo ${String(i + 1).padStart(4, "0")}.jpg`,
        detail: ["Beach", "Dinner", "Portrait", "Landscape", "Group"][i % 5],
        fails: i === 212 ? "File is empty" : i === 640 || i === 641 ? "Not an image" : undefined,
      })),
    seed: 5,
    ms: [40, 110],
    lanes: 10,
  },
};

const WORDS = {
  receipts: { verb: { running: "Reading", done: "Read" }, noun: { one: "receipt", other: "receipts" } },
  rows: { verb: { running: "Checking", done: "Checked" }, noun: { one: "guest row", other: "guest rows" } },
  thousand: { verb: { running: "Tagging", done: "Tagged" }, noun: { one: "photo", other: "photos" } },
};

function plan(mode: Mode): Script[] {
  const batch = BATCHES[mode];
  const rand = rng(batch.seed);
  return batch.script().map((s, i) => ({ ...s, id: `${mode}-${i}`, ms: batch.ms[0] + rand() * batch.ms[1] }));
}

/** The batch as it stands before anything starts: every item waiting. */
const waiting = (m: Mode): BatchItem[] => plan(m).map((s) => ({ id: s.id, name: s.name, status: "queued" }));

export function BatchProgressPreview() {
  const [mode, setMode] = useState<Mode>("receipts");
  const [items, setItems] = useState<BatchItem[]>(() => waiting("receipts"));
  const [startedAt, setStartedAt] = useState<number>();
  const [finishedAt, setFinishedAt] = useState<number>();
  const [stopped, setStopped] = useState(false);
  const [paused, setPaused] = useState(false);
  const timers = useRef<number[]>([]);
  const run = useRef(0);
  // The scheduler's own state, so Pause and Resume can reach it.
  const queue = useRef<Script[]>([]);
  const open = useRef(0);
  const hold = useRef<{ paused: boolean; at: number; retry: boolean }>({ paused: false, at: 0, retry: false });

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const set = (sid: string, patch: Partial<BatchItem>) =>
    setItems((prev) => prev.map((p) => (p.id === sid ? { ...p, ...patch } : p)));

  // Takes the next item while there is one and the batch isn't paused.
  const next = useCallback(function step(id: number) {
    if (run.current !== id || hold.current.paused) return;
    if (!queue.current.length) {
      if (open.current === 0) setFinishedAt(Date.now());
      return;
    }
    const s = queue.current.shift()!;
    open.current++;
    set(s.id, { status: "working", startedAt: Date.now(), finishedAt: undefined, error: undefined });
    timers.current.push(
      window.setTimeout(() => {
        if (run.current !== id) return;
        const finished = Date.now();
        // A retried failure goes through the second time.
        set(
          s.id,
          s.skip
            ? { status: "skipped", detail: s.skip, finishedAt: finished }
            : s.fails && !hold.current.retry
              ? { status: "failed", error: s.fails, finishedAt: finished }
              : { status: "done", detail: s.detail || undefined, finishedAt: finished },
        );
        open.current--;
        step(id);
      }, s.ms),
    );
  }, []);

  const lanes = useCallback(
    (m: Mode, id: number) => {
      // Only as many new readers as are free: some may still be finishing.
      const free = BATCHES[m].lanes - open.current;
      for (let i = 0; i < free; i++) timers.current.push(window.setTimeout(() => next(id), 250 + i * 120));
    },
    [next],
  );

  const start = useCallback(
    (m: Mode, only?: string[]) => {
      clear();
      const id = ++run.current;
      const script = plan(m);
      queue.current = script.filter((s) => !only || only.includes(s.id));
      open.current = 0;
      hold.current = { paused: false, at: 0, retry: Boolean(only) };
      setStopped(false);
      setPaused(false);
      setFinishedAt(undefined);
      setStartedAt((prev) => (only && prev ? prev : Date.now()));
      setItems((prev) =>
        script.map((s) => {
          const before = prev.find((p) => p.id === s.id);
          return only && before && !only.includes(s.id) ? before : { id: s.id, name: s.name, status: "queued" };
        }),
      );
      lanes(m, id);
    },
    [lanes],
  );

  // Starts on its own, a beat after it mounts or the batch changes.
  useEffect(() => {
    const t = window.setTimeout(() => start(mode), 300);
    return () => {
      window.clearTimeout(t);
      clear();
    };
  }, [mode, start]);

  return (
    <div className={styles.stack}>
      <div className={own.head} data-demo-controls="">
        <SegmentedControl data-demo-controls="" size="sm" value={mode} onValueChange={(v) => {
            clear();
            run.current++;
            setMode(v as Mode);
            setItems(waiting(v as Mode));
            setStartedAt(undefined);
            setFinishedAt(undefined);
            setStopped(false);
            setPaused(false);
          }} aria-label="Batch" widths="content">
          <Segment value="receipts">20 receipts</Segment>
          <Segment value="rows">240 rows</Segment>
          <Segment value="thousand">1,000 photos</Segment>
        </SegmentedControl>
        <Button variant="secondary" onClick={() => start(mode)} data-demo-controls="">
          Run again
        </Button>
      </div>
      <BatchProgress
        className={own.card}
        items={items}
        verb={WORDS[mode].verb}
        noun={WORDS[mode].noun}
        startedAt={startedAt}
        finishedAt={finishedAt}
        stopped={stopped}
        paused={paused}
        onPause={() => {
          // What's in flight finishes; nothing new starts.
          hold.current = { ...hold.current, paused: true, at: Date.now() };
          setPaused(true);
        }}
        onResume={() => {
          const away = Date.now() - hold.current.at;
          hold.current = { ...hold.current, paused: false };
          setPaused(false);
          // The clock skips the time spent paused, so the estimate stays true.
          setStartedAt((t) => (t === undefined ? t : t + away));
          lanes(mode, run.current);
        }}
        onStop={() => {
          clear();
          run.current++;
          setStopped(true);
          setPaused(false);
          setFinishedAt(Date.now());
          setItems((prev) =>
            prev.map((p) => (p.status === "working" ? { ...p, status: "queued", startedAt: undefined } : p)),
          );
        }}
        onRetry={(ids) => start(mode, ids)}
      />
      <p className={styles.note}>
        Copper reading March&rsquo;s receipts three at a time; two can&rsquo;t be read. Filter to what failed, retry one
        or all of them, or pause and pick up where it left off. Switch to 1,000 photos to see the list stay quick.
      </p>
    </div>
  );
}
