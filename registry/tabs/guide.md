# Tabs

Switches between sibling views of one thing: the menu, notes and
activity of a single dinner. A pill sits behind the selected tab and springs
to the next one. The selected tab can live in the URL, so a refresh, a shared
link or the back button lands on the same tab. A tab can carry a count, and
the list can stand as a column beside the panels, as a settings sidebar.

The behavior (roving focus, arrow keys, ARIA wiring) is built on Base UI's
`Tabs`; UI Polish adds the pill's motion, URL sync, counts and crossfade.

Tabs and the Segmented control share one look: the clear hairline track
(`--ui-track-edge`), the 4px inset (`--ui-track-inset`), the flat pill
(`--ui-track-pill`), the label colors and the pill's flight
(`pill-flight.ts`, used by both). Change them there and both follow. They
differ only in meaning: tabs switch panels, a segmented control picks a
value. The control also comes in `sm`, with a 1px smaller inset; tabs come
in one size.

```tsx
<Tabs defaultValue="menu" param="tab">
  <TabList aria-label="Dinner sections">
    <Tab value="menu">Menu</Tab>
    <Tab value="notes">Notes</Tab>
    <Tab value="activity">Activity</Tab>
  </TabList>
  <TabPanel value="menu">…</TabPanel>
  <TabPanel value="notes">…</TabPanel>
  <TabPanel value="activity">…</TabPanel>
</Tabs>
```

## When to use it

- Two to six views of the same object that the user flips between and that
  don't need to be seen side by side.
- Views that are worth linking to. Pass `param` and the tab survives reload
  and sharing (`/dinners/1182?tab=notes`).
- Sections of one settings page, as a column beside the panel
  (`orientation="vertical"`). A column holds more tabs than a row, and
  longer labels.

## When not to

- Moving between pages or sections of an app: that's navigation. Use links
  in a `<nav>`, with `aria-current="page"` on the current one.
- A choice that changes data, like "Hourly / Fixed price" on a form: that's a
  radio group or a segmented control.
- Content the user needs to compare. If people flip back and forth to read
  two panels against each other, show both.
- More than about six tabs, or labels longer than two words. The list
  scrolls sideways when it overflows, but hidden tabs are easy to miss.

## Props

| Prop | On | What it does |
|---|---|---|
| `defaultValue` | `Tabs` | Starting tab, and the fallback when the URL names a tab that doesn't exist |
| `value`, `onValueChange` | `Tabs` | Controlled mode, for example driven by your router |
| `manual` | `Tabs` | Arrow keys move focus only; Enter or Space selects |
| `crossfade` | `Tabs` | Panels share one grid cell and crossfade; wrap them in `TabPanels` |
| `param` | `Tabs` | Search param that holds the selected tab (uncontrolled only) |
| `orientation` | `Tabs` | `horizontal` (default) or `vertical`: a column of tabs beside the panels. Under 480px wide it falls back to a row |
| `aria-label` | `TabList` | Names the tab set for screen readers |
| `count` | `Tab` | A number after the label: "Guests 14". Part of the tab's name |

### Counts

```tsx
<Tab value="guests" count={guests.length}>Guests</Tab>
```

The count sits 6px after the label, a step quieter (subtle at rest, muted
when selected or hovered), at regular weight, in tabular figures. A count
that changes keeps its width as long as it keeps its digits; when it gains
or loses one (9 → 10), the digits roll with `TextMorph`, the tab's width
follows on the glide spring, and the pill follows the tab frame by frame,
so nothing beside it jumps. Screen readers hear it as part of the name,
with a pause: "Guests, 14". Show counts that help choose a tab (unread,
pending); a count on every tab is noise.

### Vertical

```tsx
<Tabs defaultValue="guests" orientation="vertical" crossfade>
  <TabList aria-label="Event settings">
    <Tab value="general">General</Tab>
    <Tab value="guests" count={14}>Guests</Tab>
    <Tab value="menu">Menu</Tab>
  </TabList>
  <TabPanels>…</TabPanels>
</Tabs>
```

