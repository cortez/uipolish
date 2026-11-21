# Filter bar

The row in front of a table or a list: an optional search, the filters in
effect as chips ("Status is Going", "Added after Nov 1"), an Add filter
button, and Clear once anything is set. Each chip opens its own small
editor in a popover: checkboxes for a field with set options, a date
picker for a date, a number or a text field. Changes apply as they're
made. The filters are plain data, so the same list can live in the URL,
go to a server, or be matched in the browser with `matchFilter`.

It's composed, not rebuilt: the search is Search field, Add filter is a
Dropdown menu, each editor is a Popover holding a Segmented control and a
Checkbox, Date picker, Number input or Text field, and Clear is a Button.
The chips and their motion are the Tag input's.

```tsx
const fields: FilterField[] = [
  { id: "status", label: "Status", icon: "check-circle", type: "enum", options: [
    { value: "going", label: "Going" },
    { value: "maybe", label: "Maybe" },
  ] },
  { id: "added", label: "Added", icon: "calendar", type: "date" },
  { id: "party", label: "Party size", icon: "gauge", type: "number", min: 1 },
  { id: "email", label: "Email", icon: "at", type: "text" },
];

<FilterBar
  aria-label="Guest filters"
  fields={fields}
  value={filters}
  onValueChange={setFilters}
  searchLabel="Search guests"
  query={query}
  onQueryChange={setQuery}
/>

const rows = guests.filter((g) => filters.every((f) => matchFilter(f, g[f.field])));
```

## When to use it

- Narrowing a table or a long list by a few of its columns: guests by
  status, orders by date, items by price.
- Filters people combine and come back to, where each one needs a small
  choice of its own (which statuses, before or after which day).

## When not to

- Two or three on/off filters that are always in view: toggle chips.
- One choice that switches the whole view (All, Going, Declined): a
  segmented control or tabs.
- Free values typed into one field: a tag input.

## Props

| Prop | What it does |
|---|---|
| `fields` | What can be filtered on, in the order Add filter lists them; see below |
| `value`, `defaultValue`, `onValueChange` | The filters in effect, as `Filter[]`. Controlled or uncontrolled. Only complete filters are in it: one whose editor is open with nothing chosen yet shows as a chip but isn't passed on |
| `searchLabel` | Shows a search field at the start of the bar, named this (the label is read, not shown) |
| `searchPlaceholder` | Defaults to the label |
| `query`, `defaultQuery`, `onQueryChange` | The search text |
| `aria-label` | Names the bar. "Filters" by default |
| `className` | On the outer box |

Each field is `{ id, label, icon?, type }`, plus:

| `type` | Also takes | Editor | Conditions |
|---|---|---|---|
| `"enum"` | `options: { value, label }[]` | Checkboxes | is, is not |
| `"date"` | | Date picker | before, on, after |
| `"number"` | `min`, `max`, `step` | Number input | less than, exactly, more than |
| `"text"` | `placeholder` | Text field (Enter closes it) | contains |

A filter is `{ field, op, value }`: `value` is `string[]` for an enum, an
ISO date (`"2026-11-01"`) for a date, a number, or a string. A new filter
on a number field starts in effect at `min` (or 0), since a number field
always holds a number; the others start empty and become filters once
something is chosen.

`matchFilter(filter, value)` says whether one value passes one filter:
enum values (or any of an array) by equality, dates by their first ten
characters (or a `Date`), numbers numerically, text ignoring case and
accents.

## The chips

