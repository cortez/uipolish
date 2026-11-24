import { getComponentGuide, getComponentMeta } from "@/lib/content";
import { cursorRuleMarkdown, rulesMarkdown, skillMarkdown } from "@/lib/skill";
import { INFO_PAGES, infoMarkdown } from "@/lib/info-pages";
import { SCREEN_INFO } from "@pro/index";
import {
  CATALOG,
  PRO_FAQ,
  PRO_HEADLINE,
  PRO_INCLUDED,
  PRO_LEDE,
  PRO_OPEN,
  PRO_PRICE,
  PRO_STEPS,
  previewHref,
} from "@/lib/pro";
import { isRetiredProDoc } from "@/lib/retired";
import { MCP_URL } from "@/lib/setup";
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

function catalogCards() {
  const built = new Map(SCREEN_INFO.map((s) => [s.name, s]));
  const listed = CATALOG.filter((c) => built.has(c.name)).map((c) => ({
    ...c,
    components: built.get(c.name)!.components,
  }));
  const extra = SCREEN_INFO.filter((s) => !CATALOG.some((c) => c.name === s.name)).map((s) => ({
    name: s.name,
    title: s.title,
    tagline: s.summary,
    components: s.components,
  }));
  return [...listed, ...extra];
}

/** The /pro page as Markdown, or null when the build has no screens. */
function proPage() {
  if (!SCREEN_INFO.length) return null;
  const screens = catalogCards()
    .map((s) => `- [${s.title}](${abs(previewHref(s.name))}): ${s.tagline}`)
    .join("\n");
  const steps = PRO_STEPS.map((s, i) => `${i + 1}. **${s.title}.** ${s.body}`).join("\n");
  const included = PRO_INCLUDED.map((line) => `- ${line}`).join("\n");
  const faq = PRO_FAQ.map((item) => `### ${item.q}\n\n${item.a}`).join("\n\n");
  const price = PRO_OPEN
    ? `UI Polish Pro is ${PRO_PRICE} one-time: ${SCREEN_INFO.length} finished app screens, no seat limits, and every screen added later included.`
    : "Try each screen live on sample data.";
  return [
    "# UI Polish Pro",
    PRO_HEADLINE,
    PRO_LEDE,
    price,
    `Live page: ${abs("/pro")}. Buyers get the private repo and a license key for MCP (\`list_screens\` and \`get_screen\`).`,
    `## ${SCREEN_INFO.length} screens`,
    screens,
    "## How it works",
    steps,
    "## Use with your AI tool",
    `Add your license key to the UI Polish MCP server at ${MCP_URL} (Authorization: Bearer <key>), then ask for a screen by name. The free components don't need a key.`,
    "## Pricing",
    PRO_OPEN ? `${PRO_PRICE} paid once` : "Pricing opens when the screens are on sale.",
    included,
    "## Questions",
    faq,
  ].join("\n\n") + "\n";
}

async function proScreen(name: string) {
  if (!SCREEN_INFO.length) return null;
  const info = SCREEN_INFO.find((s) => s.name === name);
  const listed = CATALOG.find((c) => c.name === name);
  if (!info) return null;
  const title = listed?.title ?? info.title;
  const tagline = listed?.tagline ?? info.summary;
  const components = await Promise.all(
    info.components.map(async (c) => [c, (await getComponentMeta(c))?.title ?? c] as const),
  );
  return [
    `# ${title}`,
    tagline,
    `This is a UI Polish Pro screen (${PRO_OPEN ? `${PRO_PRICE} one-time` : "part of UI Polish Pro"}). Try it live at ${abs(previewHref(name))}.`,
    info.summary && info.summary !== tagline ? info.summary : "",
    "## Built from",
    components.map(([c, title]) => `- [${title}](${abs(`/docs/${c}`)})`).join("\n") || "Built from UI Polish components.",
    `See all the screens and how to buy them: ${abs("/pro")}.`,
  ].filter((block) => block !== "").join("\n\n") + "\n";
}

function retiredPro(name: string) {
  return [
    `# This page has moved`,
    `\`/docs/${name}\` was part of an earlier UI Polish Pro offering, which is retired.`,
    `UI Polish Pro is now ${PRO_PRICE} one-time for finished app screens. Components and design rules stay free.`,
    `See [UI Polish Pro](${abs("/pro")}).`,
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
  // /pricing was the old paid-plan page; /screens was Pro's first address.
  if (clean === "/pro" || clean === "/pricing" || clean === "/screens") return proPage();
  const screen = /^\/(?:pro|screens)\/([a-z0-9-]+)$/.exec(clean);
  if (screen) return proScreen(screen[1]);
  const doc = /^\/docs\/([a-z0-9-]+)$/.exec(clean);
  if (doc) {
    if (isRetiredProDoc(doc[1])) return retiredPro(doc[1]);
    return component(doc[1]);
  }
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
