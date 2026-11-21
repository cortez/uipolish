# Split view

Panes side by side (or one above another) with a hairline between them
that you drag to resize: a chat beside the document it's writing, a list
beside the item it opened, an editor above its output. Each pane can have a
default, a minimum and a maximum, in pixels or percent. A collapsible pane
snaps shut when you drag it under half its minimum and reopens to the size
it had. The divider takes the keyboard, double-click resets it, and the
layout can be kept between visits. Under 560px wide, a side-by-side split
shows one pane at a time with a switch above it.

```tsx
<SplitView storageKey="supper-chat">
  <SplitPane id="chat" label="Chat" defaultSize="42%" minSize={280}>
    <MessageThread>…</MessageThread>
  </SplitPane>
  <SplitPane id="doc" label="Document" minSize={320} collapsible>
    <Markdown source={plan} />
  </SplitPane>
</SplitView>
```

## When to use it

- Two things people work on together and size to the task: a conversation
  and its artifact, a list and its detail, a query and its results.
- A panel people sometimes want out of the way but back at the same size
  (a document preview, an inspector): make it `collapsible`.
- Layouts that nest: a list beside a detail that is itself split into a
  summary above an activity log.

## When not to

- Navigation down the side of an app: use the sidebar, which folds to a
  rail and becomes a drawer on phones.
- A panel that opens over the page for a moment (a guest's details, a
  filter): use a drawer.
- Columns of data: use the data table, whose columns resize on their own.
- Content that only needs a fixed two-column layout: use CSS grid. A
  divider nobody needs to move is a target for nothing.

## Props

`SplitView`:

| Prop | What it does |
|---|---|
| `children` | `SplitPane` elements, as direct children. Two or more |
| `orientation` | `horizontal` (default): side by side. `vertical`: one above another |
| `storageKey` | Keeps each pane's size and its last open size in `localStorage` (`split-view:<key>`), written when a drag ends, a key moves the divider or a pane opens or closes. A layout that doesn't match the panes is ignored |
| `onResize` | `(sizes) => void`, each pane's share in percent, on every change, every frame of a drag included |
| `narrow` | Under 560px of its own width, a horizontal split shows one pane at a time with a switch above it (`switch`, default), or stays side by side (`split`). Vertical splits always stay split |
| `narrowPane`, `onNarrowPaneChange` | The pane shown when narrow, by `id`. Control it to open a detail when a row is picked; the switch reports back. Default: the first pane |
| `className` | On the root |

`SplitPane`:

