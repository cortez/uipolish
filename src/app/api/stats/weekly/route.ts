import { buildReport, matchesSecret, reportMarkdown } from "@/lib/stats-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Run by Vercel Cron every Monday (vercel.json), which sends
// Authorization: Bearer <CRON_SECRET>. Posts the week's report to
// STATS_WEBHOOK_URL as JSON: `text` and `content` hold the Markdown (the
// fields Slack- and Discord-style hooks read), `report` the numbers.

export async function GET(request: Request) {
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!matchesSecret(given, process.env.CRON_SECRET?.trim())) return new Response("Unauthorized", { status: 401 });
  const hook = process.env.STATS_WEBHOOK_URL?.trim();
  if (!hook) return Response.json({ sent: false, reason: "STATS_WEBHOOK_URL isn't set" });

  const report = await buildReport(7);
  const text = reportMarkdown(report);
  const res = await fetch(hook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, content: text, report }),
    signal: AbortSignal.timeout(10_000),
  });
  return Response.json({ sent: res.ok, status: res.status }, { status: res.ok ? 200 : 502 });
}
