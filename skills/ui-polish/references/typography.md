# Typography

Goal: hierarchy you can feel without reading. Work top-down: fix the scale, then
line-height, then wrapping, then details. If the project already has a type
scale, patch its weak steps instead of replacing it.

## 1. The scale

A type step is a size **with the line-height it is set on**, plus a weight.
Never ship a bare `font-size`, and never pick a value between steps: if a step
is missing, the scale is wrong, not the component.

**Four styles, and only four.** A fifth size is never the answer: pick the
nearest of these, or change the layout.

| Style | Token | Size | Line-height | Weight | Use |
|---|---|---|---|---|---|
| Title | `display` | clamp(30px, 1.6vw + 1rem, 38px) | 1.1 | 500 | Page titles, h1 |
| Heading | `2xl` | 22px | 28px | 500 (550 in components) | Section headings, h2, big figures |
| Body | `md` | 15px | 22px | 400; 500 for control labels | Text, controls, menus, fields, subheads |
| Small | `sm` | 13px | 18px | 400; 500 for badges | Secondary text, captions, field messages, meta |

Running text of more than a couple of lines takes `--ui-leading-prose` (1.6)
at Body size. Inline code is mono at `--ui-text-code` (0.875em) of the text
it sits in, which is the same style in another face, not a new one.

Tokens: `--ui-text-{sm,md,2xl,display}`, `--ui-leading-{sm,md,2xl,display}`
(the old `xs`, `lg` and `xl` steps alias into these),
`--ui-leading-prose`, `--ui-text-code`, `--ui-weight-{regular,medium,semibold}`,
`--ui-measure`, `--ui-text-touch`.

- Line-heights are px for the UI steps so rows line up: 13px text in a 20px
  row (a footer beside 14px text, a field message) takes `--ui-leading-md`,
  not its own 18px.
- Controls, pills and badges use `line-height: 1` so padding alone sets the
  box. That's a rule, not a step.
- Weight: 400 to read, 500 for labels and controls (12–14px UI text at 400
  looks thin), 550–600 for titles. Large display type never goes past 600.
- Mono uses the step it sits in: code blocks at `sm` / `md` leading, inline
  code at `--ui-text-code` (mono sets wider than the text face, so the same
  size looks bigger).

Keep each step's size, line height and weight together as one set of
tokens, so they're never mixed across steps:

```css
:root {
  --text-2xl: 22px;
  --text-2xl-line-height: 28px;
  --text-2xl-weight: 600;
}
```

## 2. Letter-spacing: text untracked, headings a touch tighter

**Text up to 17px is untracked.** `letter-spacing` stays `normal` on body,
labels and components. Two reasons, both measured in Chromium and WebKit with
system-ui:

- **Any letter-spacing switches optional ligatures off.** At −0.01em, −0.03em
  and +0.06em alike, Chromium drops the contextual forms of the system face
  (the colon in `12:30` drops from figure height to the baseline) and the
  fi / fl / ffi ligatures of faces that have them. WebKit keeps the system
  face's contextual forms but drops other faces' ligatures.
  `font-variant-ligatures` never brings them back; `font-feature-settings`
  brings back some in one engine and not the other. There's no reliable
  override, only not tracking.
- **The system face already tracks itself.** SF Pro switches optical size
  with font size (`font-optical-sizing: auto`, the default) and tightens as
  it grows: the same line is about 0.06em per letter tighter at 76px than at
  11px, with no letter-spacing. Negative tracking on a heading doubles that.

**Headings from 22px up carry a little negative tracking**: `--ui-tracking-heading`
(−0.01em) at 22px and `--ui-tracking-title` (−0.02em) on display sizes. The
face's own tightening is tuned for reading, and a heading set at its default
reads as separate letters instead of one shape. At these sizes the system
face has no ligatures to lose, and a heading rarely contains a time, so the
cost from the first point doesn't apply. Set it on the heading's class, never
on the `h1`–`h3` elements globally: a small `h2` used as a 13px label must
stay untracked.

