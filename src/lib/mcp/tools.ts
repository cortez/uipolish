import {
  getChecklist,
  getComponentFiles,
  getComponentGuide,
  getComponentMeta,
  getRule,
  getShadcn,
  getTailwind,
  getTokens,
  installLine,
  listComponents,
  listRuleTopics,
  packagesOf,
  type ComponentMeta,
} from "@/lib/content";
import { checkLicense } from "@/lib/license";
import { SCREEN_FILES } from "@pro/files";
import { SCREEN_INFO } from "@pro/index";

const PRO_URL = "https://uipolish.com/pro";

export const SERVER_INSTRUCTIONS = `UI Polish is a set of components and design rules where every state, transition and edge case is worked out.

Before writing UI, call get_rules for the topic you're touching (motion, states, typography, spacing, surfaces, foundations, antipatterns), or with no topic for the token file and the checklist.

To add a component, call list_components, then get_component. Write every file it returns, keeping the relative paths, and add foundation/tokens.css to the project once. Map the --ui-* token roles onto the project's existing variables instead of adding a second palette.

If the project uses Tailwind CSS v4 (its CSS has @import "tailwindcss"), pass tailwind: true to get_component, so the CSS modules come in Tailwind's components layer and utility classes override them, and set up the bridge once (get_rules topic "tailwind"). Keep the CSS modules; don't rewrite components into utility classes.

Before calling UI work done, go through the checklist (get_rules topic "checklist").

UI Polish Pro screens are whole app screens built from these components. list_screens shows them; get_screen returns one screen's files and needs a Pro license key in this server's config (header Authorization: Bearer <key>).`;

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
          description: "One of: antipatterns, foundations, motion, spacing, states, surfaces, typography, tokens, checklist, tailwind (setup for Tailwind CSS v4 projects), shadcn (using the components on a shadcn/ui theme).",
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
    name: "list_screens",
    description:
      "UI Polish Pro: whole app screens built only from UI Polish components, with what each is and the components it uses. Fetching one with get_screen needs a Pro license key.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_screen",
    description:
      "UI Polish Pro: every source file and the guide for one screen from list_screens. Needs a UI Polish Pro license key, sent as the header Authorization: Bearer <key> in this server's config.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Screen name from list_screens, e.g. inbox." },
      },
      required: ["name"],
    },
  },
];

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const text = (t: string, isError = false): ToolResult => ({ content: [{ type: "text", text: t }], ...(isError ? { isError } : {}) });

/** `events` collects anonymous usage counts. `licenseKey` is the request's
 *  Pro license key, if any; it's checked only when a Pro tool is called. */
export type CallContext = { events?: string[]; licenseKey?: string };

async function getRules(topic: unknown) {
  if (topic === "tokens") return text(await getTokens());
  if (topic === "checklist") return text(await getChecklist());
  if (topic === "tailwind") return text(await getTailwind());
  if (topic === "shadcn") return text(await getShadcn());
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

const NEEDS_KEY = `get_screen needs a UI Polish Pro license key. Buy Pro at ${PRO_URL} and your key comes by email. Then add it to this MCP server's config as the header Authorization: Bearer <your key>, and reconnect.`;

function listScreens() {
  if (!SCREEN_INFO.length) return text(`No Pro screens are available right now. See ${PRO_URL}.`);
  const line = (s: (typeof SCREEN_INFO)[number]) =>
    `- ${s.name}: ${s.title}${s.summary ? `. ${s.summary}` : ""}${s.components.length ? ` Uses: ${s.components.join(", ")}.` : ""}`;
  return text(
    [
      `${SCREEN_INFO.length} UI Polish Pro ${SCREEN_INFO.length === 1 ? "screen" : "screens"}. Try each live at ${PRO_URL}.`,
      SCREEN_INFO.map(line).join("\n"),
      `get_screen returns a screen's files and needs a UI Polish Pro license key (${PRO_URL}).`,
    ].join("\n\n"),
  );
}

async function getScreen(name: unknown, ctx: CallContext) {
  if (!ctx.licenseKey) return text(NEEDS_KEY, true);
  const check = await checkLicense(ctx.licenseKey);
  if (check === "unavailable") return text("Couldn't check your license key right now. Try again in a minute.", true);
  if (check === "invalid")
    return text(`That license key isn't valid. Check it against the one in your purchase email, or buy UI Polish Pro at ${PRO_URL}.`, true);

  if (!SCREEN_INFO.length) return text(`No Pro screens are available right now. See ${PRO_URL}.`, true);
  const names = SCREEN_INFO.map((s) => s.name);
  if (typeof name !== "string" || !name) return text(`Pass a screen name. Screens: ${names.join(", ")}.`, true);
  const info = SCREEN_INFO.find((s) => s.name === name);
  const files = SCREEN_FILES[name];
  if (!info || !files?.length) return text(`No screen "${name}". Screens: ${names.join(", ")}.`, true);
  ctx.events?.push(`screen.${info.name}.served`);

  const guide = files.find((f) => /^(guide|readme)\.md$/i.test(f.path));
  const lang = (path: string) => path.split(".").pop() ?? "";
  return text(
    [
      `# ${info.title}`,
      info.summary,
      ...(info.components.length
        ? [`It's built from these UI Polish components: ${info.components.join(", ")}. Add any the project doesn't have yet with get_component first.`]
        : []),
      `Write each file below at the path shown, under a folder for this screen (for example components/screens/${info.name}/...), then swap the sample data for the project's own.`,
      ...(guide ? [guide.content] : []),
      "## Files",
      ...files
        .filter((f) => f !== guide)
        .map((f) => `### ${f.path}\n\n\`\`\`${lang(f.path)}\n${f.content}${f.content.endsWith("\n") ? "" : "\n"}\`\`\``),
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
    case "list_screens":
      return listScreens();
    case "get_screen":
      return getScreen(args.name, ctx);
    default:
      return null;
  }
}
