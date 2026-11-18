import { openApiDocument } from "@/lib/api/openapi";
import { CORS } from "@/lib/api/respond";

export const runtime = "nodejs";
// Built from files at build time, so it's prerendered and served from the CDN.
export const dynamic = "force-static";

export async function GET() {
  return Response.json(await openApiDocument(), {
    headers: { ...CORS, "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
