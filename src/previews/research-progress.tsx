"use client";

import { useEffect, useRef, useState } from "react";
import {
  ResearchProgress,
  type ResearchPage,
  type ResearchQuery,
  type ResearchStatus,
} from "@registry/research-progress/research-progress";
import { Button } from "@registry/button/button";
import styles from "./preview.module.css";
import own from "./research-progress.module.css";

type Script = { query: ResearchQuery; found: ResearchPage[] };

// Real sites, with their marks from brand-marks; the three without one show their first letter.
const SCRIPT: Script[] = [
  {
    query: { text: "autumn supper menu for 12 guests", results: 8 },
    found: [
      { url: "https://cooking.nytimes.com/guides/autumn-dinner-party-for-a-crowd", title: "How to cook an autumn dinner party for a crowd", brand: "newyorktimes", status: "queued" },
      { url: "https://www.instagram.com/p/DBq3kXyNw2L/", title: "A long-table autumn supper for twelve", brand: "instagram", status: "queued" },
      { url: "https://www.reddit.com/r/Cooking/comments/1g7k2ab/hosting_12_for_dinner_what_scales_well/", title: "Hosting 12 for dinner: what scales well?", brand: "reddit", status: "queued" },
      { url: "https://www.pinterest.com/ideas/fall-dinner-party-menu/918273645012/", title: "Fall dinner party menu ideas", brand: "pinterest", status: "queued" },
    ],
  },
  {
    query: { text: "nut-free autumn desserts", results: 6 },
    found: [
      { url: "https://www.bbcgoodfood.com/recipes/collection/nut-free-desserts", title: "Nut-free dessert recipes", status: "queued" },
      { url: "https://www.youtube.com/watch?v=Qm3x7pLr2Vw", title: "Pear and oat crumble with no nuts, start to finish", brand: "youtube", status: "queued" },
      { url: "https://nutfreebaker.substack.com/p/swapping-nuts-out-of-classic-bakes", title: "Swapping nuts out of classic bakes", brand: "substack", status: "queued" },
    ],
  },
  {
    query: { text: "what’s in season late October", results: 5 },
    found: [
      { url: "https://en.wikipedia.org/wiki/Quince", title: "Quince", brand: "wikipedia", status: "queued" },
      { url: "https://www.seasonalfoodguide.org/october", title: "What’s in season in October: squash, chard and the last figs", status: "queued" },
      { url: "https://www.quora.com/What-vegetables-are-in-season-in-late-October", title: "What vegetables are in season in late October?", brand: "quora", status: "queued" },
    ],
  },
  {
    query: { text: "tree nut allergy hidden ingredients", results: 4 },
    found: [
      { url: "https://www.foodallergy.org/living-food-allergies/common-allergens/tree-nut", title: "Tree nut allergy: hidden sources to check", status: "queued" },
      { url: "https://en.wikipedia.org/wiki/Tree_nut_allergy", title: "Tree nut allergy", brand: "wikipedia", status: "queued" },
      { url: "https://medium.com/@hostingwithallergies/pesto-without-pine-nuts-3f9a1c2e7b10", title: "Pesto without pine nuts, and other swaps that taste right", brand: "medium", status: "queued" },
      { url: "https://www.reddit.com/r/FoodAllergies/comments/1g9w4c1/hosting_a_dinner_with_a_guest_who_has_a_tree_nut/", title: "Hosting a dinner with a guest who has a tree nut allergy", brand: "reddit", status: "queued" },
    ],
  },
];

const ALL_PAGES = SCRIPT.flatMap((s) => s.found);

/** In the "blocked pages" run, these don't make it. */
const MISSES: Record<string, Pick<ResearchPage, "status" | "reason">> = {
  "https://cooking.nytimes.com/guides/autumn-dinner-party-for-a-crowd": { status: "failed", reason: "Behind a paywall" },
  "https://nutfreebaker.substack.com/p/swapping-nuts-out-of-classic-bakes": { status: "skipped", reason: "Same advice as the BBC Good Food page" },
  "https://www.quora.com/What-vegetables-are-in-season-in-late-October": { status: "failed", reason: "Didn’t load in 10s" },
};

const SEARCH_MS = 1100;
const READ_MS = 650;
const SEC = 1000;

type Run = { status: ResearchStatus; queries: ResearchQuery[]; pages: ResearchPage[]; startedAt?: number; finishedAt?: number; error?: string };

const idle = (): Run => ({ status: "searching", queries: [], pages: [] });

