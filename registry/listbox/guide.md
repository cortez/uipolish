# Listbox

The shared parts of floating lists and panels that open under a field.
Select, combobox, phone input and date picker use it. The behavior
(focus, keys, placement, dismissal) comes from Base UI's `Select`,
`Combobox` and `Popover`; this primitive is only the look and the
highlight.

- `useHighlight({ centerSelected })` returns `listRef`, `barRef` and
  `listNode`. Put `listRef` on the scrolling list and `barRef` on a span
  that is the list's first child. One highlight slides on the snap spring
  to whichever row Base UI marks `data-highlighted`, appears in place the
  first time, and the list gets `data-fits` when it doesn't scroll (for
  the edge fade). With `centerSelected`, the chosen row
  (`data-selected`) starts in the middle each time the list opens. Base UI
  keeps the highlighted row in view.
- `listbox.module.css`: `popup` (for Base UI's `Positioner`: only holds
  the place, never scaled), `panel` (for the `Popup`: fades, unblurs and
  scales from 0.97 at `--transform-origin` on `[data-starting-style]` and
  `[data-ending-style]`, no taller than `--available-height`), `list`,
  `fade`, `highlight`, `option`, `lead`, `text`, `label`, `description`,
  `check` and `status`. Rows sit 4px inside the panel with its radius
  less 4px (concentric, never pills), and row text sits `--ui-pad-row`
  (12px) in from the row's edge, clear of its curve; the status line's
  text starts at the same 16px. Set
  `--listbox-width` on the popup to size it, such as
  `var(--anchor-width)` to match the field.

The `panel`'s edge is the one in `--ui-shadow-floating`: the outline
color fields use (`--ui-border-strong`), drawn once. Don't stack another
ring on it.

Disabled and chosen rows are styled from Base UI's `data-disabled` and
`data-selected`.
