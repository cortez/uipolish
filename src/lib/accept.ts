// Content negotiation for agents: a request that prefers Markdown over HTML
// gets the page as Markdown. Kept free of imports so it runs anywhere,
// including the proxy and the tests.

type Range = { type: string; q: number };

function parse(accept: string): Range[] {
  return accept
    .split(",")
    .map((part) => {
      const [type, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const value = q ? Number(q.slice(2)) : 1;
      return { type: type.trim(), q: Number.isFinite(value) ? value : 0 };
    })
    .filter((r) => r.type);
}

/** The quality the client gives a media type, from its most specific range. */
function quality(ranges: Range[], type: string): number {
  const [major] = type.split("/");
  const exact = ranges.find((r) => r.type === type);
  if (exact) return exact.q;
  const group = ranges.find((r) => r.type === `${major}/*`);
  if (group) return group.q;
  return ranges.find((r) => r.type === "*/*")?.q ?? 0;
}

/**
 * True when the client asks for Markdown by name and rates it at least as
 * high as HTML. Wildcards alone never select Markdown, so browsers (which
 * send text/html and *\/*) always get HTML.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  const ranges = parse(accept);
  const named = ranges.find((r) => r.type === "text/markdown" || r.type === "text/x-markdown");
  if (!named || named.q <= 0) return false;
  return named.q >= quality(ranges, "text/html");
}
