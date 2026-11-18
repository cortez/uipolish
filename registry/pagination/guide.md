# Pagination

Moves through a list or table one page at a time. Previous, the page
numbers and next sit in a fixed number of equal slots, seven where they
fit: the first page, the last, the current one with a neighbor on each
side, and a gap for the rest. Paging never changes how many slots there
are or how wide they are, so the control holds still under the pointer and
you can press Next again without aiming. One pill marks the current page;
past the middle it stays put and the numbers slide under it.

```tsx
<Pagination page={page} total={guests.length} pageSize={25} onPageChange={setPage} />
```

As links, with your router's link component:

```tsx
<Pagination page={page} pageCount={20} href="/guests?page={page}" as={Link} />
```

The compact variant, for a table footer or a narrow panel:

```tsx
<Pagination variant="compact" page={page} total={5000} pageSize={100} onPageChange={setPage} />
```

## When to use it

- Tables and lists whose pages people come back to, refer to or share:
  "it's on page 3" should mean something.
- Results where the total is known. The compact variant suits big totals,
  where the range ("1–100 of 5,000") says more than a page number does.

## When not to

- A feed people read top to bottom: load more as they scroll, or with a
  "Show more" button.
- Steps of a form or a wizard: those are steps, with their own names.
- A cursor-based API that can't jump to page 7: show previous and next
  only, as plain buttons.
- Two or three pages of short rows: show them all.

## Props

Every `<nav>` prop passes through.

| Prop | What it does |
|---|---|
| `page` | The current page, from 1. Out-of-range values are clamped |
| `pageCount` | How many pages. Optional when `total` and `pageSize` are given |
| `total`, `pageSize` | Rows overall and per page. The compact range needs both; without them it shows "Page 3 of 20" |
| `onPageChange` | Called with the page to go to. With `href` it also fires, before the link navigates, except on a click that opens a new tab |
| `href` | Turns every control into a link. A function of the page, or a string with `{page}` in it, which a server component can pass |
| `as` | Your router's link component (`Link` from Next), used with `href`. Defaults to `<a>` |
| `variant` | `pages` (default) or `compact` |
| `locale` | Formats the numbers in the compact range ("5,000", "5.000"). Defaults to the browser's |
| `aria-label` | Names the nav. Defaults to "Pagination"; name it after what it pages ("Guest list pages") when there are two on a screen |

The nav asks for the width of all its slots, capped at its row. It sits
in a flex row or a block alike, and its numbers are centered when the row
is narrower than seven slots. It takes its width from the row, not from
its numbers, so it needs a row with a width of its own: inside an
`inline-flex` toolbar that sizes to its content, give it a `width`.

## States

| State | What you see | How |
|---|---|---|
| Rest | Muted numbers and chevrons in borderless pills | ghost `Button` |
| Hover | Text in the text color, no fill: the pill is the only fill a number gets. Previous and next fill | `@media (hover: hover)` |
| Press | Shrinks a little and springs back; previous and next also take a darker fill in 80ms | the button's own press |
| Current | The pill behind it, text in the text color; no hover or press of its own | `aria-current="page"` |
| Focus | A line just inside the pill, instantly | `:focus-visible` |
| At an end | Previous (or next) at 50%, ignores presses, still in the tab order | `aria-disabled` |
| Narrow row | Five slots, then "Page 3 of 20" between the arrows | measured from the nav's own width |
| One page | One number, both arrows off | |

The current page keeps the same weight as the rest, so moving it changes
no width.

## Layout

Everything is on the small control height, 32px. Previous and next are
the small icon button's capsule (44px wide). Every page number is a 32px
square, or wider when the longest page number needs it (three digits and
up), with its number centered in tabular figures. The pill is exactly one
number's box, placed past one arrow, so it sits on its number to the
pixel at every page and every width. The width of a slot comes from the
page count, never the page, so "Page 9" and "Page 10" sit in the same row
of slots. Gaps are 4px; on touch screens they open to 6px and each pill
takes a hit area 3px larger on every side, so neighbors' targets meet
without overlapping.

How many slots fit depends on the row, not on the page: seven when they
fit, five on a phone (first, current, last and two gaps), and below that
"Page 3 of 20" between the arrows. A `ResizeObserver` on the nav decides,
so the control changes shape only when its row does, and lands in the new
shape at once.

The compact range shares a grid cell with an invisible copy of the widest
range the data can produce ("4,901–5,000 of 5,000"), so its width is set
once and the buttons beside it never move. The range is in the text color
and "of 5,000" is muted.

## Motion

| What | Duration | Easing |
|---|---|---|
| Pill slides to the new current page | `--ui-dur-glide` | `--ui-ease-glide`, lands without passing its slot |
| Numbers that stay on screen slide to their new slot | `--ui-dur-glide` | `--ui-ease-glide`, the pill's own curve |
| Numbers that arrive fade in where they land | `--ui-dur-fast` | `--ui-ease-enter` |
| Hover, press and current colors | `--ui-dur-instant` | `--ui-ease-color` |

Each number is keyed by its page, so going from 4 to 5 slides 4, 5 and 6
one slot along while the pill holds the middle slot: the row moves, not
every label at once. The pill and the numbers share the glide, which
doesn't overshoot, so a number sliding in lands in the pill without
passing it. A jump (1 to 20) slides the pill the whole way, and
the numbers that stay (1 and 20) don't move. Slides use FLIP on
`translate`, and one cut short starts again from where it is on screen.
Nothing animates on the first paint or when the row resizes. Under
`prefers-reduced-motion: reduce` everything lands at once; colors still
change.

## Accessibility

- A `<nav>` around a list of real buttons, or links with `href`. Tab
  moves through them; Enter or Space presses.
- Each number is named "Page 3", and the current one is
  `aria-current="page"`. The arrows are "Previous page" and "Next page".
  The gaps are hidden from screen readers.
- At either end the arrow is `aria-disabled`, not `disabled`: pressing
  Next down to the last page leaves focus on Next instead of dropping it
  to the top of the document. Links that are off point at the page you're
  on and ignore presses.
- Focus stays on the control you pressed, so a polite live region says
  where you are after each move ("Page 4 of 20"). In the compact variant
  the range text is that region.
- Chevrons turn under right-to-left, and the pill moves from the right.

## Before / after

Before: the page numbers are the five around the current page, so the
row grows and shrinks as you page, Next moves out from under the pointer,
and at the last page it's `disabled` and focus falls to the body.

```tsx
<div className="pager">
  <button disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
  {range(Math.max(1, page - 2), Math.min(count, page + 2)).map((p) => (
    <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
  ))}
  <button disabled={page === count} onClick={() => setPage(page + 1)}>›</button>
</div>
```

After:

```tsx
<Pagination page={page} pageCount={count} onPageChange={setPage} />
```
