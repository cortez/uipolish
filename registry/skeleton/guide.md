# Skeleton

Placeholders shaped like the content on its way, so the page fills in
rather than appearing. `SkeletonGroup` holds the place: the skeleton takes
its space at once but stays invisible for 300ms, so a fast load shows
nothing and still moves nothing. When the content arrives it crossfades in
over the skeleton in the same spot. Text lines are exactly as tall as the
text that replaces them, because each one is a real line box of the same
line height, and every bone on the page shares one band of light that
crosses them together.

```tsx
<SkeletonGroup loading={!guests} label="Loading guest list…" fallback={<GuestRowsSkeleton />}>
  {guests && <GuestRows guests={guests} />}
</SkeletonGroup>

function GuestRowsSkeleton() {
  return (
    <ul className={styles.list}>
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className={styles.guest}>
          <SkeletonCircle size={36} />
          <span className={styles.who}>
            <span className={styles.name}><SkeletonText width="8em" /></span>
            <span className={styles.note}><SkeletonText width="12em" /></span>
          </span>
        </li>
      ))}
    </ul>
  );
}
```

## When to use it

- A region whose layout you know before its data arrives: a list of rows, a
  card of fields, a profile header. The skeleton is that layout with the
  words taken out.
- Several regions loading at once on a page someone opens, where a label in
  each would be noise.

## When not to

- Loads that usually finish under 300ms. `SkeletonGroup` already shows
  nothing for those; don't add a skeleton anywhere that bypasses the delay.
- One area doing one piece of work the user asked for (a search, a
  generation, an import). Hold the space and shimmer a label that names the
  work, such as "Searching guests…": it says what's happening, a skeleton
  only says something is.
- When you can't predict the shape. A skeleton of three rows that turns into
  one row, or into twelve, moves everything below it: that's the shift it
  exists to prevent.
- Refetching data that's already on screen. Keep the old content and mark
  what's updating; going back to bones throws away what the user was
  reading.
- Buttons, fields and other controls: they're there before the data. Only
  their values load.

## Props

`Skeleton`: a block, for images, badges, buttons.

| Prop | What it does |
|---|---|
| `width` | Defaults to the container's width. Numbers are px; any CSS length works |
| `height` | Defaults to 16px |
| `radius` | `sm` (default), `md`, `lg` or `full`: the radius of what it stands in for |

`SkeletonText`: lines of text.

| Prop | What it does |
|---|---|
| `lines` | How many lines the text will wrap to. Defaults to 1 |
| `width` | Width of the block, such as `"8em"` for a name. Defaults to the container's |
| `lastLineWidth` | With several lines, the last one's width. Defaults to `60%` |
| `size` | `sm`, `md` or `2xl` sets that type step's size and line height. Leave it out to inherit both from where it sits, which is the surest match |

`SkeletonCircle`: an avatar. `size` is its diameter, 40px by default; it
never shrinks in a flex row.

`SkeletonGroup`: holds the place and does the swap. Every `<div>` prop
passes through.

| Prop | What it does |
|---|---|
| `loading` | While true the skeleton holds the place; when false the content crossfades in |
| `fallback` | The skeleton |
| `children` | The content, rendered only once `loading` is false |
| `label` | Read by screen readers once the wait passes `delay`. Defaults to "Loading…" |
| `delay` | How long a wait lasts before anything shows, in ms. Defaults to 300 |

`useLoadingDelay(loading, delay = 300)` returns true once `loading` has
lasted `delay` ms, and false the moment it ends: the same delay for any
indicator that lives outside a group.

## States

| State | What you see | How |
|---|---|---|
| First 300ms of a load | Nothing; the skeleton holds the space at opacity 0 | `loading`, before `delay` |
| Loading | The skeleton fades in; a soft diagonal sheen crosses it every 4.8s | `loading`, after `delay` |
| Content arrives | The skeleton drops out quickly and the content fades in over it, half a beat later, in the same place | `loading` turns false |
| Arrived before 300ms | The content fades in; no skeleton was ever seen | |
| Ready on first render | The content, with no fade | `loading` false from the start |
| Reduced motion | The bones, still: no band | `prefers-reduced-motion: reduce` |
| Forced colors | Each bone outlined in the system gray, since fills are dropped | `forced-colors: active` |

## Layout

