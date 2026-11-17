# Sources

Citations for an AI answer. Small numbered markers sit in the text; pointing
at one, focusing it or tapping it opens a card with the source's site, title
and a short excerpt. Below the answer, a source list uses the same numbers,
either as a "4 sources" line that opens to a list or as a row of chips that
scrolls sideways. Pointing at a list item highlights its markers in the text,
and pointing at a marker highlights it everywhere it appears.

Three parts: `<Sources>` holds the list and the shared hover state,
`<Citation n={1} />` is a marker, `<SourceList />` is the list.

The card is built on Base UI's `<Popover>` with `openOnHover`: it handles the
hover delays, the click that pins it, dismissal, focus and positioning.

## When to use it

- Answers built from documents or web pages, where the reader should be able
  to check a claim against where it came from.
- Text where the same source supports several sentences: the shared number
  and the highlight show which ones.

## When not to

- A single link the reader should follow: write a normal link in the
  sentence.
- Footnotes in long documents a reader prints or reads start to end: a
  numbered notes section at the end serves them better than hover cards.
- Sources you can't link to. A marker that opens a card with nowhere to go
  promises more than it gives; name the document in the text instead.

## States

| Part | State | What you see | How |
|---|---|---|---|
| Marker | Rest | Number in a small pill, muted, a 6% fill | |
| Marker | Pointed at (here or from the list) | Fill steps up, number goes to the text color | `data-active` |
| Marker | Press | Same step, in 80ms | `:active` |
| Marker | Focus | 2px ring; the card opens at once | `:focus-visible` |
| Card | Opening on hover | After 300ms over the marker; straight away if another card closed in the last 300ms | pointer type `mouse` only |
| Card | Open | Site with favicon or letter, number, title, two-line excerpt | portalled, above the page |
| Card | Pinned | Opened by click or tap; stays until a click outside, Escape or Tab away | |
| Card | Closing | 150ms after the pointer leaves both marker and card | |
| List | Folded | Overlapping favicons and "4 sources" with a chevron | `variant="disclosure"` |
| List | Open | Numbered rows: favicon, title, domain; an arrow shows on hover or focus | `aria-expanded` |
| List row | Pointed at | 6% fill; its markers in the text light up | `data-active` |
| Chips | Rest | One pill per source: number, favicon, title (one line, a long one fades at its end, full title in `title`); edges fade only where there's more to scroll | `variant="row"` |

**Marks.** For a well-known site, pass `brand` (a name from `brand-marks`,
such as `"wikipedia"`, `"reddit"` or `"stackoverflow"`): its real mark shows
in its own color on a round tile, the same marks Research progress uses.
Otherwise pass `favicon` with an image URL if you have one. Without either,
or if the image fails to load, the domain's first letter shows in a circle.
Nothing is fetched from a favicon service.

**Excerpts.** One sentence from the page that supports the claim: "Leftovers
should go in the fridge within two hours of cooking", not the page's meta
description. The card shows two lines at most.

The card's edge is the one in `--ui-shadow-floating`: the same outline color as fields (`--ui-border-strong`), drawn once. No inset ring as well; the two together drew a 2px edge.

## Motion

| What | Duration | Easing |
|---|---|---|
| Card in: fade and scale from 0.97, from the marker's side | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Card out | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Hover open delay / close grace | 300ms / 150ms | n/a |
| Marker and row highlight | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| List opens | `--ui-dur-panel` (280ms) height, `--ui-dur-fast` fade 75ms later | `--ui-ease-expand`, `--ui-ease-enter` |
| List closes | `--ui-dur-base` (200ms) height, `--ui-dur-instant` fade | `--ui-ease-collapse`, `--ui-ease-exit` |
| Chevron turns a quarter turn, right to down | `--ui-dur-base` (200ms) | `--ui-ease-glide` |
| Row arrow fades in, nudges 1px up and out (`Icon` external) | fade `--ui-dur-instant` (120ms), nudge `--ui-dur-snap` (240ms) | `--ui-ease-color`, `--ui-ease-snap` |

The card animates between Base UI's `[data-starting-style]` and
`[data-ending-style]`, and stays mounted until its fade ends. Its
`transform-origin` is Base UI's `--transform-origin`, so it grows out of the
marker and flips below it near the top of the screen.

Under `prefers-reduced-motion: reduce` the card fades without scaling and the
list opens instantly.

## Accessibility

- Each marker is a `<button>` named "Source 1: Leftovers and food safety:
  how long cooked food can sit out", with `aria-expanded` and `aria-controls` pointing
  at its card. The visible number alone would be read as "1".
- Keyboard focus opens the card at once. The card is portalled, but focus
  guards make Tab move from the marker to the card's link, and Tab again
  move on to whatever follows the marker and close it. Escape closes the
  card and returns focus to the marker without reopening it.
- On touch, a tap opens the card and a tap anywhere else closes it. Markers
  get a 24px hit area (40px on coarse pointers) without changing how they
  sit in the line.
- Every source link opens in a new tab with `rel="noopener noreferrer"` and
  says so to screen readers: "(opens in new tab)". Rows also show an arrow.
- The list and the chip row are `<ol>` elements labelled "Sources", so the
  numbers are announced as positions too.
- In the chip row, Tab reaches each chip; Left and Right arrows, Home and End
  move between chips; focused chips scroll clear of the edge fades.

## Before / after

Before: bracketed numbers that do nothing, and a list of bare URLs.

```tsx
<p>Leftovers should be refrigerated within two hours [1].</p>
<ul>
  <li><a href="https://health.example.org/food-safety/leftovers">https://health.example.org/food-safety/leftovers</a></li>
</ul>
```

After: a quiet marker with a preview, and a list that matches it.

```tsx
<Sources sources={sources}>
  <p>
    Leftovers should go in the fridge within two hours of cooking
    <Citation n={1} />.
  </p>
  <SourceList />
</Sources>
```

With the sources as a row of chips under a short answer:

```tsx
<Sources sources={sources}>
  <p>A fridge should stay at 40°F or below<Citation n={2} />.</p>
  <SourceList variant="row" />
</Sources>
```
