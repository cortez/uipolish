# Drawer

A panel that slides in from the edge of the screen, built on Base UI's
`Drawer`, which traps focus, makes the page behind it inert, locks scroll
and runs the swipe gesture. On wider screens it's a
full-height side panel against the end edge (the right, or the left in
right-to-left text). On phones it rises from the bottom as a sheet with a
grab handle, and can be dragged down to dismiss: past halfway, or
with a flick, it carries on off the screen at the speed of your finger;
released short, it springs back. The body scrolls between a header and a
footer that stay put.

Three things are optional: `modal={false}` leaves the page behind live,
`snapPoints` gives the phone sheet heights to rest at, as in vaul, and
`header` swaps the title row for your own (or none).

```tsx
<Drawer
  open={open}
  onOpenChange={setOpen}
  title="Priya Raman"
  description="Invited Oct 12 · Friday supper"
  footer={
    <DrawerActions>
      <Button variant="secondary" onClick={remove}>Remove guest</Button>
      <Button onClick={() => setOpen(false)}>Done</Button>
    </DrawerActions>
  }
>
  <GuestDetails guest={guest} />
</Drawer>
```

## When to use it

- Details of one item in a list, opened without losing the list: a guest,
  an order, a file.
- Filters and settings for the page behind it, with an Apply button that
  says what you'll get ("Show 5 guests").
- Anything taller than a dialog wants to be, or that a phone should reach
  with a thumb.

## When not to

- A short question or a confirm: use a dialog. A drawer for one sentence
  and two buttons is a long trip for the eye.
- Something people need to see while they work on the page, on a wide
  screen: give it a column of the layout. On a phone, a non-modal sheet with
  snap points is the column (`modal={false}`).
- Navigation on its own: a menu or a page is clearer than a panel of links.
- A flow with steps: use a dialog with steps, or a page.
- On top of another drawer or a dialog. On a phone both are sheets that
  fill the screen, and one sheet over another reads as being stuck. Show
  the next thing in the open drawer, with a Back button. A short confirm
  over a drawer is fine: use a dialog.

## Props

| Prop | What it does |
|---|---|
| `open`, `onOpenChange` | Controlled. Escape, the scrim, the close button and a drag down all call `onOpenChange(false)` |
| `title` | The panel's name, in the header. Labels the dialog. Optional when `header` isn't the built-in row and you name it with `aria-label` or `aria-labelledby` |
| `description` | A line under the title. Describes the dialog |
| `children` | The body. Scrolls on its own |
| `footer` | Pinned under the body. Wrap buttons in `DrawerActions`, main action last |
| `side` | `end` (default) or `start` on wider screens; `bottom` makes it a sheet everywhere. Phones always get the sheet |
| `size` | Width of the side panel: `sm` 360, `md` 420 (default), `lg` 560 |
| `initialFocus` | Where focus goes on open. Defaults to the first control in the body when opened from the keyboard, and to the panel itself when opened by a pointer or a finger (no ring on open; Tab reaches the first control) |
| `triggerRef` | Where focus returns. Defaults to whatever had focus when it opened |
| `finalFocus` | Where focus goes when the trigger is gone (a removed row) |
| `locked` | Escape, the scrim, the close button and dragging do nothing, e.g. while saving |
| `modal` | `true` (default): scrim, focus trap, scroll lock. `false`: no scrim; the page scrolls and takes taps and Tab, and a press on it or focus moving to it doesn't close the drawer. Escape, the close button and a drag still do |
| `snapPoints` | Heights the sheet rests at, lowest first: a fraction of the screen's height (`0.58`), pixels (`320` or `"320px"`) or `"20rem"`. Sheet only; the side panel ignores them. It opens at the first |
| `snapPoint`, `onSnapPointChange` | Optional control of the point, with your own values. Every open starts at the first. A drag that closes the sheet reports `null` |
| `header` | `true` (default): title, description and close button. `false`: no header row, only the handle. A node: your own row in its place, pinned above the body and draggable like the header |
| `aria-label`, `aria-labelledby` | The dialog's name when there's no `title`. In development a drawer with neither warns in the console |

