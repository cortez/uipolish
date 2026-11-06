# Diff view

A unified diff of two versions of a text or code file: removed lines, then
added lines, each marked in the gutter with − or +, not by color alone.
Within a changed pair, the part that changed is marked again.
Long unchanged stretches fold into a row that opens in place. In streaming
mode, lines appear as the new version is written.

```tsx
<DiffView name="checkout/shipping.ts" before={original} after={proposed} />

// While a model writes the edit:
<DiffView name="checkout/shipping.ts" before={original} after={partial} streaming={!done} />
```

## When to use it

- Reviewing an edit an assistant proposes before applying it.
- Showing what changed between two versions of a document or config.

## When not to

- Side-by-side review of large changes across many files: use a full code
  review tool.
- Prose with long wrapped paragraphs: a line diff marks whole paragraphs.
  Diff by sentence first and pass one sentence per line.
- Binary or generated files.

## How it works

- Lines are compared with Myers' O(ND) algorithm, the one most diff tools
  use. Inside each change, removed lines come before added ones.
- When a change replaces the same number of lines, each pair's common start
  and end are trimmed and the middle is marked, unless that middle is most
  of the line.
- `context` (3) unchanged lines stay beside each change. Stretches of 4 or
  more beyond that fold into an "Unchanged lines" row with the count.
- **Streaming.** Only whole lines show; the line being written appears when
  it ends. Lines of `before` the new text hasn't reached yet aren't shown as
  removed, because they may still come back.

## States

| State | What you see | How |
|---|---|---|
| Added line | Green tint, + in the gutter, new line number only | `<ins>` |
| Removed line | Red tint, − in the gutter, old line number only | `<del>` |
| Changed part | The same tint again behind the characters that changed | paired lines |
| Unchanged line | Muted text, both line numbers | |
| Folded | A full-width row: a chevron pointing down, "Unchanged lines" and the count | `aria-expanded="false"` |
| Unfolded | The lines open under the row and its chevron points up. The label doesn't change: the chevron and `aria-expanded` say which way it goes | `aria-expanded="true"` |
| Streaming | The file name dims under a passing light band; new lines fade in where they land; the counts update in place | `streaming`, `aria-busy` |
| No changes | "No changes. Both versions are the same." | |
| Wide lines | The code scrolls sideways; line numbers, markers and fold labels stay put | sticky gutter |

## Motion

| What | Duration | Easing |
|---|---|---|
| Fold opens (rows 0fr → 1fr) | `--ui-dur-panel` | `--ui-ease-expand` |
| Fold closes | `--ui-dur-base` | `--ui-ease-collapse` |
| Folded lines fade in, 60ms after the box starts | `--ui-dur-fast` | `--ui-ease-enter` |
| Chevron tip moves up or down | `--ui-dur-move` | `--ui-ease-move` (from the icon set) |
| A streamed line arrives (opacity only) | `--ui-dur-fast` | `--ui-ease-enter` |
| Light band across the name while streaming | `--ui-dur-sweep` per pass | `linear` |

Lines present when the diff mounts and lines revealed by a fold don't fade.
Under `prefers-reduced-motion: reduce` folds open at once and the name
doesn't sweep.

## Layout

- Monospace at 13px on a 20px line. Line numbers are tabular and their
  columns are sized from the largest line number, so the code starts on the
  same x on every row.
- The tints are layered over the block's own background, so the sticky
  gutter is opaque and code scrolling under it never shows through.
- The +N −N counts each reserve four characters and grow rightward inside
  them, and a fold's count comes last in its label, so a new digit while
  streaming doesn't nudge anything.

## Accessibility

- Changed lines are `<ins>` and `<del>`, and start with a visually hidden
  "Added: " or "Removed: ", since not every screen reader announces
  insertions. Line numbers and markers are `aria-hidden`.
- The counts are read as "7 lines added, 5 removed".
- Fold rows are buttons with `aria-expanded` and `aria-controls`; closed
  folds are `inert`.
- When the lines overflow, the scroll area becomes focusable, named "Diff of
  checkout/shipping.ts", so the arrow keys can scroll it.

## Before / after

Before: red and green backgrounds only, so the change is invisible without
color, and a 400-line file shows all 400 lines for a two-line change.

```tsx
{lines.map((l) => <div style={{ background: l.added ? "#dfd" : l.removed ? "#fdd" : "none" }}>{l.text}</div>)}
```

After:

```tsx
<DiffView name="checkout/shipping.ts" before={before} after={after} />
```
