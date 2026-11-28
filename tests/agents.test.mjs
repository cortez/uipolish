import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { startServer } from "./server.mjs";

// What agents rely on: Markdown on the same URLs, Markdown 404s, the REST
// API with JSON errors, its OpenAPI description, llms.txt guidance, trust
// pages and structured data, and enough real text in the homepage's HTML.

let server;
const get = (path, headers = {}, init = {}) => fetch(server.url + path, { headers, redirect: "follow", ...init });
const md = { accept: "text/markdown" };
const html = { accept: "text/html,application/xhtml+xml,*/*;q=0.8" };

before(async () => {
  server = await startServer();
});
after(async () => {
  await server.stop();
});

describe("Markdown content negotiation", () => {
  test("the homepage answers Markdown to Accept: text/markdown", async () => {
    const res = await get("/", md);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /^text\/markdown/);
    assert.match(res.headers.get("vary") ?? "", /\bAccept\b/i);
    const body = await res.text();
    assert.match(body, /^# UI Polish/m);
    assert.match(body, /## When to use UI Polish/);
  });

  test("the homepage still answers HTML to a browser", async () => {
    const res = await get("/", html);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /^text\/html/);
  });

  test(".md suffixes and the rules file", async () => {
    for (const [path, heading] of [["/docs/button.md", "# Button"], ["/index.md", "# UI Polish"], ["/rules.md", "# UI Polish"]]) {
      const res = await get(path);
      assert.equal(res.status, 200, path);
      assert.match(res.headers.get("content-type"), /^text\/markdown/, path);
      assert.ok((await res.text()).includes(heading), path);
    }
  });

  test("component pages offer to copy themselves as Markdown", async () => {
    for (const path of ["/docs/button", "/docs/dialog"]) {
      assert.match(await (await get(path, html)).text(), /Copy page/, path);
    }
  });

  test("an unknown page is a 404 with a Markdown body that points somewhere useful", async () => {
    const res = await get("/__no-such-page-probe", md);
    assert.equal(res.status, 404);
    assert.match(res.headers.get("content-type"), /^text\/markdown/);
    const body = await res.text();
    assert.ok(body.length >= 20);
    assert.match(body, /llms\.txt/);
    assert.match(body, /sitemap\.xml/);
  });

  test("an unknown page is still an HTML 404 for a browser", async () => {
    const res = await get("/__no-such-page-probe", html);
    assert.equal(res.status, 404);
    assert.match(res.headers.get("content-type"), /^text\/html/);
  });
});

