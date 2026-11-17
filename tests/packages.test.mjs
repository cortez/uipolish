import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Every bare import in a component's code is declared in its meta.json
// `packages`, so MCP, the REST API and the shadcn CLI tell the project to
// install it. React is the one package every project already has; a
// template is a Next.js app, so Next is a given there too. Node's built-ins
// and the project's own @/ imports aren't packages.

const REGISTRY = path.join(process.cwd(), "registry");
const ALWAYS = new Set(["react", "react-dom"]);
const pkgName = (spec) => (spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);

for (const name of readdirSync(REGISTRY)) {
  const dir = path.join(REGISTRY, name);
  const meta = JSON.parse(readFileSync(path.join(dir, "meta.json"), "utf8"));
  const declared = new Set((meta.packages ?? []).map((p) => p.replace(/@[^@/]*$/, "")));
  const imported = new Set();
  const given = meta.type === "template" ? new Set([...ALWAYS, "next"]) : ALWAYS;
  const files = meta.type === "template" ? meta.files : readdirSync(dir);
  for (const file of files.filter((f) => /\.tsx?$/.test(f))) {
    const code = readFileSync(path.join(dir, file), "utf8");
    for (const [, spec] of code.matchAll(/from\s+["']([^"'.][^"']*)["']/g)) {
      if (spec.startsWith("node:") || spec.startsWith("@/")) continue;
      const pkg = pkgName(spec);
      if (!given.has(pkg)) imported.add(pkg);
    }
  }
  test(`${name} declares the packages it imports`, () => {
    assert.deepEqual([...imported].sort(), [...declared].sort());
    for (const p of meta.packages ?? []) assert.match(p, /^(@[a-z0-9-]+\/)?[a-z0-9-]+@\^?\d/, `${p} needs a version range`);
  });
}