**Text that swaps without a shift.** Put the `SkeletonText` inside the
element the text will fill, or one with the same class, so it inherits the
font size and line height:

```tsx
<p className={styles.about}>
  {menu ? menu.about : <SkeletonText lines={2} />}
</p>
```

Each line is one inline bar with no text, the full width of the block so
the next one wraps onto its own line: one element per line, nothing
around it. That bar's baseline is its bottom edge, so it sits on the line's baseline like a
letter, and it's `1cap` tall, so it covers exactly where the capitals will
be. It's shorter than the line, so the line box is set by the strut, as it
is for text: two lines of skeleton are two line heights, to the pixel, and
two lines of text replace them. Give the skeleton the line count the text
usually wraps to at that width; the last line is shorter so a paragraph
reads as prose, not a table.

**Blocks and circles take the real size.** An avatar's circle is the
avatar's diameter, an image's block its width and height (or the same
`aspect-ratio` through a className), a button's block the button's height
with `radius="full"`.

**One cell for both.** `SkeletonGroup` is a one-cell grid. The skeleton and
the content sit in the same cell during the swap, so the region is as tall
as the taller of them and nothing below it moves; the skeleton leaves the
tree once the content has settled. Measured in the preview: no layout shift
at 1280px or 390px, slow load or fast.

**Bones.** One element each, with no wrapper or child for the effect: the
fill is the bone's `background-color`, `--ui-fill-strong` in both themes,
and the sheen is its single `background-image`. The sheen is the surface
color in light mode and the text color in dark mode, so it reads as light
in each: a darker band crossing a dark theme looks like a shadow passing.
Its stops are eased (22%, 62%, full, 62%, 22%), so the band has no edges,
and it's angled at 110°, so it reads as light falling across the page
rather than a wiper.

## Motion

| What | Duration | Easing |
|---|---|---|
| Skeleton fades in, after `delay` | `--ui-dur-base` | `--ui-ease-enter` |
| Sheen crosses the page, then rests off screen | `--ui-dur-sweep` × 2, looping | `linear` |
| Skeleton drops out as content arrives | `--ui-dur-instant` | `--ui-ease-color` |
| Content fades in, `--ui-dur-instant` / 2 later | `--ui-dur-base` | `--ui-ease-enter` |

The sheen is one gradient fixed to the viewport (`background-attachment:
fixed`), three viewports wide, so it crosses in about two thirds of each
4.8s loop and rests off screen for the rest, and every bone's sweep is set to start at the origin of the
document timeline, so a bone mounted late joins mid-pass. Bones side by side
light up in turn as one band crosses them, rather than each pulsing on its
own clock. It's slower than a text shimmer because it sits beside reading
content. The band follows the reading direction under `dir="rtl"`. iOS
Safari draws fixed backgrounds as scrolling ones, so there each bone gets
its own pass, still in step.

The content only fades: it lands exactly where the skeleton held its place,
so there's nowhere to move from. Under `prefers-reduced-motion: reduce` the
band stops and the bones hold still; the crossfade stays, since it's a short
change of opacity, not motion.

## Accessibility

- Every bone is `aria-hidden`, and so is the whole skeleton layer. A list
  of empty shapes means nothing read aloud.
- The group carries `aria-busy` while loading, so assistive tech waits for
  the content instead of reading it in pieces.
- A visually hidden `role="status"` says `label` once the wait passes
  `delay`, and clears when it ends. It sits just outside the busy element,
  because screen readers may hold back changes inside a busy region, and is
  absolutely positioned, so it takes no space. Fast loads say nothing.
- Nothing in a skeleton is focusable. If the content brings focusable
  controls, focus stays where it was when they arrive.
- Arrival isn't announced: the content appearing where the user is reading
  is the announcement. If arrival matters on its own (a background refresh
  finished), say so in your own status region.

## Before / after

Before: a spinner in an empty box. The box is the wrong height, so the menu
pushes everything below it down when it lands, and the spinner flashes for
a moment even when the data was cached.

```tsx
{menu ? <MenuCourses menu={menu} /> : <div className="center"><Spinner /></div>}
```

After: the space is held from the first frame, nothing shows for fast
loads, and the courses crossfade in over their own shapes.

```tsx
<SkeletonGroup loading={!menu} label="Loading menu…" fallback={<MenuCoursesSkeleton />}>
  {menu && <MenuCourses menu={menu} />}
</SkeletonGroup>
```
