import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// Line weights and colors stay in the system (foundation/rules/surfaces.md,
// "Line weights"). Reads every CSS module in registry/ and src/, no server:
//
// - Every edge and divider is a hairline box-shadow (a ring, or an inset
//   line on one side), never a `border`: a 0.5px border rounds up to a full
//   CSS pixel, twice the weight of a ring. Forced-colors blocks keep their
//   1px borders so the outline never vanishes.
// - No ring with a literal 1px spread, except a focused edge (a focus
//   selector, or the focus colors --ui-field-focus and --ui-danger).
// - No literal colors: everything reads --ui-* roles. Masks are exempt (only
//   their alpha is used).
// - No literal stroke-width: icons read the two stroke tiers.
// - No --ui-border-subtle (an alias kept only so older code resolves).
// - No literal icon sizes: an svg, icon, glyph or chevron reads the icon
//   scale (--ui-icon-xs/sm/md/lg, foundation/rules/typography.md §6).
// - No hand-mixed text grays: a text color is a role (--ui-foreground,
//   --ui-muted, --ui-subtle, --ui-on-ink-muted), never the foreground or
//   on-ink color-mixed to a new strength.
// - No bespoke hues blended from two status hues (surfaces.md, "Few
//   colors"); a chart's series are the exception.

const ROOTS = ["registry", "src"];

// Each exception names the file, the selector it applies to (or "*") and
// the check, with the reason it's allowed.
const ALLOW = [
  { file: "src/components/agent-demo-without.module.css", selector: "*", check: "*", reason: "The home page's 'without UI Polish' demo is off-system on purpose: it shows what a page looks like before the rules." },
  { file: "registry/inline-edit/inline-edit.module.css", selector: ".root", check: "ring", reason: "The 1px edge is the focused field's: --inline-edge is transparent until it's editing." },
  { file: "registry/button/button.module.css", selector: "*", check: "color", reason: "The danger button's hover and press darken toward black, whatever the hue." },
  { file: "registry/prompt-input/prompt-input.module.css", selector: ".remove", check: "color", reason: "A dark scrim over a photo thumbnail, under a white glyph: the same in both themes." },
  { file: "registry/icons/icons.module.css", selector: ".block", check: "stroke", reason: "A solid block drawn as one fat stroke (a stop square), not a line." },
  { file: "registry/voice-session/voice-session.module.css", selector: ".slashCut", check: "stroke", reason: "A mask that cuts a gap around the mute slash; never drawn." },
  { file: "registry/usage-meter/usage-meter.module.css", selector: ".ringTrack", check: "stroke", reason: "A gauge's ring, read as an amount, not an icon line." },
  { file: "registry/authorize/authorize.module.css", selector: ".mark", check: "icon-size", reason: "The app's own logo in the consent header, sized as a picture, not an icon." },
  { file: "registry/sign-in/sign-in.module.css", selector: ".brand", check: "icon-size", reason: "The product's logo above the form, sized as a picture, not an icon." },
  { file: "registry/prompt-input/prompt-input.module.css", selector: ".fileIcon", check: "icon-size", reason: "A 40px tile for an attached file; the glyph inside it reads the scale." },
  { file: "registry/popover/popover.module.css", selector: ".arrow", check: "icon-size", reason: "The popup's arrow: part of its outline, not an icon." },
  { file: "registry/tooltip/tooltip.module.css", selector: ".arrow", check: "icon-size", reason: "The popup's arrow: part of its outline, not an icon." },
  { file: "registry/usage-meter/usage-meter.module.css", selector: "*", check: "hue", reason: "A chart: each series needs its own hue." },
  { file: "registry/run-history/run-history.module.css", selector: "*", check: "hue", reason: "A waterfall chart: model calls are their own series." },
  { file: "registry/code-block/code-block.module.css", selector: "*", check: "hue", reason: "Syntax colors: a token kind per hue." },
];

function cssFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...cssFiles(p));
    else if (p.endsWith(".module.css")) out.push(p);
  }
  return out;
}

// Declarations with the chain of selectors / at-rules they sit in.
function declarations(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const out = [];
  const stack = [];
  let buf = "";
  let start = 0;
  let paren = 0;
  const lineAt = (i) => src.slice(0, i).split("\n").length;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    if (paren > 0) {
      buf += ch;
      continue;
    }
    if (ch === "{") {
      stack.push(buf.trim());
      buf = "";
      start = i + 1;
    } else if (ch === ";" || ch === "}") {
      const text = buf.trim();
      const colon = text.indexOf(":");
      if (colon > 0 && !text.startsWith("@") && stack.length) {
        out.push({ prop: text.slice(0, colon).trim().toLowerCase(), value: text.slice(colon + 1).trim(), chain: [...stack], line: lineAt(start + buf.search(/\S/)) });
      }
      buf = "";
      start = i + 1;
      if (ch === "}") stack.pop();
    } else buf += ch;
  }
  return out;
}

