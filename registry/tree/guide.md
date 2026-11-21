# Tree

A file and folder tree for an app's side panel. Rows come from data, nested
as deep as it goes; one row is selected at a time; folders fold open and
shut on their height. The whole tree is one tab stop and the arrow keys do
the rest. A row can carry a quiet value at its end (a change count, a diff
mark), and a folder can load its children the first time it opens.

```tsx
const items: TreeItem[] = [
  {
    id: "menus",
    label: "Menus",
    icon: <Icon name="folder" />,
    meta: 2,
    metaLabel: "2 changes",
    children: [
      { id: "menus/friday-supper.md", label: "friday-supper.md", icon: <Icon name="file" /> },
      { id: "menus/harvest-dinner.md", label: "harvest-dinner.md", icon: <Icon name="file" /> },
    ],
  },
  { id: "invitation.md", label: "invitation.md", icon: <Icon name="file" /> },
];

<Tree aria-label="Files" items={items} value={open} onValueChange={setOpen} defaultExpanded={["menus"]} />
```

Base UI has no tree, so this one implements the WAI-ARIA tree pattern
itself: the roles, the roving tab stop and every key below are in
`tree.tsx`. The look and motion are the library's.

## When to use it

- Things that nest to a depth you don't control: files and folders, pages
  that hold pages, a layer list, an outline.
- A side panel where one item is open in the page beside it.

## When not to

- One level of sections with a few links each: use the sidebar's sections.
- Content that opens in place under a heading: use an accordion.
- A flat set of peers: use a list.
- Picking several items, or dragging them into other folders: this tree
  selects one and doesn't reorder.

## Props

`Tree` takes every `<ul>` prop (name it with `aria-label` or
`aria-labelledby`), `ref` and `className`, besides these:

| Prop | What it does |
|---|---|
| `items` | The top level, an array of `TreeItem` |
| `value`, `defaultValue`, `onValueChange` | The selected item's id, controlled or not |
| `expanded`, `defaultExpanded`, `onExpandedChange` | The ids of the open folders, controlled or not |
| `selectFolders` | Folders can be selected too, for pages that hold pages. A press on a folder selects it and toggles it; a press on its chevron only toggles. Default `false`: a folder only opens and closes |
| `loadChildren` | `(item) => Promise<TreeItem[]>`, called the first time a `lazy` folder opens. Reject it to show the retry row |
| `guides` | A hairline down each open folder, under its chevron. Default `true` |

A `TreeItem`:

| Field | What it does |
|---|---|
| `id` | Unique in the whole tree, not only among siblings; a path works well |
| `label` | The row's text and its accessible name. One line, cut with a fade when it's too long |
| `icon` | A 16px glyph before the label. Decorative |
| `meta` | A short value at the end of the row: a count, a word, a diff mark. Never cut; the label gives way |
| `metaLabel` | What `meta` says, for screen readers, when it isn't plain text ("Added", "3 changes") |
| `children` | Present, even empty, makes the item a folder |
| `lazy` | A folder whose children come from `loadChildren` |
| `disabled` | Can't be selected or opened; the arrow keys still stop on it, so it can be read |

## States

| State | What you see | How |
|---|---|---|
| Rest | Muted text and glyphs, no fill | |
| Hover | Text, icon and chevron come up to the text color; no fill | `@media (hover: hover)` |
| Press | A fill appears in 80ms and shrinks to 0.985, the text stays put; release springs back | `:active`, on a layer under the text |
| Focus | A line just inside the row's edge, on the row alone, not the folder's contents | `:focus-visible` on the item |
| Selected | Tabs' flat highlight, text in the text color | `value` → `aria-selected` |
| Open folder | Chevron a quarter turn down; children below, stepped in one level, a hairline down their start | `aria-expanded` |
| Empty folder | One quiet line, "Empty", where the rows would be | `children: []` |
| Loading, under 300ms | Nothing but the open chevron: a fast answer never flashes a loading row | `aria-busy` on the folder |
| Loading, longer | One line, "Loading…", with a light band sweeping across it; it stays at least 400ms, then gives its place to the rows | |
| Failed | The line becomes a row: an alert glyph and "Couldn’t load. Try again". A press, Enter or Space asks again, and the line reads "Loading…" at once | the promise rejected |
| Disabled | Row at 50%, default cursor, no hover or press | `disabled` → `aria-disabled` |
| Long label | Cut at the row's end with a 24px fade; the full name is the tooltip while it's cut | the `text` primitive's `truncate` |

