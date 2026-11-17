# Diff stat

Lines added and removed, “+12 −3”, in the type around it: added in the
success color, removed in the danger color, both in figures of equal width
so a column of stats lines up at its end. Screen readers hear one sentence,
“12 lines added, 3 removed”, instead of two signed numbers.

```tsx
<DiffStat added={12} removed={3} />
<DiffStat added={22} removed={0} hideZero />   {/* a new file: "+22" */}
```

Use it anywhere a change is counted: a file row, a total, a chip. `formatCount` (“1,204”) and
`describeDiff` (the spoken sentence) are exported for a totals line or a
tab's count.

## When to use it

- Beside a file, a commit, a pull request or a turn of an agent's work: the
  size of the change at a glance.
- A totals line over a list of files.

## When not to

- A count that isn't lines of a diff (files, comments): a plain number, or a
  Badge.
- A chart of change over time: use a chart; color alone can't carry a trend.

## States

| State | What you see | How |
|---|---|---|
| Both sides | `+12 −3`, green then red | |
| A side is 0 | `+22 −0`, the 0 in the subtle color, so it reads as nothing rather than a red alarm | |
| `hideZero` | Only the side that changed: `+22` | `hideZero` |
| Nothing changed | `+0 −0`, both subtle; screen readers hear “No lines changed” | |
| Large counts | `+1,204 −388`, grouped | `formatCount` |

## Props

| Prop | What it does |
|---|---|
| `added`, `removed` | Lines added and removed |
| `hideZero` | Leave out a side that is 0 |
| other `span` props | Pass through (`className`, `aria-hidden` when the sentence is said elsewhere) |

It takes the font size and weight around it: 13px in a file row, 15px in a
heading. Only the color is its own. It renders on the server.

## Accessibility

- The visible numbers are `aria-hidden`; a visually hidden sentence says the
  same thing in words, with “line” or “lines” as the count needs.
- Red and green are never the only signal: the `+` and `−` signs carry the
  meaning in every color mode, forced colors included.
- The minus is a real minus sign (U+2212), the width of the plus.

## Before / after

Before: two spans in hand-picked greens and reds, proportional figures that
jiggle as counts change, and a screen reader that reads “plus twelve minus
three”.

```tsx
<span style={{ color: "#22c55e" }}>+{added}</span> <span style={{ color: "#ef4444" }}>-{removed}</span>
```

After:

```tsx
<DiffStat added={added} removed={removed} />
```
