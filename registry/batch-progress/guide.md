# Batch progress

An agent working through many items at once: twenty receipts read, three
hundred rows checked, a thousand photos tagged. The header says what's
running and where it stands, at a glance: the title, done of total, the
clock and the time left, over a track that fills as items settle. Below it,
every item is a row on a hairline, with a status mark, its name, what came
of it and how long it took. The list is windowed, so a thousand scroll as
easily as ten, and filters (All · Running · Failed · Done) find what
matters. Failures surface three ways: red on the track where they happened,
a count in the header and a filter, and Retry, for one row or all of them.
Pause, Resume and Stop sit in the header while it runs.

```tsx
<BatchProgress
  items={files.map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
    error: f.error,
    detail: f.total,          // "$42.10 · Groceries"
    startedAt: f.startedAt,
    finishedAt: f.finishedAt,
  }))}
  verb={{ running: "Reading", done: "Read" }}
  noun={{ one: "receipt", other: "receipts" }}
  startedAt={batch.startedAt}
  finishedAt={batch.finishedAt}
  paused={batch.paused}
  stopped={batch.stopped}
  onPause={() => agent.pause(batch.id)}
  onResume={() => agent.resume(batch.id)}
  onStop={() => agent.stop(batch.id)}
  onRetry={(ids) => agent.retry(batch.id, ids)}
/>
```

## When to use it

- One task applied to many similar things, where the count matters: "read
  these 20 receipts", "check every guest row for an email".
- The person is watching, in the conversation or on a run's page, and wants
  to see it move, and to see what each item came to.
- Some items can fail on their own without failing the batch.

## When not to

- Different steps, each its own action: that's `tool-steps`.
- Work that runs while the person is elsewhere: `background-run`, which can
  hold a `BatchProgress` when its row opens.
- Fewer than about four items. A sentence says it: "Read 3 receipts."
- One long task with a percentage. Use `progress`.

## Anatomy

- **Card**: one hairline outline from `--ui-shadow-resting`, `--ui-radius-lg`,
  `--ui-pad-card` inside. Don't add `--ui-edge` on top: two rings read as a
  darker edge than other cards.
- **Title**: what's happening, in words: "Reading 20 receipts" while it
  runs, "Read 18 of 20 receipts" once it settles. A light band crosses it
  while it runs; it morphs between states.
- **Controls**, on the right: Pause / Resume (one button whose width never
  changes) and Stop while it runs; "Retry 2 failed" once it settles with
  failures. On a narrow card Pause and Stop are icon-only, each named, Retry
  reads "Retry 2", and the title may wrap to a second line. The header holds a
  button's height (40px) either way, so nothing below moves as they swap.
- **Track**: up to `denseAfter` items (and while each segment is at least
  6px wide), one segment per item, in order, so a failure sits where it
  happened. Past that, one bar: done, failed, skipped and in flight layered
  from the left. Done is ink softened toward the surface, failed is
  `--ui-danger`, skipped `--ui-border-strong`, in flight a faint ink that
  breathes. It is the `progressbar`.
