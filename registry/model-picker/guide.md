# Model picker

A compact trigger that shows the current model and opens a list of models,
each with a name and a one-line description. It follows the WAI-ARIA
select-only combobox pattern: a trigger with `role="combobox"` and
`aria-haspopup="listbox"`, `option` roles, `aria-selected`, arrow keys and
typeahead. The trigger resizes to fit the name it shows, and the name morphs
into the new one when the model changes.

The behavior is built on Base UI's `<Select>`: it handles focus, keyboard,
typeahead, positioning and dismissal.

```tsx
const models = [
  { id: "fast", name: "Fast", description: "Quick answers to short questions" },
  { id: "balanced", name: "Balanced", description: "Everyday writing, code and analysis" },
  { id: "deep", name: "Deep", description: "Thinks longer on hard problems" },
];

<PromptInput
  onSubmit={send}
  footer={<ModelPicker models={models} value={model} onValueChange={setModel} side="top" />}
/>
```

## When to use it

- Choosing which model answers, in a composer toolbar or a settings row.
- Any short list of named options where each needs one line of explanation
  and the current choice should always be visible.

## When not to

- Options that need more than a line to compare (pricing, limits, a table of
  capabilities): link to a page that compares them.
- More than about eight options: use a command palette or a searchable
  combobox.
- Actions rather than a value: use a dropdown menu.
- A form field that submits with the form: use a native `select`.

## States

| State | What you see | How |
|---|---|---|
| Rest | Name and a chevron in muted text, no fill | |
| Hover | Text darkens, a 6% fill appears behind it | `@media (hover: hover)` |
| Press | Fill darkens to 10% at once. The trigger never shrinks: it opens a list, and the list opens from where the trigger really is | `:active` on `::before` |
| Open | Fill stays, the chevron's tip moves to point up | `aria-expanded` |
| Highlighted option | One rounded fill under the option; it slides from the last one | pointer and keyboard share it, `data-highlighted` |
| Selected option | A check at the end of the name's line | `aria-selected` |
| Disabled option | Name in the subtle color; can be reached, can't be picked. Say why in the description | `disabled`, `data-disabled` |
| Changed model | The name morphs (shared letters slide), and the trigger's width follows on the same spring | measured width, `TextMorph` |
| Flipped / shifted | Opens the other way near a viewport edge and stays 8px inside it; the list scrolls if it's taller than the room | Base UI `Positioner`, `--available-height` |

**Rows.** The list is a menu: inset `--ui-inset-menu` (12px) inside its
24px corner, rows with the concentric 12px radius and `--ui-pad-row` (12px)
inside them, so the text clears each row's curve. The same as the dropdown
menu and the command palette.

**Why the width is measured.** A pill sized by its content jumps when the
label changes. The trigger renders an invisible copy of its content, measures
it, and sets its own width in px, so the width can transition from the old
label's width to the new one. Nothing else in the row moves suddenly.

## Keyboard

| Key | On the trigger | In the list |
|---|---|---|
| Enter, Space, ArrowDown, ArrowUp | Open, highlight the selected model | Enter and Space pick the highlighted model and close |
| Letters | Select the first model starting with them, like a native select | Typeahead; repeating one letter cycles |
| Home, End, PageUp, PageDown | | First / last model |
| ArrowDown, ArrowUp | | Next / previous; stops at the ends like a native select |
| Escape | | Close, focus back on the trigger |
| Tab | | Close and move on to whatever follows the trigger |

## Pointer

- Opens on press, not on release. Pressing, dragging to an option and
  releasing picks it, the way native selects do.
- On touch it opens on tap, since a press might start a scroll.
- A press outside closes the list. The page doesn't lock its scroll while
  the list is open (`modal={false}`).

The list's edge is the one in `--ui-shadow-floating`: the same outline color as fields (`--ui-border-strong`), drawn once. Don't add a ring of your own on top.

## Motion

| What | Duration | Easing |
|---|---|---|
| List opens: fade and scale 0.97 → 1 from the trigger side | `--ui-dur-fast` | `--ui-ease-enter` |
| List closes | `--ui-dur-instant` | `--ui-ease-exit` |
| Highlight moves between options | `--ui-dur-snap` | `--ui-ease-snap` |
| Check draws in on the new selection | `--ui-dur-base` | `--ui-ease-draw` |
| Name morph and trigger width | `--ui-dur-move` | `--ui-ease-move` |
| Fill and text color | `--ui-dur-instant` | `--ui-ease-color` |

Under `prefers-reduced-motion: reduce` the list appears at once, the
highlight jumps, the check appears drawn, and the name and width change
in one step.

## Accessibility

- The trigger's name includes the value: "Model: Balanced". Pass `label`
  for another context ("Summary model").
- Focus moves into the list when it opens and follows the highlighted
  option; each description is linked with `aria-describedby`.
- On close focus returns to the trigger. After a mouse or touch pick the
  browser doesn't paint the keyboard focus line on it (`:focus-visible`).
- Options are 44px tall and the trigger has a 40px hit area on coarse
  pointers.

## Before / after

Before: a native select can't show a description per option, and a custom
`div` list has no roles, no keyboard and a trigger that jumps to the new
label's width.

```tsx
<select value={model} onChange={(e) => setModel(e.target.value)}>
  <option value="fast">Fast</option>
  <option value="deep">Deep</option>
</select>
```

After:

```tsx
<ModelPicker models={models} value={model} onValueChange={setModel} />
```
