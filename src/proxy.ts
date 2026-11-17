import { NextResponse, type NextRequest } from "next/server";
import { prefersMarkdown } from "@/lib/accept";
import { count, slug } from "@/lib/stats";

// Markdown for agents, on the same URLs people read. A page request that
// prefers text/markdown, or a path ending in .md, is served by the Markdown
// twin at /md/<path>; everything else renders as usual. Pages answer with
// Vary: Accept either way, so a cache never hands HTML to an agent that
// asked for Markdown, or the reverse.

/** A page path: not an asset, an API, the MCP server or a file like llms.txt. */
const isPage = (path: string) =>
  !/^\/(_next|api|mcp|md)(\/|$)/.test(path) && !/\.[a-z0-9]+$/i.test(path.replace(/\.md$/i, ""));

/** The site's pages, for per-page counts; anything else counts as other. */
const KNOWN_PAGE = /^\/(docs(\/[a-z0-9-]+)?|articles(\/[a-z0-9-]+)?|about|contact|privacy|thanks)?$/;
const CRAWLER = /bot|crawl|spider|slurp|preview|fetch|curl|wget|python|httpclient|headless|lighthouse/i;

/** Anonymous counts for a page request: a view (or a crawl, or an agent
 *  reading Markdown), which page, and which site linked to it. */
function countView(request: NextRequest, markdown: boolean) {
  const h = request.headers;
  if (request.method !== "GET" || h.get("next-router-prefetch") || h.get("purpose") === "prefetch") return;
  if (markdown) return count("view.markdown");
  if (CRAWLER.test(h.get("user-agent") ?? "")) return count("view.crawler");
  const path = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  const fields = ["view.page", `view.path.${KNOWN_PAGE.test(path) ? slug(path === "/" ? "home" : path.slice(1)) : "other"}`];
  // Only the linking site's domain, and only on a full page load from
  // elsewhere (a client-side navigation's referrer is this site).
  try {
    const from = new URL(h.get("referer") ?? "").hostname.replace(/^www\./, "");
    if (from && from !== request.nextUrl.hostname.replace(/^www\./, "")) fields.push(`ref.${slug(from)}`);
  } catch {
    // No referrer, or not a URL.
  }
  count(...fields);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if ((request.method !== "GET" && request.method !== "HEAD") || !isPage(pathname)) return NextResponse.next();

  const suffixed = /\.md$/i.test(pathname);
  const markdown = suffixed || prefersMarkdown(request.headers.get("accept"));
  countView(request, markdown);
  if (markdown) {
    const page = suffixed ? pathname.replace(/\.md$/i, "").replace(/\/index$/, "") || "/" : pathname;
    const url = request.nextUrl.clone();
    url.pathname = page === "/" ? "/md" : `/md${page}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("vary", "Accept");
    return response;
  }

  const response = NextResponse.next();
  response.headers.append("vary", "Accept");
  return response;
}

export const config = {
  // Skip build assets and images outright, and the router's prefetches (a
  // hover on a link fetches a page in several parts; none is a view or asks
  // for Markdown). The function above sorts out the rest.
  matcher: [
    {
      source: "/((?!_next/static|_next/image).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
