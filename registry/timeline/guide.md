# Timeline

An activity feed: who did what, and when. Items sit under day headings
("Today", "Yesterday", "Nov 14"), each with the actor's avatar or an icon
dot on a thin rail, a sentence ("Maya Chen confirmed Friday supper for
12") and a relative time with the full date in a tooltip. An item can
carry a quoted message, a field that changed ("Guests 10 → 12") or
attachments. New items slide in at the top while the rest move down;
"Load earlier" at the end brings in history.

```tsx
<Timeline
  aria-label="Booking history"
  items={activity}
  onLoadMore={loadEarlier}
  loading={loadingEarlier}
  hasMore={cursor !== null}
/>
```

## When to use it

- The history of one thing: a booking, an order, a ticket, a document.
- A team's recent activity in a side panel (`variant="compact"`).
- Anywhere updates arrive while someone is looking and should be noticed
  without a toast.

## When not to

- Things still to happen, planned by day and hour: use the calendar.
- An agent's steps in a run: use tool steps.
- A conversation people reply in: use the message thread.

## Props

`Timeline` takes every `<div>` prop besides these. Name it with
`aria-label` (default "Activity").

| Prop | What it does |
|---|---|
| `items` | Newest first. `{ id, at, actor?, action, object?, avatar?, icon?, tone?, quote?, change?, attachments? }[]` |
| `at` | When: local wall-clock text (`"2026-11-21T18:32"`), a `Date`, or text with a zone |
| `actor`, `action`, `object` | The sentence: the actor and the object in the text color, the verb between them muted. Leave `actor` out for something the system did ("Deposit of $180 received") |
| `avatar` | A photo URL for the actor's avatar; their initials show without one |
| `icon`, `tone` | An icon in a dot instead of an avatar, for system events; `tone` (`neutral`, `accent`, `success`, `warning`, `danger`) tints the dot |
| `quote` | A message they wrote, in a soft box under the sentence |
| `change` | `{ field, from, to }`: "Guests ~~10~~ → 12". When the item arrives while the feed is open, the new value rolls up from the old one |
| `attachments` | `{ name, href?, size? }[]`: a row of file tags; with `href` each is a link. Long names fade at the end |
| `groupBy` | `day` (default): under day headings. `none`: one list |
| `variant` | `default`: 32px markers. `compact`: 20px markers and tighter rows, for a side panel |
| `onLoadMore`, `loading`, `hasMore` | "Load earlier" at the end while `hasMore` (default true). `loading` makes it busy (the button's own timing: the label morphs to "Loading earlier…" only after 300ms, then holds at least 400ms) and sets `aria-busy` on the feed |
| `locale` | Times, day names and "Yesterday" come from `Intl` |

## States

| State | What you see |
|---|---|
| Today | "Just now", "12 minutes ago", "3 hours ago", moved on every 30 seconds |
| Earlier days | The clock time ("10:30 AM"); the heading says the day |
| Hover on a time | A tooltip with the full date and time |
| New item at the top | Fades in and slides down 6px into place; everything below moves down on the move spring; a changed number rolls once it's in |
| Earlier items at the end | Fade in where "Load earlier" was; the button moves down |
| Loading earlier | The button busy, the feed `aria-busy` |
| Nothing earlier | `hasMore={false}`: the button goes |
| Long text | The sentence and the quote wrap; a word too long for the line breaks inside itself; the time stays on its line |
| Focus | Each item takes focus (the ARIA feed), with a ring clear of its avatar and text |

## Layout

- The rail runs through the middle of the markers and stops 4px short of
  each one, the same at both ends; the last item of a day ends it.
- The sentence's first line sits on the marker's middle; the time is
  muted, at the end of that line.
- Items are 24px apart (16 compact), with 12px between a marker and its
  text (8 compact). Day headings are small, muted and in the title weight.
- "Load earlier" starts where the text does.
- Attachments are 32px tags with an 8px radius and the one edge; on touch
  screens they take a 40px hit area without moving.

## Motion

| What | How |
|---|---|
| A new item at the top | Opacity and a 6px slide down over `--ui-dur-base` on `--ui-ease-enter` |
| The items it pushes down | FLIP: each starts where it was and moves to its place on `--ui-ease-move` over `--ui-dur-move`. Measured in page coordinates, so a feed that's centred in its box (which moves as it grows) glides too. Another arrival mid-move starts from where each item visibly is; nothing restarts or jumps |
| A changed number | Rolls (`TextMorph`) from the old value to the new one, 160ms after the item arrives so the roll is seen |
| Earlier items | Fade in over `--ui-dur-fast`; the button below them moves down with the same FLIP |
| A new day's heading | Fades in |
| Tooltip | The tooltip's own |

Under `prefers-reduced-motion` nothing moves: new items fade in place
and the rest take their places at once.

## Accessibility

- The list is `role="feed"` with `aria-busy` while loading earlier, and
  each item an `<article>` with `aria-posinset` and `aria-setsize` (-1
  while more can load), named by its sentence.
- Items take focus; PageDown and PageUp move between them, as the ARIA
  feed pattern asks. Tab reaches the links inside one.
- A new item at the top is announced in a polite status: "New: Sam Okafor
  added two vegetarians to Friday supper".
- The marker is hidden: the sentence names the actor. A change reads as
  "Guests 10 to 12".
- The absolute time is linked to its relative one with
  `aria-describedby`, so it's read without hovering.

## Before / after

Before: new activity is prepended and every row below jumps down a row
in one frame; times say "2026-11-21T18:32:00Z"; the list never says it's
loading.

```tsx
<ul>{activity.map((a) => <li>{a.user} {a.verb} {a.target} · {a.createdAt}</li>)}</ul>
```

After: grouped by day, relative times with the exact one on hover, new
items that slide in while the rest glide down, and a feed screen readers
can step through.

```tsx
<Timeline items={activity} onLoadMore={loadEarlier} loading={loading} hasMore={hasMore} />
```
