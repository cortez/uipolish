import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

// Templates: whole apps whose folder mirrors a Next.js project. Their
// meta.json lists every file by its project path, imports go through
// @/components/ui/<name> (the components it depends on) or @/ (its own
// tree), and in this repo @/ falls back to each template's folder after
// src/, in turn, so a path a template imports must never also exist in src/
// or in another template.

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, "registry");
const metaOf = (name) => JSON.parse(readFileSync(path.join(REGISTRY, name, "meta.json"), "utf8"));
const templates = readdirSync(REGISTRY).filter((name) => metaOf(name).type === "template");

function walk(dir, base = dir) {
  return readdirSync(dir).flatMap((f) => {
    const full = path.join(dir, f);
    return statSync(full).isDirectory() ? walk(full, base) : [path.relative(base, full)];
  });
}

/** Every component a part brings in, itself included. */
function closure(name, seen = new Set()) {
  if (seen.has(name)) return seen;
  seen.add(name);
  for (const d of metaOf(name).dependencies) closure(d, seen);
  return seen;
}

test("there is a template", () => {
  assert.ok(templates.includes("ai-chat-app"));
});

test("every template's folder is on tsconfig's @/ path, so its imports type-check here", () => {
  const tsconfig = readFileSync(path.join(ROOT, "tsconfig.json"), "utf8");
  for (const t of templates) assert.ok(tsconfig.includes(`"./registry/${t}/*"`), `${t} is missing from "@/*" in tsconfig.json`);
});

for (const name of templates) {
  const meta = metaOf(name);
  const dir = path.join(REGISTRY, name);
  const sources = meta.files.filter((f) => /\.tsx?$/.test(f)).map((f) => [f, readFileSync(path.join(dir, f), "utf8")]);
  const imports = sources.flatMap(([file, code]) => [...code.matchAll(/from\s+["'](@\/[^"']+)["']/g)].map((m) => [file, m[1]]));

  test(`${name} lists exactly the files in its folder`, () => {
    const onDisk = walk(dir).filter((f) => f !== "meta.json" && f !== "guide.md").sort();
    assert.deepEqual([...meta.files].sort(), onDisk);
  });

  test(`${name} imports only the components it depends on`, () => {
    const brought = closure(name);
    for (const [file, spec] of imports) {
      const m = /^@\/components\/ui\/([a-z0-9-]+)\//.exec(spec);
      if (m) assert.ok(brought.has(m[1]), `${file} imports ${m[1]}, which isn't in its dependencies`);
    }
  });

  test(`${name}'s own imports resolve in its tree, and nowhere in src/ or another template`, () => {
    const resolves = (base, spec) =>
      ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].some((ext) => existsSync(path.join(base, spec.slice(2) + ext)));
    for (const [file, spec] of imports) {
      if (spec.startsWith("@/components/ui/")) continue;
      assert.ok(resolves(dir, spec), `${file}: ${spec} isn't in the template`);
      assert.ok(!resolves(path.join(ROOT, "src"), spec), `${file}: ${spec} also exists in src/, which would win here`);
      for (const other of templates.filter((t) => t !== name)) {
        assert.ok(!resolves(path.join(REGISTRY, other), spec), `${file}: ${spec} also exists in ${other}, which tsconfig may resolve first`);
      }
    }
  });
}
