# Surfaces & depth

Goal: surfaces that read as physical without shouting. The strongest finding
from polished production UIs: **elevation comes from background steps and
quiet borders far more often than from heavy shadows.** In light mode a card
gets a soft line and a faint, wide shadow that read as one; nothing heavier
unless it floats.

## 1. Page vs. surface

The page background and card surface are different values — always. One small
step apart:

- Light mode: page is a soft gray (~97% lightness), cards are white. The card
  "pops" with no border or shadow at all.
- Dark mode: **inverted** — cards are *lighter* than the page
  (e.g. page L≈0.15, card L≈0.20 in OKLCH). **No shadows in dark mode,
  anywhere**: the lightness step and the edges are the elevation. Every
  shadow is `light-dark(<light value>, transparent)`.

If the project renders cards on a same-color background with only a shadow,
consider stepping the page background instead — it's calmer and works in dark
mode for free.

## 2. Borders

- **Edges are one flat hairline, drawn as a shadow.** Fields, menus,
  panels, separators and chips take `--ui-hairline` (1px, at a faint
  alpha: a half pixel drew fuzzy on rounded corners) as a
  `box-shadow`: a ring for a box (`var(--ui-edge)`, or
  `inset 0 0 0 var(--ui-hairline) <color>`), an inset line on one side for
  a divider (`inset 0 var(--ui-hairline) 0 <color>` on top,
  `calc(var(--ui-hairline) * -1)` for the bottom). **Never `border`**: a
  border takes layout space and snaps differently from the rings beside
  it, so one box's line drifts from the next. Never a literal `1px` for
  an edge; always the token. No
  glints, lighter top edges or glassy double rings: a plain line fits any
  product the component lands in. The exceptions are deliberate: a
  focused field's edge is 1px (the weight change is part of the focus
  cue), and forced-colors outlines stay 1px so they never vanish.
- **Page layout gets no borders.** Headers, sections, hero bands and
  gallery tiles separate with space and a change of surface, not lines.
- **One neutral edge for every line.** A card's frame, a field, a button,
  a switch's track, a table's row rules, a separator, a key cap: all
  `--ui-border-strong` (drawn by `--ui-edge`; `--ui-border` is the same
  value), one solid neutral at the one hairline weight. Two
  grays side by side read as two thicknesses, a fainter line looks
  thinner, so there is no lighter "inner" tier: a box's insides and its
  frame are the same line. Depth comes from the shadow under a card, not
  from a darker outline.

  Beyond that one:
  - `--ui-field-focus`: a hovered, selected or focused control (or the one
    selected box in a set, like the current plan).
  - A colored edge, only for status or a component's own hue:
    `--ui-border-accent`, `-success`, `-warning`, `-danger`, or a hue (a
    phase, a brand) mixed at `--ui-border-tint`.

  Nothing else, and no exceptions at rest: a checkbox, a radio, a button
  and a card all rest on the same edge. No hand-picked alphas, no
  `color-mix` of the text color for an edge, no second gray: two neutral
  edges that look almost the same read as two weights. The edge is solid,
  not the text color at an alpha: a see-through line comes out darker over
  the page than over a card or a field, so one token drew two lines.
- **One ring per edge.** `--ui-shadow-resting` and `--ui-shadow-floating`
  already carry the outline; don't add `--ui-edge` or another hairline ring
  next to them (`--ui-shadow-raised` has none: pair it with `--ui-edge`).
  Two rings stack into a heavier line, and an inset ring plus an outer one
  draws a double edge. Pick a real `border` or a ring
  `box-shadow` per box, never both.
- Hover states on bordered elements move one step up the set
  (strong → field-focus). Polished hover deltas are
  small — sometimes just a few percent.
- Dividers: either borders or spacing, not both. A fading hairline
  (`h-[var(--ui-hairline)] bg-gradient-to-r from-transparent via-border to-transparent`) is a
  refined divider for centered content.
- Collapse doubled borders in lists/grids: `border-b -mb-px` or
  `divide-y` instead of per-item borders.
- Gradient or animated borders are decoration for one or two hero elements
  per page, max. The robust technique is the concentric wrapper: outer
  element carries the gradient as background, inner element insets by 1px
  (`m-px`) with radius = outer − 1, opaque fill.

### Line weights

One weight for every line on the page, so nothing reads heavier by accident:

- **Edges and dividers: one hairline.** Box-shadow rings and inset lines at
  `--ui-hairline`, never `border` (it renders at twice the weight). Where a
  child's background would cover an inset line (opaque sticky cells, a
  tinted row), draw the line on a `::after` over the children instead.
  Exceptions: a focused field's 1px edge, forced-colors outlines, a 2px
  quote bar, and cut-out rings in the surface color around an overlapping
  mark (an avatar stack, a corner badge).
- **Icon strokes match the text they sit with**, in two tiers:
  `--ui-icon-stroke-regular` beside 400 text, `-medium` beside a 500
  label. No blends, no third tier (typography.md §6).
- **Label weight by role**, the same everywhere: buttons, chips, tabs and
  segments, nav destinations, table headers, field labels and badges at
  500; body, menu and palette rows, list rows (chats, pages, records), field
  values and meta text at 400. The current item in a list may step to 500.

`tests/consistency.test.mjs` fails on a `border` edge, a 1px ring outside
focus, a literal color, a literal `stroke-width` or a literal icon size
(typography.md §6, "Icon sizes") in any CSS module.

## 3. Shadows — when you do use them

- **An edge drawn outside the box needs room outside it.** A ring
  (`box-shadow: 0 0 0 var(--ui-hairline)`) is shaved off by any ancestor that clips at the
  box's own edge. Let the clip reach a hairline further
  (`clip-path: inset(-1px)`) rather than moving the ring inside, which makes
  that one panel a hairline narrower than its neighbors.
- **Light mode: the edge and a soft spread shadow read as one depth.**
  Three steps, each the outline ring plus a tight contact layer and a wide,
  very faint ambient one in the same ink, pulled in by a negative spread so
  it gathers under the box instead of washing sideways. The steps grow in
  reach, not in darkness at the edge. Dark mode has none (§1).
  - `--ui-shadow-resting`: cards and panels on the page. Not a box nested
    inside one: that takes `--ui-edge` alone.
  - `--ui-shadow-raised`: a popover, a featured card, a hovered card (with
    `--ui-edge` or a field-focus ring, since it carries no ring).
  - `--ui-shadow-floating`: menus, dialogs, toasts.

Never write a shadow in a component. Every blurred layer is one of the
tokens above or `--ui-shadow-control`; a ring or line is `--ui-hairline`,
the 1px focus edge, or `--ui-knockout` (the surface-colored ring that cuts
a status dot or a stacked avatar out of what it overlaps).
`tests/consistency.test.mjs` fails on anything else.

- **Every button sits on `--ui-shadow-control`**, filled or not: the
  resting shadow's soft spread at a control's scale, starting below the
  edge, so the bottom line of a button is the same line as its top. No
  contact shadow tight under the edge (it reads as a thicker bottom
  border) and no light line along the top. Pressing drops it: the control
  goes flat as it goes down.

- **Tabs and segmented controls share one look; only their semantics
  differ.** Both are a clear track inside a hairline edge
  (`--ui-track-edge`), with one flat pill under the chosen item
  (`--ui-track-pill`, no shadow, no edge) at `--ui-track-inset` from every
  side, the same label colors and the same glide between items. A chosen
  item in a track isn't lifted: it's marked. Pick by meaning (tabs switch
  panels, a segmented control picks a value), never by look.

- Light-mode ambient opacity lives at 3–16%: wide and faint, never a
  dark band. Dark mode has none (§1).
- Nothing dark touches an edge. A shadow layer that starts at the edge
  (a 1–2px contact shadow) makes the bottom line look thicker than the
  rest; every token's spread starts below it. Fields, which are typed into
  rather than pressed, get the hairline alone.
- Tinted shadows: replace gray with the brand hue at low alpha
  (`0 24px 64px -24px` in the accent color at ~25%) for hero elements —
  reads as glow, never as dirt.
- Don't transition box-shadow on hover; polished UIs change background or
  border color instead. Shadows are static.

### Opaque where things overlap

Anything that can sit on top of a neighbor (stacked avatars, a folded stack
of site icons, tiles in a group) has an opaque fill: the surface, with any
tint mixed into it, never a translucent color over whatever is behind. Dim
a state by fading the mark inside the tile, not the tile.

### Footers in a panel

Buttons sit the same inset from every edge of the panel, concentric with its
corner. Text in the footer (a step count, an error) lines up with the
content above it instead.

### Code

Syntax colors come from the accent and status text roles, mixed in oklch
between hues and in oklab toward the text color so they stay calm, each at
4.5:1 on the code background in both themes. Four hues at most (keywords,
strings, numbers, types); names stay in the text color, so code reads as
text with a few marks. Comments are upright, in the subtle text color.

### Scroll edges

