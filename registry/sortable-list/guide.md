# Sortable list

Rows someone puts in order: the courses of a dinner, the steps of a
recipe, the speakers at a toast. Each row is a List row with a grip at its
start; drag the grip, or focus it and press Space, and the row lifts and
follows the pointer exactly while the others open a gap for it. Let go and
it settles into the gap. A list inside a scroll box scrolls while a row is
held near its edge.

```tsx
<SortableList
  aria-label="Courses"
  items={courses}
  onReorder={(from, to) => setCourses((c) => move(c, from, to))}
  renderItem={(c) => <SortableItem title={c.title} description={c.note} trailing={c.cook} />}
/>
```

`onReorder` hands you the move; nothing changes until your state does. A
`move` that takes an item out at `from` and puts it back at `to` is all
it needs:

```ts
function move<T>(list: T[], from: number, to: number) {
  const next = list.slice();
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}
```

Base UI has no drag and drop, so the dragging is in `drag.ts`, beside this
file, written on pointer events with no package. Kanban board uses the
same engine. The look and motion are the library's.

## When to use it

- An order that means something and is short enough to see: courses,
  agenda items, a playlist, the fields of a form, priorities.
- An order people set by hand, rather than one a sort could work out.

## When not to

- An order a value decides (date, price, name): sort by it instead.
- Moving things between groups: use a kanban board.
- Hundreds of rows: dragging past a screenful is slow work. Offer "Move to
  top" and "Move to position…" actions instead, or as well.
- A list that only shows things: use a list.

## Props

`SortableList` takes every `<ul>` prop (name it with `aria-label` or
`aria-labelledby`), `ref` and `className`, besides these:

| Prop | What it does |
|---|---|
| `items`, `renderItem` | Your items, and a function that returns each one's `SortableItem` |
| `getKey` | A stable key for an item. Default: its `id` |
| `children` | Instead of `items`: the `SortableItem`s themselves, each with a `key` |
| `onReorder` | `(from, to)`: the row at `from` should now be at `to`. Required. Not called when a row lands where it was |
| `handle` | `true` (default): rows lift by the grip at their start, and the rest of the row stays selectable text. `false`: by the whole row, which becomes one tab stop; on a touch screen a press must hold for 250ms first, so a swipe still scrolls |
| `variant` | `box` (default): rows in List's rounded surface. `plain`: no box |
| `messages` | The words read to screen readers and the grip's name, to translate them (see Accessibility) |

`SortableItem` takes `<li>` props besides these:

| Prop | What it does |
|---|---|
| `title` | The row's name; what a move is announced with when it's text |
| `label` | What a move is announced with, when `title` isn't plain text |
| `description` | A line under the title |
| `leading` | An avatar, icon or thumbnail. Decorative |
| `trailing` | A value at the end: who, when, how many. Keep it the item's own, not its position: the lifted copy shows what the row showed when it was picked up |
| `actions` | Secondary actions, usually List's `ListAction`. A press on one never lifts the row |
| `disabled` | The row can't be picked up; the others still move around it |

## Keyboard

| Key | Does |
|---|---|
| Space or Enter, on a grip | Picks the row up. With `handle={false}`, Space on the row |
| Up, Down | Moves it one place |
| Home, End | Moves it to the top or the bottom |
| Space or Enter | Drops it where it is |
| Escape | Puts it back where it was picked up |
| Tab | Drops it, then moves on |

Clicking elsewhere while a row is held puts it back.

## States

