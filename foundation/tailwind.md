# Tailwind CSS

UI Polish works in Tailwind CSS v4 projects with the same components: the
same React files and the same CSS modules, placed so your utility classes
win. Your agent does all three steps when it sees Tailwind in the project.

## 1. Get components for Tailwind

Agents pass `tailwind: true` to `get_component` (over REST,
`?tailwind=true`). Each CSS module then comes inside Tailwind's
`components` layer: a utility class you pass in `className` overrides the
component, and Tailwind's preflight reset stays beneath it. Without the
option the CSS is unlayered, which is right for a project without Tailwind.

## 2. Add the tokens and the bridge

Add `tokens.css` once, and `tailwind.css` (below) after it, in the
stylesheet that imports Tailwind:

```css
@import "tailwindcss";
@import "./ui/tokens.css";
@import "./ui/tailwind.css";
```

The bridge names UI Polish's roles as theme values, so your own markup
uses the same colors as the components: `bg-ui-surface`, `text-ui-muted`,
`border-ui-border`, `rounded-ui-md`, `shadow-ui-floating`,
`ease-ui-enter`. They're prefixed with `ui-` so they never collide with a
theme you already have.

## 3. Point the roles at your theme

The components read `--ui-*` roles only. Set them from your palette, after
the tokens, and the components take your brand:

```css
:root {
  --ui-accent: light-dark(var(--color-indigo-600), var(--color-indigo-400));
  --ui-accent-text: light-dark(var(--color-indigo-700), var(--color-indigo-300));
  --ui-font-sans: var(--font-sans);
  --ui-radius-md: var(--radius-lg);
}
```

Colors take `light-dark()`, so each role keeps a value for each theme.

## Overriding a component

- **Layout and shape**: margin, width, padding, radius, position. Pass the
  utility: `<Button className="w-full rounded-md">`.
- **Color**: components paint their fills on inner layers, from their own
  variables, so a press can shrink the fill without moving the label. Set
  the variables rather than the properties, the label's with the fill's:
  `<Button className="[--button-bg:var(--color-emerald-600)] [--button-fg:white]">`.
  Hover and press shades follow from those two. Each component's variables
  are at the top of its CSS module. To change a color everywhere, set the
  role (`--ui-accent`) instead.

## Dark mode

The roles follow `color-scheme`, as Tailwind's default `dark:` variant
follows the system, so the two agree with nothing to set up. If you switch
themes yourself, drive both from one attribute on `<html>`:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

Then set `data-theme="dark"` or `data-theme="light"` on `<html>` instead of
a `dark` class: `dark:` utilities and the components switch together.

## Tailwind v3

Tailwind v3 doesn't output cascade layers, so leave `tailwind` off: the
CSS modules work as they are, and a utility that has to beat a component's
own style needs the important modifier (`!px-6`).