A scroll region that clips content fades only the edge with more past it
(over `--ui-space-6`), never a hard line, and only while something is
actually hidden there. A region that follows new content keeps its
following edge crisp while it follows.

### Phase colors

An agent's working phases (reading, thinking, writing, a source's stages)
all take the accent: the phase's name and glyph say which one. Green and
red keep meaning done and failed, grey paused or stopped. One variable
carries the state, and every "now" element (the dot, the bar, the running
step) reads it. No hue blended from two status hues: a component that
wants its own color for a phase exposes a variable for the product to set.

### Few colors

Every text, icon and fill on a page comes from one short list, so a screen
reads as one system:

- **Text and icons:** `--ui-foreground`, `--ui-muted`, `--ui-subtle`, the
  four status text roles (`--ui-accent-text`, `-success-text`,
  `-warning-text`, `-danger-text`), and on a filled control `--ui-on-ink`,
  `--ui-on-ink-muted`, `--ui-on-accent`. Never the foreground color-mixed to
  a new strength (82%, 60%): pick the role a step up or down.
- **Fills:** `--ui-fill` and `--ui-fill-strong` (translucent), the same
  two opaque as `--ui-fill-solid` and `--ui-fill-strong-solid` where they
  must hide what's under them, and one tint per status hue
  (`--ui-accent-tint`, `-success-tint`, `-warning-tint`, `-danger-tint`)
  behind status text. Not a fourth gray at 3% or 7%, not a status tint at
  6, 8 or 12%.
- **Pressed and chosen** states may step past these (16% under a pressed
  row), but the same step everywhere.
- Exceptions, named: a chart's series, syntax colors in code, real brand
  marks, a theme builder's swatches.

`tests/consistency.test.mjs` fails on a text color mixed from the
foreground and on a hue blended from two status hues.

### A stored theme

