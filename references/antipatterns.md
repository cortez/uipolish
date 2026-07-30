# Anti-patterns — the rules nobody writes down

Load this during the Audit phase. These are defects that pass code review
because each one looks intentional in isolation. They cluster around one root
cause: **a signal is being sent that the interface can't honor.** A hover state
promises clickability; a spinner promises progress; a cursor promises action.
Every unhonored promise erodes trust in the ones that are honored.

## Affordance lies

- **No hover states on non-interactive elements.** A background tint, lift, or
  cursor change on a static card/row/box tells the user it's clickable. If
  clicking does nothing, remove the hover treatment — or make the element
  actually clickable. Corollary: every genuinely interactive element *must*
  have a hover and press treatment; the absence is the same lie inverted.
- **`cursor: pointer` only on things that act.** Not on static text, not on
  disabled controls, not on a whole card when only its button is interactive.
- **Never nest interactive in interactive.** A button inside a clickable card
  (or a link inside a link) is invalid HTML and ambiguous for every input
  method. Make the card's primary link cover the card (stretched-link
  pattern) and lift secondary actions above it with `position: relative`.
- **Hover must never be the only path to content or actions.** Touch devices
  can't hover; a delete button revealed only on hover is invisible on mobile
  and to keyboard users. Hover may *emphasize*; it may not *gate*.
- **`title` attributes are not tooltips.** They don't appear on touch, on
  focus, or reliably at all. If the information matters, render it.
- **Text that looks like a link but isn't** (accent color, underline) and
  links that look like plain text. The visual grammar of "this is
  interactive" must be exclusive to interactive elements.

## State-change honesty

- **Transitions belong on the base state, not the `:hover` block.** Declared
  only under `:hover`, the enter eases but the exit snaps. (The one sanctioned
  asymmetry is the reverse: `:active { transition-duration: 0s }` so presses
  read as instant while release eases back.)
- **State changes must not reflow.** Bolding the active tab, growing a border,
  or swapping to a wider label shifts every sibling. Reserve the space:
  pre-render the boldest/widest state invisibly, use an inset ring or a
  pre-allocated 2px transparent border, keep button width stable when its
  label swaps to a spinner.
- **Don't animate the focus ring, and never style bare `:focus` away.** Style
  `:focus-visible`; the ring appears instantly or keyboard users lose their
  place.
- **Hover styles need `@media (hover: hover)`** when they'd misbehave on
  touch — mobile browsers apply `:hover` sticky-on-tap, leaving cards "stuck"
  highlighted after a scroll-tap.
- **Selection must be visible.** A brand-tinted `::selection` below ~15–20%
  alpha is indistinguishable from the page — users can't see what they
  selected. Check the highlight against the background, not just the text
  against the highlight.

## Motion that betrays

- **Reveals fire once.** Content that re-animates on every scroll-back turns
  the page into a slideshow. Disconnect observers after first fire.
- **Don't make returning users watch the intro.** Entrance choreography on
  app chrome (nav, sidebars, dashboards users open 20× a day) taxes every
  single visit. Reserve staged entrances for genuinely first-run or
  marketing surfaces.
- **Nothing moves without a cause the user can name.** Ambient looping motion
  near reading content pulls the eye on every line. If asked "why did that
  move?", the answer must never be "to look alive."
- **Skeletons must match the loaded layout** or they cause the exact shift
  they exist to prevent. And under ~300ms, show nothing at all — a flash of
  spinner reads as jank, not responsiveness.

## Environmental blind spots

- **`100vh` is broken on mobile.** Browser chrome makes `100vh` taller than
  the visible screen; bottom-anchored content gets clipped. Use `100dvh`
  (layout that may resize) or `100svh` (stable minimum).
- **Fixed/sticky chrome must respect `env(safe-area-inset-*)`** — bottom bars
  and FABs collide with home indicators and notches without it.
- **Modals and drawers need `overscroll-behavior: contain`** or the page
  behind scroll-chains when the user hits the end of the panel.
- **Check every theme you ship.** A hardcoded `white`, a shadow tuned only
  for light mode, a gray border invisible on dark surfaces — every visual
  change is a two-theme change if two themes exist.
- **Zoom to 200%.** Fixed heights on text containers clip at zoom and on
  translation; use `min-height`. Never `user-scalable=no` or
  `maximum-scale=1`.

## Silent failures

- **Every async action needs a failure branch.** A `.then()` with no
  `.catch()` on clipboard/share/fetch means the button silently does nothing
  in the failure case — the most trust-destroying state an interface has.
  Feature-detect (`if (navigator.clipboard)`) and degrade visibly.
- **Icon-only state changes are inaudible.** A copy button whose icon flips
  to a checkmark tells screen-reader users nothing. Pair visual state changes
  with a `role="status"` live region ("Copied").
- **Disabled without explanation is a dead end.** Prefer enabled +
  validation message; if truly disabled, the *why* must be discoverable
  without hovering.

## Stacking & overflow debt

- **No z-index arms race.** `z-index: 9999` means the stacking model is
  broken. Keep a small documented ladder (dropdown 10, sticky 20, overlay 30,
  modal 40, toast 50) and create stacking contexts deliberately with
  `isolate`.
- **`overflow: hidden` as a fix is usually a symptom.** It silently clips
  focus rings, shadows, and dropdowns of every descendant. Find the actual
  overflowing element; prefer `overflow: clip` on the axis that needs it.
- **Scrollable regions need keyboard access.** An `overflow-x: auto` code
  block or table with no focusable content can't be scrolled by keyboard in
  all browsers — add `tabindex="0"` with an accessible name, or let content
  wrap instead.

## Audit heuristic

For each element ask two questions: *what does its styling promise?* and
*does interacting keep that promise?* Every mismatch — in either direction —
is a punch-list item, and these mismatches outrank cosmetic findings: a
broken promise is worse than a missing flourish.
