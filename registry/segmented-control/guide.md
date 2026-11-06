# Segmented control

Picks one value from two to five short options, shown side by side. It's a
radio group in a clear hairline track, with one flat pill that glides to
the checked option. It looks and moves exactly like Tabs; only the meaning
differs (a value, not a panel). It's built on Base UI's `RadioGroup` and `Radio`, which
supply arrow keys, Tab, disabled options and form submission.

```tsx
<SegmentedControl aria-label="Date range" value={range} onValueChange={setRange}>
  <Segment value="week">Week</Segment>
  <Segment value="month">Month</Segment>
  <Segment value="quarter">Quarter</Segment>
  <Segment value="year">Year</Segment>
</SegmentedControl>
```

## When to use it

- A choice that changes what's shown or saved: a chart's date range, a
  billing period, list or board view.
- Two to five options with labels of one or two words, where seeing every
  option at once helps.

## When not to

- Switching between views of one object with their own panels: use tabs.
- More than five options, or long labels: use a select.
- On or off: use a switch.

## Props

| Prop | On | What it does |
|---|---|---|
| `aria-label` / `aria-labelledby` | `SegmentedControl` | Names the choice ("Date range") |
| `value`, `onValueChange` | `SegmentedControl` | Controlled |
| `defaultValue` | `SegmentedControl` | Uncontrolled starting value |
| `widths` | `SegmentedControl` | `equal` (default): each option as wide as the widest. `content`: each as wide as its label |
| `name` | `SegmentedControl` | Form field name; the checked value submits |
| `disabled` | both | The whole group, or one option |
| `aria-label` | `Segment` | Needed when the option is an icon only |

The group is `inline-grid`: give it `width: 100%` to stretch, and equal
options share the width.

## States

| State | What you see | How |
|---|---|---|
| Rest | Muted label | |
| Hover | Label in the text color | `@media (hover: hover)` |
| Press | Nothing of its own: the pill moving over is the answer | |
| Checked | Label in the text color, pill behind it | `[data-checked]` |
| Focus | A line just inside the option's pill, instantly | `:focus-visible` |
| Disabled | 50% opacity, no hover, skipped by the arrow keys | `disabled` → `[data-disabled]` |
| Before JS | The checked option paints its own pill | `:not([data-ready])` |

Every option keeps the same weight in every state, so checking one never
changes a width.

## Layout

It shares the Tabs' look through the `--ui-track-*` tokens, so a change to
one changes both:

- `--ui-track-edge`: a clear track, no fill, inside a hairline of
  `--ui-border-strong`, the same edge as the fields and buttons it lines up
  with. With no fill of its own it sits as well on a card as on the page.
- `--ui-track-inset`: 4px from the track's edge to the pill on every side.
- `--ui-track-pill`: the checked option's flat pill (`--ui-fill-strong`), no
  shadow and no edge, fully round, the same 14px label padding as a tab.

At `md` the options and the pill are 32px inside the 4px inset, so the ends
are concentric and 4 + 32 + 4 is the 40px control height: the group lines
up with buttons and fields in a row. The whole control is measured, track
included. At `sm` it's 32px whole and the inset drops by 1px (26px pill,
12px padding, small text): a 4px inset would leave the pill too tight
around its label. That size is the one difference from Tabs, which come in
one size. On touch screens each option's hit area grows to 40px without
moving anything.

The control is never wider than its container. Labels stay whole, so when
the options don't fit, they scroll sideways inside the track (no scrollbar
shows), and the pill scrolls with them.

## Motion

| What | Duration | Easing |
|---|---|---|
| Pill stretches a little to the checked option and draws in behind it | `--ui-dur-glide` | both edges `--ui-ease-glide`, the leading one sooner |
| Label color | `--ui-dur-instant` | `--ui-ease-color` |

The flight is the Tabs pill's own: one function, `flyPill` in
`tabs/pill-flight.ts`, plays both, so they never drift apart. The edge
facing the new option leads and the far edge follows, with no overshoot, so
the pill never swings past the group's ends, and it keeps its height in
flight.

The pill is one absolutely positioned, contained element. Position is a
`translate`; its width is set directly, because scaling would
squash its round ends. It's measured from fractional bounding boxes, so equal-width
options that don't land on whole pixels still get a pill that fits exactly.
It's placed before first paint without animating (until then the checked
option paints its own pill), re-placed without animating on resize and
when fonts load, and if the value changes mid-move it starts from where it
is on screen. Under `prefers-reduced-motion:
reduce` it jumps.

## Accessibility

- `role="radiogroup"` around `role="radio"` options with `aria-checked`.
  Tab enters on the checked option; Left and Right (or Up and Down) move
  and check, wrapping, and skip disabled options.
- Each option is the radio itself, so clicks, focus and the accessible name
  (its label, or `aria-label` for an icon) are all the option's. A hidden
  input beside it carries the value into forms when `name` is set.

## Before / after

Before: buttons with an `active` class. Arrow keys do nothing, the choice
isn't announced as selected, and the background jumps between options.

```tsx
{["week", "month", "year"].map((r) => (
  <button key={r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>{r}</button>
))}
```

After:

```tsx
<SegmentedControl aria-label="Date range" value={range} onValueChange={setRange}>
  <Segment value="week">Week</Segment>
  <Segment value="month">Month</Segment>
  <Segment value="year">Year</Segment>
</SegmentedControl>
```