Set it with an inline script in `<head>` before paint, on `<html
data-theme>`. Anything that shows the theme (a toggle's icon) draws from that
attribute in CSS until it hydrates, then carries the same state, so nothing
flips at hydration. A change crossfades the page quickly, with no wipe, and
switches at once with reduced motion.

### Color-scheme islands

A region shown in the other theme (a light preview on a dark page) sets
`data-theme`, not just `color-scheme`: a `light-dark()` token resolves where
it's declared, so only redeclaring the tokens there gives that region its own
shadows and tints.

### Real marks for real services

Show a service with its real mark, inline as SVG, unaltered, with its name
in text beside it; a letter tile only when there's no mark. Invented logos
for real-looking services read as fake.

## 4. Radius

- One scale, derived from a single knob where possible:
  `--radius: 10px` with sm/md/lg/xl as ±2–4px `calc()` offsets. Controls
  (buttons, chips, badges, pills) very often go fully round — `rounded-full`
  is the most-used radius in polished products.
- **Concentric rule, no exceptions: inner radius = outer radius − gap.** A
  card at 16px containing media inset by 4px gives the media 12px. A menu at
  14px with 6px padding gives its highlighted row 8px. Nested equal radii
  look wrong at the corners every time.
  - Write the relationship, not the result:
    `border-radius: calc(var(--ui-radius-md) - 6px)`, so changing the outer
    radius or the padding keeps them lined up.
  - A pill inside a pill lines up when the inner pill's height equals the
    outer pill's height minus twice the gap.
  - If the math lands under ~4px, change the padding or the outer radius;
    don't square the inner corner off.
  - On pseudo-element overlays use `border-radius: inherit`.
- Consistency beats taste: any radius not on the scale is a defect.
- **The radius says what a thing is.** Pick by role, never per component:

  | Role | Radius | Examples |
  |---|---|---|
  | Things you press | full | buttons, segmented controls, tabs, chips, a compact select in a toolbar |
  | Fields you type in or choose from | md | text field, select, combobox, date, phone, number, each code box |
  | Boxes, panels and cards | lg (24) | cards, tables, code blocks, diffs, menus, dialogs, command palette, drop zone, composer |
  | Anything nested | outer − gap | options in a list, a button inside a field |

  A select in a form is a field, so it matches the text field beside it; only
  the compact toolbar select is a pill, like the buttons around it. A list
  that opens from a field takes the field's radius, so the two read as one
  piece. A field that holds round buttons is the exception that follows the
  concentric rule: its radius is the button's radius plus the gap.

## 5. Color tokens & states

- **One small, fixed palette:** neutrals, ink, one accent, and three status
  tones (success, warning, danger). Nothing else gets a hue.
  - Tune each theme on its own. One value for both sits at a mid
    lightness and modest chroma: gray on white, dull on black. In each
    theme take the most saturated value that stays in sRGB at a lightness
    holding 3:1 for fills, lines and icons and 4.5:1 for text: on light,
    fills around oklch L 0.55–0.67 and text around 0.5; on dark, fills
    0.6–0.78 and text 0.74–0.85. Keep a hue deeper wherever white text sits
    on it (accent, danger). Tints are the hue at 10% (16% in dark): the `--ui-*-tint` tokens.
  - Ink (`--ui-ink`, the text color as a fill) is for the strongest action:
    primary buttons, send, tooltips.
  - Accent (`--ui-accent`) is a real accent: used sparingly, only where the
    eye must find an on or chosen state among neutrals. A switch that's on,
    a checked box or radio, the selected day, a slider's range (a chosen value,
    like a switch that's on). Progress bars, meters, borders and bands stay
    neutral. A knob (a switch or slider thumb) is the raised surface in light
    and a light gray in dark: a knob the color of the surface reads as a hole
    in a dark track. If two accented things compete on one screen, one of
    them shouldn't be.
  - Status tones only ever mean that: success, needs attention (warning,
    amber), failed (danger).
  - One quiet touch takes it too, since it only shows while you act:
    selected text, as a pale tint. The caret stays the text color.
- Derive interaction states instead of inventing colors:

```css
.row:hover  { background: color-mix(in srgb, var(--foreground) 6%, transparent); }
.row:active { background: color-mix(in srgb, var(--foreground) 10%, transparent); transition-duration: 0s; }
```

  Hover ~5–8% of foreground, active ~10% — and active applies instantly
  (release eases back).
- Semantic tokens (`--background`, `--surface`, `--muted`, `--border`,
  `--ring`, `--destructive`) beat raw palette references in components. If
  the project has semantic tokens, never bypass them with a raw hex.
- Dark mode adjustments that are commonly missed: destructive/error colors
  get *lighter and less saturated* in dark mode; low-alpha error tints need
  roughly double the alpha to stay visible.
- The "alert tint" trio for banners/badges of any status color:
  30%-alpha border + 10%-alpha fill + solid text in the status color.

## 6. Overlays, without blur

Blur is the most overused effect in generated UI. It smears text behind it,
costs a compositing layer per element, and dates fast. Default to none.

- Floating surfaces (menus, popovers, toasts, sheets) are opaque: the
  surface color, a hairline and a shadow. They read as above the page
  by shadow, not by frosting what's under them.
- Modal scrims: a plain dim, roughly black at 25–30% in light mode and
  50–55% in dark. No `backdrop-filter`.
- Motion never blurs: letters, words and icons enter and leave with opacity
  and a small translate, not `filter: blur()`.
- Edge fades on scrollable rows are masks, not blur:
  `mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent)`.
- If a design truly needs glass (media behind a control), one layer per
  screen, never nested, and the text on it must pass contrast without it.

## 7. Headers

Default to a header that scrolls away with the page. A sticky bar costs
reading height on every screen for links people rarely need mid-page. Make a
header sticky only when it holds controls used while scrolling (a document
toolbar, filters). Then: the page's own background color, solid, no line
under it, no blur, and its height published as `--header-height` for
`scroll-padding-top` and sticky offsets below it.

## 8. Scrollbars & small chrome

- Custom scrollbars only inside app panes (chat, code, file trees): thin
  (4–8px), transparent track, subtle thumb with a hover step, plus the
  standard `scrollbar-width: thin; scrollbar-color: ...` for Firefox.
  Leave the page scrollbar alone.
- Hide-scrollbar utilities need all three properties
  (`::-webkit-scrollbar { display: none }`, `scrollbar-width: none`,
  `-ms-overflow-style: none`) and must only be used where scrolling is
  visually obvious without the bar.
- Decorative images: `pointer-events-none select-none draggable="false"`.
- Icons inherit `currentColor`; inside buttons, `[&_svg]:shrink-0` and
  pointer-events none. Keep one stroke weight across the icon set.

## 9. Restraint checklist

- Gradients, glows, conic borders, textures: at most one or two attention
  moments per screen. If every card glows, none does.
- No pure-black shadows at high opacity in light mode; in dark mode the
  one edge is a neutral a step lighter than the surface, never a dark gray.
- Elevation levels in the app: aim for three, not seven — resting, raised
  (dropdown/popover), overlay (modal). Each maps to one consistent
  surface + border + shadow combination.
