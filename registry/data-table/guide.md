# Data table

A grid for real app data, built to be driven from the keyboard. The whole
table is one tab stop: arrow keys move a single active cell, Home, End and
Page Up/Down jump, and Enter presses what's in the cell. Headers sort
(ascending, descending, then back to the original order), and the arrow
flips its head rather than swapping icons. Columns resize by dragging their
edge or with arrow keys on it. Checkboxes select rows, with shift-click for
a range. Rows are virtualized at a fixed height, so 10,000 scroll like 20,
and cells can be marked as needing a look, with the reason in words.

```tsx
<DataTable
  aria-label="Guests"
  columns={[
    { key: "name", header: "Guest", width: 180, sortable: true },
    { key: "email", header: "Email", width: 240, validate: (g) => (g.email.includes("@") ? null : "Add an email address.") },
    { key: "paid", header: "Paid", width: 112, align: "end", sortable: true, cell: (g) => money.format(g.paid) },
  ]}
  rows={guests}
  getRowId={(g) => g.id}
  getRowLabel={(g) => g.name}
  selectable
  stickyFirstColumn
  onColumnWidthsChange={saveWidths}
/>
```

## When to use it

- Records people scan, compare and act on: guests, orders, RSVPs,
  members, imports to review.
- Hundreds or thousands of rows in one place, where paging would break the
  reading.
- Reviewing data before it's used: mark the cells that are wrong and say why.

## When not to

- A handful of items with one action each: use a list.
- Reading content, such as a pricing comparison or a spec sheet: use a plain
  `<table>`. A grid's keyboard model is for working in it, not for reading.
- Editing in place, column reordering, grouping and pagination aren't in
  this version. For pages, pair it with your own pagination and pass one
  page of `rows`.

## Props

Every `<div>` prop not listed goes on the outer box (`className`, `style`).
Give the box its height there; it's 440px by default.

| Prop | What it does |
|---|---|
| `columns` | The column definitions; see below |
| `rows` | The data, in its original order |
| `getRowId` | A stable id per row. Selection follows it through sorting |
| `getRowLabel` | What a row is called: names its checkbox ("Select Maya Chen") and its validation messages |
| `aria-label`, `aria-labelledby` | Names the grid. One is required |
| `sort`, `defaultSort`, `onSortChange` | `{ key, direction }`, where direction is `"ascending"` or `"descending"`, or `null` for the original order. Controlled or uncontrolled |
| `columnWidths`, `defaultColumnWidths`, `onColumnWidthsChange` | Widths in px by column key. The callback fires as a column resizes, with every width set so far; save it to keep widths across visits |
| `selectable` | Adds the checkbox column and select-all |
| `selectedIds`, `defaultSelectedIds`, `onSelectedIdsChange` | The selected row ids, as a `Set`. Controlled or uncontrolled |
| `stickyFirstColumn` | The checkboxes and the first column stay put while the rest scroll sideways, as long as they take no more than 60% of the table's width. In a narrow table (a phone) the first column first gives up width, down to its `minWidth`, to stay pinned; only past that do they scroll with the rest |
| `rowHeight` | Every row's height in px. 44 by default |
| `overscan` | Rows rendered past each edge of the visible window. 6 by default |
| `loading`, `loadingLabel` | With no rows yet, the body holds its space and names the wait |
| `empty` | Shown in the body when there are no rows. Usually an Empty state |
| `locale` | For text sorting. `en-US` by default, fixed so server and browser agree |

Each column:

| Field | What it does |
|---|---|
| `key` | Unique; also the field read from each row by default |
| `header` | The column's name, in the header and in every label made from it |
| `cell` | What the cell renders. Defaults to the value as text |
| `value` | What it sorts on. Defaults to `row[key]`. Numbers and dates sort as such, text naturally ("Table 2" before "Table 10") |
| `compare` | Your own ascending order, when `value` isn't enough |
| `width`, `minWidth`, `maxWidth` | 160, 72 and 640 by default |
| `align` | `end` for numbers: right-aligned on their last digit, in tabular figures, with the sort arrow on the far side of the label |
| `sortable` | The header becomes a sort button |
| `resizable` | `false` to fix the width. On by default |
| `validate` | Returns a message when the cell needs a look, or nothing |

Define `columns` outside render, or memoize it, when the table is large:
the sort and the validation pass rerun when it changes.

## States

| State | What you see | How |
|---|---|---|
| Active cell | A line just inside the cell, at once | `:focus-visible` on the cell; one cell is the tab stop |
| Active row | The row a step darker while the grid has focus | `data-active` |
| Sorted column | Header label at full contrast, arrow shown | `aria-sort` on the header |
| Sort hover | Header filled a step, an unsorted column previews its arrow at half strength | `@media (hover: hover)` |
| Selected row | A pale accent tint, opaque under the sticky column | `aria-selected` |
| Some selected | Select-all shows its dash | Checkbox `indeterminate` |
| Resize edge | A short hairline at every header edge; it lengthens under the pointer and turns full contrast while dragged or focused | `role="separator"` |
| Needs a look | Text in the danger color and an alert mark on the side away from the alignment edge | `validate`; `aria-invalid` |
| Loading | After 300ms, hairlines for the rows to come and a shimmering label | `loading` with no rows; `aria-busy` |
| Empty | Your `empty` content, centered in the visible part of the body | no rows, not loading |