The other exception is all-caps: short uppercase labels need air,
`letter-spacing: var(--ui-tracking-caps)` (0.06em). There are no ligatures
to lose in a three-word uppercase label.

If the project ships its own web font that has no optical sizes, a large
display step can carry a small negative tracking. Check it in Chromium with a
word that has fi or fl and see what you lose.

## 3. Line-height

| Role | Line-height |
|---|---|
| Display (32–44px) | 1.1 |
| Headings (17–22px) | 24 / 28px |
| UI text (12–15px) | 16 / 18 / 20 / 22px |
| Running text, any size | 1.6 |
| Buttons, pills, badges, labels | 1, so padding alone controls the box |

The most common single miss: headings inheriting body line-height. A 22px
heading at 1.5 has a hole in the middle of the layout.

## 4. Wrapping, measure, truncation

- **`text-wrap: pretty` is the default for all body text, not an opt-in.**
  Set it once on the root (`html { text-wrap: pretty; }`); it inherits into
  everything, so no component has to remember it, it costs nothing where
  lines don't wrap and removes orphans everywhere they do. Its absence on
  any multi-line paragraph is a defect.
- `text-wrap: balance` globally on every heading, caption and legend
  (`:where(h1, h2, h3, h4, h5, h6, caption, figcaption, legend) { … }`), and on
  any other text ≤ 3 lines (card titles, section intros, empty-state
  messages). Balance for headings and short blocks, pretty for prose. Don't
  put balance on long paragraphs; browsers ignore it past a few lines anyway.
- Prose measure: `max-width: var(--ui-measure)` (65ch) on paragraphs and
  lists. A container can be wider for tables and code; the paragraphs inside
  it can't. Heading measure is *narrower* than body measure so display lines
  break 2–3 words in.
- `hanging-punctuation: first` on prose, so an opening quote hangs outside
  the text edge (Safari; ignored elsewhere).
- `white-space: nowrap` on pills, buttons and table headers.

### Wrap, don't cut

