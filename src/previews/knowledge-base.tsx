"use client";

import { useEffect, useRef, useState } from "react";
import {
  KnowledgeBase,
  type KnowledgeBatch,
  type KnowledgeChunk,
  type KnowledgeService,
  type KnowledgeSource,
  type KnowledgeTestResult,
} from "@registry/knowledge-base/knowledge-base";
import { Button } from "@registry/button/button";
import { Checkbox } from "@registry/checkbox/checkbox";
import { Select } from "@registry/select/select";
import styles from "./preview.module.css";

/* Acme, a supper-club app, and Copper, the agent that answers guests and
   hosts. This is what Copper answers from. Everything here is fake: the
   uploads, the crawl and the search take realistic time and fail when asked. */

const NOW = Date.parse("2026-11-03T15:00:00Z");
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

const READY: KnowledgeSource[] = [
  { id: "s-menu", name: "Autumn tasting menu.pdf", kind: "file", status: "ready", pages: 6, chunks: 38, tokens: 9420, syncedAt: ago(130), href: "#" },
  { id: "s-allergen", name: "Allergen matrix, autumn.pdf", kind: "file", status: "ready", pages: 4, chunks: 52, tokens: 11880, syncedAt: ago(130), href: "#" },
  { id: "s-faq", name: "Venue FAQ", kind: "notion", location: "Acme HQ › Guests › Venue FAQ, and 9 sub-pages", status: "ready", pages: 12, chunks: 64, tokens: 15210, syncedAt: ago(42), href: "#" },
  { id: "s-help", name: "acme.co/help", kind: "website", location: "Every page in acme.co/sitemap.xml", status: "ready", pages: 38, chunks: 211, tokens: 48930, syncedAt: ago(60 * 26), href: "#" },
  { id: "s-suppliers", name: "Supplier list.csv", kind: "file", status: "ready", pages: 1, chunks: 26, tokens: 4120, syncedAt: ago(60 * 24 * 3) },
  { id: "s-granary", name: "Granary Hall: access, parking and step-free entrance.docx", kind: "file", status: "ready", pages: 3, chunks: 14, tokens: 3380, syncedAt: ago(60 * 24 * 5) },
  { id: "s-menus", name: "Menus", kind: "googledrive", location: "Shared drive › Copper › Menus, 14 files", status: "ready", pages: 41, chunks: 260, tokens: 61400, syncedAt: ago(18), href: "#" },
  { id: "s-style", name: "Copper house style.md", kind: "file", status: "ready", pages: 2, chunks: 9, tokens: 2110, syncedAt: ago(60 * 24 * 9) },
  { id: "s-wine", name: "Wine pairings 2026.pdf", kind: "file", status: "ready", pages: 8, chunks: 44, tokens: 10250, syncedAt: ago(60 * 24 * 12) },
  { id: "s-contracts", name: "Event contracts", kind: "dropbox", location: "Acme › Contracts", status: "ready", pages: 23, chunks: 130, tokens: 31200, syncedAt: ago(60 * 7), href: "#" },
];

const CONNECTED: Partial<Record<KnowledgeService, string>> = {
  googledrive: "mara@saturdaysupper.co",
  notion: "Acme HQ",
  dropbox: "Saturday Supper Club",
};

/* Forty files from a season of suppers, two of which can't be read. */
const BATCH_NAMES = (() => {
  const dates = ["Sep 6", "Sep 13", "Sep 20", "Sep 27", "Oct 4", "Oct 11", "Oct 18", "Oct 25", "Nov 1", "Nov 8"];
  const kinds = ["menu.pdf", "allergens.pdf", "run sheet.docx", "guest notes.md"];
  return dates.flatMap((d) => kinds.map((k) => `Supper ${d}, ${k}`));
})();
const WILL_FAIL: Record<string, string> = {
  "Supper Sep 20, allergens.pdf": "Password protected. Upload a copy without the password.",
  "Supper Oct 18, menu.pdf": "Scanned pages with no text in them. Upload the DOCX it came from, or run it through OCR first.",
};

