import { getComponentGuide, getComponentMeta, getShadcn, getTailwind } from "@/lib/content";
import { createTheme } from "@/lib/theme";
import { cursorRuleMarkdown, rulesMarkdown, skillMarkdown } from "@/lib/skill";
import { articleMarkdown, getArticle, listArticles } from "@/lib/articles";
import { INFO_PAGES, infoMarkdown } from "@/lib/info-pages";
import { CLIENTS, MCP_URL } from "@/lib/setup";
import { llmsText } from "./llms";
import { SITE_DESCRIPTION, abs } from "./site";

// Every page as Markdown, for agents that send Accept: text/markdown or add
// .md to a path (src/proxy.ts sends both here). Built from the same sources
// as the pages, so the two say the same thing.

function docsIntro() {
  const out = [
    "# Introduction",
    SITE_DESCRIPTION,
    "UI Polish is a library of React components with every state, transition and edge case worked out, plus the design rules behind them. Your coding agent gets both over MCP. It writes the components into your project as files you own, and follows the rules for the UI it writes itself.",
    "## Installation",
    `The server is ${MCP_URL}. No account or key is needed.`,
  ];
  for (const c of Object.values(CLIENTS)) out.push(`### ${c.label}`, c.steps, "```\n" + c.command() + "\n```", c.after);
  out.push(
    "## How it works",
    "Ask for a component by name, like “add a date picker”. Your agent calls `get_component`, gets the code, its CSS and a guide to using it, and writes them into your project. The interactive ones (menus, selects, dialogs, tabs) run on Base UI for focus, keyboard and positioning, so your agent also installs `@base-ui/react` once. Before writing any other UI, the server has your agent read the rules for what it’s touching.",
    "## Tools",
    "- `get_rules(topic?)`: the rules for one topic, or the tokens and checklist.\n- `list_components()`: every component with a summary and version.\n- `get_component(name, tailwind?)`: one component's code and guide, with its dependencies. `tailwind: true` puts the CSS in Tailwind's components layer.\n- `get_theme(hue, tint?, brand?)`: a theme in one brand color, light and dark, contrast-checked.",
    `Using Tailwind CSS v4: ${abs("/docs/tailwind")}.`,
    `Without MCP, the same content is a REST API: ${abs("/openapi.json")}.`,
  );
  return out.join("\n\n") + "\n";
}

async function component(name: string) {
  const meta = await getComponentMeta(name);
  if (!meta || meta.primitive) return null;
  const guide = (await getComponentGuide(name)).replace(/^#\s.*\n+/, "");
  const kit = meta.kit === "agent" ? "Agent kit · " : "";
  return [
    `# ${meta.title}`,
    meta.summary,
    `${kit}v${meta.version} · Add it: ask your agent for the ${meta.title.toLowerCase()} (MCP \`get_component("${meta.name}")\`, or GET ${abs(`/api/components/${meta.name}`)}).`,
    guide.trim(),
  ].join("\n\n") + "\n";
}

function themeMarkdown() {
  const example = createTheme({ hue: 262, tint: 1, brand: true });
  return [
    "# Theme",
    "Pick one color. The accent, the text on it and in it, the grays and the primary buttons follow, in light and dark, and every text color is solved to read at 4.5:1 (fills and icons at 3:1). Blues, reds and violets get white text on the accent; yellows and limes get near-black text so the fill keeps its color.",
    "## Get one",
    `- MCP: \`get_theme({ hue, tint, brand })\`.\n- REST: GET ${abs("/api/theme?hue=262&tint=1&brand=true")} (add \`&format=css\` for the stylesheet alone).\n- By hand: ${abs("/docs/theme")}.`,
    "Hue is OKLCH, 0–360: about 25 red, 50 orange, 80 amber, 150 green, 190 teal, 262 blue, 295 violet, 350 pink. `tint` is 0 for neutral grays, 1 for a hint of the hue (default), 2 for tinted. `brand` puts the primary buttons in the accent (default true).",
    "## Use it",
    "Paste the CSS after tokens.css. It sets only the roles it changes, so it sits on top of the tokens or of the shadcn/ui mapping.",
    "## Example: hue 262",
    "```css\n" + example.css + "```",
  ].join("\n\n") + "\n";
}

/** The Markdown for a site path, or null when there's no such page. */
export async function markdownFor(path: string): Promise<string | null> {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/") return llmsText(false);
  if (clean === "/docs") return docsIntro();
  if (clean === "/docs/tailwind") return getTailwind();
  if (clean === "/docs/shadcn") return getShadcn();
  if (clean === "/docs/theme") return themeMarkdown();
  if (clean === "/skill") return skillMarkdown();
  if (clean === "/cursor-rule") return cursorRuleMarkdown();
  if (clean === "/rules" || clean === "/docs/rules") return rulesMarkdown();
  const doc = /^\/docs\/([a-z0-9-]+)$/.exec(clean);
  if (doc) return component(doc[1]);
  if (clean === "/articles") {
    const all = await listArticles();
    return ["# Articles", "How to design the parts specific to AI products. Each article comes with a live component that implements it.", ...all.map((a) => `- [${a.title}](${abs(`/articles/${a.slug}`)}): ${a.description}`)].join("\n\n") + "\n";
  }
  const post = /^\/articles\/([a-z0-9-]+)$/.exec(clean);
  if (post) {
    const article = await getArticle(post[1]);
    return article ? articleMarkdown(article, abs(clean)) : null;
  }
  const info = Object.values(INFO_PAGES).find((p) => p.path === clean);
  if (info) return infoMarkdown(info);
  return null;
}

export const notFoundMarkdown = (path: string) => `# Page not found

There is no page at \`${path}\` on UI Polish. It may have moved, or the address may have a typo.

- Every page, as a list: ${abs("/sitemap.xml")}
- What UI Polish is and how to use it: ${abs("/llms.txt")}
- Docs: ${abs("/docs")}
- REST API: ${abs("/openapi.json")}
`;
