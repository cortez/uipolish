import type { KnowledgeBatch, KnowledgeChunk, KnowledgeService, KnowledgeSource } from "@/components/ui/knowledge-base/knowledge-base";
import type { Database, Passage, Source } from "@/lib/db/database";
import { newId } from "@/lib/db/ids";

/* Knowledge without a vector store: each new source walks through reading,
   chunking and indexing on timers, with counts that tick up, and lands
   ready (or failed, for files whose name says they're scanned or
   password-protected). Retrieval scores passages by the words they share
   with the question. To make it real, replace `walk` with your ingest
   pipeline (parse, chunk, embed, upsert) reporting progress to the store,
   and `search` with a query to your vector index. */

export type Knowledge = ReturnType<typeof createKnowledge>;

const STOP = new Set(["the", "and", "for", "how", "can", "what", "when", "where", "does", "with", "you", "our", "are", "about", "this", "that", "from", "into", "your", "who", "why", "is"]);

const terms = (text: string) => [...new Set(text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter((w) => !STOP.has(w));

/** A fake document's eventual size, steady per name. */
function sizeOf(name: string, crawl = false) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pages = crawl ? 18 + (h % 40) : 1 + (h % 9);
  const chunks = pages * (5 + (h % 4));
  return { pages, chunks, tokens: chunks * (210 + (h % 40)) };
}

function failureOf(name: string) {
  if (/password|protected|locked/i.test(name)) return "Password protected. Upload a copy without the password.";
  if (/scan/i.test(name)) return "Scanned pages with no text in them. Upload the file it came from, or run it through OCR first.";
  return null;
}

/** What the screen shows of a source: everything but the workspace and its passages. */
const visible = ({ id, name, kind, location, href, status, progress, error, pages, chunks, tokens, syncedAt }: Source): KnowledgeSource => ({
  id, name, kind, location, href, status, progress, error, pages, chunks, tokens, syncedAt,
});

/** Overlapping or touching ranges, joined. */
function merge(ranges: [number, number][]) {
  const out: [number, number][] = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = out.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else out.push([start, end]);
  }
  return out;
}

const STAGES = [
  { status: "reading", ticks: 4, ms: 450 },
  { status: "chunking", ticks: 3, ms: 350 },
  { status: "indexing", ticks: 3, ms: 350 },
] as const;

