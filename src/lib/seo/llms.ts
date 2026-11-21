import { SCREENS } from "@pro/index";
import { AI_COMPONENTS, sortComponents } from "@/components/component-index";
import { getFaq } from "@/lib/faq";
import { getComponentGuide, getRule, listComponents, listRuleTopics } from "@/lib/content";
import { SERVER_INSTRUCTIONS, TOOLS } from "@/lib/mcp/tools";
import { CLIENTS, MCP_URL } from "@/lib/setup";
import { CONTENT_UPDATED, DEFINITION, SITE_DESCRIPTION, abs } from "./site";

// /llms.txt (index) and /llms-full.txt (everything, one request), built from
// the registry, the rules folder, the MCP tool list and the setup commands,
// so neither can go stale. The full file adds each component's public guide;
// rule bodies stay behind get_rules.

/** "Title: first sentence" of a rule file, with "Goal:" dropped. */
async function ruleSummary(topic: string) {
  const md = (await getRule(topic)) ?? "";
  const title = /^#\s+(.*)/m.exec(md)?.[1] ?? topic;
  const para = md.split(/\n\s*\n/).find((p) => p.trim() && !p.startsWith("#")) ?? "";
  const first = para.replace(/\s+/g, " ").replace(/^Goal:\s*/, "").split(/(?<=\.)\s/)[0];
  return `${title}. ${first.charAt(0).toUpperCase()}${first.slice(1)}`;
}

export async function llmsText(full: boolean): Promise<string> {
  const components = sortComponents(await listComponents());
  const topics = await listRuleTopics();
  const out: string[] = [];
  const w = (...lines: string[]) => out.push(...lines, "");

  w(full ? "# UI Polish: full reference" : "# UI Polish");
  w(`> ${SITE_DESCRIPTION}`);
  w(`Last updated: ${CONTENT_UPDATED}`);
  w(
    `${DEFINITION} Its remote MCP server gives a coding agent two things: finished React components (CSS modules) with every state, transition and edge case built in, and design rules it follows for the UI it writes itself. All of it, components and rules, is free (MIT), with no account or key. It is not an npm package: the agent writes the component files into the project. The interactive components use Base UI (@base-ui/react) for focus, keyboard and positioning, installed alongside them.`,
  );

  w("## When to use UI Polish");
  w(
    "Reach for it when you're writing React UI and a user would notice the details: a form field's error and hint states, a dialog's focus and scroll lock, a menu's keyboard model, a toast stack, a streaming chat or code view. Use it in these cases:",
    "- The user asks for a component it has (see Components below): add it with `get_component` instead of writing one from scratch.",
    "- You're about to write UI it has no component for: call `get_rules` for the topic first (motion, states, spacing, typography, surfaces, foundations) and follow its values.",
    "- You're reviewing UI before calling it done: run the checklist (`get_rules` with topic `checklist`).",
    "Don't use it for non-React stacks (only React with CSS modules is supported), for a full theme or brand (it brings none; map its `--ui-*` tokens onto the project's variables), or for charts, maps and rich-text editors.",
  );
  w("## How to call it");
  w(
    `Prefer MCP: connect ${MCP_URL} (setup per client below) and call \`list_components\`, \`get_component\` and \`get_rules\`. Without MCP, the same content is a read-only REST API described by ${abs("/openapi.json")}: \`GET /api/components\`, \`GET /api/components/{name}\`, \`GET /api/rules/{topic}\`. Errors are JSON with a code, a message and a hint. Any page on this site is also available as Markdown: send \`Accept: text/markdown\` or add \`.md\` to the path.`,
  );

  w("## Links");
  w(
    full
      ? `- [Short index](${abs("/llms.txt")})`
      : `- [Full reference](${abs("/llms-full.txt")}): everything below plus every component guide, in one file`,
    `- Design rules: the rules as one file: a Claude Code skill (${abs("/skill.md")}) or for AGENTS.md (${abs("/rules.md")})`,
    `- shadcn/ui: install with \`npx shadcn add\` (registry at ${abs("/r/registry.json")})`,
    `- [OpenAPI spec](${abs("/openapi.json")}): the REST API, for agents without MCP`,
    ...(SCREENS.copper ? [`- [UI Polish Pro screens](${abs("/screens")}): whole app screens built from these components (in the works; the first is live to try)`, `- [Example app](${abs("/example")}): Copper, an AI assistant for a caterer, built only from these components`] : []),
    `- [Contact](${abs("/contact")})`,
  );

  w("## Questions");
  for (const q of await getFaq()) w(`### ${q.question}`, q.answer);

  w("## Connect over MCP");
  w(
    `Server URL: ${MCP_URL} (Streamable HTTP, JSON-RPC 2.0). No account, sign-in or key.`,
  );
  for (const c of Object.values(CLIENTS)) {
    w(`### ${c.label}`, c.steps, "```", c.command(), "```", c.after);
  }

  w("## MCP tools");
  for (const t of TOOLS) {
    const props = (t.inputSchema.properties ?? {}) as Record<string, { description?: string }>;
    const details = full ? Object.entries(props).map(([k, v]) => `  - \`${k}\`: ${v.description ?? ""}`) : [];
    out.push(`- \`${t.name}(${Object.keys(props).join(", ")})\`: ${t.description}`, ...details);
  }
  out.push("");
  if (full) w("### Server instructions", SERVER_INSTRUCTIONS);

  w("## Rules topics", "Fetch with `get_rules(topic)`. `tokens` returns the --ui-* token roles; `checklist` returns the finished? checklist; `tailwind` returns the setup for Tailwind CSS v4 projects.");
  w(...(await Promise.all(topics.map(async (t) => `- \`${t}\`: ${await ruleSummary(t)}`))));

  w("## Components", "Add one by asking the agent, which calls `get_component(name)`.");
  for (const c of components) {
    const tag = c.kit === "agent" ? "agent kit" : AI_COMPONENTS.includes(c.name) ? "AI" : "";
    if (!full) {
      out.push(`- [${c.title}](${abs(`/docs/${c.name}`)}) (\`${c.name}\`${tag ? `, ${tag}` : ""}): ${c.summary}`);
      continue;
    }
    const guide = (await getComponentGuide(c.name).catch(() => ""))
      .replace(/^#\s.*\n/, "")
      .replace(/^(#{2,3})\s/gm, "##$1 ");
    w(`### ${c.title}`, [`\`${c.name}\``, tag, `v${c.version}`, abs(`/docs/${c.name}`)].filter(Boolean).join(" · "), "", c.summary, "", guide.trim());
  }
  return out.join("\n").trimEnd() + "\n";
}

export async function llmsResponse(full: boolean) {
  return new Response(await llmsText(full), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
