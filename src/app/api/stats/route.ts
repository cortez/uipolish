import { apiError } from "@/lib/api/respond";
import { buildReport, matchesSecret, reportMarkdown } from "@/lib/stats-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The private usage report, for the owner's bot: this week against the one
// before. Needs STATS_TOKEN, as Authorization: Bearer <token> or ?token=.
// ?format=markdown returns it ready to post; ?days= sets the period (1–90).

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.STATS_TOKEN?.trim();
  if (!secret) return apiError(404, "not_found", "No endpoint here.", "See /openapi.json for the public API.");
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("token");
  if (!matchesSecret(given, secret)) return apiError(401, "unauthorized", "This report is private.", "Send the stats token as Authorization: Bearer <token>.");

  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 7));
  const report = await buildReport(days);
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex" };
  if (url.searchParams.get("format") === "markdown") {
    return new Response(reportMarkdown(report), { headers: { ...headers, "content-type": "text/markdown; charset=utf-8" } });
  }
  return Response.json(report, { headers });
}
