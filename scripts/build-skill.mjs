// Builds skills/ui-polish/ from foundation/: SKILL.md from the template with
// the opinions filled in, and references/ as copies of the rules, tokens and
// checklist. Never edit skills/ by hand; run this instead.
//
//   node scripts/build-skill.mjs          write it
//   node scripts/build-skill.mjs --check  exit 1 if it's out of date

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const FOUNDATION = path.join(ROOT, "foundation");
const OUT = path.join(ROOT, "skills", "ui-polish");

const read = (...p) => readFileSync(path.join(...p), "utf8");

/** The opinions list without its heading and intro. */
export function opinions() {
  return read(FOUNDATION, "opinions.md")
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .join("\n");
}

export function expected() {
  const files = new Map();
  files.set("SKILL.md", read(FOUNDATION, "skill.md").replace("{{OPINIONS}}", opinions()));
  for (const f of readdirSync(path.join(FOUNDATION, "rules"))) {
    if (f.endsWith(".md")) files.set(`references/${f}`, read(FOUNDATION, "rules", f));
  }
  files.set("references/tokens.css", read(FOUNDATION, "tokens.css"));
  files.set("references/checklist.md", read(FOUNDATION, "checklist.md"));
  return files;
}

function current() {
  const files = new Map();
  const walk = (dir, prefix = "") => {
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const rel = prefix + e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), rel + "/");
      else files.set(rel, readFileSync(path.join(dir, e.name), "utf8"));
    }
  };
  walk(OUT);
  return files;
}

const want = expected();
if (process.argv.includes("--check")) {
  const have = current();
  const stale = [...new Set([...want.keys(), ...have.keys()])].filter((k) => want.get(k) !== have.get(k));
  if (stale.length) {
    console.error(`skills/ui-polish is out of date (${stale.join(", ")}). Run: npm run skill`);
    process.exit(1);
  }
} else {
  rmSync(OUT, { recursive: true, force: true });
  for (const [rel, content] of want) {
    mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
    writeFileSync(path.join(OUT, rel), content);
  }
  console.log(`wrote ${want.size} files to skills/ui-polish`);
}
