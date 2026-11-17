import { markdownFor, notFoundMarkdown } from "@/lib/seo/markdown-pages";

export const runtime = "nodejs";

// The Markdown twin of every page. src/proxy.ts rewrites a page request
// here when it asks for text/markdown or ends in .md; /md/<path> works
// directly too. An unknown path is a real 404, with a Markdown body that
// says where to go instead.
export async function GET(_request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const segments = (await params).path ?? [];
  const path = "/" + segments.join("/");
  const body = await markdownFor(path);
  return new Response(body ?? notFoundMarkdown(path), {
    status: body ? 200 : 404,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      vary: "Accept",
      "cache-control": body ? "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" : "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