/** A fake doc's eventual size, steady per name. */
function sizeOf(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pages = 1 + (h % 9);
  const chunks = pages * (5 + (h % 4));
  return { pages, chunks, tokens: chunks * (210 + (h % 40)) };
}

type Scenario = "ready" | "empty" | "ingesting" | "partial" | "full" | "viewer" | "loading" | "error";

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: "ready", label: "Ready" },
  { value: "empty", label: "First run" },
  { value: "ingesting", label: "Reading 40 files" },
  { value: "partial", label: "2 of 40 failed" },
  { value: "full", label: "Over the plan limit" },
  { value: "viewer", label: "Viewer" },
  { value: "loading", label: "Loading" },
  { value: "error", label: "Didn’t load" },
];

const PLAN_LIMIT = 500;

type World = { sources: KnowledgeSource[]; batch?: KnowledgeBatch; connected: Partial<Record<KnowledgeService, string>> };

function batchSources(settled: boolean): KnowledgeSource[] {
  return BATCH_NAMES.map((name, i) => {
    const id = `b-${i}`;
    if (!settled) return { id, name, kind: "file", status: "queued" };
    const fail = WILL_FAIL[name];
    return fail
      ? { id, name, kind: "file", status: "failed", error: fail }
      : { id, name, kind: "file", status: "ready", ...sizeOf(name), syncedAt: ago(4) };
  });
}

function world(s: Scenario): World {
  const connected = CONNECTED;
  switch (s) {
    case "empty":
      return { sources: [], connected: {} };
    case "ingesting":
      return { sources: [...batchSources(false), ...READY], batch: { sourceIds: BATCH_NAMES.map((_, i) => `b-${i}`), startedAt: Date.now() }, connected };
    case "partial":
      return {
        sources: [...batchSources(true), ...READY],
        batch: { sourceIds: BATCH_NAMES.map((_, i) => `b-${i}`), startedAt: Date.now() - 94_000, finishedAt: Date.now() },
        connected,
      };
    default:
      return { sources: READY, connected };
  }
}

/* ---------- Fake retrieval ---------- */

const PASSAGES: { sourceId: string; location: string; text: string }[] = [
  { sourceId: "s-allergen", location: "Page 2", text: "Tasting menu, autumn: the hazelnut praline in course five contains tree nuts. Ask for the nut-free plate, which swaps it for a brown-butter crumb made in a separate tray. Course two’s romesco also contains almonds; the nut-free plate serves it with a roast-pepper purée instead." },
  { sourceId: "s-menu", location: "Page 1", text: "Five courses, £68 a head. Squash, sage and brown butter; mackerel with romesco; mushroom and barley; venison with blackberries; pear and hazelnut praline. Every course can be made nut-free, gluten-free or vegetarian with 48 hours’ notice." },
  { sourceId: "s-faq", location: "Dietary needs", text: "Tell us about allergies when you book, or reply to your confirmation email at least 48 hours before the supper. The kitchen handles nuts, so we can’t promise a nut-free environment, only a nut-free plate." },
  { sourceId: "s-granary", location: "Page 1", text: "Parking: there’s no parking at Granary Hall itself. The Wharf Road car park is a four-minute walk and free after 6pm. Two blue-badge bays are by the side gate on Mill Lane; ask the host to hold one when you book." },
  { sourceId: "s-granary", location: "Page 2", text: "Step-free entrance: use the side gate on Mill Lane, which opens onto a level path to the dining room. The main entrance has three steps and no ramp." },
  { sourceId: "s-help", location: "acme.co/help/refunds", text: "Refunds: cancel up to 72 hours before a supper for a full refund to your card. After that, your seat can be passed to a friend at no cost from the booking page." },
  { sourceId: "s-suppliers", location: "Rows 4 to 6", text: "Bread: Hearth & Rye Bakery, delivers Fridays by 10am, order by Wednesday noon. Contact Tom Achebe. Sourdough and seeded rye; no nuts on site." },
  { sourceId: "s-menus", location: "Winter menu draft, page 1", text: "Winter, draft: celeriac and truffle; cod with brown shrimp; beef shin; blood orange posset with hazelnut biscuit. Hazelnut biscuit can be left off for nut-free guests." },
  { sourceId: "s-wine", location: "Page 3", text: "Pairing for the venison: a Northern Rhône Syrah. The alcohol-free pairing pours a blackberry and bay shrub with soda." },
  { sourceId: "s-contracts", location: "Venue hire, clause 7", text: "The venue opens to the host team from 4pm and must be clear by 11:30pm. Live music ends at 10:30pm." },
];

