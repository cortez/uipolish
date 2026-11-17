import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// One radius scale (foundation/rules/surfaces.md, "Radius"). Every corner in
// registry/ and src/ reads the scale (--ui-radius-xs/sm/md/lg/full or
// --ui-radius-control), inherits its parent's, or derives from them in a
// calc() (outer − gap, so nested corners line up with the padding). A
// literal length is off the scale; 0 is allowed to switch a corner off.

function cssFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return cssFiles(file);
    return name.endsWith(".css") ? [file] : [];
  });
}

test("every border-radius is on the scale or derived from it", () => {
  const bad = [];
  for (const file of [...cssFiles("registry"), ...cssFiles("src")]) {
    const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of css.matchAll(/(border(?:-[a-z]+)*-radius|--[\w-]*radius)\s*:\s*([^;}]+)/g)) {
      const value = match[2].trim();
      const words = value.split(/\s+/);
      // Strip var() and calc() content first: lengths inside a calc next to
      // a token are gaps (outer − gap), which is the concentric rule.
      const bare = value.replace(/(?:var|calc|min|max)\([^]*\)/g, "").trim();
      const literal = bare.split(/\s+/).filter((w) => w && w !== "0" && w !== "inherit" && w !== "0px");
      const onlyLiterals = !/var\(--/.test(value);
      if (literal.length || (onlyLiterals && words.some((w) => w !== "0" && w !== "inherit" && w !== "0px"))) {
        bad.push(`${file}: ${match[1]}: ${value}`);
      }
    }
  }
  assert.deepEqual(bad, [], `Off-scale radii:\n${bad.join("\n")}`);
});
