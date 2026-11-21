# Kanban board

Columns of cards that move through stages: leads through a pipeline,
orders through a kitchen, tasks through a week. Cards are dragged within
a column and across to another, by mouse, by finger after a short hold, or
from the keyboard. Each column scrolls on its own and the board scrolls
sideways; held near an edge, a card scrolls whatever it's against. A
column's count rolls as cards arrive and leave, and on a phone the board
shows one column at a time, snapping as it scrolls.

```tsx
<Kanban
  aria-label="Catering pipeline"
  columns={[
    { id: "enquiry", title: "Enquiry" },
    { id: "quoted", title: "Quoted" },
    { id: "confirmed", title: "Confirmed" },
    { id: "done", title: "Done" },
  ]}
  cards={cards}
  onMove={(cardId, toColumnId, toIndex) => setCards((all) => moveCard(all, cardId, toColumnId, toIndex))}
  onOpen={(card) => openEvent(card.id)}
  onAdd={(columnId) => startEnquiry(columnId)}
  style={{ height: "calc(100dvh - 160px)" }}
/>
```

A column shows its cards in the order they come in `cards`. `onMove`
hands you the move; nothing changes until your state does:

```ts
function moveCard(all: KanbanCard[], id: string, columnId: string, index: number) {
  const card = all.find((c) => c.id === id)!;
  const rest = all.filter((c) => c.id !== id);
  const before = rest.filter((c) => c.columnId === columnId)[index];
  rest.splice(before ? rest.indexOf(before) : rest.length, 0, { ...card, columnId });
  return rest;
}
```

The dragging is Sortable list's engine (`sortable-list/drag.ts`), on
pointer events with no package; Base UI has no drag and drop. The look
and motion are the library's.

## When to use it

- Work that moves through a few named stages, where seeing everything at
  each stage at once is the point: a sales pipeline, an order board, a
  content calendar.
- Stages someone moves things between by hand.

## When not to

- One ordered list: use a sortable list.
- Many fields to compare or sort by: use a data table, with the stage as a
  column.
- More than about seven stages, or hundreds of cards in one: a table with
  filters reads better.

## Props

