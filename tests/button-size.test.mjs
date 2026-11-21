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
  { file: "registry/terminal-output/terminal-output.tsx", match: "onClick={handleCopy}", reason: "Copy, plain text in the terminal card's header strip, as Code block's." },
  { file: "registry/terminal-output/terminal-output.tsx", match: "busyLabel=\"Stopping…\"", reason: "Stop, plain text in the terminal card's header strip beside Copy." },
  { file: "registry/message-branches/message-branches.tsx", match: "className={styles.step}", reason: "Previous and next version, 32px capsules in the row under a reply beside 13px meta text, as Response actions'." },
  { file: "registry/code-block/code-block.tsx", match: "onClick={handleCopy}", reason: "Copy, inside the code block's header strip." },
  { file: "registry/kanban/kanban.tsx", match: "className={styles.add}", reason: "Add a card, an icon in the column's 32px header strip, as Sidebar's toggle." },
  { file: "registry/toast/toast.tsx", match: "data.action!.onClick()", reason: "The toast's action, inside the compact toast card." },
  { file: "src/previews/switch.tsx", match: '<Button variant="secondary" size="sm">', reason: "Demo of the small switch beside the small button it pairs with." },
  { file: "src/components/install-command.tsx", match: "className={styles.copy}", reason: "The copy button inside the install command's pill." },
  { file: "src/components/site-search.tsx", match: 'aria-label="Search components"', reason: "Search, an icon in the top bar beside the 32px theme toggle and GitHub." },
  { file: "src/components/pro-preview.tsx", match: 'aria-label="All screens"', reason: "Back, in the compact bar over a screen preview, which keeps the screen's own header in view." },
  { file: "src/components/pro-preview.tsx", match: 'href="/screens" variant="secondary"', reason: "About Pro, in the compact bar over a screen preview." },
  { file: "src/components/pro-preview.tsx", match: "href={checkout}", reason: "Buy, in the compact bar over a screen preview." },
  { file: "src/components/pro-preview.tsx", match: 'href="/screens#buy"', reason: "Buy, in the compact bar over a screen preview." },
  { file: "src/components/site-head.tsx", match: 'href="/screens"', reason: "Pro, a text link among the header's 32px icon buttons." },
  { file: "src/components/site-head.tsx", match: 'aria-label="UI Polish on GitHub"', reason: "GitHub, an icon beside the 32px theme toggle in the page header." },
  { file: "registry/sidebar/sidebar.tsx", match: "aria-label={label}", reason: "The sidebar toggle: an icon button in the sidebar's 32px header strip." },
  { file: "registry/response-actions/response-actions.tsx", match: "className={styles.action}", reason: "Copy, thumbs, Retry and Skip: icon capsules in the compact action row under a reply." },
  { file: "registry/message-thread/message-thread.tsx", match: "styles.action", reason: "Copy, Retry and thumbs: icon capsules in the compact action row under a reply." },
  { file: "registry/message-thread/message-thread.tsx", match: "className={styles.jump}", reason: "Jump to latest, a floating pill over the bottom of the thread." },
  { file: "registry/prompt-input/prompt-input.tsx", match: "className={styles.iconButton}", reason: "Attach, in the composer's toolbar strip inside the field." },
  { file: "registry/prompt-input/prompt-input.tsx", match: "className={styles.send}", reason: "Send and Stop, in the composer's toolbar strip inside the field." },
  { file: "registry/prompt-input/prompt-input.tsx", match: "className={styles.suggestion}", reason: "Prompt suggestions, a compact strip of chips above the composer." },
  { file: "src/previews/popover.tsx", match: 'aria-label="About the card processing fee"', reason: "An info button inside a line of text, beside the term it explains." },
  { file: "src/previews/button.tsx", match: "<Button size=\"sm\">", reason: "The button preview shows the size scale, small included." },
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
