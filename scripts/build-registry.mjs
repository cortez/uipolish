// Builds the shadcn registry in r/ from registry/ and foundation/:
// r/registry.json lists every item, r/<name>.json is one item with its files
// (and the files of every component it depends on) inlined. Components land
// at components/ui/<name>/..., so the relative imports between them hold, and
// their CSS modules come inside Tailwind's components layer because shadcn
// projects run Tailwind v4.
//
//   node scripts/build-registry.mjs          write r/
//   node scripts/build-registry.mjs --check  exit 1 if r/ is out of date
//
// Each component lists the tokens item as a registry dependency by URL, so it
// installs in one command and the tokens only once. Set REGISTRY_URL to where
// r/ is served from (no trailing slash), e.g. this repository's raw files:
//
//   REGISTRY_URL=https://raw.githubusercontent.com/<owner>/<repo>/main/r node scripts/build-registry.mjs

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const REGISTRY = path.join(ROOT, "registry");
const FOUNDATION = path.join(ROOT, "foundation");
const OUT = path.join(ROOT, "r");
const SITE = "https://uipolish.com";
const BASE = (process.env.REGISTRY_URL || `${SITE}/r`).replace(/\/+$/, "");

const ITEM_SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";
const DIR = "components/ui";
const STYLES = "components/ui/uipolish";

const read = (...p) => readFileSync(path.join(...p), "utf8");
const meta = (name) => JSON.parse(read(REGISTRY, name, "meta.json"));

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
};

function styleItem(name) {
  const item = STYLE_ITEMS[name];
  return {
    $schema: ITEM_SCHEMA,
    name,
    type: "registry:item",
    title: item.title,
    description: item.description,
    files: item.files.map((f) => ({ path: `${STYLES}/${f}`, type: "registry:file", target: `${STYLES}/${f}`, content: read(FOUNDATION, f) })),
    // shadcn adds these to the project's global stylesheet, which sits in
    // app/ or styles/, next to components/, with or without src/.
    css: Object.fromEntries(item.files.map((f) => [`@import "../${STYLES}/${f}"`, {}])),
    docs: `Added to your global stylesheet: ${item.files.map((f) => `../${STYLES}/${f}`).join(", ")}. If it lives somewhere else, fix those paths.`,
  };
}

/** Depth-first, so dependencies come before the files that import them. */
function collect(name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const m = meta(name);
  return [...m.dependencies.flatMap((d) => collect(d, seen)), m];
}

function componentFiles(name) {
  return readdirSync(path.join(REGISTRY, name))
    .filter((f) => /\.(tsx?|css)$/.test(f))
    .sort()
    .map((f) => {
      const content = read(REGISTRY, name, f);
      return { path: `${name}/${f}`, content: f.endsWith(".module.css") ? inTailwindLayer(content) : content };
    });
}

function componentItem(m) {
  const parts = collect(m.name);
  return {
    $schema: ITEM_SCHEMA,
    name: m.name,
    type: m.type ? "registry:block" : "registry:ui",
    title: m.title,
    description: m.summary,
    registryDependencies: [`${BASE}/tokens.json`],
    dependencies: [...new Set(parts.flatMap((p) => p.packages ?? []))].sort(),
    files: parts
      .flatMap((p) => componentFiles(p.name))
      .map((f) => ({ path: `${DIR}/${f.path}`, type: "registry:file", target: `${DIR}/${f.path}`, content: f.content })),
    docs: `${m.title}: ${SITE}/docs/${m.name} has every state, the motion and the accessibility notes.`,
  };
}

const components = readdirSync(REGISTRY)
  .filter((d) => existsSync(path.join(REGISTRY, d, "meta.json")))
  .map(meta)
  .filter((m) => !m.primitive)
  .sort((a, b) => a.name.localeCompare(b.name));

const want = new Map();
want.set("registry.json", {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "uipolish",
  homepage: SITE,
  items: [
    ...Object.entries(STYLE_ITEMS).map(([name, s]) => ({ name, type: "registry:item", title: s.title, description: s.description })),
    ...components.map((c) => ({ name: c.name, type: c.type ? "registry:block" : "registry:ui", title: c.title, description: c.summary })),
  ],
});
for (const name of Object.keys(STYLE_ITEMS)) want.set(`${name}.json`, styleItem(name));
for (const c of components) want.set(`${c.name}.json`, componentItem(c));

const serialize = (v) => JSON.stringify(v, null, 2) + "\n";

if (process.argv.includes("--check")) {
  const have = existsSync(OUT) ? readdirSync(OUT) : [];
  const stale = [...new Set([...want.keys(), ...have])].filter(
    (f) => !want.has(f) || !have.includes(f) || read(OUT, f) !== serialize(want.get(f)),
  );
  if (stale.length) {
    console.error(`r/ is out of date (${stale.join(", ")}). Run: npm run registry`);
    process.exit(1);
  }
} else {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const [f, v] of want) writeFileSync(path.join(OUT, f), serialize(v));
  console.log(`wrote ${want.size} files to r/ (tokens from ${BASE})`);
}

/**
 * A CSS module, ready for a Tailwind CSS v4 project: its styles inside
 * Tailwind's components layer, so a utility class passed in className
 * (utilities layer) overrides them, while the preflight reset (base layer)
 * stays below them. @property rules and `composes` (CSS modules only allow it
 * in a top-level rule) stay at the top.
 */
function inTailwindLayer(css) {
  const top = [];
  const layered = [];
  for (const statement of statements(css)) {
    // Read with comments blanked out, at the same offsets, so a rule quoted
    // in a comment is never taken for a real one.
    const code = statement.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
    if (/^\s*@property\b/.test(code)) {
      top.push(statement);
      continue;
    }
    const open = code.indexOf("{");
    const head = code.slice(0, open).trim();
    const composes = open > 0 && !head.startsWith("@") ? [...code.matchAll(/^[ \t]*composes:[^;]*;[ \t]*\n?/gm)] : [];
    if (composes.length === 0) {
      layered.push(statement);
      continue;
    }
    const lead = statement.slice(0, code.search(/\S/)).trim();
    top.push([lead, `${head} {\n${composes.map((m) => `  ${m[0].trim()}`).join("\n")}\n}`].filter(Boolean).join("\n"));
    let body = statement.slice(open + 1, statement.lastIndexOf("}"));
    for (const m of composes.reverse()) {
      const at = m.index - open - 1;
      body = body.slice(0, at) + body.slice(at + m[0].length);
    }
    const left = code.slice(open + 1, code.lastIndexOf("}")).replace(/^[ \t]*composes:[^;]*;/gm, "");
    if (left.trim()) layered.push(`${head} {${body}}`);
  }
  const body = layered.join("\n\n").replace(/^(?=.)/gm, "  ");
  return ["@layer theme, base, components, utilities;", ...top, `@layer components {\n${body}\n}`].join("\n\n") + "\n";
}

/** Top-level statements, each with the comments just before it. Skips over
 *  comments and strings, so a brace in either doesn't count. */
function statements(css) {
  const out = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 1;
    } else if (c === '"' || c === "'") {
      for (i++; i < css.length && css[i] !== c; i++) if (css[i] === "\\") i++;
    } else if (c === "{") {
      depth++;
    } else if (c === "}" || (c === ";" && depth === 0)) {
      if (c === "}") depth--;
      if (depth === 0) {
        const statement = css.slice(start, i + 1).trim();
        if (statement) out.push(statement);
        start = i + 1;
      }
    }
  }
  const tail = css.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}
