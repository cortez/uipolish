# Spacing & layout

Goal: spacing that encodes relationships. The gap between two elements should
tell the user whether they belong together — proximity is hierarchy. Most
"feels cramped/feels scattered" complaints are grouping problems, not
quantity-of-whitespace problems.

## 1. The system

Base unit 4px, favor steps that land on 8: **8, 12, 16, 20, 24, 32, 40, 48,
64, 80, 96**. If the project has a spacing scale, use its steps exclusively;
hunt down one-off values (`mt-[13px]`, `margin: 17px`) and snap them to the
scale.

### Spacing roles: pick by relationship, never by component

On top of the raw scale (`--ui-space-1`…`8`) sit a few roles, one per
relationship. Ask *what is this space between, or inside?* and take that
role; never pick a number because of which component you're in. The same
relationship gets the same token everywhere, so a page's rhythm holds when
pieces move between screens.

| Role | Value | For |
|---|---|---|
| `--ui-pad-tag` | 12 | Inside a badge, tag or count pill: half its 24px height, so the label starts where the round end stops |
| `--ui-pad-tag-sm` | 8 | A 20px tag, and a tag inside a sentence |
| `--ui-pad-row` | 12 | Inside a row of a menu or a list in a panel, inline. Never less than the row's radius |
| `--ui-inset-menu` | 12 | A menu's inset around its rows (rows take panel radius − inset) |
| `--ui-pad-card` | 16 → 24 | Inside a card or panel |
| `--ui-pad-section` | 24 → 40 | Inside a screen, a page-level block, a demo stage |
| `--ui-gap-tight` | 4 | Lines of one thing: a title and its description, a label and its value |
| `--ui-gap-inline` | 8 | Side by side in a row: icon and label, tag and tag, button and button |
| `--ui-gap-stack` | 12 | Items of one group: fields in a cluster, the rows of a card |
| `--ui-gap-group` | 16 → 24 | Groups inside a card or section; a section's heading above its content |
| `--ui-gap-block` | 16 → 32 | Cards and panels in a layout; a screen's title above its content |
| `--ui-gap-section` | 48 → 72 | Sections of a screen or page |

- **Fluid by container, on the grid.** The `→` roles grow with the width of
  the nearest size container (`cqi`; the viewport when there is none) and
  round to the 4px grid (sections to 8): `round(clamp(min, slope, max), 4px)`.
  A block in a narrow pane stays compact, the same block on a wide screen
  breathes, and no value lands between pixels. Make the frame a block lives
  in (a demo stage, a pane) a size container so its blocks read its width.
- A role resolves where it's used: on an element that is itself a container,
  `cqi` reads the container *around* it. Set section and block gaps on a
  container's children, or accept that its own gap reads the frame.
- Keep a component's own variable when several rules share one inset
  (`--pricing-inset: var(--ui-pad-card)`), so they move together.
- Reach for the raw scale only inside a component's own geometry (a 2px
  optical nudge, a control's internal inset); never for the space between
  cards, groups or sections.

Ratio rule for grouping: **space within a group ≤ half the space between
groups.** A label sits 4–8px from its input; that pair sits 16–24px from the
next field; the whole form sits 48–96px from the next section. If inner and
outer gaps are equal, the eye can't parse structure.

## 2. Vertical rhythm

- Inside sections and stacks, use `gap` (flex/grid) or `space-y-*`, not
  per-child margins. Margins on children leak and collapse; gaps are owned by
  the parent.
- Canonical ladder, as roles: `--ui-gap-inline`/`--ui-gap-stack` inside a
  control cluster, `--ui-gap-group` heading → body, `--ui-gap-block`
  between cards and subsections, `--ui-gap-section` between major blocks.
  (Tailwind: `gap-2`/`gap-3`, `gap-6`, `gap-8`, `gap-12`+.)
- Section padding scales with a clean multiplier from mobile to desktop —
  1.5–2×, never an ad-hoc pair:

