import assert from "node:assert/strict";
import { test } from "node:test";
import { prefersMarkdown } from "../src/lib/accept.ts";

test("Markdown is chosen only when asked for by name", () => {
  assert.equal(prefersMarkdown("text/markdown"), true);
  assert.equal(prefersMarkdown("text/x-markdown"), true);
  assert.equal(prefersMarkdown("text/markdown, text/html;q=0.9"), true);
  assert.equal(prefersMarkdown("text/markdown;q=0.5, text/html"), false);
  assert.equal(prefersMarkdown("text/markdown;q=0"), false);
});

test("browsers and wildcards get HTML", () => {
  assert.equal(prefersMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"), false);
  assert.equal(prefersMarkdown("*/*"), false);
  assert.equal(prefersMarkdown("text/*"), false);
  assert.equal(prefersMarkdown(""), false);
  assert.equal(prefersMarkdown(null), false);
});

test("a tie with a wildcard goes to Markdown", () => {
  assert.equal(prefersMarkdown("text/markdown, */*"), true);
  assert.equal(prefersMarkdown("text/markdown;q=0.8, text/*;q=0.9"), false);
});
