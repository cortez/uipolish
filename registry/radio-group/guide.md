# Radio group

One choice from a few options that are worth seeing at once. Radios in a
`fieldset`, with one tab stop, arrow keys that move and choose, and the
form value. As a plain list, or as cards for options that need a line of
detail and a fact such as a price.

The behavior is built on Base UI's `<RadioGroup>` and `<Radio>`.

```tsx
<RadioGroup
  label="Your main"
  name="main"
  options={[
    { value: "lamb", label: "Slow-roast lamb", description: "With white beans" },
    { value: "squash", label: "Stuffed squash" },
  ]}
  validate={(v) => (v ? null : "Choose a main")}
/>
```

## When to use it

- Two to six options the user should compare before choosing.
- `variant="cards"` when each option needs a description and a fact
  (`meta`): plans, payment schedules, delivery speeds.

## When not to

- More than about six options, or options that don't need comparing: a
  select.
- A setting that's on or off: a switch or checkbox.

## Props

| Prop | What it does |
|---|---|
| `options` | `{ value, label, description?, meta?, disabled? }`. `meta` shows in cards only |
| `label` | The question, shown as the legend |
| `variant` | `list` (default) or `cards` |
| `hint`, `validate`, `error` | As on the text field; `validate` runs when focus leaves the whole group |
| `value`, `defaultValue`, `onValueChange` | Controlled or uncontrolled |
| `name`, `required`, `disabled` | As on native radios; the value submits through a hidden input |

## Keyboard

Tab enters the group on the chosen radio (or the first), arrows move and
choose, Space chooses the focused one. Disabled options are skipped.

## States and motion

| State | What you see |
|---|---|
| Rest | A neutral ring: a hairline edge in `--ui-border-strong`, as a checkbox has |
| Hover | Ring and card edge move up to `--ui-field-focus` |
| Press | The ring fills a shade at once and gives to `--ui-scale-press` (0.985), springing back on release. Cards: only the card's surface shrinks to 0.985, never its text |
| Chosen | The ring fills with `--ui-accent`, as a checked checkbox does, and a 6px `--ui-on-accent` dot grows from its center: `clip-path` opens a circle on `--ui-ease-snap`; it closes a step faster on `--ui-ease-exit`. A chosen card takes the selected edge, `--ui-field-focus` at the hairline, like every edge. Edges are shadows, so nothing moves |
| Focus | A line inside the circle (list) or inside the card's edge (cards), never animated |
| Invalid | Empty circles and cards take the danger edge; the error replaces the hint in the reserved line |
| Disabled | 50% opacity, default cursor |

The circle sits centered on the label's capitals (`0.5cap`, or `0.35em` in
browsers without the `cap` unit), in any font.
Rows are 38px tall at least; the circle's hit area is 24px for a mouse and
40px on touch screens. Under `prefers-reduced-motion` the dot appears at once and nothing gives on press.

## Accessibility

A `fieldset` with a `legend`, and inside it Base UI's group
(`role="radiogroup"`, named by the legend) with the invalid and required
states. Each radio is a `role="radio"` element with `aria-checked`. Descriptions are linked to their radio with
`aria-describedby`; the message line is `aria-live="polite"`.
