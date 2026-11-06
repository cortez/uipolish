# Nav rail

A compact app navigation: a column of icon items down the edge of the app,
or a row along the bottom on a phone. One tooltip serves the whole rail. It
waits the usual half second the first time, then follows the pointer or the
keyboard from item to item, gliding to each one, easing to the new label's
width and showing the item's shortcut. The current page has a raised
capsule that glides to the next one when you pick it.

Behavior comes from Base UI's `<Tooltip>`: one `Root` with a trigger per
item, which handles the delay, focus, dismissal and positioning, and a
`Viewport` that crossfades the label.

```tsx
<NavRail
  aria-label="Acme"
  items={[
    { id: "today", label: "Today", icon: <Icon name="calendar" />, shortcut: "1" },
    { id: "guests", label: "Guests", icon: <GuestsIcon />, shortcut: "2" },
    { id: "messages", label: "Messages", icon: <MessageIcon />, shortcut: "3", badge: unread },
  ]}
  value={section}
  onValueChange={setSection}
  shortcuts
  footer={
    <NavRailTrigger label="Ana Ruiz">
      <button type="button" aria-label="Ana Ruiz, account" onClick={openAccount}>
        <Avatar name="Ana Ruiz" size={24} decorative />
      </button>
    </NavRailTrigger>
  }
/>
```

## When to use it

- The top level of an app with three to seven sections that people move
  between all day: Today, Guests, Menus, Messages, Settings.
- When the content needs the width, and the sections have icons people
  learn quickly.

## When not to

- Sections people visit rarely, or that are hard to draw: a sidebar with
  written labels is faster to scan than a row of icons to hover.
- More than seven items: group them, or use a sidebar.
- Switching views inside one page: use tabs or a segmented control.

## Props

| Prop | On | What it does |
|---|---|---|
| `aria-label` | `NavRail` | Names the landmark; "Main" by default |
| `items` | `NavRail` | `{ id, label, icon, shortcut?, href?, badge? }[]` |
| `value`, `onValueChange` | `NavRail` | The current item's id; called with an id on press or shortcut |
| `footer` | `NavRail` | Pinned to the far end, usually an account button |
| `orientation` | `NavRail` | `vertical` (default) beside the content; `horizontal` along the bottom |
| `shortcuts` | `NavRail` | Handle ⌘ or Ctrl plus each item's `shortcut` anywhere on the page |
| `fixed` | `NavRail` | Horizontal only: pin the bar to the bottom of the viewport, clear of the home indicator |
| `label`, `shortcut` | `NavRailTrigger` | Gives a footer control the rail's tooltip and item look |
| `disabled` | `NavRailTrigger` | Keeps the tooltip closed for that control, as while a sidebar shows its labels |
| `root`, `orientation` | `NavRailTooltipGroup` | The rail's one tooltip for triggers outside a `NavRail` |

`NavRailTooltipGroup` shares the rail's tooltip with any set of controls:
wrap each in `NavRailTrigger` and they keep their own look, while the one
tooltip waits, glides and resizes between them as it does on the rail.
Sidebar's collapsed rail uses it. `NavRailTrigger` passes other props
through to its child, so a menu can render it as its trigger.

An item with `href` is a link, and pressing it also calls `onValueChange`;
without one it's a button. `label` is both the tooltip and the accessible
name, so write it as the page's name. `shortcut` is one key, shown as ⌘1 on
Apple and Ctrl+1 elsewhere through `Kbd`. `badge` is an unread count; 0
hides it, and over 99 it reads 99+.

The rail sizes to its items, with one spacing everywhere: the same 4px
between the track's edge and the items, between items, and before the
footer. In a column layout it stretches to the container's height and the
footer drops to the bottom. Horizontal, in a container wider than a phone
(480px), the bar is as wide as its items and no wider, and centers itself.
In a phone-width container it spans the width and every item, the footer
included, takes an equal share, so the bar reads as a phone's tab bar. When
the items don't fit at their capsule width they narrow evenly; the bar never
passes its container, down to a 320px phone.

## On a phone

Use `orientation="horizontal"` with `fixed` for the app's bottom bar. It
pins to the bottom of the viewport, 8px in from each side, and floats above
the home indicator by `env(safe-area-inset-bottom)` (8px where there's
none), so the page needs `viewport-fit=cover` in its viewport meta. Give the
page's end room for it: `padding-bottom: calc(56px + env(safe-area-inset-bottom))`.
A frame that draws its own home indicator, like the demo's phone, sets
`--nav-rail-safe-bottom` in place of the device's inset. `fixed` positions
against the nearest transformed or `contain: layout` ancestor when there is
one, so the bar can sit at the bottom of a panel too.