- A chip reads as a sentence: the field and condition in the muted color,
  the value in the text color. One or two options read in full ("Going or
  Maybe"); three or more read as "is any of 3". Dates show the month and
  day, and the year only when it isn't this year.
- Pressing the words opens the editor; the × removes the filter. Both are
  buttons, named in full ("Edit filter: Status is Going", "Remove filter:
  Status is Going").
- A value that changes in place morphs (Text morph), so the chip's width
  glides and the chips after it slide with it. A long value (past about 28
  characters) wraps instead, and the chip becomes a rounded box.
- Choosing a field that's already in the bar from Add filter opens its
  chip's editor rather than adding a second one.

## Keyboard

Everything is a tab stop, in reading order: the search, each chip's words
and its ×, Add filter, Clear.

| Key | Does |
|---|---|
| Enter, Space on a chip | Opens its editor; focus goes to the value (the first checkbox, the date, the number, the text) |
| Escape, or Tab past the end | Closes the editor; focus goes back to the chip |
| Enter in a text editor | Closes it |
| Enter, Space on × | Removes the filter; focus goes to the next chip, or Add filter |
| Add filter, then a field | The menu closes, a chip arrives, and its editor opens with focus in it |
| Escape in an editor with nothing chosen | The new chip leaves; focus goes to Add filter |
| Clear | Every filter leaves at once; focus goes to Add filter |

## States

| State | What you see | How |
|---|---|---|
| No filters | Search (if any) and Add filter, as a secondary button | |
| Filters set | Chips, Add filter as a ghost button, Clear after it | |
| Chip hover / press | Fill one step darker / another | `:has(.body:hover)` |
| Editing | The chip keeps the selected edge (`--ui-field-focus`) while its popover is open | `data-open` |
| Nothing chosen yet | The chip ends in a muted "…" | |
| Keyboard focus | A ring just inside the chip's edge, or the ×'s | `:focus-visible` |
| Too wide | Whole controls wrap to the next row; the bar's height follows | |

## Layout

Every control in the bar is 40px (`--ui-control-md`), as the search field
is: controls in one row share one height. Chips are pills filled with
`--ui-fill-strong`, like a removable chip, with the words 20px in (where
the round end stops) and a 32px × 4px from the end, concentric with the
chip. Items sit `--ui-gap-inline` (8px) apart across and down. The search
grows to fill a row up to 20rem and gives way first on a phone. Editors are
18rem wide; a long list of options scrolls inside its own box. Rows start
at the start; set `--filter-bar-justify: center` on an ancestor to center
them (the home page's card does).

## Motion

| What | Duration | Easing |
|---|---|---|
| A chip (or Clear) arrives: fades in, scales from 0.97 | `--ui-dur-fast` | `--ui-ease-enter` |
| A chip leaves: fades out, scales to 0.97, in place | `--ui-dur-instant` | `--ui-ease-exit` |
| The chips after it, Add filter and Clear slide into place | `--ui-dur-move` | `--ui-ease-move` |
| The bar's height follows a new or lost row | `--ui-dur-glide` | `--ui-ease-glide` |
| A value changing in a chip | Text morph | |
| Editors and the menu | as Popover and Dropdown menu | |

The bar is free space, not a field, so things move on the move spring and
settle with a little give, as a chip group's do. While it grows a row it
clips what's arriving, with 8px of room, so a chip settling past its line
is never cut. With reduced motion chips still fade; nothing slides or
scales.

## Accessibility

- The bar is a `group` named by `aria-label`.
- Each editor is a non-modal dialog named "Status filter", with focus
  returned to its chip when it closes.
- "Removed Status is Going" and "Cleared all filters" go to a polite
  status region. Announce the result count yourself, next to the table
  ("12 of 64 guests").
- On touch screens every × reaches 40px; chips and buttons already are.

## Before / after

Before: a row of selects, one per column, always showing whether used or
not; there's no way to say "after" a date, and clearing means resetting
each select.

```tsx
<select value={status} onChange={…}><option value="">Any status</option>…</select>
<select value={dietary} onChange={…}>…</select>
<input type="date" value={after} onChange={…} />
```

After: only the filters in use take room, each reads as a sentence, and
one Clear removes them all.

```tsx
<FilterBar fields={fields} value={filters} onValueChange={setFilters} />
```
