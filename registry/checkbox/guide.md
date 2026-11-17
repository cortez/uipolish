# Checkbox

A checkbox with a tick that draws on when checked and retracts when
unchecked. It has a mixed state for a "select all" over a partly checked
list, shown as a dash, and the tick and the dash turn into each other by
moving their three points. The box sits on the first line of its label.
It's built on Base UI's `Checkbox`, rendered as a native `<button>`.

```tsx
<Checkbox
  label="Attach the menu to reminder emails"
  description="Guests can pay for their seat from the email without signing in."
  checked={attach}
  onCheckedChange={setAttach}
/>
```

## When to use it

- Choices that are applied when a form is submitted.
- Picking any number of items from a list, with a "select all" over them.
- Agreeing to something ("I've read the terms").

## When not to

- A setting that takes effect the moment it's flipped: use a switch.
- One choice out of several: use radio buttons, a segmented control or a
  select.

## Props

Base UI's checkbox props pass through (`name`, `value`, `required`,
`disabled`, `form`, `id`, ARIA attributes). `ref` reaches the hidden form
`<input>`. Use `onCheckedChange` rather than `onChange`.

| Prop | What it does |
|---|---|
| `label` | The accessible name; clicking it toggles the box |
| `description` | A second line, linked with `aria-describedby` |
| `checked`, `defaultChecked` | Controlled or uncontrolled |
| `onCheckedChange` | Called with the new `checked` boolean |
| `indeterminate` | Shows the dash and reads as "mixed". A click calls `onCheckedChange(true)`; the owner decides what that means |

## Select all

The parent is mixed while some, not all, children are checked. A click on a
mixed or empty parent checks every child; a click on a full one clears them.

```tsx
const all = picked.length === statuses.length;
const some = picked.length > 0 && !all;

<Checkbox
  label="All statuses"
  checked={all}
  indeterminate={some}
  aria-controls={statuses.map((s) => `status-${s.id}`).join(" ")}
  onCheckedChange={() => setPicked(all ? [] : statuses.map((s) => s.id))}
/>
```

Indent the children by the box and its gap (24px: the 16px box and the 8px gap) so their boxes line up
under the parent's label.

## States

| State | What you see | How |
|---|---|---|
| Empty | Surface fill, hairline edge | |
| Checked | Accent fill, tick in the color that reads on it | `data-state="on"` |
| Mixed | Accent fill, dash | `indeterminate` → `data-state="mixed"` |
| Hover | Edge one step darker; a filled box one step lighter | `@media (hover: hover)`, anywhere on the row |
| Press | Fill one step further, in 80ms | `:active` |
| Focus | A line just inside the box's edge, instantly | `:focus-visible` |
| Disabled | Box and label at 50%; the description stays readable | `disabled` |

Checked and mixed are told apart by the mark, not by color.

## Motion

| What | Duration | Easing |
|---|---|---|
| Fill on check | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Tick or dash draws on | `--ui-dur-base` (200ms) | `--ui-ease-draw` |
| Tick or dash un-draws | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Fill clears, after the un-draw | `--ui-dur-instant` (120ms), 150ms delay | `--ui-ease-color` |
| Tick ↔ dash | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |

How the mark works:

- It's one stroke of three points on a path with `pathLength="1"`. Drawn is
  dash offset 0; hidden is 1.05, which leaves no round-cap dot behind. It
  draws from its start and retracts back into it.
- Between tick and dash only the three points move, under 3px each:
  the dash's middle point sits right under the tick's corner, so that point
  only drops. Nothing fades and nothing is swapped. The shape is animated
  with the CSS `d` property; browsers without it swap the shape and still
  draw.
- Coming from empty, the mark takes its new shape before it starts drawing,
  so a dash draws as a dash. While it's hidden it keeps the shape it left
  with.

Under `prefers-reduced-motion: reduce` the mark appears, leaves and changes
shape at once.

## Layout

The box's center is on the middle of the capitals of the label's first line
(placed from the baseline with the `cap` unit, or `0.35em` in browsers
without it), however the label wraps.
The box is 16px; its hit area is 24px for a mouse and 40px on touch screens,
without moving anything. The tick is drawn at the stroke that matches the 500 label.

## Accessibility

- A `<button role="checkbox">` with `aria-checked` in a `<label>`: Space
  toggles it, clicking the label toggles it, mixed is read as "mixed"
  (`aria-checked="mixed"`), and a hidden input beside it submits with forms.
- The name is the label alone; the description is read after it.
- Group related boxes in a `<fieldset>` with a `<legend>`.

## Before / after

Before: a hidden input and a styled `span` whose check pops in, and a
"select all" with no mixed state, so a partly checked list looks either all
or nothing.

```tsx
<label>
  <input type="checkbox" hidden checked={all} onChange={toggleAll} />
  <span className={all ? "box checked" : "box"}>{all && "✓"}</span>
  Select all
</label>
```

After:

```tsx
<Checkbox label="All statuses" checked={all} indeterminate={some} onCheckedChange={toggleAll} />
```
