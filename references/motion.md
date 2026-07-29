# Motion & microinteractions pass

Goal: the interface responds to the user. Motion confirms actions, connects
states, and directs attention — it never performs for its own sake. Everything
here is CSS-first; do not add an animation library.

## 1. Tokens first

Define (or reuse) a duration ladder and easing vocabulary before writing any
animation. Scattered literal values are how motion languages fall apart.

```css
:root {
  --dur-instant: 150ms;  /* color/opacity hovers on dense UI */
  --dur-fast:    200ms;  /* exits, chevrons, small toggles */
  --dur-base:    300ms;  /* the default: buttons, cards, most state changes */
  --dur-panel:   500ms;  /* accordions, dropdown panels, drawers */
  --dur-reveal:  700ms;  /* on-scroll entrances (long tail easing makes it feel fast) */

  --ease-out:     cubic-bezier(0.16, 1, 0.3, 1);   /* entrances — fast start, long settle */
  --ease-state:   cubic-bezier(0.86, 0, 0.07, 1);  /* state changes — precise, mechanical */
  --ease-io:      cubic-bezier(0.4, 0, 0.2, 1);    /* symmetric toggles, loops */
}
```

Usage rules:

- **Entrances get `--ease-out`** (decelerating): the long tail lets a 700ms
  reveal feel instant. Never use it for exits.
- **State-driven UI (accordions, panels, underlines, fills) gets
  `--ease-state`** or `--ease-io`.
- **Exits are faster than entrances** — open at 300–500ms, close at 200ms.
  Appearing should feel gentle; disappearing, decisive.
- `linear` only for marquees, shimmers, and scroll-driven animation (scroll
  position is already the easing).
- Overshoot/bounce curves: decorative one-shots only, never on functional UI.
- A quiet default worth setting once if the project has no motion language:
  `* { transition-timing-function: var(--ease-io); }` — every transition
  inherits a designed curve instead of browser `ease`.

## 2. Hover & press — restraint is the signature

The strongest pattern in polished production UIs: **buttons animate color
only.** No scale, no lift, no shadow transitions on controls.

- Primary buttons: shift background one step — `hover:bg-primary/90`, or a
  small alpha ramp (rest 8% → hover 12% → active 16% of foreground). At
  ~300ms with color transition only.
- Press states read as instantaneous: apply the active background with
  `transition-duration: 0s`, let the release ease back:

```css
.btn { transition: background-color 200ms ease; }
.btn:active { background: color-mix(in srgb, currentColor 10%, transparent); transition-duration: 0s; }
```

- Links/nav: `hover:opacity-80` or one color step. In grouped nav/menus,
  dim siblings instead of highlighting the target:
  `group-hover:opacity-50 hover:!opacity-100` — the group recedes, the
  hovered item holds.
- The arrow nudge is the classic link affordance:
  `group-hover:translate-x-0.5` on a trailing arrow icon, ~150–200ms,
  `transform` only.
- Scale on hover is for media, not controls: images inside cards at
  `scale-[1.02]`–`scale-105`, 500–700ms ease-out, wrapped in
  `overflow-hidden`. Never scale text or buttons.
- Focus rings appear instantly — never transition focus styles.
- Kill the mobile tap flash once globally:
  `html { -webkit-tap-highlight-color: transparent; }` and make sure
  `:active` states exist to replace it.

## 3. Enter & reveal

Grammar for on-scroll or on-mount entrances:

- **Blocks**: `opacity: 0; transform: translateY(8–16px)` → settled, 500–700ms
  `--ease-out`. Optionally `scale(0.97)` for popovers/cards. Rise distances
  stay small — 4–20px; long travel reads as theatrical.
- **Never animate reading content from opacity 0 without a fallback.** If JS
  fails or the element is above the fold, text must be visible. Set the final
  state when reduced motion is on, fire reveals for above-the-fold content on
  mount, and disconnect observers after first fire (content does not
  re-animate on scroll-back).
- **Stagger**: 60–100ms between siblings, cap the total (after ~6 items,
  bring remaining delays to 0). A paired secondary element (description under
  a label) runs one beat behind its primary (+40ms). Character-level stagger,
  if ever, is ~10ms.
