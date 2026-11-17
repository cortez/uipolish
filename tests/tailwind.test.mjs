import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { inTailwindLayer } from "../src/lib/tailwind-layer.ts";

// The Tailwind form of every CSS module: the same declarations, all of them
// in Tailwind's components layer except what can't be (composes, @property),
// and the layer order named in the file itself.

const REGISTRY = new URL("../registry/", import.meta.url).pathname;
const filesOf = (dir) => readdirSync(join(REGISTRY, dir));
const modules = readdirSync(REGISTRY).flatMap((dir) =>
  filesOf(dir)
    .filter((f) => f.endsWith(".module.css"))
    .map((f) => [`${dir}/${f}`, readFileSync(join(REGISTRY, dir, f), "utf8")]),
);

const uncomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const declarations = (css) =>
  uncomment(css)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.endsWith(";") && !l.startsWith("@layer"))
    .sort();

/** The text of `@layer components { … }`, by brace matching. */
function layerBody(css) {
  const code = uncomment(css);
  const at = code.indexOf("@layer components {");
  let depth = 0;
  for (let i = code.indexOf("{", at); i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}" && --depth === 0) return { inside: code.slice(at, i + 1), outside: code.slice(0, at) + code.slice(i + 1) };
  }
  throw new Error("unclosed layer");
}

test("every CSS module keeps all its declarations in the Tailwind form", () => {
  assert.ok(modules.length > 40);
  for (const [path, css] of modules) {
    const out = inTailwindLayer(css);
    assert.ok(out.startsWith("@layer theme, base, components, utilities;"), path);
    assert.deepEqual(declarations(out), declarations(css), path);
    const code = uncomment(out);
    assert.equal(code.split("{").length, code.split("}").length, `${path}: braces`);
  }
});

test("composes and @property stay outside the layer; everything else is inside", () => {
  for (const [path, css] of modules) {
    const { inside, outside } = layerBody(inTailwindLayer(css));
    assert.doesNotMatch(inside, /composes:/, path);
    assert.doesNotMatch(inside, /@property/, path);
    // Outside: the layer order, @property rules and composes-only rules.
    const rules = outside.replace(/@layer[^;{]*;/, "").replace(/@property[^{]*\{[^}]*\}/g, "");
    for (const [, body] of rules.matchAll(/\{([^}]*)\}/g)) {
      for (const line of body.split(";").map((l) => l.trim()).filter(Boolean)) assert.match(line, /^composes:/, path);
    }
  }
});

test("a rule quoted in a comment isn't moved", () => {
  const css = `/* Compose it:\n   .name { composes: truncate from "./text.module.css"; } */\n.a {\n  color: red;\n}\n`;
  const out = inTailwindLayer(css);
  assert.match(layerBody(out).inside, /\.a \{\s*color: red;/);
  assert.doesNotMatch(uncomment(out).replace(/@layer[^;{]*;/, ""), /composes/);
});

test("a rule that composes and declares keeps both, split across the layer", () => {
  const out = inTailwindLayer(`.b {\n  composes: x from "./x.module.css";\n  color: blue;\n}\n`);
  const { inside, outside } = layerBody(out);
  assert.match(outside, /\.b \{\s*composes: x from "\.\/x\.module\.css";\s*\}/);
  assert.match(inside, /\.b \{\s*color: blue;\s*\}/);
});
