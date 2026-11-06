# Scroll area

A scroll container whose edges fade where there's more content past them,
and stay solid where there isn't. The fade is a mask, not a gradient painted
on top, so it works on any background: a surface, a tint, an image.

```tsx
<ScrollArea label="RSVP activity" className="activity">
  <ActivityList />
</ScrollArea>
```

## When to use it

- A bounded pane inside a page: an activity feed, a list in a popover, a row
  of filter chips that can overflow sideways.
- Anywhere a hard clipped edge would hide that there's more.

## When not to

- The page itself. Leave the document scroll alone.
- Content short enough to show in full. Let it grow instead of giving it a
  scrollbar.
- Code blocks and tables where the last column matters: a fade over a value
  can read as "this is faint". Use `fade={false}` there.

## Props

| Prop | What it does |
|---|---|
| `label` | Accessible name. The area becomes a named `region`. Use `aria-labelledby` instead when a visible heading names it. |
| `orientation` | `"vertical"` (default) or `"horizontal"`. |
| `fade` | `true` by default. `false` keeps the edges hard. |
| `ref` | The scrolling element, for `scrollTo` and friends. |
| `className`, `style` | Go on the outer box: give it the height or max-height, radius and edge. |
| everything else | Goes on the scrolling element. |

Override the fade length per instance with `--scroll-area-fade` (default
`--ui-space-6`, 32px).

## How the fade works

- **One four-stop gradient for both edges.** The mask runs solid black from
  the fade length to the fade length before the end. The two end stops are
  black at the alpha of `--scroll-area-start` and `--scroll-area-end`: 1
  (solid) when nothing is past that edge, 0 (fully faded) when there is.
- **The fade appears by its alpha, not by a band growing.** Both properties
  are registered with `@property` as `<number>`, so the browser interpolates
  them. The band's length never changes; only its edge turns transparent.
- **Only where there's more.** Scroll position, scroll size and box size are
  read on scroll (once per frame), on resize of the box or its content, and
  when children change. At the top, only the bottom fades; in the middle,
  both; at the end, only the top.
- **First paint is already right.** The fades start easing only after the
  first measurement has been painted, so a list that loads with more below
  shows its bottom fade at once instead of fading it in.
- **The scrollbar stays crisp.** A classic scrollbar (one that takes room in
  the box) is kept out of the fade by a second, solid mask layer the width
  of the bar. Overlay scrollbars take no room and fade with the content.
- **Every `var()` in the gradient has a fallback**, so a missing token never
  drops the mask and hides the content.
- Right to left: a horizontal row fades from the right first, and the
  vertical scrollbar's solid strip moves to the left.

## Motion

| What | Duration | Easing |
|---|---|---|
| An edge fading in or out | `--ui-dur-fast` (160ms) | `--ui-ease-color` |
| First state | 0ms | n/a |

It's opacity feedback, not movement, so it stays under reduced motion.

## Accessibility

- **Keyboard scrolling.** When the area scrolls and nothing inside can take
  focus, it becomes a tab stop (`tabindex="0"`) so arrow keys, Page Up/Down
  and Space scroll it. When it holds links or buttons it stays out of the tab
  order: tabbing to those scrolls them into view.
- Named with `label` (or `aria-labelledby`), it's a `region`, so a screen
  reader announces what the area is when focus enters it.
- The focus line is drawn on the outer box, inside its edge, because the
  scroller's own mask would fade a line drawn on it.

## Before / after

Before: a hard edge at the bottom, and a painted gradient that only works on
white.

```tsx
<div style={{ height: 240, overflow: "auto" }}>
  <ActivityList />
  <div className="fade-to-white" />
</div>
```

After: fades only where there's more, on any background, scrollable by
keyboard.

```tsx
<ScrollArea label="RSVP activity" style={{ height: 240 }}>
  <ActivityList />
</ScrollArea>
```
