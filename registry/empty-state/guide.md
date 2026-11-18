# Empty state

What a list, table or view shows when there's nothing in it yet: a clean
isometric line drawing of where things would be (a stack of cards, an open
box, a folder, a tray, a magnifier, a calendar, an unplugged cord), a title
saying what would be here, one sentence on what fills it, and the one action
that does. The drawing draws itself once, the first time it comes into view.
No box or tint around it, and no icon on a rounded tile: it sits centered in
the space the content would take.

```tsx
<EmptyState
  art="calendar"
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
| `art` | Which drawing: `"stack"`, `"box"`, `"folder"`, `"tray"`, `"search"`, `"calendar"` or `"unplugged"`. Leave it out for text alone. |
| `icon` | Deprecated: use `art`. Kept so older code still renders; an icon name picks the drawing that fits it (`search` the magnifier, `alert` and `warning` the unplugged cord, `calendar` the calendar, `file` the folder, `check` the tray, anything else the stack). No icon is drawn. |
| `action` | The next step: one `Button`. Optional. |
| `secondaryAction` | A second way to fill the space, one step quieter than `action`: "Add by hand" beside "Import a file". Optional. |
| `size` | `"compact"` (default) inside a panel or list; `"page"` for a whole view. |
| `titleAs` | Heading level. Defaults to `h3` (compact) or `h2` (page). |

## Look

| | Compact | Page |
|---|---|---|
| Drawing | 196 × 144 | 264 × 194 |
| Title | `--ui-text-md`, 500 | `--ui-text-2xl`, 600 |
| Sentence | `--ui-text-md`, muted, at most 36ch | at most 40ch |
| Padding | 32px top and bottom | 64px |

- **The drawing.** An isometric drawing on the 2:1 pixel grid (one unit
  across, half a unit down), so its straight edges stay clean at 1x and 2x.
  It's the focal point, so it's big: 196px wide in a panel, 264px on a
  page (never wider than its space). Pick the one that names the space:

  | `art` | Drawing | For |
  |---|---|---|
  | `stack` | Three cards in a stack, a list of checkboxes and lines on the top one | Lists, tables, runs |
  | `box` | An open, empty box, its four flaps folded out | Nothing added yet: a first project, a collection |
  | `folder` | A folder standing open, a sheet with lines inside | Files, documents, imports, invoices |
  | `tray` | A shallow tray with a letter dropping into it | Inboxes, replies, "all caught up" |
  | `search` | A magnifier lying on a card of results | No results for a search or filter |
  | `calendar` | A spiral-bound desk calendar, a grid of days, one picked out | Nothing scheduled |
  | `unplugged` | A plug lifted out of its socket, its cord curling away | Something didn't load: a failed fetch, a lost connection |

  - **Crisp, not rounded.** Each outline is drawn flat on its own plane,
    every corner eased by about a pixel (0.6 units) and no more, then
    projected, so cards, boxes and pads read as made things. Only what is
    round in life is round: a lens, a cord, a binder coil, a socket slot.
    Caps are round, joins mitered.
  - **Built, not arranged.** Parts that touch in life touch exactly: the
    folder is one board folded at the bottom (the cover's inside meets the
    back's inside along the fold), box flaps hinge on the whole of each top
    edge and meet at the corners, the magnifier's handle starts on the
    rim's outer edge, stacked cards lie on each other, and the calendar's
    coils come out of holes in the pad and end where its back edge hides
    them.
  - **Clean.** One line weight for the set: the icon set's medium stroke
    (`--ui-icon-stroke-medium`, 1.5px on screen at either size, divided
    back down by the scale), in the text color at 34% over the surface.
    Faces are opaque, painted back to front, in two tones only: tops and
    near faces in the surface color, sides and insides in the text color at
    7% over it. Text on a card is filled bars at 13%, with no edge; the one
    thing picked out (today on the calendar) is filled in the line color.
    Everything is a mix of `--ui-foreground` into `--ui-surface`, so it
    reads the same in light and dark.
  - **Solids.** A part with thickness is its near face over its side: the
    face and a copy pushed back, wrapped in one convex outline.
  - **The box.** 120 × 88 units, each drawing centered in it, so they all
    sit on the same baseline and the text below never moves when you swap
    one.
  - **No icon tile.** An icon on a rounded square reads as an app icon, not
    as the empty space. The drawing says it on its own; when none fits,
    leave `art` out and let the title speak.
- **No slab.** A tinted or bordered box around an empty state reads as a
  thing in itself. Without one, the empty space is the content area,
  waiting.
- The drawing's size is fixed before it draws, so drawing never moves the
  text below.
- Drawing to text 16px (24px on a page); title to sentence 4px; text to
  action 16px (24px).

### One action or two

- **One**: centered under the text, at its own width.
- **Two**: side by side, `action` first, 8px apart, the pair centered.
  When they don't fit on one line (a side panel, a phone), they stack,
  `action` on top, and both take the full width of the space, so the pair
  reads as one even block rather than two ragged pills. Side by side,
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
  art="folder"
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

The drawing draws once, the first time a quarter of it is on screen (one
IntersectionObserver, disconnected after it fires). Each part waits half
an instant step (`--ui-dur-instant` / 2) after the one before:

| What | Duration | Easing |
|---|---|---|
| Each face's edge, back to front | `--ui-dur-base` | `--ui-ease-draw` |
| Each face's fill, as its edge draws | `--ui-dur-fast` | `--ui-ease-enter` |
| A cord, as one stroke | `--ui-dur-base` | `--ui-ease-draw` |
| Pills and marks on a card | `--ui-dur-instant` | `--ui-ease-color` |

The undrawn starting pose only applies under `@media (scripting: enabled)`,
so without JavaScript the sketch is already drawn. Under
`prefers-reduced-motion: reduce` it's drawn from the start. The button
carries its own press.

## Accessibility

- The title is a real heading, so the empty state is reachable by heading
  navigation. Pick the level that fits the page outline.
- The drawing is `aria-hidden`; the title says it all.
- Under `forced-colors: active` the drawing keeps its lines in the system
  text color, with faces in the canvas color.
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
  art="search"
  title="No books match “Piranesi”"
  description="Try the author’s name, or check the spelling."
  action={<Button variant="ghost" onClick={clear}>Clear search</Button>}
/>
```
