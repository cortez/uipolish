import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { inTailwindLayer } from "@/lib/tailwind-layer";

// foundation/ and registry/ are the product. The MCP server and the site both
// read them from disk, so a change to a rule or a component ships everywhere
// on the next deploy.

const ROOT = process.cwd();
const RULES_DIR = path.join(ROOT, "foundation", "rules");
const REGISTRY_DIR = path.join(ROOT, "registry");

export type ComponentMeta = {
  name: string;
  title: string;
  summary: string;
  /** What the home page's card says, when the summary's opening phrase is
   *  far from the others' length (about 40 to 65 characters). */
  blurb?: string;
  /** "agent": the components for AI products, grouped apart in the docs. */
  kit?: "agent";
  /** "block": a whole section composed from components. */
  type?: "block";
  /** "wide": a screen that fills its frame; its docs demo reaches past the
   *  text column. A block that caps its own width or is one card leaves it out. */
  stage?: "wide";
  version: string;
  dependencies: string[];
  /** npm packages its code imports, as name@range (e.g. @base-ui/react@^1.9.0). */
  packages?: string[];
  /** Building block other components use; not counted as a component. */
  primitive?: boolean;
};

export type ComponentFile = { path: string; content: string };

export async function listRuleTopics() {
  const files = await readdir(RULES_DIR);
  return files.filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")).sort();
}

export async function getRule(topic: string) {
  const topics = await listRuleTopics();
  if (!topics.includes(topic)) return null;
  return readFile(path.join(RULES_DIR, `${topic}.md`), "utf8");
}

export function getTokens() {
  return readFile(path.join(ROOT, "foundation", "tokens.css"), "utf8");
}

export type Opinion = { title: string; body: string };

/** foundation/opinions.md: the calls UI Polish makes, as title and body. */
export async function getOpinions(): Promise<Opinion[]> {
  const md = await readFile(path.join(ROOT, "foundation", "opinions.md"), "utf8");
  return md
    .split("\n")
    .map((l) => /^- \*\*(.+?)\*\* (.+)$/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ title: m[1], body: m[2] }));
}

export function getChecklist() {
  return readFile(path.join(ROOT, "foundation", "checklist.md"), "utf8");
}

/** Using UI Polish with Tailwind CSS v4: the guide, then the bridge file
 *  that names the roles as Tailwind theme values. */
export async function getTailwind() {
  const [guide, css] = await Promise.all([
    readFile(path.join(ROOT, "foundation", "tailwind.md"), "utf8"),
    readFile(path.join(ROOT, "foundation", "tailwind.css"), "utf8"),
  ]);
  return `${guide}\n## tailwind.css\n\n\`\`\`css\n${css}\`\`\`\n`;
}

/** Installing with the shadcn CLI. */
export function getShadcn() {
  return readFile(path.join(ROOT, "foundation", "shadcn.md"), "utf8");
}

/** Every npm package a set of components imports, deduplicated. */
export function packagesOf(parts: ComponentMeta[]) {
  return [...new Set(parts.flatMap((p) => p.packages ?? []))].sort();
}

/** One install line for those packages, or null when there are none. */
export function installLine(packages: string[]) {
  return packages.length ? `npm install ${packages.join(" ")}` : null;
}

export async function listComponents(): Promise<ComponentMeta[]> {
  const dirs = await readdir(REGISTRY_DIR, { withFileTypes: true });
  const metas = await Promise.all(
    dirs.filter((d) => d.isDirectory()).map((d) => getComponentMeta(d.name)),
  );
  return metas.filter((m): m is ComponentMeta => m !== null);
}

export async function getComponentMeta(name: string): Promise<ComponentMeta | null> {
  if (!/^[a-z0-9-]+$/.test(name)) return null;
  try {
    return JSON.parse(await readFile(path.join(REGISTRY_DIR, name, "meta.json"), "utf8"));
  } catch {
    return null;
  }
}

/** A component's files. With `tailwind`, its CSS modules come inside
 *  Tailwind's components layer, so utility classes override them. */
export async function getComponentFiles(name: string, { tailwind = false } = {}): Promise<ComponentFile[]> {
  if (!/^[a-z0-9-]+$/.test(name)) return [];
  const dir = path.join(REGISTRY_DIR, name);
  const css = (f: string, content: string) => (tailwind && f.endsWith(".module.css") ? inTailwindLayer(content) : content);
  const files = (await readdir(dir)).filter((f) => /\.(tsx?|css)$/.test(f)).sort();
  return Promise.all(
    files.map(async (f) => ({ path: `${name}/${f}`, content: css(f, await readFile(path.join(dir, f), "utf8")) })),
  );
}

export function getComponentGuide(name: string) {
  return readFile(path.join(REGISTRY_DIR, name, "guide.md"), "utf8");
}
