# Surfaces & depth pass

Goal: surfaces that read as physical without shouting. The strongest finding
from polished production UIs: **elevation comes from background steps and
quiet borders far more often than from shadows.** Default to no shadow; earn
each one.

## 1. Page vs. surface

The page background and card surface are different values — always. One small
step apart:

- Light mode: page is a soft gray (~97% lightness), cards are white. The card
  "pops" with no border or shadow at all.
- Dark mode: **inverted** — cards are *lighter* than the page
  (e.g. page L≈0.15, card L≈0.20 in OKLCH). Shadows barely register on dark;
  the lightness step is the elevation.

If the project renders cards on a same-color background with only a shadow,
consider stepping the page background instead — it's calmer and works in dark
mode for free.

## 2. Borders

- **Alpha over hex.** Border colors as the foreground color at low alpha
  auto-adapt to theme changes: hairlines at 8–15%, standard borders at
  15–30%, emphasized at 40–60%. In dark mode, borders become
  *white*-at-alpha (10–15%), not a lighter gray.
- Hover states on bordered elements move one alpha step
  (`border-black/15 → hover:border-black/25`). Polished hover deltas are
  small — sometimes just a few percent.
- Dividers: either borders or spacing, not both. A fading hairline
  (`h-px bg-gradient-to-r from-transparent via-border to-transparent`) is a
  refined divider for centered content.
- Collapse doubled borders in lists/grids: `border-b -mb-px` or
  `divide-y` instead of per-item borders.
- Gradient or animated borders are decoration for one or two hero elements
  per page, max. The robust technique is the concentric wrapper: outer
  element carries the gradient as background, inner element insets by 1px
  (`m-px`) with radius = outer − 1, opaque fill.

## 3. Shadows — when you do use them

- **Layer them.** One tight low-opacity contact shadow + one large soft
  ambient with negative spread. Negative spread is what stops big blurs
  from washing sideways:

```css
/* floating panel, light mode */
box-shadow: 0 1px 2px rgb(0 0 0 / 0.05), 0 12px 32px -12px rgb(0 0 0 / 0.12);
/* modal / popover */
box-shadow: 0 20px 40px rgb(0 0 0 / 0.15);
```

- Light-mode ambient opacity lives at 3–15%. Dark-mode shadows need 35–65%
  to register at all — and usually the lightness step (§1) is better.
- On dark surfaces, an inset top highlight sells the material more than any
  drop shadow: `inset 0 1px 0 rgb(255 255 255 / 0.05)` as the first shadow
  layer.
- Tinted shadows: replace gray with the brand hue at low alpha
  (`0 24px 64px -24px` in the accent color at ~25%) for hero elements —
  reads as glow, never as dirt.
- Don't transition box-shadow on hover; polished UIs change background or
  border color instead. Shadows are static.

## 4. Radius

- One scale, derived from a single knob where possible:
  `--radius: 10px` with sm/md/lg/xl as ±2–4px `calc()` offsets. Controls
  (buttons, chips, badges, pills) very often go fully round — `rounded-full`
  is the most-used radius in polished products.
- **Concentric rule: inner radius = outer radius − gap.** A card at 16px
  containing media inset by 4px gives the media 12px. Nested equal radii
  look wrong at the corners every time. On pseudo-element overlays use
  `border-radius: inherit`.
- Consistency beats taste: any radius not on the scale is a punch-list item.

## 5. Color tokens & states

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

## 6. Glass & overlays

The reliable glass recipe is **low-alpha fill + alpha border + blur**, with
much lower fills than people expect:

```
bg-white/5  border border-white/10 backdrop-blur-lg     /* dark theme */
bg-black/5  border border-black/10 backdrop-blur-lg     /* light theme */
```

- 2–5% fill is enough over a busy background. Add
  `backdrop-saturate-150` to restore the color that blur washes out.
- Modal scrims: `bg-black/50`, or background color at 60–80% with
  `backdrop-blur-sm`. Keep scrim blur low (2–4px) — the page should stay
  recognizable behind.
- Edge fades on scrollable rows/marquees:
  `mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent)`.
- Blur layers are expensive; a handful per screen, and never stacked inside
  other blur containers.

## 7. Sticky headers

The standard treatment: transparent over the top of the page, then blur +
background + hairline once scrolled. Drive it with a data attribute so CSS
owns the styling:

```css
header { transition: background-color 300ms ease, border-color 300ms ease; }
header[data-scrolled="true"] {
  background: color-mix(in srgb, var(--background) 75%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
}
```

Never show both a solid background *and* a strong border — one defines the
edge. Publish the header height as a variable (`--header-height`) and use it
for `scroll-padding-top` and sticky offsets below it.

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
- No pure-black shadows at high opacity in light mode; no gray borders in
  dark mode (use white-alpha).
- Elevation levels in the app: aim for three, not seven — resting, raised
  (dropdown/popover), overlay (modal). Each maps to one consistent
  surface + border + shadow combination.