`DrawerActions` lays footer buttons out at the end of the row; on a sheet
they share the width. `SHEET_QUERY` is exported for layouts that need to
know which form the drawer takes, and the `DrawerSnapPoint` type for your
snap state.

```tsx
// A phone sheet that leaves the plan above it live: half height, or nearly full.
<Drawer
  open={course !== null}
  onOpenChange={(open) => !open && setCourse(null)}
  modal={false}
  snapPoints={[0.58, 0.92]}
  aria-labelledby={titleId}
  header={
    <div className={styles.course}>
      <h2 id={titleId}>{course.name}</h2>
      <Button variant="ghost" size="sm" aria-label="Next course" onClick={next}>
        <Icon name="chevron-right" />
      </Button>
      <Button variant="ghost" size="sm" aria-label="Close" onClick={close}>
        <Icon name="close" />
      </Button>
    </div>
  }
>
  <Steps course={course} />
</Drawer>
```

## States

| State | What you see | How |
|---|---|---|
| Opening | Panel slides in from its edge; scrim fades in | `transform` transition from `[data-starting-style]` |
| Open | Panel on a dimmed page; the page doesn't scroll | Base UI's modal `Drawer.Root`, which locks scroll |
| Body overflow | Body scrolls; header and footer stay. A hairline under the header appears once something scrolls under it; the one over the footer fades as you reach the end | Scroll timeline on the body, read by the header and footer |
| Dragging (sheet) | Sheet follows the finger; the scrim lifts in proportion | `[data-swiping]`, `--drawer-swipe-movement-y`, `--drawer-swipe-progress` |
| Pulled up past open | Sheet gives less the further it goes; a strip of surface fills under it | Base UI damps the overshoot |
| Released short | Glides back to open from where it is | `--ui-ease-glide` from the current offset |
| Released far or flicked | Leaves, faster the harder the flick | `--drawer-close` scaled by `--drawer-swipe-strength` |
| Closing | Slides back off its edge; scrim fades; then it unmounts | `[data-ending-style]`; Base UI waits for the transition |
| Reopened while closing | Turns around from where it is | A transition, so it reverses from the current transform |
| Keyboard up (sheet) | Sheet sits on top of the keyboard, not under it | `visualViewport` lifts it by the covered height |
| Locked | Nothing closes it; it can't be dragged | `locked` |
| Non-modal | No scrim; the floating edge and shadow set the sheet apart from the live page, as on the side panel. Taps, scrolling and Tab reach the page | `modal={false}`, `[data-modal="false"]` |
| Below the top snap point | Sheet rests lower, its bottom off screen. A drag anywhere on it, body included, moves it; the body doesn't scroll | `--drawer-snap-point-offset`; `.body` is `overflow-y: hidden` without `[data-snap-top]` |
| At the top snap point | The body scrolls. Once it's scrolled to the top, a drag down on it moves the sheet | `[data-snap-top]` |
| Released between points | Glides to the nearest point; a flick goes one point on; below the lowest, nearer closed than open, it closes | Base UI's `snapToSequentialPoints` |
| Caught while settling | Stops under the finger and carries on from there | `--drawer-grab` (below) |
| Own header (`header={node}`) | Your row under the handle, 8px below it, with the hairline under it once the body scrolls | `.top` |
| No header (`header={false}`) | Only the handle; the body starts where the header would | `.handle + .body` |

