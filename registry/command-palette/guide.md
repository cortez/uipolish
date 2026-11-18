# Command palette

A ⌘K / Ctrl+K search box for every command in the app. It matches loosely
("sgt" finds "Seat guests at tables"), picks out the letters that matched,
shows recent commands when the box is empty, and merges results from slow
sources like a guest search without flashing a loading state. Built on `Modal`
from the dialog (Base UI's `Dialog` underneath), so it shares its focus
handling, scroll lock and open/close motion. The search field and list keep
their own logic: grouped results, recents and async sources don't map
cleanly onto a stock combobox.

`fuzzy.ts` holds the matcher on its own, in case you want it for other lists.

## When to use it

- Apps with more commands than fit comfortably in menus: a supper club app
  with dinners, guests, menus and settings.
- Jumping to a record by name ("14 Alder", "Priya") from anywhere.
- Giving keyboard users one place to reach everything.

## When not to

- A handful of actions: put them on screen.
- Searching content with filters, sorting and pages of results: build a
  search page.
- As the only way to reach something. The palette is a shortcut; every
  command should also live somewhere visible.

## API

```tsx
<CommandPalette
  open={open}
  onOpenChange={setOpen}
  commands={[
    { id: "new", label: "New dinner", group: "Dinners", shortcut: ["⌘", "N"], icon: <Icon name="plus" />, onSelect: newDinner },
    { id: "theme", label: "Switch to dark mode", group: "Settings", keywords: ["theme", "appearance"], onSelect: toggleTheme },
  ]}
  sources={[{ id: "guests", heading: "Guests", search: (q, signal) => api.guests(q, { signal }) }]}
/>
```

- `group` sets the heading. Groups keep the order they first appear in when
  the box is empty, and sort by their best match while typing.
- `keywords` find a command by words not in its label. Keyword matches rank
  below label matches and highlight nothing.
- `shortcut` is display only. Bind the keys yourself. It shows at the end
  of the row, except on the highlighted row, which shows `enter` in its
  place: that's the key that runs it now.
- `sources` are called after typing pauses for 120ms. The previous search is
  aborted through `signal` before the next one starts. Their results appear
  after the built-in commands, so a late answer never moves the item under
  the cursor.

## Recents

Recents are command ids, newest first, five by default (`maxRecent`). Without
props they're kept in memory for the life of the page. To keep them across
visits, control them:

```tsx
const [recent, setRecent] = useState<string[]>(() => {
  try { return JSON.parse(localStorage.getItem("recent-commands") ?? "[]"); } catch { return []; }
});

<CommandPalette
  recent={recent}
  onRecentChange={(ids) => {
    setRecent(ids);
    try { localStorage.setItem("recent-commands", JSON.stringify(ids)); } catch {}
  }}
  …
/>
```

Ids that no longer match a command are skipped. A result picked from an async
source is remembered for the session; to restore it after a reload, include
it in `commands` (or look it up from your own store).

## Matching

The query's letters have to appear in the label in order. Among all the ways
they can, the matcher picks the best-scoring one:

- +8 for a letter at the start of a word (after a space, hyphen, slash, or a
  lower-to-upper case change), +6 more at the very start of the label
- +8 for each letter that directly follows the previous match
- −0.5 for each letter skipped between matches, −0.15 for each one before
  the first
- a tiny penalty per extra letter, so "Seat guests" beats "Seat guests at
  tables" on a tie

It's a small dynamic program, O(query × label), so it finds "**S**eat
**g**uests at **t**ables" for "sgt" rather than the first `t` it sees, the
one inside "guests".
Matched letters keep the text color and the rest dim to muted. The change is
color only, so labels never change width as you type.

## States

| State | What you see | How |
|---|---|---|
| Empty query | Recent group (if any), then every command by group | |
| Typing | Matches by score; unmatched letters dimmed; first result highlighted | |
| Waiting | Typed, source not called yet or answered in under 300ms: nothing extra appears | 120ms debounce, 300ms delay before the loading row |
| Loading | "Searching guests…" under the source's heading, no icon: the text dims and a light band passes across it | only after 300ms; `mask-image` on the row text |
| Source failed | "Couldn’t search guests. Try again" as a selectable row | the promise rejects |
| No results | "No results for “xyz”" and a hint, centered | `emptyHint` |
| Active row | Fill behind the row, icon at full strength, an `enter` key at its end in place of the shortcut (none on touch screens) | pointer and keyboard set the same state; the shortcut and the key share one cell, so the label never reflows |
| Run | Palette closes, command runs, it moves to the top of Recent | |

## Motion

| What | Duration | Easing |
|---|---|---|
| Open, close | as Dialog: fades, scales from 0.97 and clears a 2px blur over `--ui-dur-base`; out in `--ui-dur-instant` | `--ui-ease-enter`, `--ui-ease-exit` |
| Height following the results | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Active row background and `enter` key | instant on, `--ui-dur-instant` off | `--ui-ease-color` |
| Loading row and empty state in | `--ui-dur-fast` (160ms) fade | `--ui-ease-enter` |
| Light band across the loading row | `--ui-dur-sweep` (2.4s) per sweep | `linear` |

The palette grows from its own center, whether a button or ⌘K opened it: a
search box opens in place rather than flying in from its trigger. It sits near the top of the screen rather than in the
middle, so a list that grows or shrinks only moves the bottom edge.

**How the height animates.** The results live in a scroller with a
`max-height`. A `ResizeObserver` measures the scroller after each change and
writes that number as an explicit height on a wrapper with `overflow: clip`;
the wrapper transitions `height` on the spring.

- Only the wrapper's height animates. The rows inside are laid out once per
  change at their final size and are clipped, not squeezed, so there's no
  per-frame reflow of the list.
- A CSS transition picks up from the current value when the target changes
  mid-flight, and the spring curve makes that retarget look continuous.
  Typing "s", "sg", "sgt" quickly gives one smooth settle, not three
  restarts.
- The palette is in the top layer, so nothing else on the page reflows.

Animating `grid-template-rows` doesn't fit, since the target is a measured
pixel height that changes many times a second, and `interpolate-size` isn't
reliable across browsers. Under `prefers-reduced-motion: reduce` the height
changes instantly and the loading row is plain muted text with no band.

## Accessibility

- The input is a `combobox` with `aria-controls` pointing at the `listbox`
  and `aria-activedescendant` pointing at the highlighted `option`. Focus
  never leaves the input.
- Each group is a `role="group"` labelled by its heading.
- A visually hidden `role="status"` reads the result count, "searching
  guests" while a slow source runs, and "No results for …".
- Keys: ↓ and ↑ move and wrap around, Home and End jump to the first and last
  result (the caret still moves with ⌘← / ⌘→), Enter runs, Escape closes and
  returns focus to where it was.
- Moving the pointer over a row highlights it; the keyboard continues from
  there. Only keyboard moves scroll the list, so rows never slide out from
  under a still pointer.
- The key legend in the footer (↑ ↓ to move, enter to run, esc to close) and
  the `enter` key on the highlighted row use the same keycap. Both are
  `aria-hidden`: the keys are announced by the combobox itself.
- On touch screens rows are 48px tall, the input is 16px so iOS doesn't zoom,
  and the key legend and the `enter` key are hidden.

## Before / after

Before: an input that filters with `includes`, so "sgt" finds nothing,
results jump as they change, and the async search shows a spinner for 80ms
on every keystroke.

```tsx
const results = commands.filter((c) => c.label.toLowerCase().includes(query));
{loading && <Spinner />}
{results.map((c) => <div onClick={c.run}>{c.label}</div>)}
```

After: fuzzy ranked, highlighted, keyboard driven, async without flicker.

```tsx
<CommandPalette
  open={open}
  onOpenChange={setOpen}
  commands={commands}
  sources={[guestSource]}
  emptyHint="Try a guest name, an address like “Alder”, or a command like “new”."
/>
```