- **Meta line**, under the track (two lines on a narrow card, in every
  state, so the list never moves when it settles): on the left "7 of 20 · 1 failed" while it
  runs, "18 read · 2 failed · 1 skipped" once it settles (and "8 not
  started" when stopped); on the right the clock, "12s · about 10s left",
  then "Took 9s · 2 a second".
- **Filters**: a segmented control, All · Running · Failed · Done, each with
  its count in tabular figures, so the pill only resizes when a count gains
  a digit. Failed's count is red when it isn't zero. On a narrow card only
  Failed keeps its count (the others are in the meta line), so the four fit.
- **List**: edge to edge under one hairline, `visibleRows` rows tall (8)
  before it scrolls, and that height is the batch's, not the filter's: a
  filter with nothing in it says so ("No failed receipts") in the same
  space. Each row, on a hairline:
  - a **mark** (16px): an open ring queued, a short arc turning in flight,
    a soft ink check done, a red "!" failed, a ring with a dash skipped;
  - the **name**, one line, truncated with an ellipsis (the full name in a
    `title`);
  - the **detail**: what came of it (`detail`) when done, the `error` in red
    when failed, "Reading…" in flight, "Waiting" queued;
  - the **time** it took, in tabular figures, right-aligned, when items
    carry `startedAt`/`finishedAt`;
  - a **retry** for that row alone, when failed and `onRetry` is set. Its
    column is held on every row so the times line up.

  On a card under 480px wide, a row takes two lines: the name and time,
  then the detail under the name.
- **Following**: while it runs, the list keeps the first item in flight in
  view, with one finished row above it, gliding at most twice a second
  (a jump, when it's more than two screens away).
  Once the person scrolls, clicks or keys in the list, it stops following
  until they pick All again or a new run starts. When it settles with
  failures, it brings the first one into view.

## States

`items` is controlled: the agent owns the work and says where each item is.

| Item `status` | Mark | Detail | Track |
|---|---|---|---|
| `queued` | Open ring, `--ui-border-strong` | "Waiting", subtle; the name muted | Faint |
| `working` | A short arc turning (still when paused) | "Reading…" and a live time | A breathing faint ink |
| `done` | A soft ink disc with a check that draws in | `detail`, if given | Soft ink |
| `failed` | A red disc with "!" | `error` in red, and a row retry | Red |
| `skipped` | A ring with a dash, subtle | `detail` or "Skipped", subtle | Border gray |

| The batch | Title | Meta | Controls |
|---|---|---|---|
| Waiting (nothing started, no `startedAt`) | "20 receipts waiting" | "0 of 20", "Waiting to start" | Stop |
| Running | "Reading 20 receipts" | "7 of 20 · 1 failed", "12s · about 10s left" | Pause, Stop |
| Paused (`paused`) | "Paused after 7 receipts" | "7 of 20", "Paused · 12s" | Resume, Stop |
| Done | "Read 20 receipts" | "20 read", "Took 9s · 2 a second" | |
| Done with failures | "Read 18 of 20 receipts" | "18 read · 2 failed" | Retry 2 failed |
| Stopped (`stopped`) | "Stopped after 12 receipts" | "11 read · 1 failed · 8 not started" | Retry, when any failed |
| Empty (`items` is `[]`) | "No receipts yet" | A line: "Receipts appear here as the agent finds them." | |

The estimate appears only after three items and 15% are settled and a
second has passed. It rounds to 5 seconds and hides under 5 seconds left,
where it would only flicker. While paused, the clock and the estimate hold;
shift `startedAt` forward by the time spent paused when it resumes, so the
estimate stays true. Counts take English grouping ("1,000").

Fast batches change faster than anyone can read: the count steps at most
five times a second, the filter counts four, and the clock once a second.
The last value always lands.

## Props

| Prop | Type | Default |
|---|---|---|
| `items` | `{ id, name, status, error?, detail?, startedAt?, finishedAt? }[]` | Required |
| `verb` | `{ running, done }` | `{ running: "Processing", done: "Processed" }` |
| `noun` | `{ one, other }` | `{ one: "item", other: "items" }` |
| `startedAt`, `finishedAt` | `number` (`Date.now()`) | Clock and estimate hidden without `startedAt` |
| `paused` | `boolean` | `false` |
| `stopped` | `boolean` | `false` |
| `onPause`, `onResume` | `() => void` | No Pause button unless both are set |
| `onStop` | `() => void` | No Stop button |
| `onRetry` | `(ids: string[]) => void` | No Retry. Called with every failed id from the header, one id from a row |
| `denseAfter` | `number` | `60`: past it, the track is one bar |
| `visibleRows` | `number` | `8` | `0` hides the filters and list, for a screen that already lists the items. |
| `className` | `string` | |

`detail`, `startedAt`/`finishedAt` per item, `paused`, `onPause`,
`onResume` and `visibleRows` are new in 0.4; everything from 0.3 works
unchanged.

## Motion

| What | How |
|---|---|
| A row changing state | Its mark crossfades in place (`--ui-dur-fast`, `--ui-ease-enter`, a 0.9 → 1 scale on `--ui-ease-snap`); the check draws in on `--ui-dur-base`, `--ui-ease-draw`. Rows are placed by index at a fixed height: nothing around it moves |
| Item in flight | A short arc turns once per 3 × `--ui-dur-panel`, `linear`; it holds still when paused |
| The track | Segments change color on `--ui-dur-base`, `--ui-ease-color`; the bar's parts grow by `scale` on `--ui-dur-glide`, `--ui-ease-glide`: a result, no overshoot. A segment in flight breathes on `--ui-dur-pulse` |
| Counts and clock | Changed characters roll: the old one lifts out on `--ui-dur-instant`, the new one rises 0.3em on `--ui-dur-fast`, a beat later. In tabular figures, so a digit never changes width and nothing beside it jitters |
| Following | A smooth scroll, at most twice a second |
| Title while running | A light band on `--ui-dur-sweep` |

With reduced motion there is no roll, band, breathing segment or glide: the
track steps, marks change at once, the list jumps instead of scrolling, and
the arc breathes in place instead of turning, so in flight still reads.

## Accessibility

- The track is the `progressbar`, with `aria-valuenow` set to settled items
  and `aria-valuetext` like "14 of 20, 1 failed".
- The filters are a radio group (arrow keys move between them), named "Show
  receipts".
- The list is a named, scrollable region holding a real list. Rows outside
  the window aren't in the DOM, so each row carries `aria-setsize` and
  `aria-posinset`; its text reads "Linen hire, Mar 7.pdf: Password
  protected".
- Each row's retry is named for its item ("Retry Linen hire, Mar 7.pdf");
  icon-only controls on a narrow card are named "Pause", "Resume", "Stop".
- Rolling numbers keep a visually hidden copy of the whole value, so a
  screen reader never reads digit by digit; a live time in flight is hidden
  from it.
- A polite status announces milestones only: halfway, and the end with its
  failures. Not every item.

## Before and after

```tsx
// Before: a spinner and a number, and the failures lost in a log.
<p><Spinner /> Processing… {done}/{total}</p>

// After: where it is, item by item, and what went wrong, with a way back.
<BatchProgress items={items} verb={{ running: "Reading", done: "Read" }}
  noun={{ one: "receipt", other: "receipts" }} startedAt={t0} onRetry={retry} />
```