Touch has no hover, so the tooltip comes from a long press instead: hold an
item for 400ms and its name shows above it. Slide along the bar and the
tooltip glides from item to item as it does under a mouse; lift and the item
under the finger is pressed, as on a phone's tab bar. A short tap is just a
tap, and moving before the tooltip shows is left to the page's scroll. The
shortcut isn't shown on screens without hover. Icons still carry the bar, so
keep it to the five or six sections people know by their icon.

## States

| State | What you see | How |
|---|---|---|
| Rest | Muted icon on the sunken track | |
| Hover | The icon in the text color; no fill, the tooltip says which item it is | `@media (hover: hover)` |
| Current | The raised capsule behind it, icon in the text color | `aria-current="page"` → `[data-current]` |
| Focus | A line inside the item's capsule, and the tooltip at once | `:focus-visible` |
| Tooltip waiting | Nothing yet: the pointer rests on an item for 500ms | Base UI `Provider` `delay` |
| Tooltip open | Inverted label beside the item (above it on a bottom bar), shortcut after it | |
| Tooltip warm | Moving along the rail, or coming back within 300ms: no wait, no entrance | Base UI `Provider` `timeout` |
| Long press (touch) | The tooltip after 400ms held; it follows the finger along the rail, and lifting presses that item | the handle's `open(id)` |
| Badge | An accent count at the icon's top right, cut out of the icon by a ring | `badge` |
| Before JS | The current item paints its own capsule | `:not([data-ready])` |

Pressing an item closes the tooltip until the pointer leaves it, so it
doesn't sit over the page you just opened.

## Layout

Items are 40px icon capsules, 1.375 times as wide as tall, with 4px between
them, in a sunken hairline track 4px larger on every side, so the item and
track ends are concentric. The tooltip sits 8px off the rail's outer side
(above it when horizontal), never over the item under the pointer, and
stays 8px inside the viewport. Each item's hit area reaches halfway across
the gap to its neighbors, so a pointer moving along the rail goes straight
from one item to the next and the tooltip never closes in between. On touch
screens it also grows 2px past the item's other edges, and on a bottom bar
it runs to the bar's edges: 48px tall, and at least 44px wide with up to
seven items on a 375px phone.

## Motion

| What | Duration | Easing |
|---|---|---|
| Tooltip opens: fade, unblur, scale 0.97 → 1 | `--ui-dur-fast` | `--ui-ease-enter` |
| Tooltip closes | `--ui-dur-instant` | `--ui-ease-exit` |
| Tooltip moves to the next item, and its width to the new label | `--ui-dur-glide` | `--ui-ease-glide` |
| Old label fades out | `--ui-dur-instant` | `--ui-ease-color` |
| New label fades in, 60ms later | `--ui-dur-fast` | `--ui-ease-enter` |
| Both labels shift 4px the way the tooltip travels | `--ui-dur-glide` | `--ui-ease-glide` |
| Capsule moves to the current item | `--ui-dur-glide` | `--ui-ease-glide` |
| Icon color on hover | `--ui-dur-instant` | `--ui-ease-color` |

Both the tooltip and the capsule are held by the rail, so they glide: no
overshoot past the item, and a change mid-move starts from where they are.
The tooltip only glides once it has been on screen for a frame, so it never
slides in from where it was last time, and it keeps gliding until it has
fully closed: if the pointer crosses empty rail and reaches the next item
while the tooltip is still fading out, it glides there. Its width eases
inside a clipped box, so the label grows into it. The capsule is placed
before first paint, re-placed without animating on resize, and moves by
`transform` only.

Under `prefers-reduced-motion: reduce` the tooltip and capsule jump, and the
label swap is a plain crossfade.

## Accessibility

- A `<nav>` landmark around a list. Each item is a link or button whose
  accessible name is its `label` (with "3 new" when it has a badge), so
  screen readers never depend on the tooltip, which is `aria-hidden`.
- The current item has `aria-current="page"`.
- Tab visits every item; Up and Down (Left and Right when horizontal), Home
  and End move along the rail, the footer included.
- With `shortcuts`, items carry `aria-keyshortcuts` ("Meta+1 Control+1").
  Either modifier works on any platform. In a browser tab, ⌘ or Ctrl plus a
  digit usually belongs to the browser, so Ctrl is the one that reaches
  the page on a Mac; in an installed app both do.
- On touch screens the tooltip comes from a long press, which few people
  try, so pick icons people know; the items' names are their accessible
  names either way.

## Before / after

Before: a column of icon buttons, each with its own `title`. Nothing says
which page is current to a screen reader, the hints wait a second and a half
each, and the active background jumps between items.

```tsx
<div className="rail">
  {sections.map((s) => (
    <button key={s.id} title={s.label} className={s.id === section ? "active" : ""} onClick={() => setSection(s.id)}>
      {s.icon}
    </button>
  ))}
</div>
```

After:

```tsx
<NavRail aria-label="Acme" items={sections} value={section} onValueChange={setSection} shortcuts />
```
