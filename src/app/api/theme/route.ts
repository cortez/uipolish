import { apiError, json, preflight } from "@/lib/api/respond";
import { createTheme } from "@/lib/theme";
import { count } from "@/lib/stats";

export const runtime = "nodejs";

// A theme from one hue: GET /api/theme?hue=262&tint=1&brand=true. Free, no
// key. Without a hue it's the default blue, 262.

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const hue = q.get("hue") === null ? 262 : Number(q.get("hue"));
  if (!Number.isFinite(hue)) {
    return apiError(400, "invalid_parameter", "hue must be a number from 0 to 360.", "Try /api/theme?hue=262 for blue.");
  }
  const tintRaw = q.get("tint");
  if (tintRaw !== null && !["0", "1", "2"].includes(tintRaw)) {
    return apiError(400, "invalid_parameter", `tint must be 0, 1 or 2, not "${tintRaw}".`, "0 keeps the grays neutral, 1 gives them a hint of the hue, 2 tints them.");
  }
  const tint = (tintRaw === null ? 1 : Number(tintRaw)) as 0 | 1 | 2;
  const brand = q.get("brand") !== "false";
  const theme = createTheme({ hue, tint, brand });
  count("api.theme");
  if (q.get("format") === "css") {
    return new Response(theme.css, { headers: { "content-type": "text/css; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "public, max-age=86400" } });
  }
  return json({ hue, tint, brand, css: theme.css, vars: theme.vars, checks: theme.checks }, { headers: { "cache-control": "public, max-age=86400" } });
}

export const OPTIONS = preflight;