export function createKnowledge(db: Database) {
  const batches = new Map<string, KnowledgeBatch>();
  // Bumped when a source is retried, re-synced or removed, so an older walk stops.
  const generation = new Map<string, number>();

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function walk(workspaceId: string, id: string, delay: number, crawl = false) {
    const gen = (generation.get(id) ?? 0) + 1;
    generation.set(id, gen);
    const current = async () => (generation.get(id) === gen ? db.getSource(workspaceId, id) : null);
    await sleep(400 + delay);
    const first = await current();
    if (!first) return;
    const size = sizeOf(first.name, crawl);
    const failure = first.kind === "file" ? failureOf(first.name) : null;
    for (const stage of STAGES) {
      for (let tick = 1; tick <= stage.ticks; tick++) {
        const source = await current();
        if (!source) return;
        const progress = tick / stage.ticks;
        if (failure && stage.status === "reading" && tick === 3) {
          await db.saveSource({ ...source, status: "failed", error: failure, progress: undefined });
          return settle(workspaceId);
        }
        const counts =
          stage.status === "reading"
            ? { pages: Math.round(size.pages * progress) }
            : stage.status === "chunking"
              ? { pages: size.pages, chunks: Math.round(size.chunks * progress) }
              : { pages: size.pages, chunks: size.chunks, tokens: Math.round(size.tokens * progress) };
        await db.saveSource({ ...source, status: stage.status, progress, error: undefined, ...counts });
        await sleep(stage.ms);
      }
    }
    const source = await current();
    if (!source) return;
    await db.saveSource({ ...source, status: "ready", progress: undefined, ...size, syncedAt: new Date().toISOString() });
    settle(workspaceId);
  }

  /** Marks the batch finished once none of its sources is still moving. */
  async function settle(workspaceId: string) {
    const batch = batches.get(workspaceId);
    if (!batch || batch.finishedAt) return;
    const sources = await db.listSources(workspaceId);
    const moving = sources.some((s) => batch.sourceIds.includes(s.id) && !["ready", "failed"].includes(s.status));
    if (!moving) batches.set(workspaceId, { ...batch, finishedAt: Date.now() });
  }

  function passagesFor(name: string): Passage[] {
    return [{ location: "Page 1", text: `${name.replace(/\.[a-z0-9]+$/i, "")}: the first passage of this document, as the index would hold it.` }];
  }

  async function add(workspaceId: string, source: Omit<Source, "workspaceId" | "addedAt" | "status" | "passages">, delay = 0, crawl = false) {
    await db.saveSource({ ...source, workspaceId, addedAt: Date.now(), status: "queued", passages: passagesFor(source.name) });
    void walk(workspaceId, source.id, delay, crawl);
  }

  return {
    async state(workspaceId: string) {
      const sources = await db.listSources(workspaceId);
      const batch = batches.get(workspaceId);
      return {
        sources: sources.map(visible),
        connected: await db.getKnowledgeAccounts(workspaceId),
        // A finished batch stays on its sheet for a minute, longer while some failed.
        batch: batch && (!batch.finishedAt || Date.now() - batch.finishedAt < 60_000 || sources.some((s) => batch.sourceIds.includes(s.id) && s.status === "failed")) ? batch : undefined,
        used: sources.filter((s) => s.status !== "failed").reduce((sum, s) => sum + (s.pages ?? 0), 0),
      };
    },

    async addFiles(workspaceId: string, files: { name: string; size: number }[]) {
      const ids = files.map(() => newId("src"));
      const prior = batches.get(workspaceId);
      const keep = prior && !prior.finishedAt ? prior.sourceIds : [];
      batches.set(workspaceId, { sourceIds: [...keep, ...ids], startedAt: prior && !prior.finishedAt ? prior.startedAt : Date.now() });
      await Promise.all(files.map((f, i) => add(workspaceId, { id: ids[i], name: f.name.slice(0, 200), kind: "file" }, Math.min(i, 12) * 260)));
    },

    async replaceFile(workspaceId: string, id: string, file: { name: string; size: number }) {
      const source = await db.getSource(workspaceId, id);
      if (!source) throw new Error("That source was removed.");
      await db.saveSource({ ...source, name: file.name, status: "queued", error: undefined, pages: undefined, chunks: undefined, tokens: undefined });
      void walk(workspaceId, id, 0);
    },

    async addWebsite(workspaceId: string, url: string, crawl: boolean) {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") throw new Error("Use an https address.");
      const sitemap = /sitemap[^/]*\.xml$/i.test(parsed.pathname);
      const name = `${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`;
      const location = sitemap ? `Every page in ${name}` : crawl ? `${name} and the pages it links to` : "This page only";
      await add(workspaceId, { id: newId("src"), name, kind: "website", location, href: url }, 0, crawl || sitemap);
    },

    async connect(workspaceId: string, service: KnowledgeService, account: string) {
      // The app's sign-in and folder picker go here; the sample picks a folder for you.
      const folder: Record<KnowledgeService, [string, string]> = {
        googledrive: ["Support macros", "Shared drive › Support › Macros"],
        notion: ["Product FAQ", "Acme HQ › Product › FAQ, and 6 sub-pages"],
        dropbox: ["Contracts", "Acme › Legal › Contracts"],
      };
      const [name, location] = folder[service];
      await db.setKnowledgeAccount(workspaceId, service, account);
      await add(workspaceId, { id: newId("src"), name, kind: service, location }, 0, true);
    },

    async resync(workspaceId: string, id: string) {
      const source = await db.getSource(workspaceId, id);
      if (!source) throw new Error("That source was removed.");
      await db.saveSource({ ...source, status: "queued" });
      void walk(workspaceId, id, 0, source.kind !== "file");
    },

    async retry(workspaceId: string, ids: string[]) {
      for (const id of ids) {
        const source = await db.getSource(workspaceId, id);
        if (!source) continue;
        // A retried file reads cleanly: the sample pretends a fixed copy went up.
        const name = source.name.replace(/scan(ned)?|password|protected|locked/gi, "").replace(/\s{2,}/g, " ").trim() || source.name;
        await db.saveSource({ ...source, name: failureOf(name) ? `${source.id}.pdf` : name, status: "queued", error: undefined });
        void walk(workspaceId, id, 0);
      }
    },

    async remove(workspaceId: string, id: string) {
      generation.set(id, (generation.get(id) ?? 0) + 1);
      if (!(await db.deleteSource(workspaceId, id))) throw new Error("That source was already removed.");
    },

    /** The passages that best match a question, best first, with the matching words marked. */
    async search(workspaceId: string, question: string, k = 4): Promise<KnowledgeChunk[]> {
      const want = terms(question);
      if (!want.length) return [];
      const sources = (await db.listSources(workspaceId)).filter((s) => s.status === "ready");
      const scored = sources.flatMap((s) =>
        s.passages.map((p, i) => {
          const text = p.text;
          const lower = text.toLowerCase();
          const hits = want.filter((w) => lower.includes(w));
          const highlights: [number, number][] = [];
          for (const w of hits) {
            for (let at = lower.indexOf(w); at >= 0; at = lower.indexOf(w, at + w.length)) highlights.push([at, at + w.length]);
          }
          return { id: `${s.id}-${i}`, sourceId: s.id, location: p.location, text, highlights: merge(highlights), score: hits.length / want.length };
        }),
      );
      return scored
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map((c) => ({ ...c, score: Math.round((0.52 + c.score * 0.43) * 100) / 100 }));
    },
  };
}
