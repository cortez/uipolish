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

/** The components the example app at /example is built from, in the order a visitor meets them. */
const EXAMPLE_PARTS = [
  "sidebar", "breadcrumbs", "model-picker", "popover", "copy-field", "message-thread", "reasoning", "tool-steps",
  "markdown", "diff-view", "response-actions", "message-branches", "agent-question", "prompt-suggestions",
  "prompt-input", "usage-meter", "drawer", "list", "data-table", "inline-edit", "badge", "avatar",
  "command-palette", "dialog", "toast", "tooltip", "kbd",
];

async function example() {
  const parts = await Promise.all(EXAMPLE_PARTS.map(async (name) => [name, (await getComponentMeta(name))?.title ?? name] as const));
  return [
    "# Copper, an example app",
    "Copper is an AI assistant for a small catering business, built only from UI Polish components and running on sample data in the browser. Nothing in it talks to a server.",
    `Open it at ${abs("/example")}. A chat about a rehearsal dinner is already there: a reply with its reasoning, tool steps (one failed, with Retry), a table and a diff of the menu card; an email with two versions; and a question waiting for an answer. Send a prompt to watch a reply stream (thinking, then tool steps, then the answer) and stop it. Guests and suppliers open in a drawer, ⌘K (Ctrl+K) searches everything, and deleting a chat asks first and offers Undo.`,
    "## Built from",
    parts.map(([name, title]) => `- [${title}](${abs(`/docs/${name}`)})`).join("\n"),
  ].join("\n\n") + "\n";
}

/** The Markdown for a site path, or null when there's no such page. */
export async function markdownFor(path: string): Promise<string | null> {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/") return llmsText(false);
  if (clean === "/skill") return skillMarkdown();
  if (clean === "/cursor-rule") return cursorRuleMarkdown();
  if (clean === "/rules") return rulesMarkdown();
  if (clean === "/example") return example();
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
