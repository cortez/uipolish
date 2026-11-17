import { readFile } from "node:fs/promises";
import path from "node:path";
import { getComponentFiles, getComponentMeta, listComponents, packagesOf, type ComponentMeta } from "@/lib/content";
import { collect } from "@/lib/mcp/tools";
import { abs } from "@/lib/seo/site";

// The registry the shadcn CLI reads: /r/registry.json lists every item, and
// /r/<name>.json is one item with its files inlined. Components land where
// get_component puts them (components/ui/<name>/...), so the relative
// imports between them hold, and they come in Tailwind's components layer
// because shadcn projects run Tailwind v4. A template is a registry:block
// whose own files carry project targets (app/(app)/chat/page.tsx), with the
// components and blocks it uses inlined at components/ui/<name>/ as usual.

const ITEM_SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";
const DIR = "components/ui";
const STYLES = "components/ui/uipolish";

const foundation = (file: string) => readFile(path.join(process.cwd(), "foundation", file), "utf8");

/** The CSS everything reads, installed once. `theme` maps the roles onto a shadcn theme. */
const STYLE_ITEMS = {
  tokens: {
    title: "UI Polish tokens",
    description: "The --ui-* roles every UI Polish component reads, with UI Polish's own light and dark values, plus the Tailwind bridge (bg-ui-surface, text-ui-muted).",
    files: ["tokens.css", "tailwind.css"],
  },
  theme: {
    title: "UI Polish on your shadcn/ui theme",
    description: "The tokens, the Tailwind bridge and a mapping that points the color and radius roles at your shadcn/ui variables, so the components follow your theme in light and dark.",
    files: ["tokens.css", "tailwind.css", "shadcn.css"],
  },
} as const;

type StyleName = keyof typeof STYLE_ITEMS;
const isStyle = (name: string): name is StyleName => Object.hasOwn(STYLE_ITEMS, name);

// shadcn adds these to the project's global stylesheet. It sits in app/ or
// styles/, next to components/, in both layouts (with or without src/).
const cssImports = (files: readonly string[]) =>
  Object.fromEntries(files.map((f) => [`@import "../${STYLES}/${f}"`, {}]));

async function styleItem(name: StyleName) {
  const item = STYLE_ITEMS[name];
  return {
    $schema: ITEM_SCHEMA,
    name,
    type: "registry:item",
    title: item.title,
    description: item.description,
    files: await Promise.all(
      item.files.map(async (f) => ({ path: `${STYLES}/${f}`, type: "registry:file", target: `${STYLES}/${f}`, content: await foundation(f) })),
    ),
    css: cssImports(item.files),
    docs: `Added to your global stylesheet: ${item.files.map((f) => `../${STYLES}/${f}`).join(", ")}. If it lives somewhere else, fix those paths.`,
  };
}

/** shadcn has no template type: a template installs as a block. */
const itemType = (meta: ComponentMeta) => (meta.type ? "registry:block" : "registry:ui");

/** A template's route files are pages to shadcn; the rest of its files are plain files with a target. */
const fileType = (target: string) => (/^(src\/)?app\/.*\/?(page|layout)\.tsx$/.test(target) ? "registry:page" : "registry:file");

async function componentItem(meta: ComponentMeta, origin: string) {
  const parts = await collect(meta.name);
  const files = (await Promise.all(parts.map((p) => getComponentFiles(p.name, { tailwind: true })))).flat();
  return {
    $schema: ITEM_SCHEMA,
    name: meta.name,
    type: itemType(meta),
    title: meta.title,
    description: meta.summary,
    // The tokens come from this same registry by URL (the request's own
    // origin, so previews and local runs point at themselves), so a component
    // installs in one command and the tokens only once.
    registryDependencies: [`${origin}/r/tokens.json`],
    dependencies: packagesOf(parts),
    files: files.map((f) =>
      f.target
        ? { path: f.target, type: fileType(f.target), target: f.target, content: f.content }
        : { path: `${DIR}/${f.path}`, type: "registry:file", target: `${DIR}/${f.path}`, content: f.content },
    ),
    docs:
      meta.type === "template"
        ? `${meta.title}: ${abs(`/docs/${meta.name}`)} explains the files, how to run it and where to swap in your own model, auth and database.`
        : `${meta.title}: ${abs(`/docs/${meta.name}`)} has every state, the motion and the accessibility notes.`,
  };
}

export type RegistryItem =
  | { status: "ok"; item: Record<string, unknown>; meta?: ComponentMeta }
  | { status: "not_found" };

/** One item, or not_found. */
export async function registryItem(name: string, origin: string): Promise<RegistryItem> {
  if (isStyle(name)) return { status: "ok", item: await styleItem(name) };
  const meta = await getComponentMeta(name);
  if (!meta || meta.primitive) return { status: "not_found" };
  return { status: "ok", item: await componentItem(meta, origin), meta };
}

export async function registryIndex() {
  const components = (await listComponents()).filter((c) => !c.primitive).sort((a, b) => a.name.localeCompare(b.name));
  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "uipolish",
    homepage: abs("/"),
    items: [
      ...Object.entries(STYLE_ITEMS).map(([name, s]) => ({ name, type: "registry:item", title: s.title, description: s.description })),
      ...components.map((c) => ({
        name: c.name,
        type: itemType(c),
        title: c.title,
        description: c.summary,
      })),
    ],
  };
}