const STOP = new Set(["the", "and", "for", "are", "can", "what", "where", "who", "how", "does", "our", "with", "there", "this", "that", "from", "have", "your", "you", "any", "into", "get", "is", "do", "we", "a", "an", "to", "of", "in", "at", "it", "on", "be", "i"]);

function search(question: string, sources: KnowledgeSource[]): KnowledgeTestResult {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(ing|es|s)$/, ""))
    .filter((w) => w.length > 2);
  const live = new Set(sources.filter((s) => s.status === "ready").map((s) => s.id));
  const scored = PASSAGES.filter((p) => live.has(p.sourceId))
    .map((p, i) => {
      const lower = p.text.toLowerCase();
      const highlights: [number, number][] = [];
      let hits = 0;
      for (const w of words) {
        const re = new RegExp(`\\b${w.replace(/[-]/g, "\\-")}[a-z-]*`, "g");
        let m: RegExpExecArray | null;
        let found = false;
        while ((m = re.exec(lower))) {
          highlights.push([m.index, m.index + m[0].length]);
          found = true;
        }
        if (found) hits++;
      }
      const score = words.length ? Math.min(0.94, 0.42 + (hits / words.length) * 0.5 - i * 0.004) : 0;
      return { chunk: { id: `c-${i}`, sourceId: p.sourceId, location: p.location, text: p.text, highlights, score } as KnowledgeChunk, hits };
    })
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.chunk.score - a.chunk.score)
    .slice(0, 4)
    .map((r) => r.chunk);
  const top = scored[0];
  let answer: string | undefined;
  if (top && /nut/.test(question.toLowerCase()))
    answer = "Not as served: course five has hazelnut praline and course two has almonds. Ask for the nut-free plate when you book, at least 48 hours ahead. The kitchen handles nuts, so it can’t promise a nut-free kitchen.";
  else if (top && /park/.test(question.toLowerCase()))
    answer = "There’s no parking at Granary Hall. Wharf Road car park is a four-minute walk and free after 6pm, and two blue-badge bays are on Mill Lane if you ask the host when you book.";
  else if (top && /bread|bakery|supplier/.test(question.toLowerCase()))
    answer = "Hearth & Rye Bakery. They deliver Fridays by 10am; order by Wednesday noon from Tom Achebe.";
  return { answer, chunks: scored };
}

/* ---------- Ingest, played forward ---------- */

const STAGES: KnowledgeSource["status"][] = ["reading", "chunking", "indexing"];

