import {
  getChecklist,
  getComponentFiles,
  getComponentGuide,
  getComponentMeta,
  getRule,
  getTailwind,
  getTokens,
  installLine,
  listComponents,
  listRuleTopics,
  packagesOf,
  type ComponentMeta,
} from "@/lib/content";
import { collect } from "@/lib/mcp/tools";
import { abs } from "@/lib/seo/site";

// What the REST API serves, from the same registry and rules the MCP tools
// read: the two surfaces can't disagree.

export const RULE_TOPICS_EXTRA = ["tokens", "checklist", "tailwind"] as const;

const summary = (c: ComponentMeta) => ({
  name: c.name,
  title: c.title,
  summary: c.summary,
  ...(c.kit ? { kit: c.kit } : {}),
  type: c.type ?? "component",
  version: c.version,
  docs_url: abs(`/docs/${c.name}`),
});

export async function componentList() {
  return (await listComponents()).filter((c) => !c.primitive).map(summary);
}

export type ComponentResult =
  | { status: "ok"; body: Record<string, unknown> }
  | { status: "not_found"; names: string[] };

export async function componentDetail(name: string, { tailwind = false } = {}): Promise<ComponentResult> {
  const meta = await getComponentMeta(name);
  if (!meta) return { status: "not_found", names: (await componentList()).map((c) => c.name) };
  const parts = await collect(name);
  const packages = packagesOf(parts);
  const files = (await Promise.all(parts.map(async (p) => (await getComponentFiles(p.name, { tailwind })).map((f) => ({ component: p.name, ...f }))))).flat();
  return {
    status: "ok",
    body: {
      ...summary(meta),
      dependencies: parts.slice(0, -1).map((p) => p.name),
      packages,
      guide: await getComponentGuide(name),
      files,
      install:
        (packages.length ? `Run ${installLine(packages)} first. ` : "") +
        (meta.type === "template"
          ? "Write each file with a target at that path from the project root (under src/ if the app lives there), and every other file at its path under components/ui/, dependencies first."
          : "Write each file at its path under the project's components directory, dependencies first.") +
        " Add foundation tokens once (GET /api/rules/tokens) or map the --ui-* roles onto existing variables." +
        (tailwind ? " The CSS modules are in Tailwind's components layer, so utility classes override them; set up the bridge once (GET /api/rules/tailwind)." : ""),
    },
  };
}

export async function ruleTopics() {
  return [...(await listRuleTopics()), ...RULE_TOPICS_EXTRA];
}

export async function rule(topic: string): Promise<{ format: "markdown" | "css"; content: string } | null> {
  if (topic === "tokens") return { format: "css", content: await getTokens() };
  if (topic === "checklist") return { format: "markdown", content: await getChecklist() };
  if (topic === "tailwind") return { format: "markdown", content: await getTailwind() };
  const content = await getRule(topic);
  return content ? { format: "markdown", content } : null;
}
