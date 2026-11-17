# Breadcrumbs

Shows where the current page sits, as a trail of links from the top level
down to it. The last crumb is the page you're on: in the text color and
not a link. A long trail folds its middle into a "…" button that opens it
in place, and a long label fades out at its end instead of wrapping or
pushing the rest off the line. Links render through your router's link
component.

```tsx
<Breadcrumbs
  as={Link}
  items={[
    { label: "Events", href: "/events" },
    { label: "Saturday supper", href: "/events/1182" },
    { label: "Guests" },
  ]}
/>
```

## When to use it

- Pages deep in a hierarchy that people reach from search or a shared
  link: a guest in an event in a season. The trail says where they are
  and gets them up a level.
- Above the page title, as the first thing in the page's header.

## When not to

- Flat apps, where every page is one level down: the sidebar or tabs
  already say where you are.
- The steps of a flow (cart, shipping, payment): those are steps, not
  places, and need a progress indicator.
- Browser history. A breadcrumb shows the hierarchy, not the path you
  took to get here; that's the back button.

## Props

Every `<nav>` prop passes through.

| Prop | What it does |
|---|---|
| `items` | The trail, top level first: `{ label, href? }`. The last item is the current page and is never a link. An item without `href` is a level with no page of its own and shows as plain text |
| `as` | Your router's link component (`Link` from Next). Defaults to `<a>`. Gets `href`, `className` and the label |
| `max` | Trails longer than this fold to the first crumb, "…" and the last `max − 2`. At least 3; defaults to 4 |
| `aria-label` | Names the nav. Defaults to "Breadcrumb" |

Set `--breadcrumbs-label-max` on the nav to change where a long label
starts to fade (20em by default).

## States

| State | What you see | How |
|---|---|---|
| Link | Muted text | `<a>` |
| Hover | A fill behind the crumb, text in the text color | `@media (hover: hover)` |
| Press | Darker fill in 80ms | `:active` |
| Focus | A line just inside the crumb's pill, instantly | `:focus-visible` |
| Current page | Text color, a step heavier, no hover or press | `aria-current="page"` |
| Level with no page | Muted text, no hover or press | no `href` |
| Folded | First crumb, "…", the last two | more than `max` items |
| Long label | Its last 24px fade, only when cut; pointing at it shows the full label in a native tooltip | `truncate` from `text` |

## Layout

Text is the Small step (13px), each crumb a 24px pill with 6px of padding,
and a 14px chevron between crumbs in the subtle color. The pills reach
past the start edge by their padding, so the first label's text lines up
with the title under it and the hover fill hangs outside.

A trail too long for its line wraps between crumbs, never inside one, and
each crumb keeps its chevron with it. A label fades from 20em, or sooner
when it alone is wider than its line. On touch screens every link and the
fold get a 40px hit area, and wrapped lines open to 16px apart so
targets don't overlap.

## Motion

| What | Duration | Easing |
|---|---|---|
| Crumbs after the fold slide to their new places as it opens | `--ui-dur-move` | `--ui-ease-move` |
| Crumbs that open fade in where the "…" was | `--ui-dur-fast` | `--ui-ease-enter` |
| Hover and press fills, text color | `--ui-dur-instant` | `--ui-ease-color` |

Opening the fold is the only movement. The crumbs already on screen slide
(FLIP on `translate`, onto the next line if the trail now wraps) rather
than jumping to make room. Nothing animates on the first paint. Under
`prefers-reduced-motion: reduce` the crumbs land at once.

## Accessibility

- `<nav aria-label="Breadcrumb">` around an ordered list, so screen
  readers announce a landmark and "list, 3 items".
- The current page is `aria-current="page"` and not a link: a link to the
  page you're on goes nowhere.
- Chevrons are drawn, `aria-hidden`, so the trail is read as names, not
  "greater than". They turn under right-to-left.
- The fold is a real button, named for what it does ("Show 3 more
  levels"). Opening it moves focus to the first link it revealed, since
  the button itself is gone.
- A faded label is still all in the DOM, so screen readers read it whole.

## Before / after

Before: slashes as text, read aloud between every crumb; the current page
is a link to itself; and a long event name wraps the trail onto three
lines.

```tsx
<div className="crumbs">
  <a href="/events">Events</a> / <a href="/events/1182">{event.name}</a> /{" "}
  <a href="/events/1182/guests">Guests</a>
</div>
```

After:

```tsx
<Breadcrumbs
  as={Link}
  items={[
    { label: "Events", href: "/events" },
    { label: event.name, href: `/events/${event.id}` },
    { label: "Guests" },
  ]}
/>
```
