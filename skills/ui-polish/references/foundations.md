# Foundations

Goal: one system for everything downstream. Nothing here is visible on its
own. It sets up the tokens and global defaults that keep every other rule
consistent, and fixes the details users only notice when they're wrong.

The UI Polish token roles live in `tokens.css` (`--ui-*`). Map each role onto
the project's existing variable instead of adding a second system.

## 1. Token inventory

Read the project's existing tokens first. Consolidate before decorating:

- **Durations & easings**: if the project animates with literals, introduce
  the ladder from [motion.md](motion.md) as CSS custom properties (or the
  project's theme keys) and migrate existing literals to it as you touch them.
- **Radius**: one scale (e.g. 10 / 14 / 22 + full). See
  [surfaces.md](surfaces.md).
- **Shadows, borders, semantic colors**: name what repeats. Three ad-hoc
  grays doing the same job become one token.
- Put new tokens where the project already keeps them (its theme config or
  `:root`). Never inline a value that two components share.

Do not rename or restructure existing tokens — extend only.

## 2. Focus (one definition, everywhere)

The most common focus defect is `outline: none` with nothing in its place. The
second is a ring around the control, dark or haloed, that shouts louder than
the control itself. Draw focus inside the control's own edge instead: a thin
line in the control's text color, so it reads on a dark primary button and a
light ghost button alike, and nothing grows outside the shape.

```css
:focus-visible {
  outline: 1.5px solid color-mix(in oklch, currentColor 55%, transparent);
  outline-offset: -1.5px; /* hugs the inside of the edge, follows the radius */
}
```

Fields darken and thicken their edge, nothing outside:

```css
.input:focus {
  box-shadow: inset 0 0 0 1px var(--ui-field-focus);
}
```

Invalid fields use the same edge in the danger color.

- `:focus-visible`, not `:focus`, on buttons and links: clicks shouldn't paint
  focus. Text fields show it on `:focus`, because the caret already tells.
- Check it on every surface a control sits on: if the line disappears
  (a control whose text color matches its fill), raise its alpha.
- Pick one field treatment and use it on every field.
- Never animate it; never remove it.

## 3. Selection, caret, taps

Cheap, high-signal details — each one line, applied once:

```css
::selection { background: /* accent at ~20-30% */; color: /* readable fg */; }
html { -webkit-tap-highlight-color: transparent; }
```

Custom selection color is near-universal in polished products and absent in
unpolished ones. Verify selected text stays readable (don't use a dark accent
with dark text).

## 4. Global rendering hygiene

```css
html {
  -webkit-font-smoothing: antialiased;
  scrollbar-gutter: stable;        /* no layout shift when dialogs lock scroll */
}
* { min-width: 0; }                /* flex/grid children can actually shrink */
```

- If the project uses `scroll-behavior: smooth`, pair it with
  `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }`.
- Scroll lock for modals: `html:has(dialog[open]) { overflow: hidden; }`
  (with `scrollbar-gutter: stable` this is shift-free).
- Dark mode: verify `color-scheme: light dark` (or the applicable one) is set
  so native controls, scrollbars, and form elements match the theme.

## 5. Interaction affordances

- Two cursors only: `pointer` on things that act, `default` everywhere
  else, including disabled, busy and draggable things. No `not-allowed`,
  `progress`, `grab` or `wait`; the state belongs in the control's look, not
  the cursor. Text inputs keep the browser's own text cursor.
- Hit areas ≥ 40×40px for touch targets. Grow small icon buttons with
  padding or a pseudo-element (`::after { inset: -8px }`), never by scaling
  the icon.
- `user-select: none` on button labels and other pure-control text so
  double-clicks don't highlight chrome; never on content.
- `touch-action: manipulation` on buttons removes the 300ms-legacy/double-tap
  ambiguity on some mobile browsers.

## 6. Semantic sweep

While you're at the foundation layer, fix what CSS can't:

- Clickable `<div>`s → `<button>` (type="button") or `<a>`. This is the
  cheapest accessibility *and* polish win — buttons get focus, Enter/Space,
  and touch behavior for free.
- Icon-only buttons get `aria-label`.
- Images get real `alt` text (or `alt=""` when decorative) and explicit
  dimensions/`aspect-ratio` to prevent layout shift.
- Exactly one `<h1>` per view; heading levels don't skip.

## 7. Check before moving on

- Tab through the main flow: every stop visible, order sensible.
- Select text on a few surfaces: readable.
- Open a modal: no background scroll, no width jump.
- Toggle dark mode (if present): tokens hold, no hardcoded whites/blacks
  bleeding through.
