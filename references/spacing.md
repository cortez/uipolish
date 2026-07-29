# Spacing & layout pass

Goal: spacing that encodes relationships. The gap between two elements should
tell the user whether they belong together — proximity is hierarchy. Most
"feels cramped/feels scattered" complaints are grouping problems, not
quantity-of-whitespace problems.

## 1. The system

Base unit 4px, favor steps that land on 8: **8, 12, 16, 20, 24, 32, 40, 48,
64, 80, 96**. If the project has a spacing scale, use its steps exclusively;
hunt down one-off values (`mt-[13px]`, `margin: 17px`) and snap them to the
scale.

Ratio rule for grouping: **space within a group ≤ half the space between
groups.** A label sits 4–8px from its input; that pair sits 16–24px from the
next field; the whole form sits 48–96px from the next section. If inner and
outer gaps are equal, the eye can't parse structure.

## 2. Vertical rhythm

- Inside sections and stacks, use `gap` (flex/grid) or `space-y-*`, not
  per-child margins. Margins on children leak and collapse; gaps are owned by
  the parent.
- Canonical intra-section ladder: `gap-2`/`gap-3` inside a control cluster,
  `gap-6` heading → body, `gap-8`–`gap-10` between subsections, `gap-16`+
  between major blocks.
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

(Tailwind shorthand for the same instinct: `not-first:mt-12` on prose headings.)

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
  Heights consistent per size tier: 32 / 36 / 40 / 44px. Icon-only buttons are
  square, same height as their text siblings.
- **Cards**: one internal padding value per card (16, 20, or 24px), not
  different values per side. Media that bleeds to the card edge needs the
  card's `overflow-hidden` and radius handling (see surfaces pass).
- **Inputs**: same height ladder as buttons so they line up in rows. Label
  4–8px above the field; help/error text 4–6px below.
- **Lists/tables**: row padding consistent, `py-2.5`–`py-3` for dense UI,
  `py-4` for comfortable. Dividers OR spacing — using both is redundant.

## 6. Breathing room failures to hunt

- Text touching container edges (missing padding on mobile).
- Buttons/badges where the text nearly touches the border — a pill with
  `px-2` at 14px text is always cramped; start at `px-3`.
- Headings glued to the content above them instead of below (the 2:1 rule
  inverted).
- Full-bleed sections whose *content* forgot the gutter.
- Elements centered vertically in a taller sibling when they should be
  top-aligned (multi-line text next to an avatar or checkbox: align to the
  first line, e.g. `items-start` + small top offset).

## 7. Responsive collapse

- Multi-column grids collapse in content order — verify the order still makes
  sense stacked. `lg:grid-cols-2` with a media-right layout often needs
  `order-first` on the media at mobile.
- Reduce, don't remove: section padding halves on mobile, it doesn't vanish.
- Anything `sticky` on desktop should usually stop being sticky on short
  viewports (`lg:sticky` rather than `sticky`).
- Never let horizontal scroll leak: wide tables and code blocks get their own
  `overflow-x-auto` wrapper; the page body never scrolls sideways.