Text a person needs to read in full (a name, an email, a file name, a page
title, a chip's label) wraps. A long unbroken string breaks inside itself
only when there's nowhere else to break, and the box around it grows: a chip
becomes a rounded box, a row gets taller. Cutting it with "…" or a fade hides
exactly the part that tells two items apart.

```css
.fileName { composes: wrap from "../text/text.module.css"; }
```

Cut text only where the height is fixed for a reason: rows of a virtualized
table, a single-line native input. There, use a fade, never an ellipsis,
and put the full text in `title` too. That's the one exception.

A read-only value inside a fixed-height control (a copy field, a token, a
URL) is the other case: one line, the end faded, the full value in `title`.
Wrapping inside a control's height spills out of it.

### When text must be cut: fade, not an ellipsis

Fade its last 24px out instead of cutting to "…". **Only fade when the text
is actually cut.** A fade on a label that fits looks like a rendering bug.

```css
.cellValue { composes: truncate from "../text/text.module.css"; }
.excerpt   { composes: truncateLines from "../text/text.module.css"; --truncate-lines: 2; }
```

It needs no script. `overflow: hidden` makes the element a scroll
container, and it only has a scroll range while the content overflows. An
animation on `scroll(self inline)` sets the fade width; with no range the
timeline is inactive and the fade stays 0. The mask runs `to right`, or
`to left` inside a `dir="rtl"` ancestor. Write that as
`:is([dir="rtl"]) .x`, not `:dir(rtl)`: the CSS transpiler rewrites
`:dir()` into a list of `:lang()` matches, which misses `dir` attributes.
Browsers without scroll timelines fall back to
the ellipsis.

- The full string stays in the DOM, so screen readers read all of it.
  Where the cut part carries meaning (an extension, a title), also put it in
  `title`. That's a convenience for mouse users, not the fix: if the cut text
  is the only way to tell two rows apart, give it room.
- Never truncate the only label on a control, an error message, or copy you
  wrote: shorten or wrap instead.
- Nothing else on the element may set `animation` or `mask-image`. Put a
  sweep or shimmer on a span inside; nested masks multiply.

### Tabular figures need a face that has them

`font-variant-numeric: tabular-nums` does nothing in a font without the
`tnum` feature. Check that the font ships it (measure two digits' widths
with and without it) before relying on it to stop numbers jiggling. A
readout that must keep its width without them reserves the width of its
widest value.

### A badge or pill inside a sentence

Shorter than the line (20px in a 24px line), its label on the sentence's
baseline, 2px of room at each side. Never as tall as the line: it touches
the lines above and below, and punctuation butts against it.

## 5. Numerics & details

- `font-variant-numeric: tabular-nums` on anything numeric that changes or
  aligns vertically: timers, counters, file sizes, prices in lists, line
  numbers, stat tiles. A two-second fix that kills row jitter.
- Curly quotes and real apostrophes (’ “ ”) in interface copy; straight
  quotes stay in code.
- Ellipsis character (…) not three periods, in copy like "Searching…".
- All-caps eyebrow labels: `xs`, uppercase, `--ui-tracking-caps`, muted.
  Don't use `font-variant: small-caps` with fonts that don't have them.
- Code turns ligatures off (`font-variant-ligatures: none`), so `!=` and
  `=>` stay two characters. tokens.css does this once for `code, kbd, pre,
  samp`; put mono text in those elements rather than a styled span. Set mono
  with `font-family` and the size longhands: a `font:` shorthand resets
  `font-variant-ligatures` and turns them back on.

## 6. Icons beside text

An icon next to a label should look like the same weight as the label's
letters: **icon stroke matches the text's stem**.

- Measured on the system face (stem of `l` at 3× scale): a vertical stem is
  about **0.085em at 400, 0.104em at 500, 0.123em at 600**. 14px / 500 text
  has a 1.46px stem; 13px / 400 has 1.10px.
- A stroke in a 16-unit viewBox renders at `size / 16 × stroke` px, so the
  stroke number is `stem × 16 / icon size`. A 14px icon needs a slightly
  higher number than a 16px one for the same weight.
- Size: 16px icons beside 14–16px text, 14px beside 13px (the scale is
  under "Icon sizes" below). The icon's drawn
  height (about 9.5 of 16 units) then sits between the x-height and the cap
  height. Centre it on the line box, not the baseline; with `line-height: 1`
  and `align-items: center` the system face is already optically centred.
- **A control beside a label that can wrap** (checkbox, radio, switch) sits
  on the first line, its centre on the middle of that line's capitals:
  baseline-align it, then shift by `size / 2 − 0.5cap`. Give the `cap` unit
  a fallback (`@supports not (height: 1cap)` → `0.35em`, half the system
  face's cap height): without one, Safari before 17.2 drops the control onto
  the baseline, 2–6px high. A control with no label is centred in its cell.

Tokens (16-unit viewBox numbers, measured against DM Sans at 3x: a 15px
stem is 1.25px at 400 and 1.48px at 500):

| Token | Value | Text it matches |
|---|---|---|
| `--ui-icon-stroke-regular` | 1.25 | 400 |
| `--ui-icon-stroke-medium` | 1.5 | 500 |
| `--ui-icon-stroke` | medium | what icons read |

**Two tiers, picked by the weight of the label beside the icon.** Icons
read `stroke-width: var(--ui-icon-stroke)`. Set it once where the text
weight is known: buttons, tabs, segments, nav items and chips (500) set
medium; field adornments, menu and palette rows, and icons in running text
(400) set regular. An icon-only button is a button: medium. No blends
between the tiers, no third tier (`--ui-icon-stroke-semibold` is the medium
value, kept for older code), no literal `stroke-width`. A glyph drawn
smaller than 16px on its own (in a node or a tile) keeps the line:
`calc(var(--ui-icon-stroke-medium) * 16 / 14)` at 14px. Don't add weight
to an icon on a filled control to "hold up": match the label.

### Icon sizes

Four sizes, picked by the text the icon sits with, never by the component:

| Token | Size | Where |
|---|---|---|
| `--ui-icon-md` | 16px | Beside 14–16px text, and in every control (button, field, select, menu row) |
| `--ui-icon-sm` | 14px | Beside 13px text: sm controls, meta lines, notes, a 13px disclosure |
| `--ui-icon-xs` | 12px | Only a tiny mark in a node, a corner badge or a 24px tile |
| `--ui-icon-lg` | 20px | A glyph alone in a 36–44px tile |

- **Every chevron is `--ui-icon-chevron` (14px)**, whatever the text
  beside it: accordion, reasoning, tool steps, sources, sidebar rows,
  select and menu triggers. A chevron is a hint, not a glyph: at the
  icons' 16px it outweighs the label. The Icon component sizes any
  `chevron-*` this way, so a chevron needs no size of its own.
- **No sizes in between** (15, 18, 22px). A glyph that needs to read bigger
  steps to `lg`; one in a tight node steps to `xs`.
- Sizes read the tokens, never a literal: `width: var(--ui-icon-sm)`.

## 7. Responsive type

Discrete 2–3 stop jumps for almost everything:

```
text-2xl md:text-3xl              /* card/section headings */
text-4xl md:text-5xl lg:text-6xl  /* page headings */
text-5xl md:text-7xl lg:text-8xl  /* hero */
```

Reserve `clamp()` for hero display type only. Give it a rem intercept so small
viewports don't collapse: `font-size: clamp(2rem, 5vw + 0.35rem, 4rem)`. When a
title comes from a CMS or user data, size conditionally on length — long titles
get one step smaller and a wider container.

**Form inputs: minimum 16px on touch** or iOS Safari zooms the page on focus:
`@media (pointer: coarse) { .input { font-size: var(--ui-text-touch); } }`.

Anchor targets under a sticky header need `scroll-margin-top` (roughly header
height + 16px), or in-page links bury headings under the nav.

## 8. Text color hierarchy

Pick ONE system and use it everywhere:

- **Alpha ladder** on the foreground color: 100% headings / 80% body /
  60–70% secondary / 50% meta / 40% disabled-ish. Six rungs ~10% apart is the
  finest distinction that stays perceptible.
- **Token ramp**: gray-900 headings, gray-700 body, gray-600 secondary,
  gray-400 placeholder — with `light-dark()` or dark-mode overrides. The
  mid-tone secondary color often works unchanged in both modes.

Either way, secondary text must stay ≥ 4.5:1 contrast for body sizes. The
token ramp here is `--ui-foreground` / `--ui-muted` / `--ui-subtle` at 15 / 46 /
55% lightness (96 / 72 / 60% dark); all three hold 4.5:1 on canvas and
surface in both themes. `--ui-subtle` on a filled control sits just under, so
use `--ui-muted` there.
A refined default: body copy slightly muted, headings at full contrast — the
hierarchy reads even in a squint test.

## 9. Rendering hygiene (once, globally)

```css
html {
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  scrollbar-gutter: stable;      /* kills layout shift when modals lock scroll */
}
```

System font stack as the default: `system-ui, -apple-system,
BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto,
"Helvetica Neue", Arial, sans-serif` plus the color emoji faces. Nothing to
download, no layout shift, and each platform's best-tuned UI face.

Ligatures, contextual forms, kerning and optical sizing are all **on by
default**. Leave them on by not fighting them:

- No `letter-spacing` on text under 22px; headings use the heading tokens (section 2).
- Never `font-optical-sizing: none`: WebKit then sets every size in the
  display cut, too tight below 20px.
- Prefer `font-variant-*` to `font-feature-settings`. Feature settings don't
  merge: a component that sets `"tnum"` that way silently drops every other
  feature it inherited.
- A `font:` shorthand resets `font-variant-ligatures`, `font-kerning` and
  `font-optical-sizing` to their defaults. For text that's harmless (the
  defaults are on); for code it turns ligatures back on.

On Apple the system face has no fi / fl ligatures to show; what tracking costs
it is its contextual forms. On Windows and Android the system faces' own
ligatures are what tracking turns off.

If the project ships web fonts: `font-display: swap` on every face, `.woff2`
only, preload only the one face used above the fold. Never add a new font
dependency yourself.
