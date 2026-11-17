import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startServer } from "./server.mjs";

// Articles: the index, a page with its live demo, the Markdown twin without
// the demo marker, and the sitemap.

let server;
const get = (path, headers = {}) => fetch(server.url + path, { headers });

before(async () => {
  server = await startServer();
});
after(async () => {
  await server.stop();
});

test("the index links every article", async () => {
  const html = await (await get("/articles")).text();
  assert.match(html, /href="\/articles\/mcp-consent-screen"/);
  assert.match(html, /href="\/articles\/tool-approval"/);
});

test("an article renders its title and its component's demo", async () => {
  const res = await get("/articles/mcp-consent-screen");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<h1[^>]*>What an MCP consent screen needs<\/h1>/);
  assert.match(html, /wants to access/, "the Authorize demo is on the page");
  assert.doesNotMatch(html, /\{\{demo/);
});

test("the Markdown twin leaves out the demo marker and says where it lives", async () => {
  const res = await get("/articles/tool-approval.md");
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /^# Ask before the agent acts/);
  assert.doesNotMatch(body, /\{\{demo/);
  assert.match(body, /\/articles\/tool-approval\.$/m);
});

test("unknown articles are 404s, and the sitemap lists the real ones", async () => {
  assert.equal((await get("/articles/nope")).status, 404);
  const sitemap = await (await get("/sitemap.xml")).text();
  assert.match(sitemap, /\/articles\/mcp-consent-screen</);
});

test("a component page links to the article about it", async () => {
  const html = await (await get("/docs/authorize")).text();
  assert.match(html, /href="\/articles\/mcp-consent-screen"/);
});
