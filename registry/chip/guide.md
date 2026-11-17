# Chip

Two kinds of small pill for a row of choices. A **toggle chip** is a filter
that stays on or off: a real `<button aria-pressed>`. Off, it shows a plus;
pressed, the plus's two bars swing into a check, so on and off differ by
shape as well as by the accent tint, and the chip never changes width. A **removable chip** is a value already chosen, with its own remove
button named for what it removes ("Remove Vegan"). In a `ChipGroup`, a
removed chip fades out, the chips after it slide into its place, and focus
moves to the remove button that took its place.

```tsx
<ChipGroup aria-label="Dietary filters">
  {DIETS.map((d) => (
    <Chip key={d} pressed={diets.includes(d)} onPressedChange={(on) => toggle(d, on)}>
      {d}
    </Chip>
  ))}
</ChipGroup>

<ChipGroup aria-label="Priya’s notes">
  {notes.map((n) => (
    <RemovableChip key={n} onRemove={() => setNotes((v) => v.filter((x) => x !== n))}>
      {n}
    </RemovableChip>
  ))}
</ChipGroup>
```

## When to use it

- Toggle chips: filters over a list (dietary needs, statuses, tags), where
  any number can be on and each applies at once. This is the "pressed
  toggle" the button guide points to.
- Removable chips: the values picked for a field (tags, recipients, a
  guest's allergies) or the filters in effect, each removable on its own.

## When not to

- One choice out of several: use a segmented control or a radio group. A
  row of chips where pressing one unpresses another is a radio group that
  doesn't say so.
- A setting with a label and a description: use a switch.
- A choice applied only when a form is submitted: use checkboxes.
- A status that doesn't act: use a badge.
- An action ("Add guest"): use a button. A chip that does something once
  and doesn't stay pressed is a button in the wrong shape.

## Props

`Chip` passes every `<button>` prop through (`disabled`, `onClick`,
`aria-controls`); `RemovableChip` every `<span>` prop; `ChipGroup` every
`<div>` prop.

| Component | Prop | What it does |
|---|---|---|
| `Chip` | `children` | The label |
| | `pressed`, `defaultPressed` | Controlled or uncontrolled on/off |
| | `onPressedChange` | Called with the new value. An `onClick` that calls `preventDefault()` stops the change |
| `RemovableChip` | `children` | The value |
| | `onRemove` | Called once the chip has faded. Take it out of your list here. If you keep it, it fades back in |
| | `removeLabel` | The remove button's name. Defaults to "Remove" and the label, when the label is text |
| `ChipGroup` | `aria-label` or `aria-labelledby` | What the chips are: "Dietary filters" |

## States

| State | What you see | How |
|---|---|---|
| Off | Surface fill, hairline edge, muted plus | |
| On | Accent tint, accent edge and text, a check where the plus was | `aria-pressed="true"` |
| Hover | Fill and edge one step darker (on: the fill steps, the accent edge holds); the plus takes the text color | `@media (hover: hover)` |
| Press | Fill another step darker in 80ms; nothing moves, so a row of chips stays still | `:active` on a layer under the label |
| Focus | A line just inside the edge, in the label's color, at once | `:focus-visible` |
| Disabled | 50%, no hover or press; say why next to the row | native `disabled` |
| Removable, at rest | Filled (`--ui-fill-strong`), no edge: a thing you have, not a choice still open | |
| Remove button hover / press | Hover: the × takes the text color, nothing fills behind it. Press: a faint circle fills behind it | |
| Removing | The chip fades out; it can't be pressed again while it fades | `data-leaving` |

On and off never differ by color alone: the plus becomes a check.

## Layout

- 34px tall (`--ui-control-sm`), the small button's height, with 14px
  labels at 500 like a small button, so a row of chips lines up with the
  "Clear filters" button beside it. Fully round: chips are things you
  press.
- **The mark holds the width.** The plus and the check share one 16px
  slot, so pressing a chip never changes its width or moves the row.
  The mark's side has 12px of padding (`--ui-pad-tag`) against 16px on
  the other, half the chip's height so the label ends where the round end
  stops: a 16px mark has air inside its box.
- **Removable chips** have 16px before the label and a 26px remove button
  4px in from the end, so its curve is concentric with the chip's. The ×
  is drawn at the medium stroke, matching the 500 label.
- **Hit areas.** Chips are 34px, above the 24px mouse minimum; on touch
  screens their hit area grows to 40px tall. The remove button is 26px for
  a mouse and 40px on touch; that reaches 3px past the chip, less than the
  8px to the next chip, so two targets never overlap.
- **The group** wraps with `--ui-gap-inline` (8px) across and down, so a second row reads as
  the same group.
- Long labels fade at the end rather than cutting to "…", and only when
  they're actually cut.

## Motion

| What | Duration | Easing |
|---|---|---|
| Plus swings into a check (and back) | `--ui-dur-move` | `--ui-ease-move` |
| Fill, edge and text color | `--ui-dur-instant` | `--ui-ease-color` |
| Press darkens / release | `--ui-dur-press` / `--ui-dur-instant` | `--ui-ease-color` |
| Removed chip fades out | `--ui-dur-instant` | `--ui-ease-exit` |
| The chips after it slide into its space | `--ui-dur-move` | `--ui-ease-move` |
| A chip added later fades in | `--ui-dur-fast` | `--ui-ease-enter` |

**Removing follows the list-removal rule** in
`foundation/rules/motion.md`: the item fades out fast, starting on the
press, and only then does its space close, so nothing crushes a chip that
is still visible. In a wrapping row the space can't collapse like a list
row's height (the chips after it may change rows), so the group closes it
by moving the chips that follow from where they were to where they now
are (FLIP, on the move spring). Nothing slides sideways while the removed
chip is still visible, and nothing shrinks. To do this yourself without
`ChipGroup`: fade the chip on `--ui-dur-instant` / `--ui-ease-exit`,
measure every sibling, remove it, then animate each sibling's `translate`
from its old position to zero on `--ui-ease-move` over `--ui-dur-move`.

Chips there on the first paint don't fade in; only chips added after the
group has mounted do. Under `prefers-reduced-motion: reduce`, the mark
swaps, removed chips go at once and the rest jump into place; colors still
change.

## Accessibility

- A toggle chip is a `<button aria-pressed>`: Tab reaches it, Space and
  Enter toggle it, and it's read as "Vegan, toggle button, pressed". Each
  chip is its own tab stop.
- A removable chip's label is static text; only the remove button acts,
  and it has its own name ("Remove Vegan"), so a list of them doesn't read
  as a list of identical "×" buttons. Never make the whole chip the
  button: the label isn't what the press does.
- `ChipGroup` is `role="group"` with your label. When a chip in it is
  removed while focus is on it, focus moves to the remove button that
  slid into its place (or the one before it at the end of the row, or the
  group itself when none are left), and "Removed Vegan" is announced from
  a `role="status"` region.
- The plus and check are decorative; `aria-pressed` carries the state.
- In forced-colors mode chips draw a real border, and a pressed chip adds
  an outline in the highlight color.

## Before / after

Before: a `div` that turns blue when clicked. It can't be reached with
Tab, screen readers don't hear that it's on, and the check that appears
makes the chip wider, so every chip after it jumps.

```tsx
<div className={on ? "chip on" : "chip"} onClick={() => setOn(!on)}>
  {on && <CheckIcon />} Vegan
</div>
```

After:

```tsx
<Chip pressed={on} onPressedChange={setOn}>Vegan</Chip>
```

Before: a × that removes the value at once. The chips after it snap left,
focus drops to the page, and every button is read as "times".

```tsx
<span className="tag">
  Vegan <button onClick={() => remove("Vegan")}>×</button>
</span>
```

After:

```tsx
<ChipGroup aria-label="Dietary needs">
  <RemovableChip onRemove={() => remove("Vegan")}>Vegan</RemovableChip>
</ChipGroup>
```