function Live() {
  const [run, setRun] = useState<Run>(idle);
  const [round, setRound] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const timers = useRef<number[]>([]);
  // Read by the timers, which outlive the render that set them.
  const blockedRef = useRef(false);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function clear() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  // The agent's side: each search runs, then adds the pages it found;
  // then the pages are read one at a time.
  function search(i: number) {
    const step = SCRIPT[i];
    if (!step) return later(() => read(0), 300);
    setRun((r) => ({ ...r, status: "searching", queries: [...r.queries, { ...step.query, status: "running" }] }));
    later(() => {
      setRun((r) => ({
        ...r,
        queries: r.queries.map((q, n) => (n === i ? { ...q, status: "done" } : q)),
        pages: [...r.pages, ...step.found],
      }));
      later(() => search(i + 1), 250);
    }, SEARCH_MS);
  }

  function read(i: number) {
    const page = ALL_PAGES[i];
    if (!page) {
      setRun((r) => ({ ...r, status: "done", finishedAt: Date.now() }));
      return;
    }
    setRun((r) => ({ ...r, status: "reading", pages: r.pages.map((p) => (p.url === page.url ? { ...p, status: "reading" } : p)) }));
    const miss = blockedRef.current ? MISSES[page.url] : undefined;
    // A page that won't load takes a little longer to give up on.
    later(
      () => {
        setRun((r) => ({ ...r, pages: r.pages.map((p) => (p.url === page.url ? { ...p, status: "read", ...miss } : p)) }));
        read(i + 1);
      },
      miss?.status === "failed" ? READ_MS * 2 : miss ? READ_MS / 2 : READ_MS,
    );
  }

  useEffect(() => {
    const list = timers.current;
    const id = window.setTimeout(() => {
      setRun({ ...idle(), startedAt: Date.now() });
      search(0);
    }, 600);
    return () => {
      clearTimeout(id);
      list.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function again(withBlocked: boolean) {
    clear();
    blockedRef.current = withBlocked;
    setBlocked(withBlocked);
    setRun(idle());
    setRound((r) => r + 1);
  }

  function stop() {
    clear();
    setRun((r) => ({
      ...r,
      status: "stopped",
      finishedAt: Date.now(),
      queries: r.queries.map((q) => ({ ...q, status: "done" })),
      // What was being read when the person stopped it doesn't count as read.
      pages: r.pages.map((p) => (p.status === "reading" ? { ...p, status: "queued" } : p)),
    }));
  }

  return (
    <section className={styles.group}>
      <div className={own.head}>
        <h2 className={styles.label}>Copper researching Saturday’s menu</h2>
        <div className={own.actions}>
          <Button variant="secondary" onClick={() => again(false)} data-demo-controls="">
            Replay
          </Button>
          <Button variant="secondary" onClick={() => again(true)} data-demo-controls="">
            Replay with blocked pages
          </Button>
        </div>
      </div>
      <div className={own.frame}>
        <p className={own.prompt}>Find seasonal menus for 12 guests. One guest has a tree nut allergy.</p>
        <ResearchProgress
          key={round}
          agent="Copper"
          label="Copper’s research for Saturday’s menu"
          {...run}
          onStop={stop}
          onRetry={() => again(blocked)}
        />
      </div>
      <p className={styles.note}>
        {blocked
          ? "Three sources don’t make it this time: one is paywalled, one times out, and one is skipped as a repeat. The line counts them; the list says why."
          : "Copper runs four searches, then reads the 14 sources they turned up. Open the line for the searches and sources."}
      </p>
    </section>
  );
}

const STATES: { status: ResearchStatus | "partial"; label: string }[] = [
  { status: "searching", label: "Searching" },
  { status: "reading", label: "Reading" },
  { status: "done", label: "Done" },
  { status: "partial", label: "Partly read" },
  { status: "failed", label: "Failed" },
  { status: "stopped", label: "Stopped" },
];

const done = (q: ResearchQuery): ResearchQuery => ({ ...q, status: "done" });

/** Each state, frozen, from one clock. */
function frozen(state: ResearchStatus | "partial", t: number): Run {
  const queries = SCRIPT.map((s) => done(s.query));
  const readUpTo = (n: number, missing = false) =>
    ALL_PAGES.map((p, i): ResearchPage => {
      if (i > n) return p;
      if (i === n) return { ...p, status: "reading" };
      return { ...p, status: "read", ...(missing ? MISSES[p.url] : undefined) };
    });
  switch (state) {
    case "searching":
      return {
        status: "searching",
        startedAt: t - 3 * SEC,
        queries: [...queries.slice(0, 2), { ...SCRIPT[2].query, status: "running" }],
        pages: [...SCRIPT[0].found, ...SCRIPT[1].found],
      };
    case "reading":
      return { status: "reading", startedAt: t - 21 * SEC, queries, pages: readUpTo(5) };
    case "done":
      return { status: "done", startedAt: t - 48 * SEC, finishedAt: t, queries, pages: readUpTo(ALL_PAGES.length) };
    case "partial":
      return { status: "done", startedAt: t - 52 * SEC, finishedAt: t, queries, pages: readUpTo(ALL_PAGES.length, true) };
    case "failed":
      return {
        status: "failed",
        startedAt: t - 30 * SEC,
        finishedAt: t,
        queries,
        pages: readUpTo(6).map((p) => (p.status === "reading" ? { ...p, status: "queued" } : p)),
        error: "The search service stopped answering, so 8 pages weren’t read. Copper won’t draft the menu from 6.",
      };
    case "stopped":
      return {
        status: "stopped",
        startedAt: t - 18 * SEC,
        finishedAt: t,
        queries,
        pages: readUpTo(4).map((p) => (p.status === "reading" ? { ...p, status: "queued" } : p)),
      };
  }
}

function Every() {
  const [t0] = useState(() => Date.now());
  const [state, setState] = useState<ResearchStatus | "partial">("partial");
  const run = frozen(state, t0);
  return (
    <section className={styles.group}>
      <h2 className={styles.label}>Every state</h2>
      <div className={own.actions} role="group" aria-label="Show state">
        {STATES.map((s) => (
          <Button key={s.status} variant={s.status === state ? "primary" : "secondary"} aria-pressed={s.status === state} onClick={() => setState(s.status)}>
            {s.label}
          </Button>
        ))}
      </div>
      <div className={own.frame}>
        <ResearchProgress agent="Copper" label="Copper’s research for Saturday’s menu" {...run} defaultExpanded onStop={() => {}} onRetry={() => setState("reading")} />
      </div>
    </section>
  );
}

export function ResearchProgressPreview() {
  return (
    <div className={styles.stack}>
      <Live />
      <Every />
    </div>
  );
}
