# Stat

One figure with its label, an optional change since some earlier point, and
an optional hint. Tiles side by side stay level, and when the figure
changes, only the digits that differ move.

```tsx
<Stat
  label="Ticket sales this month"
  value={48210}
  format={dollars}
  delta={{ value: "12%", direction: "up", tone: "positive", label: "vs September" }}
  hint="Paid seats, before refunds."
/>
```

## When to use it

- A row of key numbers at the top of a dashboard or report.
- A single headline figure beside a chart.

## When not to

- More than four or five in a row: past that, nothing stands out. Use a
  table.
- Figures without a comparison or context: a lone number rarely means
  anything. Add a delta or a hint.

## Props

| Prop | What it does |
|---|---|
| `label` | What the figure is. One line; too long fades at its end. |
| `value` | A number (formatted with `format`) or a word ("High", "Paused"). |
| `format` | Number to text. Defaults to `Intl.NumberFormat(locale)`. |
| `delta` | `{ value, direction, tone?, label? }`, see below. |
| `hint` | One or two lines of context. Two lines are always reserved. |
| `locale` | For the default number format, default `"en-US"`, fixed so the server and browser agree. |

`delta.direction` is `"up"`, `"down"` or `"flat"`; it picks the arrow and the
words. `delta.tone` is `"positive"`, `"negative"` or `"neutral"`; it picks
the color. They're separate because up isn't always good: a reply time going
down is good news.

## Level tiles

Tiles in a grid share a baseline because every part has a fixed line:

- The label is always one line (no wrapping).
- The figure's line box is set by the 32px number face whatever it holds. A
  word is set smaller (`--ui-text-2xl`) inside it and sits on the same
  baseline through the line's strut, so "Low" lines up with "$48,210".
- The hint always takes two lines, filled or not. Pass `hint=""` on a tile
  with nothing to say, to keep its neighbors level. More than two lines
  fade out at the end of the second.

Nothing ends in an ellipsis: clipped text fades out with a mask, and only
when it's clipped.

## Direction, not by color alone

The change shows an arrow (drawn by the icon set) and says the direction in
visually hidden text, so a screen reader hears "up 12%" and a reader who
can't tell green from red still sees the arrow. Flat shows a dash and reads
"unchanged". Map `--ui-success` to your green; the fallback is tuned for
both themes.

## Motion

| What | Duration | Easing |
|---|---|---|
| Figure and delta digits | text morph: shared digits stay, changed ones swap, width follows on `--ui-dur-move` | `--ui-ease-move` |
| Arrow up ↔ down | the shaft stays, only the head moves (icon set) | `--ui-ease-move` |
| Arrow ↔ dash | strokes retract and draw | `--ui-ease-draw` |
| Delta color | `--ui-dur-instant` (120ms) | `--ui-ease-color` |

"12" to "11" moves one digit; "$48,210" to "$59,052" keeps the "$", the
comma and any digit that stays put. Nothing counts up through the values
in between: that's motion with no information in it. Under
`prefers-reduced-motion: reduce` the text swaps.

## Accessibility

- Each tile is a `<dl>`: the label is the `<dt>`, the figure, change and hint
  are `<dd>`s, so the pairing is announced.
- Figures are `tabular-nums`.
- If a figure changes while the user watches because of something they did,
  that's fine; if it changes on its own (live data), don't also announce it.

## Before / after

Before: a green "+12%" with no arrow, a figure that jumps, tiles that
stagger when one hint wraps.

After:

```tsx
<Stat label="Average reply time" value="2.4 h" delta={{ value: "18%", direction: "down", tone: "positive" }} hint="Weekdays only." />
```
