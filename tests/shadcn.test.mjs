import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startServer } from "./server.mjs";

// The shadcn registry: the index, and items the CLI can install as they are,
// agent kit included, with the npm packages they import.

let server;
const get = (path, headers = {}) => fetch(server.url + path, { headers });

before(async () => {
  server = await startServer();
});
after(async () => {
  await server.stop();
});

test("the index lists the style items and every component", async () => {
  const res = await get("/r/registry.json");
  assert.equal(res.status, 200);
  const index = await res.json();
  assert.equal(index.name, "uipolish");
  const names = index.items.map((i) => i.name);
  for (const n of ["tokens", "theme", "button", "authorize", "icons", "text-morph"]) assert.ok(names.includes(n), n);
});

test("a free item inlines its files and its dependencies' files at components/ui/<name>/", async () => {
  const res = await get("/r/dialog.json");
  assert.equal(res.status, 200);
  const item = await res.json();
  assert.equal(item.name, "dialog");
  const targets = item.files.map((f) => f.target);
  assert.ok(targets.includes("components/ui/dialog/dialog.tsx"));
  assert.ok(targets.includes("components/ui/button/button.tsx"), "dependencies come along");
  assert.ok(item.files.every((f) => typeof f.content === "string" && f.content.length > 0));
  assert.match(item.files.find((f) => f.target.endsWith(".module.css")).content, /@layer components/);
  assert.match(item.registryDependencies[0], /\/r\/tokens\.json$/);
});

test("the theme item adds the stylesheet imports", async () => {
  const item = await (await get("/r/theme.json")).json();
  assert.deepEqual(Object.keys(item.css), [
    '@import "../components/ui/uipolish/tokens.css"',
    '@import "../components/ui/uipolish/tailwind.css"',
    '@import "../components/ui/uipolish/shadcn.css"',
  ]);
});

test("an agent kit item installs with no key and lists Base UI", async () => {
  const res = await get("/r/authorize.json");
  assert.equal(res.status, 200);
  const item = await res.json();
  assert.ok(item.files.some((f) => f.path === "components/ui/authorize/authorize.tsx"));
  assert.ok(item.dependencies.some((d) => d.startsWith("@base-ui/react@")));
});

test("unknown items and other extensions are 404s", async () => {
  assert.equal((await get("/r/nope.json")).status, 404);
  assert.equal((await get("/r/button.txt")).status, 404);
});
