import { timingSafeEqual } from "node:crypto";
import { statsEnabled, totals } from "@/lib/stats";

// The weekly report: this period against the one before, from the usage
// counts. As JSON for a bot to read, or as Markdown
// ready to post.

type Counts = Record<string, number>;
type Ranked = { name: string; count: number }[];

export type Report = {
  period: { from: string; to: string; days: number };
  configured: { usage: boolean };
  visitors: { views: number; viewsBefore: number; crawlerViews: number; markdownReads: number; topPages: Ranked; referrers: Ranked };
  agents: { connections: number; connectionsBefore: number; clients: Ranked; toolCalls: Ranked; apiRequests: number };
  components: {
    served: number;
    servedBefore: number;
    top: Ranked;
    tailwind: number;
    /** Items the shadcn CLI fetched from /r/<name>.json. */
    registryInstalls: number;
    registryInstallsBefore: number;
    registryTop: Ranked;
  };
};

const sum = (c: Counts, test: (field: string) => boolean) =>
  Object.entries(c).reduce((n, [f, v]) => (test(f) ? n + v : n), 0);

/** Fields under a prefix, ranked, with the prefix (and a suffix) cut off. */
function rank(c: Counts, prefix: string, suffix = "", limit = 5): Ranked {
  return Object.entries(c)
    .filter(([f]) => f.startsWith(prefix) && f.endsWith(suffix))
    .map(([f, count]) => ({ name: f.slice(prefix.length, f.length - suffix.length), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

const dateOf = (daysAgo: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

export async function buildReport(days = 7): Promise<Report> {
  const [now, before] = await Promise.all([
    statsEnabled() ? totals(days) : Promise.resolve({} as Counts),
    statsEnabled() ? totals(days, days) : Promise.resolve({} as Counts),
  ]);
  const served = (c: Counts) => sum(c, (f) => f.startsWith("component.") && f.endsWith(".served"));
  const registry = (c: Counts) => sum(c, (f) => f.startsWith("component.") && f.endsWith(".registry"));
  return {
    period: { from: dateOf(days - 1), to: dateOf(0), days },
    configured: { usage: statsEnabled() },
    visitors: {
      views: now["view.page"] ?? 0,
      viewsBefore: before["view.page"] ?? 0,
      crawlerViews: now["view.crawler"] ?? 0,
      markdownReads: now["view.markdown"] ?? 0,
      topPages: rank(now, "view.path."),
      referrers: rank(now, "ref."),
    },
    agents: {
      connections: now["mcp.connect"] ?? 0,
      connectionsBefore: before["mcp.connect"] ?? 0,
      clients: rank(now, "mcp.client."),
      toolCalls: rank(now, "tool."),
      apiRequests: now["api.component"] ?? 0,
    },
    components: {
      served: served(now),
      servedBefore: served(before),
      top: rank(now, "component.", ".served"),
      tailwind: now["component.tailwind"] ?? 0,
      registryInstalls: registry(now),
      registryInstallsBefore: registry(before),
      registryTop: rank(now, "component.", ".registry"),
    },
  };
}

/** A token against its secret, in constant time. No secret, no match. */
export function matchesSecret(given: string | null, secret: string | undefined) {
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---------- Markdown ---------- */

function change(now: number, before: number) {
  if (before === 0) return now === 0 ? "" : " (new)";
  const pct = Math.round(((now - before) / before) * 100);
  return ` (${pct >= 0 ? "+" : ""}${pct}% vs the week before)`;
}

const list = (r: Ranked) => (r.length ? r.map((x) => `${x.name} ${x.count}`).join(", ") : "none yet");

export function reportMarkdown(r: Report): string {
  const out = [`# UI Polish: ${r.period.from} to ${r.period.to}`];


  if (!r.configured.usage) {
    out.push("## Usage", "Not connected. Add the Upstash Redis integration in Vercel to start counting.");
    return out.join("\n\n") + "\n";
  }

  out.push(
    "## Agents",
    `- Connections: ${r.agents.connections}${change(r.agents.connections, r.agents.connectionsBefore)}`,
    `- By agent: ${list(r.agents.clients)}`,
    `- Components installed: ${r.components.served}${change(r.components.served, r.components.servedBefore)}; top: ${list(r.components.top)}`,
    `- Tailwind installs: ${r.components.tailwind}`,
    `- shadcn CLI installs: ${r.components.registryInstalls}${change(r.components.registryInstalls, r.components.registryInstallsBefore)}; top: ${list(r.components.registryTop)}`,
    `- Tool calls: ${list(r.agents.toolCalls)}`,
    `- REST API component requests: ${r.agents.apiRequests}`,
    "## Visitors",
    `- Page views: ${r.visitors.views}${change(r.visitors.views, r.visitors.viewsBefore)}`,
    `- Top pages: ${list(r.visitors.topPages)}`,
    `- Came from: ${list(r.visitors.referrers)}`,
    `- Agents reading pages as Markdown: ${r.visitors.markdownReads}; crawler visits: ${r.visitors.crawlerViews}`,
  );
  return out.join("\n\n") + "\n";
}