Under the grid, while any cell needs a look, one line counts them ("2 cells
need a look"). When the active cell is one, the line says which and why:
**Priya Patel, Email** Add the part after the @. It wraps instead of
cutting the message short.

## Keyboard

| Key | Does |
|---|---|
| Tab | Into the grid, on the last active cell. From a header cell, once more to its resize edge |
| Arrows | Move the active cell. Left and right follow the writing direction |
| Home, End | First or last cell in the row; with Ctrl or Cmd, of the grid |
| Page Up, Page Down | A screenful of rows; from the first row, Page Up reaches the header |
| Enter | Presses the cell's button, link or checkbox; on a header, sorts |
| Space | Toggles the row's checkbox from the checkbox column, or from anywhere with Shift; on a header, sorts |
| Ctrl/Cmd + A | Selects every row |
| Escape | From something inside a cell, back to the cell |
| On a resize edge | Arrows by 16px (Shift: 64px), Home and End to the limits, Enter or Escape back to the header |

## Layout

The header is 40px and sticks to the top; rows are `rowHeight` tall with a
hairline between them. Cells have 12px of padding, 16px on the table's
starting edge, so the checkbox and the first column's text start where the
header's do. Text that doesn't fit fades at its end, only when it's cut.

Edges follow the system's two tiers: the box's outline is
`--ui-border-strong`, the same color as the search field or select above
it, and every line inside (the header rule, row dividers, the footer rule,
the sticky column's edge) is the lighter `--ui-border`.

The table scrolls both ways inside its box. When there are more columns
past an edge, that edge fades, with a mask that keeps the scrollbars solid.
Sideways it has no overscroll: a swipe that reaches the end stops there,
with no rubber band pulling columns off the sticky one and no browser back
gesture. Up and down, reaching the end hands the scroll on to the page, so
the table never traps it.
A sticky first column instead draws a hairline at its edge while content
passes under it. Cell backgrounds there are opaque mixes of the surface, so
nothing shows through, selected or not.

The resize edge is 24px wide to hit with a mouse and 40px on touch, over
the padding of the cells either side, so it never takes room from a label.
The pointer stays the default arrow over it, as everywhere else that isn't
a button; the edge's line is the cue.

On a phone the table scrolls sideways inside its own box, never the page,
with the checkboxes and first column pinned (`stickyFirstColumn`): the first
column narrows toward its `minWidth` so the pinned part stays within 60% of
the box, and the other columns scroll under it. It doesn't stack into cards:
a data table is for comparing across columns, and its cells are edited in
place.

## Virtualization

Only the rows in view, plus `overscan` either side, exist in the DOM. Every
row is placed at `index × rowHeight` inside a body as tall as all of them,
so the scrollbar is true from the start. The grid's `aria-rowcount` is the
full count plus the header, and each row's `aria-rowindex` is its real
place, so a screen reader says "row 212 of 321". The active row stays
rendered while it's scrolled away, so the focused cell is never removed
from under the keyboard.

Rows can't change height: wrap or clamp long content inside the cell
instead, and raise `rowHeight` for two-line cells.

## Motion

| What | Duration | Easing |
|---|---|---|
| Sort arrow appears or fades | `--ui-dur-instant` | `--ui-ease-color` |
| Arrow flips between up and down | `--ui-dur-move` | `--ui-ease-move`, the head moves, the shaft stays |
| Row tint on select, active row | `--ui-dur-instant` | `--ui-ease-color` |
| Edge fade and sticky edge line | `--ui-dur-fast` | `--ui-ease-color` |
| Resize line growing | `--ui-dur-snap` | `--ui-ease-snap` |
| Loading hairlines and label | `--ui-dur-fast` after 300ms | `--ui-ease-enter` |
| A new message under the grid | `--ui-dur-fast` | `--ui-ease-enter` |

When a sort is cleared, the arrow fades out as the direction it was and
only then turns back to up, ready to preview the next click. Columns resize
live, with no animation: the edge follows the pointer. Under
`prefers-reduced-motion: reduce` the arrow and the resize line change at
once; color and opacity feedback stays.

## Accessibility

- `role="grid"` with `columnheader` and `gridcell` roles, `aria-rowcount`,
  `aria-colcount` and a real `aria-rowindex` on every rendered row.
- One tab stop (a roving `tabindex`). Links and buttons inside cells are
  taken out of the tab order and reached with Enter, so a table of 300
  "Remind" buttons isn't 300 tab stops.
- Sorting sets `aria-sort` on the header and says what happened in a live
  region: "Sorted by Paid, descending".
- Resize edges are `role="separator"` with `aria-valuenow`, min and max,
  named "Resize Email column".
- With `selectable`, the grid is `aria-multiselectable` and rows carry
  `aria-selected`. Each checkbox is named from `getRowLabel`.
- A cell that needs a look has `aria-invalid` and its message as its
  description, so it's read when the cell is reached.

## Before / after

Before: a `<table>` of every row, a click handler on each header with an
arrow that pops in, no keyboard path through the cells, and 300 buttons in
the tab order.

```tsx
<table>
  <thead>
    <tr>{cols.map((c) => <th onClick={() => setSort(c.key)}>{c.label} {sort === c.key && "▲"}</th>)}</tr>
  </thead>
  <tbody>{rows.map((r) => <tr>{cols.map((c) => <td>{r[c.key]}</td>)}</tr>)}</tbody>
</table>
```

After:

```tsx
<DataTable aria-label="Guests" columns={columns} rows={guests} getRowId={(g) => g.id} selectable stickyFirstColumn />
```
