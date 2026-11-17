import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// Buttons are the standard control height, 40px (foundation/rules/spacing.md,
// "Buttons are the standard control height"). Reads every .tsx in registry/
// and src/, no server, and fails on a <Button> or <ButtonLink> with
// size="sm" that isn't listed below. The small size is only for a button
// inside another control or a compact control strip, where 40px would break
// the control.

const ROOTS = ["registry", "src"];

// Each exception names the file, a piece of text from the button's opening
// tag that picks it out, and why it's small.
const ALLOW = [
  { file: "registry/code-block/code-block.tsx", match: "aria-pressed={wrap}", reason: "Wrap, inside the code block's header strip." },
  { file: "registry/code-block/code-block.tsx", match: "onClick={handleCopy}", reason: "Copy, inside the code block's header strip." },
  { file: "src/components/install-command.tsx", match: "className={styles.copy}", reason: "The copy button inside the install command's pill." },
  { file: "registry/dialog/dialog.tsx", match: 'aria-label="Close"', reason: "The corner close on the dialog's title line, sized by --close-size." },
  { file: "src/components/site-head.tsx", match: "href={DONATE_URL}", reason: "Donate, a quiet text link beside the 32px theme toggle in the page header." },
  { file: "src/components/site-head.tsx", match: 'aria-label="UI Polish on GitHub"', reason: "GitHub, an icon beside the 32px theme toggle in the page header." },
  { file: "src/components/docs-shell.tsx", match: 'aria-label="Open the docs menu"', reason: "The docs menu button in the phone top bar, beside the mark and level with the 32px theme toggle." },
  { file: "registry/sidebar/sidebar.tsx", match: "aria-label={label}", reason: "The sidebar toggle: an icon button in the sidebar's 32px header strip." },
  { file: "src/previews/popover.tsx", match: 'aria-label="About the card processing fee"', reason: "An info button inside a line of text, beside the term it explains." },
  { file: "src/previews/button.tsx", match: "<Button size=\"sm\">", reason: "The button preview shows the size scale, small included." },
  { file: "registry/turn-summary/turn-summary.tsx", match: "className={styles.action}", reason: "Copy and More in the row under an answer, beside 13px meta text, as Response actions' 32px buttons." },
];

function tsxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

// Opening tags of <Button> and <ButtonLink>, read to their closing `>` past
// any braces and the strings inside them.
function buttonTags(src) {
  const out = [];
  const re = /<(Button|ButtonLink)(?=[\s>/])/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + 1;
    let depth = 0;
    let quote = null;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (quote) {
        if (ch === quote) quote = null;
        continue;
      }
      if (depth > 0 && (ch === '"' || ch === "'" || ch === "`")) quote = ch;
      else if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) break;
    }
    out.push({ tag: src.slice(m.index, i + 1), line: src.slice(0, m.index).split("\n").length });
  }
  return out;
}

// size="sm", size={"sm"}, or an expression that can come out "sm".
const SMALL = /\bsize=(?:["']sm["']|\{[^}]*["']sm["'][^}]*\})/;

const found = [];
for (const root of ROOTS) {
  for (const file of tsxFiles(root)) {
    const rel = file.split(path.sep).join("/");
    for (const t of buttonTags(readFileSync(file, "utf8"))) {
      if (SMALL.test(t.tag)) found.push({ file: rel, ...t });
    }
  }
}

test("buttons are the standard height; small ones are listed with a reason", () => {
  const stray = found
    .filter((b) => !ALLOW.some((a) => a.file === b.file && b.tag.includes(a.match)))
    .map((b) => `${b.file}:${b.line}  ${b.tag.replace(/\s+/g, " ").slice(0, 100)}`);
  assert.deepEqual(
    stray,
    [],
    'Drop size="sm" (a button is 40px), or, for a button inside another control or a compact strip, add it to ALLOW in tests/button-size.test.mjs with the reason.',
  );
});

test("every allowed small button still exists", () => {
  const stale = ALLOW.filter((a) => !found.some((b) => b.file === a.file && b.tag.includes(a.match))).map(
    (a) => `${a.file}: ${a.match}`,
  );
  assert.deepEqual(stale, [], "Remove these from ALLOW in tests/button-size.test.mjs: no small button matches them.");
});
