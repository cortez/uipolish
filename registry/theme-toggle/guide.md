# Theme toggle

An icon-only capsule that switches the page between light and dark. The icon
is one drawing: the sun's disc grows into the moon while a second circle
slides over it and bites out the crescent, and the rays turn and pull in. It
stores the choice in `localStorage`, follows the system until someone makes
one, and with `ThemeScript` in `<head>` the stored theme is on the page
before the first paint, so nothing flashes and nothing flips at hydration.

```tsx
// app/layout.tsx: the stored theme lands on <html> before paint.
import { ThemeScript } from "@/components/ui/theme-toggle/theme-script";

<html lang="en" suppressHydrationWarning>
  <head>
    <ThemeScript />
  </head>
  …
</html>

// Anywhere in the chrome:
<ThemeToggle size="sm" />

// A settings page that also offers "System":
<ThemeSelect />
```

## When to use it

- A light/dark switch in the site or app chrome, next to the logo or the
  account menu.
- `ThemeSelect` on a settings page, where "follow the system" deserves its
  own visible option.

## When not to

- Theming one region (a preview, an embed): put `data-theme` on that
  element and drive it from your own state. The toggle can still be the
  control; pass it `value` and `onValueChange`.
- A long-press or right-click to reach "System": nobody finds it. Use
  `ThemeSelect`, or rely on the toggle's rule below.

## How it decides

- **Default is the system.** With nothing stored, `<html data-theme>` is
  the OS theme, and it follows the OS live.
- **Toggling stores a choice.** Clicking stores the other theme. Toggling
  back to the theme the OS is in clears the choice, so the page follows the
  system again: two clicks undo one.
- **Tokens do the rest.** `foundation/tokens.css` switches every role on
  `[data-theme="light" | "dark"]`, so nothing else needs to know.

## Props

| Prop | On | What it does |
|---|---|---|
| `value` | both | Controlled. `"light"`, `"dark"` or `"system"`. Leave it out to drive the page |
| `onValueChange` | both | The toggle passes the theme it switches to; the select passes the option |
| `size` | both | `sm` (32px) or `md` (40px). Toggle default `md`, select `sm`: side by side, pass the toggle `size="sm"` (or both `md`), since controls in one row share one height |
| `variant` | `ThemeToggle` | `ghost` (default) in chrome, `secondary` on a busy surface |
| `tooltip`, `tooltipSide` | `ThemeToggle` | "Switch to dark theme" on hover and focus; default on, below |
| `storageKey` | all | `localStorage` key, `"theme"` by default. Pass the same key to `ThemeScript` |
| `transition` | toggle, select, `useTheme` | Crossfade the page on change (default on; never under reduced motion) |

`useTheme({ storageKey, transition })` returns `{ theme, resolvedTheme,
systemTheme, setTheme }` for your own controls; `useSystemTheme()` returns
just the OS theme. Every value is `undefined` until hydration, so the server
and the first client render agree. `themeScript(key)` is the inline script as
a string, for a framework that takes one.

## States

| State | What you see | How |
|---|---|---|
| Light | Sun: a small disc and eight short rays | `data-state="light"`, `aria-pressed="false"` |
| Dark | Crescent moon, about the size of the other icons | `data-state="dark"`, `aria-pressed="true"` |
| Before hydration | The right icon, drawn from `<html data-theme>` | `:not([data-state])` reads the root; no JS at all falls back to `prefers-color-scheme` |
| Hover, press, focus | The ghost button's own | `Button` |

**Nothing flips after hydration.** The server can't know the theme, so the
button renders without a state and its CSS draws the icon from the root's
`data-theme`, which `ThemeScript` set before paint. After hydration the
button carries the same state itself, so no value changes and nothing
animates. Labels that depend on the theme (`aria-pressed`, the tooltip) fill
in after hydration, where the user can't see them change.

## Motion

| What | Duration | Easing |
|---|---|---|
| Disc grows or shrinks | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Bite slides in or out | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Rays turn 45° and pull in to half, to dark | `--ui-dur-base` (200ms), fade `--ui-dur-instant` | `--ui-ease-exit`, fade `--ui-ease-color` |
| Rays come back, to light | `--ui-dur-snap` (240ms) after `--ui-dur-press` | `--ui-ease-snap`, fade `--ui-ease-color` |
| Page crossfade | `--ui-dur-base` (200ms) | `--ui-ease-color` |

The disc and the bite glide because the crescent is a shape held between two
edges: a spring would over-bite and spring back. The rays are small things
leaving and arriving, so they get the exit curve and the snap.

The page crossfade is a view transition of type `theme`. Its CSS ships in
the module: every snapshot holds still and the new page fades in over the
old, with no additive blend. Browsers without view transition types switch
at once. If your app styles `::view-transition-*` for page changes, the
`:active-view-transition-type(theme)` rules win while the theme changes.

Under `prefers-reduced-motion: reduce` no shape moves: the new icon fades in
over `--ui-dur-base`, and the page switches without a crossfade.

## Accessibility

- A real `<button>` with a stable name, "Dark theme", and `aria-pressed`,
  so a screen reader hears "Dark theme, toggle button, pressed". Pass your
  own `aria-label` for another language.
- The tooltip says what a click does next, "Switch to light theme", and
  isn't linked as a description, since the name already says it.
- `ThemeSelect` is a radio group (`SegmentedControl`): arrow keys move
  between Light, Dark and System. Until hydration no option is checked, and
  the pill appears in place without sliding.

## Drawing

16px grid, the same outline weight as the icons (`--ui-icon-stroke`). The
outline is made of filled circles: the outer edge filled, the inner edge and
the bite masked away, half a stroke either side of each line. That keeps the
crescent's tips as clean points; a stroked circle cut by a mask leaves
notched ends.

## Before / after

Before: the icon is chosen in React from `localStorage`, so the server
renders a sun, the page paints light, then flips to dark and the icon swaps
after hydration, with a hydration warning.

```tsx
const [dark, setDark] = useState(() => localStorage.theme === "dark");
<button onClick={() => setDark(!dark)}>{dark ? <Moon /> : <Sun />}</button>
```

After: the theme is on `<html>` before paint, the icon is drawn from it, and
toggling morphs one drawing into the other.

```tsx
<head><ThemeScript /></head>
…
<ThemeToggle size="sm" />
```