function step(list: KnowledgeSource[], failing: Set<string>): KnowledgeSource[] {
  let running = list.filter((s) => STAGES.includes(s.status)).length;
  return list.map((s) => {
    if (s.status === "queued" && running < 4) {
      running++;
      return { ...s, status: "reading", progress: 0, pages: 0, chunks: undefined, tokens: undefined };
    }
    if (!STAGES.includes(s.status)) return s;
    const size = sizeOf(s.name);
    const progress = Math.min(1, (s.progress ?? 0) + 0.34 + Math.random() * 0.3);
    if (s.status === "reading") {
      if (failing.has(s.id) && progress > 0.5) return { ...s, status: "failed", progress: 0, error: WILL_FAIL[s.name] ?? "The file couldn’t be opened. Upload it again." };
      const pages = Math.round(size.pages * progress);
      return progress >= 1 ? { ...s, status: "chunking", progress: 0, pages: size.pages } : { ...s, progress, pages };
    }
    if (s.status === "chunking") {
      const chunks = Math.round(size.chunks * progress);
      return progress >= 1 ? { ...s, status: "indexing", progress: 0, chunks: size.chunks } : { ...s, progress, chunks };
    }
    const tokens = Math.round(size.tokens * progress);
    return progress >= 1
      ? { ...s, status: "ready", progress: 1, tokens: size.tokens, syncedAt: new Date(NOW).toISOString() }
      : { ...s, progress, tokens };
  });
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
let nextId = 0;

/* ---------- Preview ---------- */

export function KnowledgeBasePreview() {
  const [scenario, setScenario] = useState<Scenario>("ready");
  const [state, setState] = useState<World>(() => world("ready"));
  const [failNext, setFailNext] = useState(false);
  const [run, setRun] = useState(0);
  const failRef = useRef(failNext);
  const failing = useRef(new Set<string>());
  useEffect(() => {
    failRef.current = failNext;
  }, [failNext]);

  function pick(next: Scenario) {
    setScenario(next);
    const w = world(next);
    failing.current = new Set(w.sources.filter((s) => WILL_FAIL[s.name] && s.status === "queued").map((s) => s.id));
    setState(w);
    setRun((r) => r + 1);
  }

  // Plays ingest forward while anything is waiting or being read.
  const busy = state.sources.some((s) => s.status === "queued" || STAGES.includes(s.status));
  useEffect(() => {
    if (!busy) return;
    const t = window.setInterval(() => {
      setState((w) => {
        const sources = step(w.sources, failing.current);
        let batch = w.batch;
        if (batch && !batch.finishedAt) {
          const inBatch = sources.filter((s) => batch!.sourceIds.includes(s.id));
          if (inBatch.every((s) => s.status === "ready" || s.status === "failed")) batch = { ...batch, finishedAt: Date.now() };
        }
        return { ...w, sources, batch };
      });
    }, 420);
    return () => window.clearInterval(t);
  }, [busy]);

  async function call(ms: number, failure: string) {
    await wait(ms);
    if (failRef.current) {
      setFailNext(false);
      throw new Error(failure);
    }
  }

  const pages = state.sources.reduce((n, s) => n + (s.pages ?? 0), 0);
  const used = scenario === "full" ? Math.max(pages, PLAN_LIMIT) : pages;
  const limit = PLAN_LIMIT;

  /** Drops three files on the block, as if dragged in: one new, one already here, one it can't read. */
  function dropSamples() {
    const target = document.querySelector<HTMLElement>("[data-kb-preview] [data-drop-target]");
    if (!target) return;
    const dt = new DataTransfer();
    dt.items.add(new File(["x".repeat(48_000)], "Christmas supper menu.pdf", { type: "application/pdf" }));
    dt.items.add(new File(["x".repeat(52_000)], "Allergen matrix, autumn.pdf", { type: "application/pdf" }));
    dt.items.add(new File(["x".repeat(12_000)], "Seating plan.pages", { type: "" }));
    for (const type of ["dragenter", "drop"]) target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
  }

  return (
    <div className={styles.stack}>
      <div className={styles.row} data-demo-controls="">
        <Select aria-label="State" options={SCENARIOS} value={scenario} onValueChange={(v) => pick(v as Scenario)} />
        <Checkbox label="Fail the next request" checked={failNext} onCheckedChange={setFailNext} />
        <Button variant="secondary" onClick={dropSamples} disabled={scenario === "viewer" || scenario === "loading" || scenario === "error"}>
          Drop 3 sample files
        </Button>
        <Button variant="ghost" onClick={() => pick(scenario)} data-demo-controls="">
          Start over
        </Button>
      </div>

      <div data-kb-preview="">
        <KnowledgeBase
          key={run}
          headingLevel={2}
          agentName="Copper"
          description="What Copper answers guests and hosts from. Copper only uses what’s here, and says so when a question isn’t covered."
          now={NOW}
          loading={scenario === "loading"}
          error={scenario === "error" ? "Acme couldn’t reach the search index. Your sources are safe; nothing has changed." : undefined}
          onReload={() => pick("ready")}
          readOnly={scenario === "viewer" ? "You’re a host on Saturday Supper Club. Only owners can add or remove sources. Ask Mara Okafor." : undefined}
          sources={state.sources}
          batch={state.batch}
          connected={state.connected}
          usage={{ used, limit, unit: "pages" }}
          testSuggestions={["Is the tasting menu nut-free?", "Where can guests park at Granary Hall?", "Who supplies our bread?"]}
          onUpgrade={() => undefined}
          onAddFiles={async (files) => {
            await call(900 + files.length * 120, "The upload stopped halfway. Check your connection and try again.");
            const added: KnowledgeSource[] = files.map((file) => ({ id: `u-${++nextId}`, name: file.name, kind: "file", status: "queued" }));
            setState((w) => ({
              ...w,
              sources: [...added, ...w.sources],
              batch: files.length >= 4 ? { sourceIds: added.map((a) => a.id), startedAt: Date.now() } : w.batch,
            }));
          }}
          onReplaceFile={async (id) => {
            await call(800, "The new copy didn’t upload. Try again.");
            setState((w) => ({ ...w, sources: w.sources.map((s) => (s.id === id ? { ...s, status: "queued", progress: 0 } : s)) }));
          }}
          onAddWebsite={async (url, { crawl }) => {
            await call(1300, "acme.co didn’t answer. Check the address, or try again in a minute.");
            const u = new URL(url);
            const name = `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}`;
            setState((w) => ({
              ...w,
              sources: [{ id: `w-${++nextId}`, name, kind: "website", location: crawl ? "This page and the pages it links to" : "This page only", status: "queued" }, ...w.sources],
            }));
          }}
          onConnect={async (service) => {
            await call(1600, "The sign-in window was closed before it finished.");
            const add: Record<KnowledgeService, KnowledgeSource> = {
              googledrive: { id: `g-${++nextId}`, name: "Allergen sheets", kind: "googledrive", location: "Shared drive › Copper › Allergens, 8 files", status: "queued" },
              notion: { id: `n-${++nextId}`, name: "Host handbook", kind: "notion", location: "Acme HQ › Hosts › Handbook, and 14 sub-pages", status: "queued" },
              dropbox: { id: `d-${++nextId}`, name: "Supplier price lists", kind: "dropbox", location: "Acme › Suppliers", status: "queued" },
            };
            setState((w) => ({
              ...w,
              connected: { ...w.connected, [service]: w.connected[service] ?? CONNECTED[service] },
              sources: [add[service], ...w.sources],
            }));
          }}
          onResync={async (id) => {
            await call(500, "Couldn’t start a sync. Try again.");
            setState((w) => ({ ...w, sources: w.sources.map((s) => (s.id === id ? { ...s, status: "queued", progress: 0 } : s)) }));
          }}
          onRetry={async (ids) => {
            await call(600, "Couldn’t start again. Try once more.");
            ids.forEach((id) => failing.current.delete(id));
            setState((w) => ({
              ...w,
              batch: w.batch && ids.some((id) => w.batch!.sourceIds.includes(id)) ? { ...w.batch, finishedAt: undefined } : w.batch,
              sources: w.sources.map((s) => (ids.includes(s.id) ? { ...s, status: "queued", error: undefined, progress: 0 } : s)),
            }));
          }}
          onRemove={async (id) => {
            await call(700, "It’s still there. Try again.");
            setState((w) => ({
              ...w,
              sources: w.sources.filter((s) => s.id !== id),
              batch: w.batch ? { ...w.batch, sourceIds: w.batch.sourceIds.filter((x) => x !== id) } : undefined,
            }));
          }}
          onTest={async (q) => {
            await call(650 + Math.random() * 500, "The search index didn’t answer. Try again.");
            return search(q, state.sources);
          }}
        />
      </div>

      <p className={styles.note}>
        Uploads, crawls and searches take about a second, like a real backend. Drag files from your computer onto the list,
        or use “Drop 3 sample files” to see a duplicate and a type it can’t read. Tick “Fail the next request” to see how
        each action recovers.
      </p>
    </div>
  );
}