## Layout

Rows are 32px tall with 2px between them, at the control radius, as Sidebar's
are; 40px on touch screens. A row is laid out from its start: 12px, the
chevron's 16px slot, 4px, the 16px icon, 8px, the label, then the value
12px from the end. A row with no chevron keeps the slot, so icons and
labels on one level line up. Each level steps in 20px (the slot and its
gap), which puts a child's chevron under its folder's icon. The guide is
one hairline in `--ui-border-strong` under the folder's chevron. Labels are
14px; values are 12px in `--ui-subtle`. Wrap a figure that should line up
down the tree in a span with `font-variant-numeric: tabular-nums`: the row
doesn't set it, since a value can hold words.

The tree has no box, padding or scroll of its own: put it in the panel
that holds it (8px of padding suits the rows' corners), inside a scroll area
when it can outgrow the panel.

## Motion

| What | Duration | Easing |
|---|---|---|
| Text, icon and chevron color on hover and select | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Fill on select and release | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Press: fill and shrink | `--ui-dur-press` (80ms) | |
| Press release (scale) | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Chevron quarter turn | `--ui-dur-base` (200ms) | `--ui-ease-glide` |
| Folder opening (`grid-template-rows`) | `--ui-dur-panel` (280ms) | `--ui-ease-expand` |
| Its rows fading in, 60ms after | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Folder closing | `--ui-dur-base` (200ms) | `--ui-ease-collapse` |
| Its rows fading out | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Loading line giving way to the rows | the opening's 280ms, both ways | `--ui-ease-expand` |
| Loading line turning into the failure, and back | `--ui-dur-fast` (160ms) fade | `--ui-ease-enter` |

A folder interrupted midway turns round from the height it has reached.
The loading line closes on the rows' opening timing, so the two heights
trade off and what's below moves once. Nothing animates on first paint: a
tree that starts with folders open is simply open. A folder's rows mount
the first time it opens and stay mounted, so closing can fade them. Under
`prefers-reduced-motion: reduce` folders open and close at once with their
rows fading, the chevron turns at once, the press doesn't shrink and the
loading band holds still.

## Accessibility

- `role="tree"` on the list, `role="treeitem"` on each item with
  `aria-level`, `aria-posinset` and `aria-setsize`, and `role="group"`
  around a folder's children. Folders carry `aria-expanded`; rows that can
  be selected carry `aria-selected`.
- One tab stop: the row the keyboard was last on, or the selected row, or
  the first. Tab leaves the tree.
- Keys: Down and Up move through the rows in sight. Right opens a closed
  folder, then moves to its first row; Left closes an open folder, then
  moves to its parent. Home and End go to the first and last row. Enter and
  Space select a row or toggle a folder. `*` opens every folder on the
  current level. Typing letters jumps to the next row whose name starts
  with them; a pause of half a second starts a new search, and one letter
  pressed again cycles. Left and Right swap in right-to-left layouts.
- Moving focus never selects: a file opens when it's asked for, not while
  passing over it.
- A row's name is its label, then its value: `metaLabel`, or `meta` when
  it's plain text ("Menus, 3 changes"). Icons and marks are decorative.
- A loading folder is `aria-busy`. The retry row is a real tree item named
  "Couldn’t load Archive. Try again", reached with the arrow keys; after it's
  pressed, focus waits on the folder.
- Closed folders are `inert`: their rows can't be focused or read.
- Rows are 40px on touch screens.

## Before / after

Before: nested `div`s with click handlers. Nothing is focusable, a screen
reader hears loose text with no levels, folders snap open, and a slow
folder shows a spinner for 80ms.

```tsx
<div onClick={() => toggle(folder.id)}>
  {open ? "▾" : "▸"} {folder.name}
</div>
{open && (loading ? <Spinner /> : folder.files.map((f) => <div onClick={() => openFile(f)}>{f.name}</div>))}
```

After: a tree with levels, one tab stop and every key, folders that fold,
and a loading row only when the wait is long enough to need one.

```tsx
<Tree
  aria-label="Files"
  items={items}
  value={openFile}
  onValueChange={setOpenFile}
  loadChildren={(folder) => fetchFiles(folder.id)}
/>
```
