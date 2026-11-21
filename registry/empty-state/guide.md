# Empty state

What a list, table or view shows when there's nothing in it yet: a title
saying what would be here, one sentence on what fills it, and the one action
that does, with an optional plain icon above. No illustration, no box or
tint around it, and no icon on a rounded tile: it sits centered in the space
the content would take.

```tsx
<EmptyState
  icon="calendar"
  title="No dinners on the calendar"
  description="Pick a night and a host. Guests RSVP from the invite link."
  action={<Button><Icon name="plus" />Plan a dinner</Button>}
  size="page"
/>
```

## When to use it

- A list, table, inbox or panel with no items.
- A search or filter with no results (say what was searched, offer a reset).
- A full-view error: what broke, one line, and a retry.

## When not to

- Loading. Show nothing under 300ms, then a shimmering label that names the
  work (`sweep` from `text`) in the space the content will take.
- A section that will always be empty for this user: hide it.

## Props

| Prop | What it does |
|---|---|
| `title` | What would be here: "No dinners on the calendar". Required. |
| `description` | One sentence on what fills this space, or how to. |
| `icon` | An icon name from Icons, drawn plain and muted above the title. Leave it out for text alone. |
| `action` | The next step: one `Button`. Optional. |
| `secondaryAction` | A second way to fill the space, one step quieter than `action`: "Add by hand" beside "Import a file". Optional. |
| `size` | `"compact"` (default) inside a panel or list; `"page"` for a whole view. |
| `titleAs` | Heading level. Defaults to `h3` (compact) or `h2` (page). |

## Look

| | Compact | Page |
|---|---|---|
| Icon | 20px, `--ui-subtle` | 20px |
| Title | `--ui-text-md`, the body weight | `--ui-text-2xl`, title weight |
| Sentence | `--ui-text-md`, muted, at most 36ch | at most 40ch |
| Padding | 32px top and bottom | 64px |

- **No slab.** A tinted or bordered box around an empty state reads as a
  thing in itself. Without one, the empty space is the content area,
  waiting.
- Icon to title 12px; title to sentence 4px; text to action 16px (24px on
  a page).

### One action or two

- **One**: centered under the text, at its own width.
- **Two**: side by side, `action` first, 8px apart, the pair centered.
  When they don't fit on one line (a side panel, a phone), they stack,
  `action` on top, and both take the full width of the space, so the pair
  reads as one even block rather than two ragged buttons. Side by side,
  neither stretches.
- The second is always one step quieter, so the eye lands on one: a
  `primary` with a `secondary`, or a `secondary` with a `ghost`. Same size
  for both.
- Two only when both are real ways to fill the space ("Import a file",
  "Add by hand"). A "Learn more" link belongs in the sentence, not beside
  the button.

```tsx
<EmptyState
  size="page"
  title="No guests yet"
  description="Import last year’s list, or add people one at a time."
  action={<Button><Icon name="upload" />Import a file</Button>}
  secondaryAction={<Button variant="secondary">Add by hand</Button>}
/>
```

## Writing it

- Title: what would be here, plainly. "No dinners on the calendar", "No
  RSVPs yet". Not "Oops!" and not "No data".
- Sentence: what fills it, or how. One sentence.
- Action: one, the verb that fills it ("Plan a dinner", "Copy invite
  link"). For no results, "Clear search" or "Clear filters". At most a
  second, quieter one, when there are two real ways to fill it.
- No results: put the query in the title ("No books match “Piranesi”")
  and suggest what else to try.

## Motion

None of its own: it appears with the view it sits in. The button carries
its own press.

## Accessibility

- The title is a real heading, so the empty state is reachable by heading
  navigation. Pick the level that fits the page outline.
- The icon is `aria-hidden`; the title says it all.
- When the state appears because of a search, announce the result count
  through your search's live region, not by focusing the empty state.

## Before / after

Before:

```tsx
<div className="empty">No data</div>
```

After:

```tsx
<EmptyState
  icon="search"
  title="No books match “Piranesi”"
  description="Try the author’s name, or check the spelling."
  action={<Button variant="ghost" onClick={clear}>Clear search</Button>}
/>
```