| Prop | What it does |
|---|---|
| `id` | Stable key for storage and the narrow switch |
| `label` | Names the pane (it's a labelled `section`), its divider ("Resize Chat") and its option in the narrow switch |
| `defaultSize` | Pixels (`320`) or a share (`"40%"`). Panes without one share what's left |
| `minSize` | Default 120px. A drag stops here; a collapsible pane dragged past half of it snaps shut |
| `maxSize` | Optional ceiling |
| `collapsible` | The pane can close to nothing and reopen to its last size |
| `defaultCollapsed` | Starts closed (collapsible panes only) |
| `collapsed`, `onCollapsedChange` | Control it, e.g. from a "Hide document" button. A drag, Enter or a double-click that opens or closes it calls `onCollapsedChange` |
| `className` | On the pane |

The view fills its parent (`width` and `height` 100%), so give the parent a
height. Each pane is a clipping box its content fills: put a scroll
container inside, with `height: 100%`.

## States

| State | Divider | Pane |
|---|---|---|
| Resting | A 1px line in the edge color | Its content |
| Hovered | After 120ms the line darkens to the hover edge and a 4 × 24px grip grows from its middle | |
| Dragging | Line in the hover edge, grip in ink; the resize cursor stays even off the divider | Content takes no pointer, so an iframe or a selection can't steal the drag |
| Focused (keyboard) | As dragging, with the focus ring around the grip | |
| At the view's edge (the pane past it is closed) | The hit area and grip move inside the edge, where they can be reached | Closed: hidden and `inert` |
| Narrow (`switch`) | Hidden | One pane, with a segmented control above to switch. It follows the view's own width wherever it sits, with no size container needed around it |

## Layout

- The divider is a track of no width: the line sits on the first pixel of
  the pane after it, so panes never lose a pixel to it.
- The hit area is 9px across (4px into each pane), so it doesn't take the
  scrollbar of the pane beside it; the grip is a 24 × 40px target in the
  middle. On a touch screen the strip is 25px and the grip 40px, and the
  grip always shows.
- While a pane opens or closes, its content keeps its open width and rests
  against the pane's outer edge, so nothing inside rewraps as the edge
  passes over it; the other pane's content reflows once, as it would on a
  drag.
- A drag only trades between the two panes beside the divider. When the
  view itself narrows, panes keep their shares, and a pixel minimum still
  holds: what one pane can't give, the last one does.

## Motion

| What | Duration | Easing |
|---|---|---|
| A drag | Follows the pointer 1:1, one layout per frame | none |
| A pane snapping shut (dragged past half its minimum, Enter, a "Hide" button): lands flush at the edge | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| A pane opening (dragged back out, Enter, "Show"): a touch past its size and back | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| An arrow key step | `--ui-dur-snap` | `--ui-ease-snap` |
| Double-click reset | `--ui-dur-glide` | `--ui-ease-glide` |
| A closing pane's content fades out first; an opening one's fades in half a beat in | out `--ui-dur-instant` (120ms), in `--ui-dur-fast` (160ms), 60ms late | `--ui-ease-exit`, `--ui-ease-enter` |
| Hover: line color and grip (scale along the line, 50% to 100%) | `--ui-dur-instant`, after a 120ms beat; grip `--ui-dur-snap` | `--ui-ease-color`, `--ui-ease-snap` |
| Narrow switch: the leaving pane fades, the arriving one fades in and slides 16px from its side | out `--ui-dur-instant`, in `--ui-dur-fast` 60ms late; slide `--ui-dur-glide` | `--ui-ease-color`, `--ui-ease-enter`, `--ui-ease-glide` |

Closing lands on the glide rather than the snap: the snap's overshoot would
carry the pane past the view's edge and make the pane beside it wider than
the view for a moment. Sizes animate through `grid-template-columns` (or
rows), which the transition is switched on for only while a change plays,
so a drag is never smoothed into lag. Repeated presses, a key held down or
collapsing mid-drag all retarget from where the panes are on screen.

Under `prefers-reduced-motion: reduce` every size change is instant; the
content fades and the grip's color change remain.

## Accessibility

- Each divider is a focusable `role="separator"` with
  `aria-orientation`, named "Resize <pane>", whose value is the size of
  the pane before it in percent (`aria-valuenow`, `-min`, `-max`), and
  whose `aria-valuetext` reads "Chat 42%" or "Document collapsed".
- Keys on a divider: arrows move it 16px (Shift: 64px), Left and Right for
  side by side (mirrored in right-to-left), Up and Down for stacked. Home
  and End go to the minimum and maximum, and close a collapsible pane at
  that end. Enter closes or reopens the collapsible pane beside it. An arrow
  never closes a pane, so holding one can't lose a pane.
- Pressing on a divider focuses it without a ring, so the keys work
  straight after a drag.
- A closed pane is `inert`; so are the panes not shown when narrow.
- Panes are `section` elements named by `label`.

## Before / after

Before: a flex row with a fixed-width chat, and a document that can't be
widened to read or hidden to focus.

```tsx
<div style={{ display: "flex" }}>
  <aside style={{ width: 400 }}><Chat /></aside>
  <main style={{ flex: 1 }}><Doc /></main>
</div>
```

After: the line between them moves, holds each side's minimum, folds the
document away and brings it back at its size, remembers where you left it,
and turns into a switch on a phone.

```tsx
const [hidden, setHidden] = useState(false);

<SplitView storageKey="supper-chat">
  <SplitPane id="chat" label="Chat" defaultSize="42%" minSize={280}>
    <Chat />
  </SplitPane>
  <SplitPane id="doc" label="Document" minSize={320} collapsible collapsed={hidden} onCollapsedChange={setHidden}>
    <Doc />
  </SplitPane>
</SplitView>
```

A list beside its detail, with the detail opening when a row is picked on a
phone:

```tsx
<SplitView narrowPane={pane} onNarrowPaneChange={setPane}>
  <SplitPane id="orders" label="Orders" defaultSize={240} collapsible>
    <Orders onPick={(id) => { setOrder(id); setPane("detail"); }} />
  </SplitPane>
  <SplitPane id="detail" label="Order">
    <OrderDetail id={order} />
  </SplitPane>
</SplitView>
```

Sizes are read from storage once the view is measured, before it paints on
the client. A page rendered on the server paints the defaults first; if the
stored layout differs, it moves into place on hydration.