**When it's a sheet.** `(max-width: 640px), (pointer: coarse) and
(max-height: 500px)`: a narrow window, or a touch screen too short for a
side panel (a phone on its side). Tablets keep the side panel. The rule
lives in one place, the script, which sets `data-mode` on the panel; the
panel isn't rendered until it opens, so there's no first paint to get wrong.

**Dragging.** Only the sheet drags; the side panel and a `locked` drawer
don't. The handle, header and footer drag with any pointer (with snap points the handle is a button, so a mouse drags from the header). The body is
Base UI's `Drawer.Content`: a finger drags the sheet once the body is
scrolled to the top, and a mouse there selects text instead. Base UI tells
taps from drags, leaves a sideways start to whatever is under it, and
decides from distance and velocity whether a release dismisses. Fields,
buttons and anything marked `data-base-ui-swipe-ignore` never start a drag
(`data-base-ui-swipe-ignore="x"` keeps a horizontal carousel's own drags
while vertical swipes still move the sheet).

**Snap points.** Base UI resolves the points, runs the drag and decides
where a release lands; the component supplies the parts it doesn't:

- The sheet is as tall as its top point (at most the screen less 48px) and
  rests lower by Base UI's offset, so its foot is off screen at a lower
  point and a `footer` shows only at the top. Points reach Base UI as whole
  pixels, so a resting sheet never sits on a fractional offset that blurs
  its text.
- Base UI moves the sheet from the body only when the body can't scroll,
  so below the top point the body's overflow is hidden and any drag moves
  the sheet. At the top it scrolls, and Base UI takes a downward drag once
  it's at its top. A horizontal carousel inside keeps its own drags with
  `data-base-ui-swipe-ignore="x"`.
- A flick moves one point, not straight to closed (vaul's way): from the
  lowest point it closes. A slow release closes once the sheet is nearer
  closed than its lowest point, so on a phone a long drag that starts low
  on the sheet may not get there: start from the top row, or flick.
- Base UI measures a drag from the point the sheet was heading to, so a
  finger landing mid-settle would make it jump there. The component holds
  the difference in `--drawer-grab` from the touch to the release, so the
  sheet stops under the finger and follows it; the release glides it out.
  Where the release lands is still decided from Base UI's offset, which
  can differ from what you see by what was left of the settle.
- Closing doesn't move a sheet that only fades: Base UI resets the point as
  it starts closing, and the component keeps the one it left from.
- With `modal`, Base UI shows the scrim in full at the top point and lifts
  it as the sheet goes lower.

## Layout

The side panel is full height (`100dvh`) and leaves at least 48px of page,
so it's clear there's a page to go back to. It's square against its edge,
with one hairline on its inner edge and the floating shadow. Padding is 24
all round; the close button is centered on the title's first line with its
X on the content's edge, as in the dialog.

The sheet is as tall as its content, at most the screen less 48px, so the
page always shows above it. It has no drawn edge, only its rounded top and
the raised shadow over the dimmed page. Its top corners take `--ui-radius-lg`; the
handle is 32 × 4, 8px from the top. On a phone on its side it stays 640px
wide, centered. The footer's bottom padding grows to the home indicator's
safe-area inset (`max(16px, env(safe-area-inset-bottom))`); without a
footer the body's padding does. Your page needs `viewport-fit=cover` for
the inset to be non-zero.

## Motion

| What | Duration | Easing |
|---|---|---|
| Panel and scrim in, from just past its edge | `--drawer-open` (`--ui-dur-move`, 380ms: the ceiling for any transition) | `--ui-ease-expand` |
| Panel and scrim out: full speed at once, no long tail, so closing never feels like a wait | `--drawer-close` (`--ui-dur-base`, 200ms) | `--ui-ease-color` |
| Out after a flick | `--drawer-close` × `--drawer-swipe-strength` (0.1 to 1) | `--ui-ease-color` |
| Glide back after a short drag | `--ui-dur-glide` | `--ui-ease-glide` |
| Between snap points, after a release or from the keyboard | `--ui-dur-glide` (320ms), from where it is | `--ui-ease-glide` |
| Scrim back after a short drag | `--drawer-open` | `--ui-ease-expand` |
| Header and footer hairlines | scroll position, over 16px | `linear` |
| Close button press release | `--ui-dur-snap` | `--ui-ease-snap` |

The panel is a whole surface crossing the screen, so it travels on the
expand curve: it moves at once and brakes long and softly into place, with
no opacity, only position. The move spring is for short hops; on a tall
sheet it covers half the distance in its first 76ms and reads as a jump. Out
is shorter on the same curve: the sheet is gone from view before it slows,
so leaving never lingers. A flick shortens the exit in proportion to its
strength, so the sheet never stalls under the thumb. Under
`prefers-reduced-motion: reduce` it fades in and out in
`--ui-dur-instant` without sliding, and a short drag snaps back at once;
a sheet with snap points fades where it rests (or where a drag left it)
and jumps between points without travel; dragging itself still follows the
finger, since that motion is the user's.
The scrim is a plain dim, never blurred.

## Scroll lock

Base UI locks page scroll while the drawer is open and restores it on
close, counting nested overlays so two never fight over restoring the
page's overflow. It's most reliably free of a sideways jump if the page
reserves the scrollbar's space:

```css
html { scrollbar-gutter: stable; }
```

With classic (non-overlay) scrollbars, the reserved gutter stays visible as
a strip beside a panel on that edge; the browser paints it outside the page,
where nothing can cover it.

## Accessibility

- Base UI's modal Drawer: the page is inert, Tab stays in the panel, and
  screen readers don't read what's behind. It portals to `<body>`, or into
  the nearest `[data-theme]` element around the trigger.
- With `modal={false}` it's a dialog without `aria-modal`: Tab walks on
  from the panel into the page, and the page stays readable and usable.
  Escape still closes it, wherever focus is.
- The title and description are `Drawer.Title` and `Drawer.Description`, so
  the panel is labelled and described by them. Without the built-in
  header, pass `aria-labelledby` (the id of your row's heading) or
  `aria-label`.
- Snap points from the keyboard: the sheet opens at the first point with
  focus in the body. With snap points the handle is a button ("Expand
  sheet", "Collapse sheet"), just before the header in Tab order: Enter or
  Space steps it up, and from the top back to the lowest; Arrow Up and Down
  (or Page Up and Down) move one point, Home and End to the ends. None of
  these close it. Tabbing to a control below the screen's edge raises the
  sheet to its top point. Base UI has no keyboard handling of its own for
  snap points.
- Focus on open: `initialFocus`; otherwise, opened from the keyboard, the
  first control in the body (its ring shows, as it should), and opened by a
  pointer or a finger, the panel itself, so no ring appears that nobody
  asked for; Tab then reaches the first control. With no control in the
  body, the first in the footer. Never the close button. On a sheet a
  text field isn't focused on open (the keyboard would cover the sheet as it
  rises); the sheet itself is, and the first Tab reaches the field.
- Focus on close: back to the trigger, or to `finalFocus` if the trigger is
  gone.
- Escape and a scrim press close it through `onOpenChange`; the drawer is
  controlled, so `locked` can hold it. A select or popover open inside it
  takes Escape first.
- Dragging is never the only way out: the close button is always there, 32px
  tall, 40px on touch screens, with `aria-label="Close"`. Without snap
  points the handle is decoration (`aria-hidden`). With your own header,
  give it a close button.
- A drag never starts on a button, so letting go doesn't press one by
  accident.

## Before / after

Before: a `div` pinned to the right with a transition on `right`. The page
scrolls under it and jumps sideways when the scrollbar goes, Tab walks out
into the page, focus is lost on close, and on a phone it's a narrow column
you can't swipe away.

```tsx
<div className={open ? "overlay visible" : "overlay"} onClick={() => setOpen(false)} />
<aside className={open ? "panel open" : "panel"}>
  <h2>Priya Raman</h2>
  <GuestDetails guest={guest} />
</aside>
```

After: a real modal, slides from the end edge, scroll locked without a
shift, focus in and back out, and a sheet you drag down on a phone.

```tsx
<Drawer
  open={open}
  onOpenChange={setOpen}
  title="Priya Raman"
  description="Invited Oct 12 · Friday supper"
  footer={
    <DrawerActions>
      <Button onClick={() => setOpen(false)}>Done</Button>
    </DrawerActions>
  }
>
  <GuestDetails guest={guest} />
</Drawer>
```
