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
import { createTheme } from "@/lib/theme";

export const SERVER_INSTRUCTIONS = `UI Polish is a set of components and design rules where every state, transition and edge case is worked out.

Before writing UI, call get_rules for the topic you're touching (motion, states, typography, spacing, surfaces, foundations, antipatterns), or with no topic for the token file and the checklist.

To add a component, call list_components, then get_component. Write every file it returns, keeping the relative paths, and add foundation/tokens.css to the project once. Map the --ui-* token roles onto the project's existing variables instead of adding a second palette.

If the project uses Tailwind CSS v4 (its CSS has @import "tailwindcss"), pass tailwind: true to get_component, so the CSS modules come in Tailwind's components layer and utility classes override them, and set up the bridge once (get_rules topic "tailwind"). Keep the CSS modules; don't rewrite components into utility classes.

Before calling UI work done, go through the checklist (get_rules topic "checklist").`;

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export const TOOLS: Tool[] = [
  {
    name: "get_rules",
    description:
      "Foundation rules: concrete values for motion, states, typography, spacing, surfaces, focus and anti-patterns. Pass a topic for one file; omit it for the token roles, the finished? checklist and the list of topics.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "One of: antipatterns, foundations, motion, spacing, states, surfaces, typography, tokens, checklist, tailwind (setup for Tailwind CSS v4 projects).",
        },
      },
    },
  },
  {
    name: "list_components",
    description: "Every UI Polish component with a one-line summary and version. Those marked agent kit are for AI products.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_component",
    description:
      "The code and guide for one component: when and when not to use it, every state, motion specs, accessibility notes, before/after. Includes the components it depends on and the npm packages to install.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Component name from list_components, e.g. button." },
        stack: { type: "string", enum: ["react"], description: "Target stack. Only react (CSS modules) for now." },
        tailwind: {
          type: "boolean",
          description: "True for a Tailwind CSS v4 project: each CSS module comes inside Tailwind's components layer, so utility classes passed in className override it. Leave out otherwise.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_theme",
    description:
      "A color theme from one hue: the --ui-* accent, the text on it and in it, optionally tinted grays and accent primary buttons, light and dark, with every text color solved for 4.5:1 contrast. Returns CSS to paste after tokens.css. Use it when the project has a brand color.",
    inputSchema: {
      type: "object",
      properties: {
        hue: { type: "number", description: "OKLCH hue, 0–360: about 25 red, 50 orange, 80 amber, 150 green, 190 teal, 262 blue, 295 violet, 350 pink." },
        tint: { type: "number", enum: [0, 1, 2], description: "How much of the hue the grays take: 0 none, 1 a hint (default), 2 tinted." },
        brand: { type: "boolean", description: "Primary buttons in the accent instead of near-black. Default true." },
      },
      required: ["hue"],
    },
  },
];

function getTheme(hue: unknown, tint: unknown, brand: unknown) {
  if (typeof hue !== "number" || !Number.isFinite(hue)) return text("Pass hue as a number from 0 to 360, e.g. 262 for blue.", true);
  const t = tint === 0 || tint === 2 ? tint : 1;
  const theme = createTheme({ hue, tint: t, brand: brand !== false });
  const checks = theme.checks.map((c) => `- ${c.role}: ${c.ratio}:1 (needs ${c.needed})`).join("\n");
  return text(`Paste this after tokens.css, in the global stylesheet.\n\n\`\`\`css\n${theme.css}\`\`\`\n\nContrast:\n${checks}`);
}

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const text = (t: string, isError = false): ToolResult => ({ content: [{ type: "text", text: t }], ...(isError ? { isError } : {}) });

/** `events` collects anonymous usage counts. */
export type CallContext = { events?: string[] };

