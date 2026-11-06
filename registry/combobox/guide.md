# Combobox

Type to filter a list and choose from it: a guest, a dish, a city. Works
with options in the browser or results from a server, marks the typed text
in each match, offers to add what was typed, and says plainly when nothing
matches.

The behavior (focus, keys, highlight, placement, dismissal) is built on
Base UI's `Combobox`; the filtering, async loading and add row are this
component's own.

```tsx
<Combobox
  label="Guest"
  loadOptions={(query, signal) => fetch(`/api/guests?q=${query}`, { signal }).then((r) => r.json())}
  onCreate={(text) => createGuest(text)}
  createLabel={(text) => `Add guest “${text}”`}
/>
```

## When to use it

- More options than fit a select comfortably, or options from a server.
- Choosing an existing record, with a way to add a new one.

## When not to

- Under about 15 known options: a select.
- Free text with suggestions the user may ignore: a text field with a
  `datalist`.

## Props

| Prop | What it does |
|---|---|
| `options` | Filtered in the browser: accents and case ignored, label starts first, descriptions matched too |
| `loadOptions(query, signal)` | Async results. Runs 150ms after typing pauses; a newer query aborts the older one, and old results stay until new ones arrive |
| `onCreate`, `createLabel` | An add row when nothing matches exactly. Return the new option to choose it |
| `emptyMessage` | Defaults to `No matches for “text”` |
| `value`, `defaultValue`, `onValueChange(value, option)` | The option comes along, so async results need no lookup. A controlled value must be among `options`, or have been chosen in this field |
| `hint`, `validate`, `error`, `name`, `required`, `disabled`, `placeholder` | As on the text field |

## Keyboard

| Key | Does |
|---|---|
| Typing | Opens and filters; the best match is highlighted, so Enter takes it |
| ArrowDown / ArrowUp | Open, or move the highlight (disabled rows skipped) |
| Enter | Choose the highlighted row (or add, or retry) |
| Escape | Close; pressed again, put back the chosen label |
| Tab, leaving | Close. Text that wasn't chosen goes back to the choice; an emptied field clears it |

## States

| State | What you see |
|---|---|
| Searching | Nothing for 300ms, then "Searching…" with the text sweep under the results. With no results yet, the whole panel waits |
| Match | The row's text muted, the typed part in full color, painted with `::highlight()`: color only, so nothing in a row moves as you type |
| Nothing found | A status line, not an option, so arrows skip it |
| Load failed | A "Try again" row |
| Chosen | A check at the end of its row |

## No layout shift

The list floats (Base UI's positioner, as wide as the field through
`--anchor-width`, flipping above when there's no room below), so it never
moves the page. Inside it, rows are keyed by
position: when late results land, each row's box stays put and only its
words change, so even results arriving after the 500ms input window add
no shift. The clear button's room is reserved, so the text never reflows.
Clearing focuses the field and opens the full list, ready for the next pick.

## Accessibility

An editable combobox with list autocomplete, from Base UI: focus stays in
the input, `aria-activedescendant` follows the highlight, and the result count ("4
results, or Add guest “Fern”") goes to a polite live region. The clear and
toggle buttons are out of the tab order, named "Clear Guest" and
"Guest".
