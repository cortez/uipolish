# File changes

The files an agent changed, one 32px row each: a mark for what happened to
the file (added, modified, deleted, renamed), its folder in the muted color
and cut from the start when there's no room, its name whole, and lines added
and removed at the end. A totals line sits on top, the selection follows the
arrow keys so a diff beside the list keeps up, and the list has loading and
empty states. `FileChip` names one file inline, in a message or under a
reply.

```tsx
<FileChanges
  files={[
    { path: "tests/e2e/checkout.spec.ts", kind: "modified", added: 6, removed: 4 },
    { path: "src/checkout/use-cart-total.ts", kind: "modified", added: 14, removed: 7 },
    { path: "tests/e2e/fixtures/slow-tax.ts", kind: "added", added: 22, removed: 0 },
  ]}
  value={selected}
  onValueChange={openDiff}
/>

<FileChip path="src/lib/rate-limit.ts" kind="added" added={41} removed={0} onClick={() => openDiff("src/lib/rate-limit.ts")} />
```

## When to use it

- The changed files of an agent's turn, a commit or a pull request, beside
  the diff they open.
- A repository's files with the changed ones marked (leave `added`,
  `removed` and `kind` out for unchanged files).
- `FileChip`: a file an answer or a prompt names, as a pressable chip.

## When not to

- A tree people expand and collapse folder by folder: this is a flat list of
  paths, which is what a review needs.
- The diff itself: use Diff view beside the list.
- More than a few thousand rows: virtualize them; the rows keep a fixed
  height so they can be.

## Parts

| Part | What it is |
|---|---|
| `FileChanges` | The list, with its totals line |
| `FileChip` | One file inline: the mark, the name in mono, its stat. A button with `onClick`; `inline` steps it down to 20px for a line of text |
| `FilePath` | A path as the rows show it: the folder muted and cut from its start, the name whole |
| `ChangeMark` | The icon set's change square: plus, dot, minus or arrow; a plain file when nothing changed |
| `splitPath`, `totalChanges` | `"src/app/page.tsx"` → `["src/app/", "page.tsx"]`; files, added and removed across a list |

## Props

| Prop | What it does |
|---|---|
| `files` | `{ path, added?, removed?, kind?, from? }[]`. `from` is the old path of a rename |
| `value`, `onValueChange` | The selected path; called as the selection moves. Without `onValueChange` the list is read-only |
| `label` | Names the list for screen readers. “Changed files” by default |
| `totals` | The “4 files +54 −12” line. On by default |
| `actions` | Something at the end of the totals line: a filter, a Collapse |
| `loading`, `loadingLabel` | Skeleton rows after 300ms, the label announced |
| `empty` | What shows with no files. “No files changed yet.” by default |

## Layout

| Part | Size |
|---|---|
| Row | 32px (40px on touch), 12px in, the panel's row radius |
| Mark | 14px, beside 13px text: green added, red deleted, muted otherwise |
| Path | 13px mono. The folder takes what's left after the name and shrinks first, cut at its start with a fade |
| Stat | 13px, figures of equal width, at the row's end |
| Chip | 24px tag on the field edge (20px `inline`); the name in mono, never cut unless the line can't hold it |

## States

| State | What you see | How |
|---|---|---|
| Rest | Mark, muted folder, name in the text color, stat | |
| Hover | A faint fill on the row | `@media (hover: hover)` |
| Selected | The kit's flat pill, as the current row everywhere | `aria-selected` |
| Focus | A line inside the row | `:focus-visible` |
| Long path | `…components/settings/` cut at the start, the name whole; the full path in `title` | |
| Renamed | The arrow mark; “Renamed from old/path” read out; `old → new` in `title` | `kind: "renamed"`, `from` |
| Unchanged file | A plain file mark, no stat | no `kind` |
| Loading | After 300ms, six skeleton rows of the real height | `loading` |
| Empty | One quiet line where the list would be | `empty` |

## Keyboard

| Key | Does |
|---|---|
| Tab | Into the list, on the selected row (or the last focused, or the first) |
| ↑ ↓ | Move and select, so the diff beside it follows |
| Home, End | First, last |
| Enter, Space | Select the focused row |

## Motion

| What | Duration | Easing |
|---|---|---|
| Row fill on hover, press, select | `--ui-dur-instant` | `--ui-ease-color` |
| A change mark changing kind | the icon set's morph | |

Nothing else moves: a list people scan holds still.

## Accessibility

- A selectable list is a `listbox` of `option`s with one tab stop; a
  read-only one is a plain list.
- Each row reads its path, then what happened and the counts in words
  (“Modified, 6 lines added, 4 removed”); the visible stat is hidden from
  screen readers so it isn't read twice.
- Paths are isolated left to right, so a right-to-left page never reorders
  their slashes.
- Chips take a 40px target on touch without growing.

## Before / after

Before: a path cut at its end, which hides the file name, a status letter
in a colored box, and rows that need a mouse.

```tsx
<li className="truncate">{file.path} <span className="text-green-600">+{file.added}</span></li>
```

After:

```tsx
<FileChanges files={files} value={selected} onValueChange={setSelected} />
```