The list is a column at least 160px wide (as wide as its longest tab), 32px
from the panel, its top lined up with the panel's. It has no edge: in a
column, the pill alone marks the selection. Tabs are full-width rows with
the label at the start and any count lined up at the end. The pill travels
up and down with the same small stretch as in a row. The Tabs measure their own width with a container
query: under 480px a column and a readable panel don't fit side by side,
so the list becomes the usual row above the panels. The script reads the
axis from the layout, so arrow keys, `aria-orientation` and the pill all
follow (Base UI's `orientation` is set from the measured axis). Because the Tabs measure themselves, give them a width from their
container (a block, or a stretched grid or flex item), not a shrink-to-fit
one.

## States

| State | What you see | How |
|---|---|---|
| Rest | Muted label, no background | `.tab` |
| Hover | Label turns to the text color, 150ms | `@media (hover: hover)` only |
| Press | Nothing of its own: the pill moving to the tab is the feedback | — |
| Selected | Label in the text color, pill behind it | `[data-active]` (Base UI) |
| Focus | 2px ring with a 2px offset, appears instantly | `:focus-visible` |
| Before JS | The selected tab paints its own pill until the moving pill is measured | indicator still `hidden` |
| Count | Number after the label, subtle; muted when selected or hovered | `count` |
| Vertical | A column with no edge, full-width rows, counts at the end; rows are 40px on touch | `orientation="vertical"`, at 480px and wider |
| Overflow | List scrolls sideways with no scrollbar; the edge with hidden tabs fades. A mouse wheel scrolls it sideways, then the page once it reaches an end; a swipe past the end stops there, with no rubber band or back gesture. Selecting a tab scrolls it clear of the fade, and the first and last back to the 4px inset | `data-overflow-start`, `data-overflow-end`, `scroll-padding-inline` |

Every state uses the same font weight. A bold selected tab is wider than a
regular one, so selecting it would push its neighbors sideways.

## Motion

| What | Duration | Easing |
|---|---|---|
| Pill stretches a little toward the new tab and draws in behind it | `--ui-dur-glide` | both edges `--ui-ease-glide`, the leading one sooner, so it never overshoots or swings past the last tab |
| Pill in a column: the same, along the column | `--ui-dur-glide` | as above |
| Label and count color | `--ui-dur-instant` | `--ui-ease-color` |
| Count gains or loses a digit: digits roll, tab width and pill follow | `--ui-dur-move` | `--ui-ease-move` |
| Old panel fades out (`crossfade`) | `--ui-dur-instant` | `--ui-ease-color` |
| New panel fades in (`crossfade`), 75ms after | `--ui-dur-fast` | `--ui-ease-enter` |

How the pill moves:

- It's Base UI's `Tabs.Indicator`: one absolutely positioned, empty element
  behind the tabs. At rest it sits on the selected tab through Base UI's
  `--active-tab-left` and `--active-tab-width` (`--active-tab-top` and
  `--active-tab-height` in a column), as a `translateX` and a width. Width is the one
  non-transform property it animates, because `scaleX` would squash its round
  ends mid-flight. The element is `contain: strict`, so resizing it lays out
  nothing else.
- Its two edges travel separately, both on the glide: the edge facing the
  new tab leads, the far edge follows. The pill stretches a little toward
  the tab and draws itself in, settling once with no overshoot, so it
  never runs past the end of the list and never wobbles. The frames are
  sampled from the two easing tokens in JS and played as one Web Animation
  on top of the resting position, which takes over when it ends. The flight
  lives in `pill-flight.ts`, which the Segmented control plays too.
- The pill keeps its height in flight. A dip and a springy leading edge
  were tried and read as organic, a blob more than a control.
- Nothing animates until the page has painted once. A tab selected from
  the URL is already in place; it doesn't slide in from the left.
- Base UI observes the list and every tab and re-places it without
  animation when the window resizes or a web font loads late and changes the
  labels' widths.
- If the user picks another tab mid-move, the pill starts from where it is
  on screen, so the motion stays continuous.

Under `prefers-reduced-motion: reduce` the pill and panels switch instantly.

## URL sync

With `param="tab"`, Tabs reads `?tab=` before the first paint, writes it with
`history.replaceState` on every change (no new history entries, so Back
leaves the page rather than stepping through tabs), and follows `popstate`
so back and forward update the selected tab. An unknown value falls back to
`defaultValue`. Other params in the URL are kept.

`replaceState` works in any framework, but routers that keep their own copy
of the URL won't see the change. In that case drop `param` and control the
value from the router: read the tab from its search params and write it
back with a replace, so changing tabs doesn't add history entries.

```tsx
<Tabs
  value={searchParams.get("tab") ?? "menu"}
  onValueChange={(tab) => replaceSearchParam("tab", tab)}
>
```

## Panels

Panels stay mounted, so their state survives a switch. By default an
unselected panel is `hidden`, so the area takes the selected panel's height. With `crossfade`, wrap the panels in `TabPanels`: they stack
in one grid cell, the area always takes the tallest panel's height, and
switching never moves anything below the tabs. Unselected panels are `inert`
and `visibility: hidden`, so they can't be focused or read. Use `crossfade`
when the panels are close in height; when one is much taller, the others get
empty space under them.

## Accessibility

Follows the WAI-ARIA tabs pattern.

- `role="tablist"` with an `aria-label`, `role="tab"` buttons with
  `aria-selected` and `aria-controls`, `role="tabpanel"` with
  `aria-labelledby` pointing back at its tab.
- Roving tabindex, from Base UI: Tab enters the list on the selected tab and Tab again
  goes to the panel. Inside the list, Left and Right move between tabs and
  wrap at the ends; Home and End jump to the first and last. Right-to-left
  layouts swap Left and Right. In a column, Up and Down take their place,
  and `aria-orientation` says `vertical`; when a narrow vertical list falls
  back to a row, both switch back with it.
- A count is part of the tab's name, after a comma that's in the markup at
  zero size: "Guests, 14".
- Automatic activation by default: moving focus selects the tab. Use
  `manual` when showing a panel is slow (it fetches, or it's heavy to
  render), so arrowing past a tab doesn't load it.
- The selected panel has `tabIndex={0}` so a panel with no controls can
  still be reached and scrolled by keyboard.
- The visible pill is 32px tall; on coarse pointers each tab's hit area
  extends to 40px. In a column, where rows touch, each row is 40px instead.

## Before / after

Before: the selected tab goes bold and pushes its neighbors, the underline
jumps instead of moving, and a refresh forgets the tab.

```tsx
const [tab, setTab] = useState("menu");

<div>
  {["menu", "notes", "activity"].map((t) => (
    <button key={t} onClick={() => setTab(t)} style={{ fontWeight: tab === t ? 700 : 400 }}>
      {t}
    </button>
  ))}
</div>
{tab === "menu" && <DinnerMenu />}
```

After: arrow keys work, nothing reflows, the pill springs between tabs, and
`?tab=notes` survives reload and Back.

```tsx
<Tabs defaultValue="menu" param="tab" crossfade>
  <TabList aria-label="Dinner sections">
    <Tab value="menu">Menu</Tab>
    <Tab value="notes">Notes</Tab>
    <Tab value="activity">Activity</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="menu"><DinnerMenu /></TabPanel>
    <TabPanel value="notes"><Notes /></TabPanel>
    <TabPanel value="activity"><Activity /></TabPanel>
  </TabPanels>
</Tabs>
```