describe("REST API", () => {
  const errorShape = (body, code) => {
    assert.equal(body.error.code, code);
    for (const key of ["message", "hint", "docs"]) assert.equal(typeof body.error[key], "string", key);
  };

  test("lists components", async () => {
    const res = await get("/api/components");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /application\/json/);
    const { components } = await res.json();
    assert.ok(components.length > 10);
    assert.ok(components.every((c) => c.name && c.title && c.version && c.type === "component"));
    assert.ok(components.some((c) => c.kit === "agent"));
  });

  test("returns a free component with its files, dependencies first", async () => {
    const res = await get("/api/components/button");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.name, "button");
    assert.ok(body.guide.length > 100);
    assert.ok(body.files.some((f) => f.path === "button/button.tsx"));
    assert.equal(body.files.at(-1).component, "button");
  });

  test("agent kit components are served with no key, with their packages", async () => {
    const { components } = await (await get("/api/components")).json();
    const kit = components.find((c) => c.kit === "agent");
    const res = await get(`/api/components/${kit.name}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.files.length > 0);
    assert.ok(Array.isArray(body.packages));
  });

  test("errors are JSON with a code, message and hint", async () => {
    const cases = [
      ["/api/components/no-such-thing", 404, "component_not_found"],
      ["/api/components/button?stack=vue", 400, "unsupported_stack"],
      ["/api/rules/no-such-topic", 404, "topic_not_found"],
      ["/api/no/such/endpoint", 404, "not_found"],
    ];
    for (const [path, status, code] of cases) {
      const res = await get(path);
      assert.equal(res.status, status, path);
      assert.match(res.headers.get("content-type"), /application\/json/, path);
      errorShape(await res.json(), code);
    }
    // The private report doesn't exist without its token configured.
    const stats = await get("/api/stats");
    assert.equal(stats.status, 404);
    errorShape(await stats.json(), "not_found");

    const post = await get("/api/components", {}, { method: "POST" });
    assert.equal(post.status, 405);
    errorShape(await post.json(), "method_not_allowed");
  });

  test("serves a component's CSS for Tailwind on request", async () => {
    const plain = await (await get("/api/components/button")).json();
    const tw = await (await get("/api/components/button?tailwind=true")).json();
    const css = (body) => body.files.filter((f) => f.path.endsWith(".module.css"));
    assert.ok(css(plain).every((f) => !f.content.includes("@layer")));
    assert.ok(css(tw).length > 0 && css(tw).every((f) => f.content.startsWith("@layer theme, base, components, utilities;")));
    assert.match(tw.install, /api\/rules\/tailwind/);
    const bad = await get("/api/components/button?tailwind=yes");
    assert.equal(bad.status, 400);
    errorShape(await bad.json(), "invalid_parameter");
  });

  test("serves rules and tokens", async () => {
    const { topics } = await (await get("/api/rules")).json();
    assert.ok(topics.some((t) => t.topic === "motion"));
    const motion = await (await get("/api/rules/motion")).json();
    assert.equal(motion.format, "markdown");
    const tokens = await (await get("/api/rules/tokens")).json();
    assert.equal(tokens.format, "css");
    assert.match(tokens.content, /--ui-/);
    const tailwind = await (await get("/api/rules/tailwind")).json();
    assert.match(tailwind.content, /@theme inline/);
    assert.ok(topics.some((t) => t.topic === "tailwind"));
  });
});

describe("OpenAPI", () => {
  test("is OpenAPI 3.1 with a unique, described, typed operation per endpoint", async () => {
    const res = await get("/openapi.json");
    assert.equal(res.status, 200);
    const spec = await res.json();
    assert.equal(spec.openapi, "3.1.0");
    const ops = Object.entries(spec.paths).flatMap(([path, item]) => Object.entries(item).map(([method, op]) => ({ path, method, op })));
    const ids = ops.map((o) => o.op.operationId);
    assert.equal(new Set(ids).size, ids.length);
    for (const { path, op } of ops) {
      assert.ok(op.operationId && op.summary && op.description, path);
      assert.ok(op.responses["200"].content["application/json"].schema, path);
      for (const p of op.parameters ?? []) assert.ok(p.schema?.type && p.description, `${path} ${p.name}`);
    }
    assert.ok(spec.components.schemas.ApiError);
  });

  test("every documented path answers", async () => {
    const spec = await (await get("/openapi.json")).json();
    for (const path of Object.keys(spec.paths)) {
      const concrete = path.replace("{name}", "button").replace("{topic}", "motion");
      assert.equal((await get(concrete)).status, 200, concrete);
    }
  });
});

describe("Agent guidance and trust", () => {
  test("llms.txt says when to use UI Polish and how to call it", async () => {
    const text = await (await get("/llms.txt")).text();
    assert.match(text, /## When to use UI Polish/);
    assert.match(text, /## How to call it/);
    assert.match(text, /openapi\.json/);
    assert.match(text, /^Last updated: \d{4}-\d{2}-\d{2}$/m);
  });

  test("the contact page has real content, in HTML and Markdown", async () => {
    for (const path of ["/contact"]) {
      const page = await get(path, html);
      assert.equal(page.status, 200, path);
      const text = (await page.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
      assert.ok(text.replace(/\s+/g, " ").length > 500, path);
      const markdown = await get(path, md);
      assert.match(markdown.headers.get("content-type"), /^text\/markdown/, path);
      assert.ok((await markdown.text()).length > 500, path);
    }
  });

  test("the Organization in JSON-LD has a contact point", async () => {
    const page = await (await get("/", html)).text();
    const graphs = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const nodes = graphs.flatMap((g) => g["@graph"] ?? [g]);
    const org = nodes.find((n) => n["@type"] === "Organization");
    assert.equal(org.contactPoint["@type"], "ContactPoint");
    assert.match(org.contactPoint.email, /@/);
  });

  test("the homepage serves its content as HTML, with one h1", async () => {
    const page = await (await get("/", html)).text();
    assert.equal(page.match(/<h1\b/g)?.length, 1);
    const text = page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    assert.ok(text.length > 500);
    // A client-rendered shell sits under 1%. The home page is only a title
    // and the components' names, and Next's serialized data is most of its
    // HTML; 1.2% still proves the text is in the HTML.
    assert.ok(text.length / page.length >= 0.012, `content ratio ${((100 * text.length) / page.length).toFixed(2)}%`);
  });
});

describe("UI Polish Pro on the site", () => {
  test("llms.txt has the current date and the $299 one-time price", async () => {
    const text = await (await get("/llms.txt")).text();
    assert.match(text, /^Last updated: 2026-11-24$/m);
    assert.match(text, /\$299 one-time/);
    assert.doesNotMatch(text, /\$199|\$149/);
    assert.doesNotMatch(text, /UI Polish Pro screens/);
  });

  test("the homepage FAQ says components and rules are free and Pro is $299 one-time", async () => {
    const page = await (await get("/", html)).text();
    const text = page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
    assert.match(text, /Is it free\?/);
    assert.match(text, /\$299 one-time/);
    assert.match(text, /Components and design rules are free/);
  });

  test("/pricing and retired Pro docs redirect to /pro, not home", async () => {
    for (const path of ["/pricing", "/docs/plan-approval", "/docs/file-changes", "/thanks"]) {
      const res = await get(path, html, { redirect: "manual" });
      assert.equal(res.status, 308, path);
      assert.equal(new URL(res.headers.get("location"), server.url).pathname, "/pro", path);
    }
  });

  test("/pro and /screens are available as Markdown, with the price", async () => {
    const page = await get("/pro", html, { redirect: "manual" });
    if (page.status === 404) return; // a build without the private screens
    for (const path of ["/pro.md", "/pro", "/screens.md", "/pricing.md"]) {
      const headers = path.endsWith(".md") ? {} : md;
      const res = await get(path, headers);
      assert.equal(res.status, 200, path);
      assert.match(res.headers.get("content-type"), /^text\/markdown/, path);
      const body = await res.text();
      assert.match(body, /^# UI Polish Pro/m, path);
      assert.match(body, /\$299/, path);
    }
  });

  test("a retired Pro docs path explains the move in Markdown", async () => {
    const res = await get("/docs/plan-approval.md");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /^text\/markdown/);
    const body = await res.text();
    assert.match(body, /has moved/i);
    assert.match(body, /\$299/);
    assert.match(body, /uipolish\.com\/pro/);
    assert.doesNotMatch(body, /\$199|\$149/);
  });
});

describe("MCP", () => {
  test("get_component still answers over JSON-RPC", async () => {
    const res = await fetch(server.url + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_component", arguments: { name: "button" } } }),
    });
    const body = await res.json();
    assert.match(body.result.content[0].text, /^# Button v/);
  });

  test("get_component takes tailwind, and get_rules has the Tailwind setup", async () => {
    const call = async (name, args) =>
      (
        await (
          await fetch(server.url + "/mcp", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
          })
        ).json()
      ).result.content[0].text;
    assert.match(await call("get_component", { name: "button", tailwind: true }), /@layer components \{/);
    assert.doesNotMatch(await call("get_component", { name: "button" }), /@layer components \{/);
    assert.match(await call("get_rules", { topic: "tailwind" }), /^# Tailwind CSS/);
  });

  test("list_components lists components and marks the agent kit", async () => {
    const res = await fetch(server.url + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_components", arguments: {} } }),
    });
    const list = (await res.json()).result.content[0].text;
    assert.match(list, /^- /);
    assert.match(list, /- model-picker \(agent kit\), v/);
    assert.match(list, /- button, v/);
  });

  test("get_screen needs a license key and points to /pro; a bad key never gets files", async () => {
    const call = async (headers = {}) =>
      (
        await (
          await fetch(server.url + "/mcp", {
            method: "POST",
            headers: { "content-type": "application/json", ...headers },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_screen", arguments: { name: "copper" } } }),
          })
        ).json()
      ).result;
    const none = await call();
    assert.equal(none.isError, true);
    assert.match(none.content[0].text, /license key/);
    assert.match(none.content[0].text, /uipolish\.com\/pro/);
    const bad = await call({ authorization: "Bearer UIPOLISH-NOT-A-REAL-KEY" });
    assert.equal(bad.isError, true);
    assert.doesNotMatch(bad.content[0].text, /UIPOLISH-NOT-A-REAL-KEY/);
    assert.doesNotMatch(bad.content[0].text, /## Files/);
  });
});
