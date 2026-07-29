# Foundations pass

Goal: one system for everything downstream. This pass adds no visible flash —
it establishes the tokens and global defaults that make every later pass
consistent, and fixes the invisible details users only notice when they're
wrong.

## 1. Token inventory

From Recon you know what exists. Consolidate before decorating:

- **Durations & easings**: if the project animates with literals, introduce
  the ladder from [motion.md](motion.md) as CSS custom properties (or Tailwind
  theme keys) and migrate existing literals to it as you touch them.
- **Radius**: one scale (e.g. 4 / 8 / 12 / 16 + full). Note it — the surfaces
  pass enforces it.
- **Shadows, borders, semantic colors**: name what repeats. Three ad-hoc
  grays doing the same job become one token.
- Put new tokens where the project already keeps them (`@theme`,
  `tailwind.config`, `:root`). Never inline a value that two components share.

Do not rename or restructure existing tokens — extend only.

## 2. Focus ring (one definition, everywhere)

The single most common polish defect is `outline: none` with nothing in its
place. Define one focus treatment and apply it globally:

```css
:focus-visible {
  outline: 2px solid var(--ring, currentColor);
  outline-offset: 2px;
}
```

or the utility form on interactive elements:
`focus-visible:ring-2 ring-offset-2 ring-primary/60 outline-none`.

A softer variant common in refined component systems: a 3px ring at 50% alpha
with **no offset**, plus the border switching to the ring color —
`focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`.
The semi-transparent ring against the solid border reads as a halo instead of
a second outline; it suits dense forms where offset rings collide. Invalid
fields reuse the same geometry with the destructive color
(`aria-invalid:border-destructive aria-invalid:ring-destructive/20`, roughly
double the ring alpha in dark mode).

- `:focus-visible`, not `:focus` — mouse clicks shouldn't paint rings.
- The ring must contrast with both the element and its background (3:1
  minimum); on dark surfaces a light ring, `outline-offset` gives separation
  on any background.
- Inputs may use a border-color + subtle ring combo instead, but pick one
  input focus treatment and use it on every field.
- Never animate it; never remove it.

## 3. Selection, caret, taps

Cheap, high-signal details — each one line, applied once:

```css
::selection { background: /* accent at ~20-30% */; color: /* readable fg */; }
html { -webkit-tap-highlight-color: transparent; caret-color: var(--accent, auto); }
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

- `cursor: pointer` on actual links and buttons only — not on disabled
  elements, not on plain text.
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