- **Popovers/dropdowns/tooltips**: `opacity 0 → 1` + `scale(0.97 → 1)` with
  `transform-origin` at the trigger side, 150–200ms in, ~150ms out.
- Native `<dialog>`/popover animation without JS:

```css
dialog { transition: opacity 200ms var(--ease-out), display 200ms allow-discrete, overlay 200ms allow-discrete; opacity: 0; }
dialog[open] { opacity: 1; @starting-style { opacity: 0; } }
```

- IntersectionObserver reveals: threshold ~0.15–0.25 for sections, plus a
  negative bottom `rootMargin` (e.g. `0px 0px -10% 0px`) so elements reveal
  after actually entering, not at the pixel edge. Use one shared observer,
  not one per element.

## 4. Expanding content (the auto-height problem)

Animate `grid-template-rows`, not `height`/`max-height`:

```html
<div class="grid transition-[grid-template-rows] duration-300 ease-[var(--ease-state)]
            data-[open=true]:grid-rows-[1fr] grid-rows-[0fr]">
  <div class="overflow-hidden"><!-- content --></div>
</div>
```

The `overflow-hidden` must be on the inner element. Pair with opacity, and make
close faster than open. Content fades in slightly *after* the box starts
opening, and fades out *faster* than the box collapses.

## 5. Micro-recipes

- **Chevron/disclosure rotation**: `rotate-180` on open, 200–300ms ease-out.
- **Underline that doesn't shift layout**: a `scaleX(0 → 1)` pseudo-element
  with `transform-origin: left`, 300ms — not `text-decoration` toggling.
- **Toast**: enter with fade + small rise or `scale(0.98 → 1)` at ~150–200ms,
  `transform-origin` toward its screen corner; exit ~200–300ms; defer unmount
  until the exit finishes.
- **Theme/route content swap**: crossfade two stacked layers (same grid cell)
  rather than animating one element through empty.
- **Skeleton pulse**: 2s ease-in-out, subtle opacity range — never a fast blink.
- **Marquee** (if one exists): duplicate content, animate `translateX(0 → -50%)`
  linear, mask the edges with a gradient, pause on hover, and pause offscreen.
- Derive related delays from durations instead of hardcoding: if a line draws
  in 600ms and its endpoint dot fades in 300ms, delay the dot by 300ms so it
  lands as the line arrives.

## 6. Performance discipline

- Animate **`transform`, `opacity`, `filter`, and colors only.** Never
  `width`/`height`/`top`/`left`/`margin` (exception: `grid-template-rows`
  above). Never `transition: all` on anything that moves.
- `will-change: transform` only on elements that continuously animate
  (marquee tracks, pinned sections) — a handful per page, never globally.
- Scroll-linked effects: `requestAnimationFrame`-coalesced with a passive
  listener writing a transform, or CSS `animation-timeline: scroll()/view()`
  behind `@supports (animation-timeline: scroll())` with a static fallback.
- Ambient/looping decoration (if kept at all): slow (3s+) and low-amplitude,
  paused when offscreen. Nothing loops fast enough to draw the eye while
  reading.

## 7. Reduced motion — non-negotiable

Every animation you introduce is guarded, and the guard produces the **end
state**, not a missing element:

```css
@media (prefers-reduced-motion: reduce) {
  .reveal { animation: none; opacity: 1; transform: none; }
  html { scroll-behavior: auto; }   /* often forgotten next to scroll-smooth */
}
```

- Tailwind: prefer `motion-safe:` prefixes for anything that moves.
- JS-driven animation branches on
  `matchMedia('(prefers-reduced-motion: reduce)').matches` and sets final
  values instantly. Reduced motion means *instant state change*, not *no
  state change*.
- Sub-200ms opacity/color transitions may remain — they are feedback, not
  motion.
- Colocate the reduce override with each animation it guards, so copies of
  the component keep the guard.

## 8. What NOT to do

- No entrance animation on every element — reveal groups/sections, not each
  paragraph.
- No re-triggering reveals on every scroll pass.
- No animated focus rings, no animated disabled states.
- No spring physics on functional UI (menus, accordions, inputs).
- No hover-dependent information (touch devices exist); hover only enhances.
- No motion added to an app that already has a motion language you haven't
  matched — extend theirs.