const allowed = (file, chain, check) =>
  ALLOW.some((a) => a.file === file && (a.check === "*" || a.check === check) && (a.selector === "*" || chain.some((s) => s.split(",").some((part) => part.trim().startsWith(a.selector)))));

const BORDER_PROP = /^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-width)?$/;
const COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(\s*[\d.]/i;
const RING_1PX = /(?:^|,)\s*(?:inset\s+)?0\s+0\s+0\s+1px\s+([^,]+)/g;

// The last compound of a selector names an icon: an svg, or a class that
// ends in icon, glyph or chevron (.icon, .statusIcon, .stepChevron).
const ICON_SELECTOR = (sel) => {
  const compound = sel.trim().split(/\s*[\s>+~]\s*(?![^(]*\))/).at(-1) ?? "";
  return /(^|[^\w-])svg\b/.test(compound) || /\.[\w-]*(icon|Icon|glyph|Glyph|chevron|Chevron)(?![\w-])/.test(compound);
};
const SIZE_PROP = /^(width|height|inline-size|block-size|min-width|min-height)$/;
// Neutral text roles color-mixed to a new strength.
const MIXED_GRAY = /color-mix\(\s*in\s+\w+\s*,\s*var\(--ui-(foreground|muted|subtle|on-ink|ink)\)\s+[\d.]+%/;
const TEXT_PROP = /^(color|-webkit-text-fill-color|caret-color)$/;
// Two status hues blended into a new one.
const HUE = "var\\(--ui-(?:accent|success|warning|danger)(?:-text)?\\)";
const BLEND = new RegExp(`color-mix\\(\\s*in\\s+\\w+\\s*,\\s*${HUE}\\s*[\\d.]*%?\\s*,\\s*${HUE}`);

const files = ROOTS.flatMap((r) => cssFiles(r)).map((f) => f.split(path.sep).join("/")).sort();
const problems = { border: [], ring: [], color: [], stroke: [], subtle: [], iconSize: [], mixedText: [], hue: [] };

for (const file of files) {
  const decls = declarations(readFileSync(file, "utf8"));
  // Custom properties holding a mixed gray, and whether text reads them.
  const grayVars = new Set(decls.filter((d) => d.prop.startsWith("--") && MIXED_GRAY.test(d.value)).map((d) => d.prop));
  for (const d of decls) {
    const where = `${file}:${d.line} ${d.chain.at(-1)} { ${d.prop}: ${d.value} }`;
    const forced = d.chain.some((s) => /forced-colors/.test(s));

    if (BORDER_PROP.test(d.prop) && !/^(0|0px|none|hidden)(\s|$)/.test(d.value) && !/^0\s+(solid|none)/.test(d.value) && !forced && !allowed(file, d.chain, "border")) {
      problems.border.push(where);
    }
    if (d.prop === "box-shadow") {
      for (const [, color] of d.value.matchAll(RING_1PX)) {
        const focusEdge = /var\(--ui-(field-focus|danger)\)/.test(color) || d.chain.some((s) => /focus|popup-open/.test(s));
        if (!focusEdge && !allowed(file, d.chain, "ring")) problems.ring.push(where);
      }
    }
    if (!/^(-webkit-)?mask/.test(d.prop) && !d.prop.startsWith("--") && COLOR.test(d.value) && !forced && !allowed(file, d.chain, "color")) {
      problems.color.push(where);
    }
    if (d.prop.startsWith("--") && COLOR.test(d.value) && !allowed(file, d.chain, "color")) {
      problems.color.push(where);
    }
    if (d.prop === "stroke-width" && /^[\d.]+(px)?$/.test(d.value) && !allowed(file, d.chain, "stroke")) {
      problems.stroke.push(where);
    }
    if (d.value.includes("--ui-border-subtle")) problems.subtle.push(where);
    const last = d.chain.at(-1) ?? "";
    if (SIZE_PROP.test(d.prop) && /^[\d.]+px$/.test(d.value) && !last.startsWith("@") && last.split(/,(?![^(]*\))/).some(ICON_SELECTOR) && !allowed(file, d.chain, "icon-size")) {
      problems.iconSize.push(where);
    }
    if (TEXT_PROP.test(d.prop) && (MIXED_GRAY.test(d.value) || [...grayVars].some((v) => d.value.includes(`var(${v})`) || d.value.includes(`var(${v},`))) && !allowed(file, d.chain, "mixed-text")) {
      problems.mixedText.push(where);
    }
    if (BLEND.test(d.value) && !allowed(file, d.chain, "hue")) problems.hue.push(where);
  }
}

test("CSS modules are scanned", () => {
  assert.ok(files.length > 50, `found ${files.length} CSS modules`);
});

test("edges and dividers are hairline box-shadows, not borders", () => {
  assert.deepEqual(problems.border, [], "Draw the edge as `box-shadow: inset 0 0 0 var(--ui-hairline) <color>` (or `var(--ui-edge)`), a divider as an inset line on its side, e.g. `inset 0 var(--ui-hairline) 0 var(--ui-border)`.");
});

test("no 1px rings except a focused edge", () => {
  assert.deepEqual(problems.ring, [], "Edges take `var(--ui-hairline)`; only a focused field's edge is 1px.");
});

test("no literal colors outside tokens.css", () => {
  assert.deepEqual(problems.color, [], "Read a --ui-* role (foundation/tokens.css), or add one there.");
});

test("no literal stroke widths: icons read the two stroke tiers", () => {
  assert.deepEqual(problems.stroke, [], "Use var(--ui-icon-stroke), --ui-icon-stroke-regular or --ui-icon-stroke-medium (calc(tier * 16 / size) for a smaller glyph).");
});

test("no --ui-border-subtle", () => {
  assert.deepEqual(problems.subtle, [], "Use --ui-border (lines inside a box) or --ui-border-strong (a box's outline).");
});

test("icons read the icon size scale", () => {
  assert.deepEqual(problems.iconSize, [], "Size an svg, icon, glyph or chevron with var(--ui-icon-md) (16px: beside 14-16px text, in controls), --ui-icon-sm (14px: beside 13px text), --ui-icon-xs (12px: tiny badges and marks) or --ui-icon-lg (20px: a glyph in a tile).");
});

test("text colors are roles, not mixed grays", () => {
  assert.deepEqual(problems.mixedText, [], "Use --ui-foreground, --ui-muted or --ui-subtle (on ink: --ui-on-ink-muted) instead of color-mixing the foreground to a new strength.");
});

test("no hues blended from two status hues", () => {
  assert.deepEqual(problems.hue, [], "Use one of the palette's hues (accent, success, warning, danger); a working state takes the accent.");
});

test("every allowlist entry still matches a file", () => {
  for (const a of ALLOW) assert.ok(files.includes(a.file), `${a.file} is in the allowlist but no longer exists`);
});

// One solid edge (surfaces.md, "One neutral edge for every line"): a
// see-through edge came out darker over the page than over a card or a
// field, so the same token drew two different lines.
test("the edge token is one solid color", () => {
  const tokens = readFileSync("foundation/tokens.css", "utf8");
  const value = /--ui-border-strong:\s*([^;]+);/.exec(tokens)?.[1] ?? "";
  assert.match(value, /^light-dark\(oklch\([\d.]+ 0 0\), oklch\([\d.]+ 0 0\)\)$/, `--ui-border-strong must be solid, got ${value}`);
  for (const name of ["--ui-border", "--ui-border-subtle"]) {
    assert.match(tokens, new RegExp(`${name}:\\s*var\\(--ui-border(-strong)?\\);`), `${name} must alias the one edge`);
  }
});

test("controls you tick rest on the one edge", () => {
  const checkbox = readFileSync("registry/checkbox/checkbox.module.css", "utf8");
  assert.match(/\.box\s*\{[^}]*\}/.exec(checkbox)?.[0] ?? "", /box-shadow: inset 0 0 0 var\(--ui-hairline\) var\(--ui-border-strong\)/);
  const radio = readFileSync("registry/radio-group/radio-group.module.css", "utf8");
  assert.match(radio, /--radio-edge: var\(--ui-border-strong\);/);
});

// Shadows are tokens (surfaces.md, "Elevation"): a box-shadow is built only
// from --ui-shadow-*, the edge tokens and unblurred lines. A blurred layer
// written in a component is a one-off depth; a ring or line is the hairline,
// the 1px focus edge or the knockout, never another weight.
test("shadows come from the tokens; lines are the hairline, focus or knockout", () => {
  const LEN = /^(0|1px|var\(--ui-(hairline|knockout)\)|calc\(var\(--ui-hairline\) \* -1\)|var\(--[a-z-]*width\))$/;
  const bad = [];
  for (const file of files) {
    for (const d of declarations(readFileSync(file, "utf8"))) {
      if (!(d.prop === "box-shadow" || (d.prop.startsWith("--") && /shadow|depth/.test(d.prop)))) continue;
      if (allowed(file, d.chain, "shadow")) continue;
      for (const raw of d.value.split(/,(?![^()]*\))/)) {
        const part = raw.trim();
        if (/^(none|0 0 transparent|var\(--[a-z-]+(, ?0 0 transparent)?\))$/.test(part)) continue;
        // Split on spaces outside parentheses: calc(var(--ui-hairline) * -1) is one length.
        const tokens = [];
        let depth = 0;
        let cur = "";
        for (const ch of part.replace(/^inset\s+/, "")) {
          if (ch === "(") depth++;
          if (ch === ")") depth--;
          if (/\s/.test(ch) && depth === 0) {
            if (cur) tokens.push(cur);
            cur = "";
          } else cur += ch;
        }
        if (cur) tokens.push(cur);
        const lengths = [];
        for (const t of tokens) {
          if (/^(-?[\d.]+(px)?|calc\(.*\)|var\(--ui-(hairline|knockout)\)|var\(--[a-z-]*(width|edge-width)\))$/.test(t)) lengths.push(t);
          else break;
        }
        const [, , blur = "0", spread = "0"] = lengths;
        if (blur !== "0" || !LEN.test(spread) || lengths.slice(0, 2).some((l) => !LEN.test(l))) {
          bad.push(`${file}:${d.line} ${d.chain.at(-1)} { ${d.prop}: ${part} }`);
        }
      }
    }
  }
  assert.deepEqual(bad, [], "Use --ui-shadow-* for depth, and --ui-hairline, 1px (focus) or --ui-knockout for a line.");
});

