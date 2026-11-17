# Animated size

A box that eases its height, its width, or both, to whatever its content
measures. Wrap the part of a layout that changes size when the user does
something (a section that opens, a message that gets longer, a label that
changes) and everything below or beside it is carried to its new place
instead of jumping.

```tsx
<AnimatedSize>
  {open ? <ShippingDetails /> : <ShippingSummary />}
</AnimatedSize>
```

It's a building block: other components use it, and it has no look of its
own.

## When to use it

- Content that changes size because the user did something: a toggle that
  reveals detail, a filter that changes a short list, a form step that adds a
  field.
- An inline label or control whose width changes (`axis="width"`).

## When not to

- Open and closed panels whose closed state is zero height: the
  `grid-template-rows` recipe in the motion rules does that without
  JavaScript.
- Content that changes size on its own, with no input from the user: data
  arriving, a timer, a live feed. A box that grows by itself moves everything
  below it while the user is reading, and the browser counts the movement as
  layout shift. Reserve the space instead (a fixed slot the size of the result,
  with the label that names the work shimmering inside it).
- Long lists that grow row by row as they load: let them grow.

## Props

| Prop | What it does |
|---|---|
| `axis` | `"height"` (default), `"width"` or `"both"`. Width and both lay the content out at its own width (`max-content`), so use them for inline things, not paragraphs. |
| everything else | Passed to the outer `<div>`. |

## How it measures

- A `ResizeObserver` watches an inner box. The size is read with
  `offsetWidth` and `offsetHeight`, which are layout sizes: a transform
  playing on the content (a button press, a text morph) never changes the
  target.
- The inner box is `display: flow-root`, so the content's own margins stay
  inside what's measured.
- **The first measurement applies with no transition.** Before JavaScript
  runs, the box is `auto`, so the server-rendered page already has the right
  size; when the observer first reports, that size is written and nothing
  animates. Nothing ever grows from zero on mount.
- **Hidden ancestors.** When the box has no client rects (a `display: none`
  tab panel or closed dialog above it) it stops animating and ignores the
  zero size it reports. When it's shown again, the new size applies at once
  and the transition re-arms one frame later, so opening a tab never plays a
  resize that happened while you weren't looking.
- **Container resizes apply at once.** In height mode, if the content's width
  changed (the window or a sidebar resized), the new height is written
  instantly. Only changes to the content itself animate.
- **Interruptible.** A new size mid-flight retargets from the size on screen,
  because CSS transitions start from the current value.

## Motion

| What | Duration | Easing |
|---|---|---|
| Growing | `--ui-dur-panel` (280ms) | `--ui-ease-expand` |
| Shrinking | `--ui-dur-base` (200ms) | `--ui-ease-expand` |
| First size, size while hidden, size on the frame it's shown, size after a container resize | 0ms | n/a |

Animating `height` and `width` is an exception to "transform and opacity
only", the same one the motion rules make for `grid-template-rows` and the
text morph's width: the alternative is a jump. The box clips its content on
the moving axis only while a transition runs, so shadows and focus lines
aren't cut off at rest. Under `prefers-reduced-motion: reduce` every change
is instant.

**Pacing one use.** Set `--animated-size-grow`, `--animated-size-shrink`
and `--animated-size-ease` on an ancestor to change the timing for that box
alone. Authorize uses 420ms on the move spring, because its card goes from
a full consent form to two lines.

## Layout shift

The box only moves what's around it when its content changes. On load and on
hydration it adds no shift at all (the first size is applied as-is). A resize
that follows a click, tap or key press finishes within the 500ms the browser
allows after input, so it doesn't count toward Cumulative Layout Shift. A
resize with no input behind it does count, every frame of it, which is why
content that changes on its own should reserve its space instead.

## Accessibility

- Nothing is hidden from assistive technology: the content is always fully
  in the DOM, only the box around it is sized.
- If the change reports something (a result, an error), announce it with a
  live region; motion alone isn't a message.

## Before / after

Before: the summary becomes the details and the page below jumps 120px.

```tsx
<section>{open ? <ShippingDetails /> : <ShippingSummary />}</section>
```

After: the section eases to its new height and the page below travels with
it; nothing animates on load.

```tsx
<AnimatedSize>{open ? <ShippingDetails /> : <ShippingSummary />}</AnimatedSize>
```
