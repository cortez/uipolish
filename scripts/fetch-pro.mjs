// Pulls the paid screens (cortez/uipolish-pro, private) into ./pro before a
// build, so uipolish.com can render their live previews and serve them to
// licensed MCP requests. ./pro is git-ignored: nothing paid is ever
// committed to this public repo.
//
// - A local checkout beside this one (../uipolish-pro) is copied as is, for
//   development.
// - Otherwise, with SCREENS_GITHUB_TOKEN set (a read-only token for that one
//   repo, set in Vercel), the default branch's tarball is downloaded.
// - Otherwise ./pro is left empty and the site builds without screens.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "pro");
const local = resolve(root, process.env.PRO_DIR ?? "../uipolish-pro");
const repo = process.env.PRO_REPO ?? "cortez/uipolish-pro";
const token = process.env.SCREENS_GITHUB_TOKEN?.trim();

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

if (existsSync(join(local, "screens"))) {
  cpSync(join(local, "screens"), join(out, "screens"), { recursive: true });
  console.log(`pro: copied screens from ${local}`);
} else if (token) {
  const res = await fetch(`https://api.github.com/repos/${repo}/tarball`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "uipolish-build" },
  });
  if (!res.ok) throw new Error(`pro: GitHub answered ${res.status} for ${repo}; check SCREENS_GITHUB_TOKEN`);
  const file = join(tmpdir(), `uipolish-pro-${process.pid}.tar.gz`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  // The tarball has one top folder (owner-repo-sha); drop it.
  execFileSync("tar", ["-xzf", file, "-C", out, "--strip-components=1"]);
  rmSync(file, { force: true });
  console.log(`pro: downloaded ${repo}`);
} else {
  console.log("pro: no local checkout and no SCREENS_GITHUB_TOKEN; building without screens");
}
mkdirSync(join(out, "screens"), { recursive: true });

// An index the site imports from (@pro/index): every screen whose folder
// holds <name>.tsx, by name. Empty when there are none, so the site still
// builds and its screen pages simply aren't there.
const names = readdirSync(join(out, "screens"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(out, "screens", d.name, `${d.name}.tsx`)))
  .map((d) => d.name)
  .sort();
const ident = (n) => "S_" + n.replace(/[^a-z0-9]/gi, "_");
writeFileSync(
  join(out, "index.ts"),
  [
    "// Written by scripts/fetch-pro.mjs. Do not edit.",
    'import type { ComponentType } from "react";',
    ...names.map((n) => `import ${ident(n)} from "./screens/${n}/${n}";`),
    "",
    `export const SCREENS: Record<string, ComponentType> = { ${names.map((n) => `${JSON.stringify(n)}: ${ident(n)}`).join(", ")} };`,
    "",
  ].join("\n"),
);
console.log(`pro: ${names.length} screen${names.length === 1 ? "" : "s"}${names.length ? ": " + names.join(", ") : ""}`);