```
py-12 md:py-24     /* standard content section */
py-16 lg:py-24     /* moderate */
py-20 lg:py-40     /* large marketing section */
```

- In prose, space *before* a heading should be ~2–3× the space after it, so
  the heading visually attaches to what it introduces. Modern CSS can derive
  this instead of hardcoding per element:

```css
:is(p, ul, ol, blockquote) { margin-block-end: 1em; }
h2 { margin-block-end: 0.75em; }
*:has(+ h2) { margin-block-end: 2.5em; }      /* big gap before a heading */
h2:has(+ h3) { margin-block-end: 0.75em; }    /* unless it's a stacked subhead */
p:has(+ ul) { margin-block-end: 0.25em; }     /* a list belongs to its lead-in */
```


## 3. Horizontal gutters & containers

- One gutter ladder for the whole app: `px-4 sm:px-6 lg:px-8` (conservative
  app chrome) or `px-5 lg:px-20` (airy marketing). Not both.
- Better: a gutter token so everything computes from it:

```css
:root { --gutter: 1rem; }
@media (min-width: 1024px) { :root { --gutter: 2rem; } }
.container { max-width: 80rem; margin-inline: auto; padding-inline: var(--gutter); }
```

- Container widths: ~1280–1400px for full layouts, `max-w-3xl` for section
  intros, `max-w-2xl`/`65ch` for reading columns. The `min()` idiom replaces
  max-width + padding pairs: `width: min(1340px, 100% - 2 * var(--gutter))`.

## 4. Alignment

- Edges align or they don't — there is no "close". Check that section
  headings, body copy, and cards share a left edge; ragged starts read as
  broken.
- Optical alignment beats box alignment: icons next to text usually need a
  1px nudge; play-style triangles need centering by visual mass. A text
  baseline next to a larger sibling wants `items-baseline`, not `items-center`.
- Icon + label gaps: 6–8px (`gap-1.5`/`gap-2`). Icon size ~1.0–1.2× the text's
  cap height — 16px icons with 14px text, 20px with 16px.
- Fixed-position chrome (toasts, FABs) offsets from the viewport by the same
  step everywhere (16 or 24px), and respects safe-area insets on mobile:
  `bottom: max(1rem, env(safe-area-inset-bottom))`.

## 5. Component-level spacing

- **Buttons**: horizontal padding ≈ 2–2.5× vertical (e.g. `px-4 py-2`).
  Heights come from one scale, 8px apart: 32 / 40 / 48px
  (`--ui-control-sm/md/lg`). Steps closer than 8px read as a mistake beside
  each other, and a jump of 14 reads as two different families. Everything
  that sits in a row with a button takes a height from this scale, including
  composite controls: a segmented control or a switch is measured whole,
  track included, not by its inner pill. Icon-only buttons are
  square, same height as their text siblings.
- **Buttons are the standard control height (40).** Page actions, card and
  row actions, dialog footers, banners, empty states, form submits and demo
  toolbars all use the default size. The small size (32) is only for a
  button inside another control or a compact control strip, where 40 would
  break the control: Copy in a code block's header, send or attach in a
  prompt input, an icon button in a dense toolbar or a row's overflow menu.
  When in doubt, use the default. A row that holds a button is at least 40
  tall; a ghost button that lines up with text beside it pulls back by its
  20px padding, not the small size's 14.
