import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { startServer } from "./server.mjs";

// Anonymous usage counts and the private report, end to end: the real
// server, counting into a stand-in for Upstash's REST API.

const hashes = new Map();
const store = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.headers.authorization !== "Bearer store-token") return res.writeHead(401).end();
    const replies = JSON.parse(body).map(([cmd, key, field]) => {
      const h = hashes.get(key) ?? new Map();
      hashes.set(key, h);
      if (cmd === "HINCRBY") return { result: h.set(field, (h.get(field) ?? 0) + 1).get(field) };
      if (cmd === "HGETALL") return { result: [...h].flatMap(([f, v]) => [f, String(v)]) };
      return { result: 1 };
    });
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(replies));
  });
});

let server;
before(async () => {
  await new Promise((r) => store.listen(0, r));
  server = await startServer({
    env: {
      KV_REST_API_URL: `http://127.0.0.1:${store.address().port}`,
      KV_REST_API_TOKEN: "store-token",
      STATS_TOKEN: "report-token",
    },
  });
});
after(async () => {
  await server?.stop();
  store.close();
});

const rpc = (method, params) =>
  fetch(server.url + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

test("usage is counted anonymously and reported to the token holder only", async () => {
  await rpc("initialize", { clientInfo: { name: "Cursor" }, protocolVersion: "2024-11-05" });
  await rpc("tools/call", { name: "get_component", arguments: { name: "button", tailwind: true } });
  // An item the shadcn CLI installs.
  assert.equal((await fetch(server.url + "/r/button.json")).status, 200);
  await fetch(server.url + "/docs", { headers: { accept: "text/html", referer: "https://news.ycombinator.com/item?id=1", "user-agent": "Mozilla/5.0" } });
  await fetch(server.url + "/docs/button.md");
  await new Promise((r) => setTimeout(r, 500));

  // Nothing identifying is stored: only named totals.
  const fields = [...[...hashes.values()][0].keys()];
  assert.ok(fields.every((f) => /^[a-z0-9._-]+$/.test(f)), fields.join(" "));

  assert.equal((await fetch(server.url + "/api/stats")).status, 401);
  assert.equal((await fetch(server.url + "/api/stats", { headers: { authorization: "Bearer wrong-token!" } })).status, 401);

  const report = await (await fetch(server.url + "/api/stats", { headers: { authorization: "Bearer report-token" } })).json();
  assert.equal(report.agents.connections, 1);
  assert.deepEqual(report.agents.clients, [{ name: "cursor", count: 1 }]);
  assert.equal(report.components.served, 1);
  assert.equal(report.components.tailwind, 1);
  assert.equal(report.components.registryInstalls, 1);
  assert.deepEqual(report.components.registryTop, [{ name: "button", count: 1 }]);
  assert.equal(report.visitors.views, 1);
  assert.deepEqual(report.visitors.topPages, [{ name: "docs", count: 1 }]);
  assert.deepEqual(report.visitors.referrers, [{ name: "news-ycombinator-com", count: 1 }]);
  assert.equal(report.visitors.markdownReads, 1);

  const md = await (await fetch(server.url + "/api/stats?format=markdown&token=report-token")).text();
  assert.match(md, /^# UI Polish: /);
  assert.match(md, /shadcn CLI installs: 1 \(new\); top: button 1/);
  assert.match(md, /By agent: cursor 1/);
});

test("the weekly push needs Vercel's cron secret", async () => {
  assert.equal((await fetch(server.url + "/api/stats/weekly")).status, 401);
});
