import { getComponentGuide, getComponentMeta, getShadcn, getTailwind } from "@/lib/content";
import { cursorRuleMarkdown, rulesMarkdown, skillMarkdown } from "@/lib/skill";
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
    "- `get_rules(topic?)`: the rules for one topic, or the tokens and checklist.\n- `list_components()`: every component with a summary and version.\n- `get_component(name, tailwind?)`: one component's code and guide, with its dependencies. `tailwind: true` puts the CSS in Tailwind's components layer.",
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

/** The Markdown for a site path, or null when there's no such page. */
export async function markdownFor(path: string): Promise<string | null> {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/") return llmsText(false);
  if (clean === "/docs") return docsIntro();
  if (clean === "/docs/tailwind") return getTailwind();
  if (clean === "/docs/shadcn") return getShadcn();
  if (clean === "/skill") return skillMarkdown();
  if (clean === "/cursor-rule") return cursorRuleMarkdown();
  if (clean === "/rules" || clean === "/docs/rules") return rulesMarkdown();
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
- Docs: ${abs("/docs")}
- REST API: ${abs("/openapi.json")}
`;
