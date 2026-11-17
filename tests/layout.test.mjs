import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { startServer } from "./server.mjs";

// Layout in a real browser against the production build. Production can load
// stylesheets in a different order than dev, so a rule that ties another on
// specificity can win in one and lose in the other; this caught the docs
// sidebar showing on phones and a copy button pushing the page sideways.
// Runs when Playwright is installed (it isn't a dependency) and skips
// otherwise.

let chromium = null;
try {
  ({ chromium } = createRequire(import.meta.url)("playwright"));
} catch {
  // Not installed: every test below skips.
}

let server;
let browser;
let pages = [];

before(async () => {
  if (!chromium) return;
  server = await startServer();
  browser = await chromium.launch();
  const { components } = await (await fetch(`${server.url}/api/components`)).json();
  pages = ["/", "/docs", "/docs/tailwind", "/about", "/contact", "/privacy", ...components.map((c) => `/docs/${c.name}`)];
});

after(async () => {
  await browser?.close();
  await server?.stop();
});

async function check(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500 });
  const problems = [];
  for (const path of pages) {
    const page = await context.newPage();
    await page.goto(server.url + path, { waitUntil: "networkidle" });
    const found = await page.evaluate((desktop) => {
      const out = [];
      const extra = document.documentElement.scrollWidth - innerWidth;
      if (extra > 0) out.push(`scrolls sideways by ${extra}px`);
      // The docs sidebar belongs beside the page on wide screens and under
      // it, hidden until the menu button slides the page aside, on narrow ones.
      const list = document.querySelector('nav[aria-label="Docs"] [aria-label="Docs pages"]');
      if (list) {
        const side = document.getElementById("docs-sidebar");
        const shown = getComputedStyle(side).visibility !== "hidden" && list.getBoundingClientRect().height > 0;
        if (shown !== desktop) out.push(`docs sidebar list ${shown ? "shown" : "hidden"}`);
      }
      return out;
    }, width > 860);
    for (const f of found) problems.push(`${path}: ${f}`);
    await page.close();
  }
  await context.close();
  return problems;
}

test("pages fit a phone, with the docs sidebar tucked away", { skip: !chromium && "Playwright isn't installed" }, async () => {
  assert.deepEqual(await check(375), []);
});

test("pages fit a desktop, with the docs sidebar beside them", { skip: !chromium && "Playwright isn't installed" }, async () => {
  assert.deepEqual(await check(1280), []);
});
