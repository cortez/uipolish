import { after } from "next/server";

// Anonymous usage counts: one hash of named totals per day, in Redis over
// Upstash's REST API (no client library). Nothing that identifies a
// person is kept: no IP, no key, no user agent, only counts like
// "mcp.connect" or "component.dialog.locked". Written after the response,
// so counting never slows a request, and skipped when no store is set.
//
// Vercel's Upstash integration sets KV_REST_API_URL and KV_REST_API_TOKEN;
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN work too.

const KEEP_DAYS = 400;

function store() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

export const statsEnabled = () => store() !== null;

const day = (date: Date) => date.toISOString().slice(0, 10);

/** A name safe to use in a field: lowercase letters, digits and dashes. */
export const slug = (value: string, max = 40) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max) || "unknown";

async function pipeline(commands: (string | number)[][]) {
  const s = store();
  if (!s) return null;
  const res = await fetch(`${s.url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`stats store answered ${res.status}`);
  return (await res.json()) as { result?: unknown; error?: string }[];
}

/** Adds one to each field for today, after the response is sent. Call it
 *  from a route handler or the proxy. */
export function count(...fields: string[]) {
  if (!fields.length || !statsEnabled()) return;
  after(async () => {
    const key = `stats:${day(new Date())}`;
    try {
      await pipeline([...fields.map((f) => ["HINCRBY", key, f, 1]), ["EXPIRE", key, KEEP_DAYS * 86400]]);
    } catch (e) {
      console.warn(`[stats] ${(e as Error).message}`);
    }
  });
}

/** Totals per field over the `days` days ending today (UTC), summed. */
export async function totals(days: number, endingDaysAgo = 0): Promise<Record<string, number>> {
  const keys = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - endingDaysAgo - i);
    return `stats:${day(d)}`;
  });
  const replies = (await pipeline(keys.map((k) => ["HGETALL", k]))) ?? [];
  const sum: Record<string, number> = {};
  for (const reply of replies) {
    const flat = Array.isArray(reply.result) ? (reply.result as string[]) : [];
    for (let i = 0; i + 1 < flat.length; i += 2) sum[flat[i]] = (sum[flat[i]] ?? 0) + Number(flat[i + 1]);
  }
  return sum;
}