async function getRules(topic: unknown) {
  if (topic === "tokens") return text(await getTokens());
  if (topic === "checklist") return text(await getChecklist());
  if (topic === "tailwind") return text(await getTailwind());
  const topics = await listRuleTopics();
  if (typeof topic === "string" && topic) {
    const rule = await getRule(topic);
    if (rule) return text(rule);
    return text(`No rules topic "${topic}". Topics: ${[...topics, "tokens", "checklist", "tailwind"].join(", ")}.`, true);
  }
  return text(
    [
      `Topics: ${topics.join(", ")}. Call get_rules with one for its full rules.`,
      "## tokens.css",
      "```css\n" + (await getTokens()) + "```",
      await getChecklist(),
    ].join("\n\n"),
  );
}

/** What list_components calls it: the agent kit, or nothing for a plain component. */
function kindOf(c: ComponentMeta) {
  return c.kit ? " (agent kit)" : "";
}

async function listAll() {
  const components = (await listComponents()).filter((c) => !c.primitive);
  const line = (c: ComponentMeta) => `- ${c.name}${kindOf(c)}, v${c.version}: ${c.summary}`;
  return text(components.map(line).join("\n"));
}

// Depth-first so dependencies are written before the files that import them.
export async function collect(name: string, seen = new Set<string>()): Promise<ComponentMeta[]> {
  if (seen.has(name)) return [];
  seen.add(name);
  const meta = await getComponentMeta(name);
  if (!meta) return [];
  const deps = (await Promise.all(meta.dependencies.map((d) => collect(d, seen)))).flat();
  return [...deps, meta];
}

async function getComponent(name: unknown, stack: unknown, tailwind: unknown, ctx: CallContext) {
  if (typeof name !== "string" || !name) return text("Pass a component name, e.g. button.", true);
  if (stack !== undefined && stack !== "react") return text(`Stack "${stack}" isn't supported yet. Use react.`, true);

  const meta = await getComponentMeta(name);
  if (!meta) {
    const names = (await listComponents()).filter((c) => !c.primitive).map((c) => c.name);
    return text(`No component "${name}". Components: ${names.join(", ")}.`, true);
  }
  ctx.events?.push(`component.${meta.name}.served`, ...(tailwind === true ? ["component.tailwind"] : []));

  const parts = await collect(name);
  const install = installLine(packagesOf(parts));
  const sections = await Promise.all(
    parts.map(async (part) => {
      const files = await getComponentFiles(part.name, { tailwind: tailwind === true });
      return files
        .map((f) => {
          const lang = f.path.endsWith(".css") ? "css" : f.path.endsWith(".ts") ? "ts" : "tsx";
          return `### ${f.path}\n\n\`\`\`${lang}\n${f.content}\`\`\``;
        })
        .join("\n\n");
    }),
  );
  const where = `Write each file below at the path shown, under the project's components directory (for example components/ui/${parts[0].name}/...). The relative imports between them depend on those paths. The components read --ui-* tokens only; add foundation/tokens.css once (get_rules topic "tokens") or map those roles onto existing variables.`;

  return text(
    [
      `# ${meta.title} v${meta.version}`,
      ...(install ? [`Install its package${packagesOf(parts).length > 1 ? "s" : ""} first (pnpm, yarn and bun work too): \`${install}\`. The behavior (focus, keyboard, positioning, dismissal) comes from Base UI; the look, motion and states are in the files below.`] : []),
      where +
        (tailwind === true
          ? ` These CSS modules are in Tailwind's components layer, so utility classes in className override them. Set up the bridge once if the project doesn't have it (get_rules topic "tailwind").`
          : ""),
      await getComponentGuide(name),
      "## Files",
      ...sections,
    ].join("\n\n"),
  );
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  ctx: CallContext = {},
): Promise<ToolResult | null> {
  if (TOOLS.some((t) => t.name === name)) ctx.events?.push(`tool.${name}`);
  switch (name) {
    case "get_rules":
      return getRules(args.topic);
    case "list_components":
      return listAll();
    case "get_component":
      return getComponent(args.name, args.stack, args.tailwind, ctx);
    case "get_theme":
      return getTheme(args.hue, args.tint, args.brand);
    default:
      return null;
  }
}
