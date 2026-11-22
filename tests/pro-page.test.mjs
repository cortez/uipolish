import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startServer } from "./server.mjs";

// The /pro page's pictures load: a redirect once caught them and every
// thumbnail came back as a 404.

let server;
before(async () => {
  server = await startServer();
});
after(async () => {
  await server.stop();
});

test("every picture on /pro answers with an image", async () => {
  const page = await (await fetch(server.url + "/pro")).text();
  // next/image serves them through /_next/image?url=<path>; ask for the files.
  const sources = [...new Set([...page.matchAll(/url=(%2Fshots%2F[^&"]+)/g)].map((m) => decodeURIComponent(m[1])))];
  assert.ok(sources.length >= 2, "the page shows thumbnails");
  for (const src of sources) {
    const res = await fetch(server.url + src, { redirect: "manual" });
    assert.equal(res.status, 200, src);
    assert.match(res.headers.get("content-type") ?? "", /^image\//, src);
  }
});
