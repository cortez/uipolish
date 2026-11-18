# Badge

A small static label for a status or a count: "Going", "Card declined", a
3 beside Replies. It's a pill exactly as tall as the line it sits in, so a
badge in a sentence or a table row never makes that line taller. A tone
tints it and colors an optional dot; the words always carry the meaning.
Counts are round for one digit and set in figures of equal width.

```tsx
<Badge tone="positive" dot>Going</Badge>
<Badge tone="danger" dot>Card declined</Badge>
<Badge size="sm" tone="accent" count={3} label="3 unread replies" />
```

## When to use it

- The state of a row in a list or table: a guest's RSVP, a dinner's
  status, a deploy's result.
- A count beside a tab, a nav item or a heading.
- A short marker on something new ("New", "Beta").

## When not to

- Anything the user can press or dismiss: use a button, or a chip
  (`registry/chip`) for filters and removable values. A badge has no hover,
  no pointer and no focus, because it doesn't act.
- A status that needs a sentence of explanation or an action: use an
  alert.
- Decoration. If every row has a colored badge, none of them stands out;
  leave the ordinary state unbadged or neutral.

## Props

Every `<span>` prop passes through.

| Prop | What it does |
|---|---|
| `tone` | `neutral` (default), `accent`, `positive`, `warning`, `danger`. See below |
| `dot` | A 6px mark in the tone's color before the label |
| `size` | `md` (default) is 24px, for a 15px line; `sm` is 20px, for a 13px line |
| `count` | Shows a number instead of a label. Round for one digit, longer for more |
| `max` | Over this, a count reads `99+` (default 99) |
| `label` | What a count means, read instead of the bare number ("3 unread replies") |

## Tones

The palette is small on purpose (see `foundation/rules/surfaces.md`):

| Tone | Means | Look |
|---|---|---|
| `neutral` | A state with nothing good or bad about it: awaiting reply, draft | Gray tint, muted text, gray dot |
| `accent` | New, unread, the one thing the eye should find | Accent tint and text |
| `positive` | Done and good: going, paid, confirmed | Success tint and text |
| `warning` | Needs attention, nothing failed: reply due tomorrow | Amber (`--ui-warning`), with its text in `--ui-warning-text` |
| `danger` | Failed: card declined, bounced | Danger tint and text |

Each tone is the alert tint trio at badge scale: the tone's tint token
(`--ui-accent-tint`, `-success-tint`, `-warning-tint`, `-danger-tint`;
`--ui-fill-strong` for neutral), the hue a few percent into transparent, a hairline of it at the edge, and the label in the tone's
text color (`--ui-success-text`, `--ui-danger-text`, `--ui-accent-text`),
which holds 4.5:1 on the tint in both themes. Dark surfaces show a hue far
later than light ones, so dark takes more of it (16% fill against 10%). The edge is the
tone's set edge (`--ui-border-accent`, `-success`, `-warning`, `-danger`;
`--ui-border` for neutral, the line used inside a box). The fill is mixed with transparent, not with the surface, so a
badge reads the same on the canvas, a card, or a selected row.

**Never rely on the color.** The tone backs up the words; it doesn't
replace them. Write "Card declined", not a red badge that says "Card".
People who can't tell red from green, and screen readers, get the label.

## States

A badge has one state: what it says. There's no hover, press, focus or
disabled look, because nothing about it responds. If its content changes
(a count going up), it changes in place; figures of equal width keep 18
and 11 the same size.

## Layout

- **A little taller than the line.** `md` is 24px and `sm` 20px: two pixels
  more than a 15px or 13px line, so the letters have air above and below and
  the pill doesn't look squeezed. In a row, aligned to the top of the line
  (`vertical-align: top`).
- **In a sentence** (straight inside a `p`, `li`, `dd` or `figcaption`) it
  drops to 20px and sits on the text's baseline, so there's room above and
  below and it never touches the lines around it, with 2px at each side so
  punctuation doesn't butt against it.
- Text is 13px / 500, trimmed to its capitals and baseline, so the box centers the letters:
  `--ui-pad-tag` (12px, half the height, so the label starts where the
  round end stops) each side at `md`, `--ui-pad-tag-sm` (8px) at `sm` and
  inside a sentence.
- **The dot** is 6px, 6px from the label. It's a lighter mark than a
  letter, so its side looks emptier at the same padding; the start padding
  is 2px less with a dot, which balances the pill.
- **Counts** are never narrower than tall: one digit is a circle, two or
  more a pill with 8px sides (6px at `sm`). `tabular-nums` gives every figure the same
  width.
- In a flex row, align the row's items to center; the badge is as tall as
  a line of text beside it.

## Motion

None. A badge doesn't move or animate when it appears or changes; a status
arriving later is announced by whatever region it's in, not by the badge.

## Accessibility

- A plain `<span>` with its text, so it's read in place: "Maya Okafor,
  Going".
- A count with `label` reads the label instead of the bare number; the
  number is `aria-hidden` and the label is visually hidden. Without
  `label`, it reads the number, which only makes sense if the text right
  beside it says what it counts.
- The dot is `aria-hidden`.
- In forced-colors mode the tint and inset edge are dropped by the browser,
  so the badge draws a real outline and keeps its dot in the text color.
- If a badge's status changes while the user is on the page and they need
  to know, put the change in a `role="status"` region; the badge doesn't
  announce itself.

## Before / after

Before: a colored rectangle with 4px padding and 11px uppercase text,
green and red as the only difference, set `vertical-align: middle` so
every row with one is a little taller than the rest.

```tsx
<span style={{ background: paid ? "green" : "red", color: "white", padding: 4, fontSize: 11 }}>
  {paid ? "PAID" : "UNPAID"}
</span>
```

After:

```tsx
<Badge tone={paid ? "positive" : "neutral"} dot>{paid ? "Paid" : "Awaiting payment"}</Badge>
```

Before: a count as a 16px circle that turns into an egg at 10.

```tsx
<span className="count">{unread}</span>
```

After:

```tsx
<Badge size="sm" tone="accent" count={unread} label={`${unread} unread replies`} />
```
