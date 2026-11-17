import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// The skill folder is built from foundation/, and the README lists the same
// opinions: neither can drift from the source.

test("skills/ui-polish matches foundation/", () => {
  execFileSync(process.execPath, ["scripts/build-skill.mjs", "--check"], { stdio: "pipe" });
});

test("the README lists every opinion, in order", () => {
  const titles = readFileSync("foundation/opinions.md", "utf8")
    .split("\n")
    .map((l) => /^- \*\*(.+?)\*\*/.exec(l)?.[1])
    .filter(Boolean);
  assert.equal(titles.length, 10);
  const readme = readFileSync("README.md", "utf8");
  titles.forEach((t, i) => assert.ok(readme.includes(`${i + 1}. ${t}`), t));
});

test("the skill has a name, a description and links that resolve", () => {
  const skill = readFileSync("skills/ui-polish/SKILL.md", "utf8");
  assert.match(skill, /^---\nname: ui-polish\ndescription: ".+"\n---\n/);
  for (const [, href] of skill.matchAll(/\]\((references\/[^)]+)\)/g)) {
    readFileSync(`skills/ui-polish/${href}`);
  }
});