`Kanban` takes every `<div>` prop (name it with `aria-label` or
`aria-labelledby`; it's a `group`), `className` and `style`, and `ref`
to the board, the element that scrolls sideways. Set its height; the
default is 560px, and the columns fill it and scroll inside.

| Prop | What it does |
|---|---|
| `columns` | `{ id, title }` for each column, in order |
| `cards` | Every card. A column shows the cards whose `columnId` is its `id`, in this order |
| `onMove` | `(cardId, toColumnId, toIndex)`: the card should now be at `toIndex` in that column, counting without it. Required. Not called when a card lands where it was |
| `onOpen` | Makes each card a button: a click or Enter opens it. Without it, a card with `href` is a link, and any other is only picked up |
| `onAdd` | Shows a "+" in each column's header, named "Add a card to Quoted" |
| `messages` | The words read to screen readers, the add button's name and the empty column's words, to translate them |

A `KanbanCard`:

| Field | What it is |
|---|---|
| `id`, `columnId` | Its key and its column |
| `title` | Its name: the button's or link's name, and what moves are announced with |
| `content` | A line or two under the title, muted |
| `meta` | A row at the foot: an `Avatar` at 20px, a small `Badge`, a date. It wraps when the card is narrow |
| `href` | Makes the card a link when there's no `onOpen` |

## Keyboard

| Key | Does |
|---|---|
| Tab | To each card, column by column |
| Space, on a card | Picks it up |
| Up, Down | Moves it within its column |
| Left, Right | Moves it to the column before or after, at the same place in its list or at the end. Swapped in right-to-left layouts |
| Home, End | Top or bottom of the column |
| Space | Drops it |
| Escape | Puts it back where it was picked up |
| Enter | Opens the card (with `onOpen` or `href`); while one is held, drops it |

A card moved from the keyboard scrolls into view in its column and on the
board as it goes, and keeps focus when it lands in another column.

## States

| State | What you see | How |
|---|---|---|
| Rest | Lanes of a soft fill (in dark, the page itself), each card the surface on the one edge | |
| Hover | An openable card's edge steps up to the hover edge | `@media (hover: hover)`, with `onOpen` or `href` |
| Press | The card goes down to 0.985 about the point pressed and springs back | `:active` |
| Focus | A ring just inside the card | `:focus-visible` |
| Holding (touch) | The card presses down under the finger and its lift starts to show: the hover edge and the raised shadow fade in over the hold | `data-drag-pending` |
| Lifted | A copy of the card rides above the page with the hover edge and the raised shadow, grown 2% about the point held. Its place stays empty | `data-drag-source` on the card, `data-drag-clone` on the copy |
| Over a column | That lane steps up a shade; the cards below the slot slide down by the card's height, and the ones below its old place close up | `data-drag-over` |
| Empty column | A drop zone a card tall: one hairline, "Nothing here yet". Held over, its words step aside and its edge steps up | |
| Outside the board | More than 24px past the board, the gaps close and its old place reopens: a drop there puts it back | |
| Settling | The copy lands on the card's new place and comes down to its size as it does; in its last frame it is the card | `data-settling` |
| Count | Rolls to its new number when a card arrives or leaves | Text morph |

## Layout

Columns are 272px with 12px between them. A lane has a 16px corner and
8px of padding, so a card's corner is 8px, concentric with it; cards are
8px apart with 12px inside. The header's title lines up with the text on
the cards, its count beside it and the "+" at the end. Card titles are
14px; content and meta 12px, muted. The board's sides fade where there
are more columns past them; a column's top and bottom fade where there
are more cards.

Under 640px of board width a column is the board's width less 48px, so
the next one shows at the edge, and the board snaps to each column. The
snap lets go while a card is held, so the edge can scroll freely.

## Motion

| What | Duration | Easing |
|---|---|---|
| The copy following the pointer or finger | none: 1:1, every pointer event | |
| The copy growing as it lifts, and coming down as it lands | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Its edge and shadow coming in | `--ui-dur-fast` (160ms) | `--ui-ease-color` |
| …and going as it lands | `--ui-dur-snap` (240ms) | `--ui-ease-color` |
| A hold's lift showing, after 80ms | `--ui-dur-base` (200ms) | `--ui-ease-color` |
| Cards making room and closing up | `--ui-dur-move` (380ms) | `--ui-ease-move` |
| The copy settling into its place on the drop | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| The copy moving from the keyboard | `--ui-dur-move` (380ms) | `--ui-ease-move` |
| Lane shade, card edge | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Press | `--ui-dur-press` (80ms), released on `--ui-dur-snap` | `--ui-ease-snap` |
| Count | Text morph's roll | |
| Edge scrolling | up to about 20px a frame, faster the nearer the edge | |

Interrupted, everything starts from where it's seen: a card caught while
it settles is picked up from there, and the drop measures every card
before the page changes and glides each from there to its new place.
Under `prefers-reduced-motion: reduce` cards and the copy move at once
and nothing grows or presses; the shadow and lane shade still fade.

## Accessibility

- The board is a `group` with your name. Each column is a `section`
  named by its title, holding a `<ul role="list">` named the same, so a
  screen reader hears "Quoted, list, 2 items".
- Each card is one tab stop: its title is a button (with `onOpen`), a link
  (with `href`), or a button with the role description "draggable card".
  Its content and meta are its description, then the instructions: "Press
  Space to pick up. Use the arrow keys to move within a column, Left and
  Right to move between columns, Space to drop, Escape to cancel."
- Every step is read from a polite live region: "Picked up Book club
  supper, Enquiry, position 3 of 3." "Moved to Quoted, position 2 of 3."
  "Dropped Book club supper in Quoted, position 2 of 3." "Cancelled. Book
  club supper is back in Enquiry, position 3 of 3."
- A long press lifts a card and never opens it or the system menu; a drag
  never ends in a click.
- The copy is `aria-hidden` and `inert`; the card it stands for stays in
  the page, so nothing is read twice.
- The "+" is 32px, 40px to a finger.

## Before / after

Before: a drag library's columns with cards as `div`s. A swipe on a phone
starts a drag instead of scrolling, a card dragged out of its column is
cut off by the column's scroll, the keyboard can't move anything, and the
counts jump.

```tsx
<DragDropContext onDragEnd={onDragEnd}>
  {columns.map((col) => (
    <Droppable droppableId={col.id}>{/* … */}</Droppable>
  ))}
</DragDropContext>
```

After: one component, no package; a finger holds to lift and swipes to
scroll, the lifted card rides above every column, the keyboard moves it
anywhere, and every step is read aloud.

```tsx
<Kanban aria-label="Pipeline" columns={columns} cards={cards} onMove={moveCard} onOpen={openCard} />
```
