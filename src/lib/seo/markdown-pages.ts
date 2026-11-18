import { getComponentGuide, getComponentMeta } from "@/lib/content";
import { cursorRuleMarkdown, rulesMarkdown, skillMarkdown } from "@/lib/skill";
import { INFO_PAGES, infoMarkdown } from "@/lib/info-pages";
import { llmsText } from "./llms";
import { abs } from "./site";

// Every page as Markdown, for agents that send Accept: text/markdown or add
// .md to a path (src/proxy.ts sends both here). Built from the same sources
// as the pages, so the two say the same thing.

async function component(name: string) {
  const meta = await getComponentMeta(name);
  if (!meta || meta.primitive) return null;
  const guide = (await getComponentGuide(name)).replace(/^#\s.*\n+/, "");
  return [
    `# ${meta.title}`,
    meta.summary,
    `v${meta.version} · Add it: ask your agent for the ${meta.title.toLowerCase()} (MCP \`get_component("${meta.name}")\`, or GET ${abs(`/api/components/${meta.name}`)}).`,
    guide.trim(),
  ].join("\n\n") + "\n";
}

/** The Markdown for a site path, or null when there's no such page. */
export async function markdownFor(path: string): Promise<string | null> {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/") return llmsText(false);
  if (clean === "/skill") return skillMarkdown();
  if (clean === "/cursor-rule") return cursorRuleMarkdown();
  if (clean === "/rules") return rulesMarkdown();
  const doc = /^\/docs\/([a-z0-9-]+)$/.exec(clean);
  if (doc) return component(doc[1]);
  const info = Object.values(INFO_PAGES).find((p) => p.path === clean);
  if (info) return infoMarkdown(info);
  return null;
}

export const notFoundMarkdown = (path: string) => `# Page not found

There is no page at \`${path}\` on UI Polish. It may have moved, or the address may have a typo.

- Every page, as a list: ${abs("/sitemap.xml")}
- What UI Polish is and how to use it: ${abs("/llms.txt")}
- Components: ${abs("/")}
- REST API: ${abs("/openapi.json")}
`;
