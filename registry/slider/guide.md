# Slider

A slider in the family's shapes: a label row with the value at its end, over
a sunken track like the segmented control's and a raised capsule thumb like
its pill. The range from the start to the thumb is the accent, the same as
a switch that's on and a checked box. The behavior is built on Base UI's
`<Slider>`: its control is the whole 32px row under the label, and its
thumb holds a real `<input type="range">`, so the keyboard, pointer, touch
and screen readers all get a proper slider.

```tsx
<Slider label="Deposit" min={0} max={50} step={5} defaultValue={30} format={(v) => `${v}%`} />
```

## When to use it

- Picking a value in a range where the rough position matters more than the
  exact number: a percentage, a size, a budget.
- Settings that preview live as you drag.

## When not to

- Exact values the user knows already (a price, a quantity): use a text field
  with `inputmode="decimal"`.
- Two to five named options: use a segmented control.
- A range with two ends: this slider has one value.

## Props

| Prop | What it does |
|---|---|
| `label` | Visible label at the start of the label row. Required. |
| `min`, `max`, `step` | As on a range input. Defaults 0, 100, 1. Page Up/Down and Shift+arrows move ten steps. |
| `value`, `onValueChange` | Controlled mode. `defaultValue` for uncontrolled. |
| `format` | The value as shown, e.g. `` v => `${v}%` ``. |
| `valueText` | What screen readers say (`aria-valuetext`). Defaults to `format`. Say units and context: "35 percent, $3,795". |
| `morph` | Morph the shown value between steps (default `true`). Turn off for wide ranges with hundreds of steps. |
| `name`, `disabled` | As on an input; the value submits with the form. |

## Anatomy

- **Label row:** the label (Body, medium) at the start, wrapping rather than
  cut; the value (Body, muted, tabular figures) at the end. The value's
  cell holds the width of the widest value the slider can show (measured
  once in the readout's own font, since not every font has tabular
  figures), so dragging never moves the label or re-wraps it.
- **Control row:** `--ui-control-sm` (32px) tall, the whole hit area; 40px
  under a coarse pointer, without moving anything.
- **Track:** 6px, `--ui-fill` with a hairline `--ui-border-strong` inner edge (the switch track's),
  full radius: the segmented control's sunken track.
- **Range:** `--ui-accent`, the whole track slid back with `translate` so
  its end sits under the thumb's center.
- **Thumb:** a 20px capsule (`--ui-capsule` wide), the raised surface with
  a `--ui-border-strong` hairline and `--ui-shadow-control`, like the
  segmented pill and the switch's thumb. In dark mode it's a light gray, as
  the switch's is: a thumb the color of the surface reads as a hole.
- **Base UI control and thumb:** the control covers the row and draws
  nothing. Its thumb is as wide as the drawn one and kept inside the track
  (`thumbAlignment="edge"`), so their centers match at every value: a press
  lands exactly where the thumb goes.

## States

| State | What you see | How |
|---|---|---|
| Rest | Accent range, raised thumb, value in muted text | |
| Hover | Thumb one step darker (lighter in dark mode) | `@media (hover: hover)`, on the control row |
| Focus | Inset focus line on the thumb, value in the text color; instant | `:focus-visible` on the thumb's input |
| Press | Thumb grows to 108% in 80ms; springs back on release | `:active` on the control |
| Dragging | Range and thumb follow the pointer with no easing; the value swaps instead of morphing, in the text color | `data-follow`, once the pointer has moved 3px from the press |
| Holding an arrow key | As dragging: the thumb keeps up with the repeating key | `data-follow`, from a repeated keydown to keyup |
| Disabled | The whole slider at 50%, default cursor | `disabled` |

The whole slider dims as one layer, so the thumb, range and track never
show seams where they overlap.

## Motion

| What | Duration | Easing |
|---|---|---|
| Thumb and range to a clicked value (a press on the track that moves less than 3px) | `--ui-dur-glide` (320ms) | `--ui-ease-glide`: held by the track, it lands without passing its value or the track's end |
| Thumb and range to a keyed value: Page Up/Down, Home, End, a single arrow press | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Thumb and range while dragging, or while an arrow key repeats | 0ms | n/a |
| Thumb growing on press | `--ui-dur-press` (80ms) | `--ui-ease-snap` |
| Thumb settling on release | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Colors | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Value text | text morph, `--ui-dur-move` | `--ui-ease-move` |

A press that moves 3px or more is a drag and follows exactly; one that
doesn't (a click, a slightly wobbly one included) is a jump and glides
there. Base UI's own `data-dragging` is set from pointerdown, so it can't
tell the two apart; the slider sets `data-follow` itself. A glide that a
drag interrupts hands over at once: the thumb jumps under the pointer and
follows it from there. The thumb and range move with `translate` on layers
the width of the track, so nothing lays out while they move. Under
`prefers-reduced-motion: reduce` they jump to their place and the thumb
doesn't grow; colors still change.

## Touch

Vertical swipes over the slider still scroll the page (`touch-action:
pan-y`); sideways ones move the value. Base UI handles touch on the whole
control row: a tap anywhere jumps there and a sideways drag follows the finger.

## Accessibility

- The thumb holds a range input: arrow keys, Page Up/Down, Home and End, and
  every screen reader's slider gestures work.
- Named by the visible label (Base UI's `Slider.Label`), valued by
  `valueText` (`aria-valuetext`).
- The drawn track, range, thumb and the shown value are `aria-hidden`; the
  input carries the name and value.

## Before / after

Before: a styled `div` with pointer handlers; no keyboard, no screen reader,
and the label floats somewhere above it.

After:

```tsx
<Slider
  label="Season budget"
  max={24000}
  step={100}
  morph={false}
  format={(v) => dollars.format(v)}
/>
```