// Spacing roles (foundation/rules/spacing.md §1): in a block, the space
// between its cards, groups and sections is picked by relationship, so it
// reads --ui-gap-block, --ui-gap-section or --ui-pad-section and grows with
// the block. A raw step of 32 or more (--ui-space-6/7/8, or a literal) on a
// vertical gap, margin or padding is a section-scale gap that skipped the
// roles. Column gaps (a gap's second value) are horizontal and exempt.
test("blocks space sections with the spacing roles, not the raw scale", () => {
  const blocks = readdirSync("registry").filter((d) => {
    try {
      return JSON.parse(readFileSync(path.join("registry", d, "meta.json"), "utf8")).type === "block";
    } catch {
      return false;
    }
  });
  const RAW = /var\(--ui-space-[678]\)|(?<![\w.-])(3[2-9]|[4-9]\d|\d{3,})px/;
  const VERTICAL = /^(row-gap|margin-(top|bottom|block(-start|-end)?)|padding-(top|bottom|block(-start|-end)?))$/;
  // The first value of each shorthand is its block (vertical) part.
  const firstValue = (v) => v.split(/\s+(?![^(]*\))/)[0];
  const bad = [];
  for (const b of blocks) {
    for (const file of cssFiles(path.join("registry", b)).map((f) => f.split(path.sep).join("/"))) {
      for (const d of declarations(readFileSync(file, "utf8"))) {
        const v = d.prop === "gap" ? firstValue(d.value) : VERTICAL.test(d.prop) ? d.value : null;
        if (v && RAW.test(v)) bad.push(`${file}:${d.line} ${d.chain.at(-1)} { ${d.prop}: ${d.value} }`);
      }
    }
  }
  assert.deepEqual(bad, [], "Between cards and the title: var(--ui-gap-block); between sections: var(--ui-gap-section); inside a screen: var(--ui-pad-section).");
});

// Right to left is written as an ancestor's dir attribute (:is([dir="rtl"]) .x),
// never :dir(): build tools that target older browsers rewrite :dir(rtl) into
// a list of right-to-left languages, which matches nothing on a page that only
// sets dir="rtl".
test("right to left is an ancestor's dir attribute, not :dir()", () => {
  const bad = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    src.split("\n").forEach((line, i) => {
      if (/:dir\(/.test(line)) bad.push(`${file}:${i + 1} ${line.trim()}`);
    });
  }
  assert.deepEqual(bad, [], 'Use :is([dir="rtl"]) .x instead of .x:dir(rtl).');
});