| State | What you see | How |
|---|---|---|
| Rest | List rows, the grip a quiet 16px mark at the start | |
| Grip hover | The grip goes to the text color; the cursor is a hand ready to grab | `@media (hover: hover)` |
| Grip focus | A ring just inside the grip | `:focus-visible` |
| Holding (touch, whole row) | The row's fill presses down while the 250ms hold runs | `data-drag-pending` |
| Lifted | A copy of the row rides above the page: the surface (a step lighter in dark), the edge and the raised shadow, grown by about 12px across (at most 2%) about the point you hold. Its place stays empty | `data-drag-source` on the row, `data-drag-clone` on the copy |
| Lifted from the keyboard | The copy also carries the focus ring | `data-keyboard` on its layer |
| Making room | The rows between its old place and the new one slide by its height; the separators step aside so the gap reads as one space | `data-dragging` on the list |
| Outside the list | Dragged more than 24px past the list, the gap goes back to where the row came from: a drop there puts it back | |
| Settling | The copy lands on the row's new place and comes down to the row's own size and fill as it does; in its last frame it is the row | `data-settling` on the copy |
| Disabled | Grip at 50%, no grab cursor, out of the tab order | `disabled` |

## Layout

Rows are List's: 12px in from their edges, 60px with a description, 44px
without, 48px or more on touch screens. The grip is a 24 by 32px target
whose glyph sits on the row's padding line, so the text starts 44px in;
on a touch screen it's 40px square and reaches the row's edge.

The lifted copy is drawn in a layer at the end of the page (or of the
nearest element with `data-theme`), outside any scroll box, so no edge or
column ever cuts it off, its shadow included. It copies the row as it was
when picked up.

## Motion

| What | Duration | Easing |
|---|---|---|
| The copy following the pointer | none: 1:1, every pointer event | |
| The copy growing as it lifts, and coming down as it lands | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Its shadow and fill coming in | `--ui-dur-fast` (160ms) | `--ui-ease-color` |
| …and going as it lands | `--ui-dur-snap` (240ms) | `--ui-ease-color` |
| The others making room | `--ui-dur-move` (380ms) | `--ui-ease-move` |
| The copy settling into its place on the drop | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| The copy moving a place from the keyboard | `--ui-dur-move` (380ms) | `--ui-ease-move` |
| Rows gliding back after a move is refused or undone | `--ui-dur-move` (380ms) | `--ui-ease-move` |
| Grip color, separators | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Press under a holding finger | `--ui-dur-press` (80ms) | |
| Edge scrolling | up to about 20px a frame, faster the nearer the edge | |

Every move starts from where things are seen: a row caught again while it
settles is picked up from there, a gap that changes its mind retargets
from where it has got to, and the drop measures every row before the page
changes and glides each from there to its new place. Under
`prefers-reduced-motion: reduce` rows and the copy move at once and
nothing grows; the shadow still fades in and out.

## Accessibility

- The list is a `<ul role="list">`, so screen readers count the rows.
- Each grip is a button named "Move" and the row's name ("Move Olive oil
  cake"), described by the instructions: "Press Space to pick up. Use the
  arrow keys to move, Space to drop, Escape to cancel." With
  `handle={false}` the title is the one tab stop, a button with the role
  description "sortable item".
- Every step is read from a polite live region: "Picked up Olive oil
  cake, position 5 of 5." "Moved to position 4 of 5." "Dropped Olive oil
  cake at position 2 of 5." "Cancelled. Olive oil cake is back at position
  5 of 5." A pointer drag announces its pick-up and its drop.
- Focus stays on the grip through the whole move and is on it afterwards,
  in the row's new place.
- The copy is `aria-hidden` and `inert`; the row it stands for stays in
  the page, so nothing is read twice.
- `messages` takes `instructions`, `handle(label)` and the four
  announcements, each a function of `{ label, position, total }`.
- Grips are 40px on touch screens.

## Before / after

Before: native HTML drag and drop. Nothing works on a phone or from the
keyboard, the browser draws a ghost image at half opacity, the other rows
don't move until the drop, and a screen reader hears nothing.

```tsx
<li draggable onDragStart={() => setDragging(i)} onDrop={() => move(dragging, i)}>
  {course.title}
</li>
```

After: a grip that works by mouse, finger and keyboard, a row that
follows the pointer, a gap that opens where it will land, and every step
read aloud.

```tsx
<SortableList aria-label="Courses" items={courses} onReorder={(from, to) => setCourses((c) => move(c, from, to))}
  renderItem={(c) => <SortableItem title={c.title} />} />
```
