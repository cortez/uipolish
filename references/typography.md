# Typography pass

Goal: hierarchy you can feel without reading. Work top-down: fix the scale, then
tracking and line-height, then wrapping, then details. If the project already
has a type scale, patch its weak steps instead of replacing it.

## 1. The scale

A type step is four values, not one: **size + line-height + letter-spacing +
weight travel together**. Never ship a bare `font-size`. In Tailwind v4, encode
all four per step:

```css
@theme {
  --text-2xl: 24px;
  --text-2xl--line-height: 1.1;
  --text-2xl--letter-spacing: -0.02em;
  --text-2xl--font-weight: 500;
}
```

Weight belongs in the token: large display type wants 400–500 (it's already
heavy at size — 700 turns to sludge), while 12–14px UI text often wants 500 so
it doesn't look thin. High weight contrast (700 headings / 400 body) is a
legitimate style, but pick one system and apply it everywhere.

**Cheapest high-leverage move when defaults are in play:** framework default
scales are fine at 12–18px but too loose and untracked above ~20px. Patch only
the large steps:

```css
--text-2xl--line-height: 1.15;  --text-2xl--letter-spacing: -0.02em;
--text-3xl--line-height: 1.1;   --text-3xl--letter-spacing: -0.02em;
--text-4xl--line-height: 1.05;  --text-4xl--letter-spacing: -0.03em;
--text-5xl--line-height: 1;     --text-5xl--letter-spacing: -0.03em;
--text-7xl--line-height: 0.95;  --text-7xl--letter-spacing: -0.04em;
```

## 2. Letter-spacing

Negative tracking starts at 16px and deepens with size. Positive tracking is
for all-caps only — lowercase text never gets it.

| Size | Tracking |
|---|---|
| 10–12px captions | 0 (or +0.02em if all-caps) |
| 14px | 0 |
| 15–20px body | −0.01em to −0.02em |
| 22–32px headings | −0.02em |
| 36–64px | −0.02em to −0.04em |
| 72px+ display | −0.04em (some faces prefer a bit less; check double letters like "ll") |

A defensible simple rule: flat **−0.04em on everything ≥ 24px**, 0 below. If
type resizes across breakpoints, re-declare tracking per breakpoint when using
px values so the em-equivalent holds.

## 3. Line-height

| Role | Line-height |
|---|---|
| Display (72px+) | 0.85–0.95 |
| Headings (32–64px) | 1.0–1.1 |
| Subheadings (20–28px) | 1.2–1.25 |
| Body (14–16px) | 1.4–1.5 |
| Long-form prose (16–20px) | 1.5–1.6 |
| Buttons, pills, badges, labels | 1 — so padding alone controls the box |

The most common single miss: headings inheriting body line-height. A 48px
heading at 1.5 has a hole in the middle of the layout.

## 4. Wrapping, measure, truncation

- `text-wrap: balance` on every heading and any text ≤ 3 lines (card titles,
  section intros, empty-state messages).
- `text-wrap: pretty` on paragraph bodies. Division of labor: balance for
  headings, pretty for prose. Don't put balance on long paragraphs.
- Prose measure: 60–75 characters. `max-w-[65ch]` is a good default; it's fine
  to widen slightly at large breakpoints (61ch → 70ch). Heading measure should
  be *narrower* than body measure so display lines break 2–3 words in.
- Truncation: `line-clamp-2` for card titles, `line-clamp-3` for excerpts,
  `truncate` only where a one-line ellipsis is genuinely wanted (filenames,
  breadcrumbs). Never clamp interactive text that carries the only label.
- `whitespace-nowrap` on pills, buttons, and table headers.

## 5. Numerics & details

- `tabular-nums` on anything numeric that changes or aligns vertically:
  tables, timers, counters, prices in lists, stat tiles. This is a
  two-second fix that kills row jitter.
- Curly quotes and real apostrophes (’ “ ”) in marketing/interface copy;
  straight quotes stay in code.
- Ellipsis character (…) not three periods.
- All-caps eyebrow/kicker labels: `text-xs uppercase tracking-wide` + muted
  color (and mono face if the project has one). This is the standard
  "small caps" substitute — don't use `font-variant: small-caps` with fonts
  that don't support it.
- In code blocks with programming-ligature fonts, disable ligatures:
  `font-feature-settings: 'liga' 0, 'calt' 0;`. Keep inline code the same
  size as body text (padded, not shrunk).

## 6. Responsive type

Discrete 2–3 stop jumps for almost everything:

```
text-2xl md:text-3xl              /* card/section headings */
text-4xl md:text-5xl lg:text-6xl  /* page headings */
text-5xl md:text-7xl lg:text-8xl  /* hero */
```

Reserve `clamp()` for hero display type only. Give it a rem intercept so small
viewports don't collapse: `font-size: clamp(2rem, 5vw + 0.35rem, 4rem)`. When a
title comes from a CMS or user data, size conditionally on length — long titles
get one step smaller and a wider container.

**Form inputs: minimum 16px font-size on mobile** (`text-[16px] sm:text-sm`) or
iOS Safari zooms the page on focus.

Anchor targets under a sticky header need `scroll-margin-top` (roughly header
height + 16px), or in-page links bury headings under the nav.

## 7. Text color hierarchy

Pick ONE system and use it everywhere:

- **Alpha ladder** on the foreground color: 100% headings / 80% body /
  60–70% secondary / 50% meta / 40% disabled-ish. Six rungs ~10% apart is the
  finest distinction that stays perceptible.
- **Token ramp**: gray-900 headings, gray-700 body, gray-600 secondary,
  gray-400 placeholder — with `light-dark()` or dark-mode overrides. The
  mid-tone secondary color often works unchanged in both modes.

Either way, secondary text must stay ≥ 4.5:1 contrast for body sizes.
A refined default: body copy slightly muted, headings at full contrast — the
hierarchy reads even in a squint test.

## 8. Rendering hygiene (once, globally)

```css
html {
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  scrollbar-gutter: stable;      /* kills layout shift when modals lock scroll */
}
* { min-width: 0; }              /* flex/grid text-overflow guard */
```

Fonts: `font-display: swap` on every face, `.woff2` only, preload only the one
face used above the fold. If headings and body share one font doing everything,
consider whether the project already ships a second face to differentiate —
never add a new font dependency yourself.