- **Controls in one row share one height.** A toolbar, a filter bar, a
  form's actions or a demo's controls pick one step and every control in
  the row takes it: a search field (40px) sets its select and segmented
  control to 40, not 32 beside it. Only a control nested inside another
  (a field's clear button, the copy button inside a command pill) is
  smaller, inset evenly on every side.
- **Cards**: one internal padding value per card (`--ui-pad-card`), not
  different values per side. Media that bleeds to the card edge needs the
  card's `overflow-hidden` and radius handling (see surfaces.md).
- **Menus and lists in a panel** (dropdown and context menus, select and
  combobox lists, the command palette, a model picker): rows are rounded
  rectangles, never pills. The panel insets its rows evenly and each row
  takes the concentric radius, panel radius − inset (a menu: 24 − 12 = 12;
  a field's list: 14 − 4 = 10). Row text sits `--ui-pad-row` (12) in, at
  least the row's radius, so it never runs into the curve. A group label,
  a search row or a status line starts its text where the rows' text does.
  A pill row on a short row puts the text inside the round end and reads
  cramped however much padding it gets.
- **Inputs**: same height ladder as buttons so they line up in rows. Label
  4–8px above the field; help/error text 4–6px below.
- **Optical padding**: a control's text sits the same distance in on every
  field in a form (14px). A trailing chevron or icon carries air inside its
  own box, so the padding after it is smaller (10px) to read as even.
- **Lists/tables**: row padding consistent, `py-2.5`–`py-3` for dense UI,
  `py-4` for comfortable. Dividers OR spacing — using both is redundant.
- **Connectors (steppers, timelines, pipelines)**: a line between two nodes
  stops one fixed gap short of each node's outermost edge, the same at both
  ends and in every state. So nothing state-driven grows past a node toward
  its line: a running or selected node changes its own fill and edge, not a
  ring or halo outside it, and a selection tint sits behind the text, never
  around the node the line meets. A corner badge may hang off a node only
  away from the line's axis. A moving highlight is the line itself
  brightening (tint the line, move a brighter stretch of it), never a
  second stroke laid over a grey one.

## 6. Breathing room failures to hunt

- Text touching container edges (missing padding on mobile).
- Buttons/badges where the text nearly touches the border — a pill with
  `px-2` at 14px text is always cramped; start at `px-3`
  (`--ui-pad-tag`: half the pill's height).
- Headings glued to the content above them instead of below (the 2:1 rule
  inverted).
- Full-bleed sections whose *content* forgot the gutter.
- Elements centered vertically in a taller sibling when they should be
  top-aligned (multi-line text next to an avatar or checkbox: align to the
  first line, e.g. `items-start` + small top offset).

## 7. Responsive collapse

- **Components adapt to their container, not the viewport.** A component
  that can sit in a narrow pane (a list, a card, a form row) makes itself a
  size container and folds with `@container`; viewport `@media` is for page
  chrome. A container query can't style its own container, so set the
  variables on its child. A grid's columns are `minmax(0, 1fr)`, never a
  bare `auto` that grows to the widest content, and nothing has a fixed
  width or `min-width` wider than a 320px phone.
- **On phones:** primary actions are 40px+ to the touch (grow a smaller
  control's hit area with a pseudo-element on `pointer: coarse`, not its
  look) and within the thumb's reach, spanning the card when stacked;
  prose tables stack, data tables scroll in their own box with the first
  column pinned; sheets, dialogs and drawers come up from the bottom, clear
  of `env(safe-area-inset-bottom)`; a bottom bar spans the width with its
  items sharing it evenly. A row of controls that can't fit wraps whole
  controls or scrolls inside its own track, never one word per line.

- Multi-column grids collapse in content order — verify the order still makes
  sense stacked. `lg:grid-cols-2` with a media-right layout often needs
  `order-first` on the media at mobile.
- Reduce, don't remove: section padding halves on mobile, it doesn't vanish.
- Anything `sticky` on desktop should usually stop being sticky on short
  viewports (`lg:sticky` rather than `sticky`).
- Never let horizontal scroll leak: wide tables and code blocks get their own
  `overflow-x-auto` wrapper; the page body never scrolls sideways.
- A table of prose (states, props, options) stacks when its box is too
  narrow for its columns: each row becomes a block, its first cell the title
  and every other value under its column's name. Sideways scroll is for
  data a person compares across columns, never for sentences.
