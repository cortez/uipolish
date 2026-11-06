# Avatar

A person's photo in a circle, with their initials on a quiet, opaque
neutral fill behind it, and a quiet head and shoulders when there's no name to take letters
from. The circle is its final size from the first frame; a photo that
loads fades in over the fill, one that's quick shows no initials first, and
one that fails never shows the browser's broken-image mark. `AvatarGroup`
overlaps a few and ends with a +N that says how many more.

```tsx
<Avatar name="Maya Chen" src={maya.photo} />

<AvatarGroup people={going} label="Going" max={5} />
```

## When to use it

- Next to a person's name in a list, a comment, a byline, a guest list.
- A group of people at a glance: who's going, who's editing, who replied.

## When not to

- As the only way to tell people apart. Initials repeat; write the name
  beside it.
- For things that aren't people: a project, a file, a site. Use an icon or
  a thumbnail; a circle with letters reads as a person.
- As a button. If clicking it opens a profile, wrap it in a link with the
  person's name, or use a list row.

## Props

`Avatar` takes every `<span>` prop besides these:

| Prop | What it does |
|---|---|
| `name` | The person's name. Picks the initials, and is the accessible name. Leave it out (or pass one with no letters) for the head and shoulders, named "Unnamed person" |
| `src` | A photo. The initials show until it loads and if it fails |
| `size` | `20`, `24`, `32` (default) or `40` |
| `decorative` | Hidden from screen readers. Use it when the name is written beside the avatar |
| `initials` | `1` or `2`. Defaults to 2 from 32px up and 1 below; `AvatarGroup` uses 1 |

`AvatarGroup`:

| Prop | What it does |
|---|---|
| `people` | `{ name?, src? }[]` |
| `label` | What the group is ("Going", "Waitlist"). Its accessible name |
| `max` | Most circles to show, the +N included. Default 4 |
| `total` | Everyone in the group, when `people` holds only the first few |
| `size` | As on `Avatar` |
| `moreLabel` | `(count) => string`, the +N's accessible name. Default "3 more" |

## States

| State | What you see | How |
|---|---|---|
| No photo | Initials on the neutral fill | no `src` |
| Photo loading, under 300ms | The fill alone; then the photo fades in | `data-status="loading"` |
| Photo loading, over 300ms | The initials fade in on the fill after 300ms; the photo fades in over them when it arrives | |
| Photo in the cache | The photo, at once, with no fade | `complete` on first render |
| Photo failed | The initials, on the same schedule as loading; no broken-image mark, ever | `onError` removes the `<img>` |
| No name | A head and shoulders in the letters' color at a third strength | no `name`, or one with no letters ("?") |

**Initials.** The first letter of the first and last words: "Maya Chen" is
MC, "Priya" is P, "noor@example.com" is N, "王小明" is 王. Words that are
only punctuation, like "(host)", are skipped, and accent marks stay with
their letter. At 20 and 24 only the first letter shows; two would be too
small to read.

**Fill.** Initials sit on the strong fill mixed onto the surface, in the
text color: an avatar is a person, not a status, so it takes no hue.
The fill is opaque, so circles that overlap in a group never show through
each other. The letters hold 4.5:1 on it in both themes.

**No name.** A plain head and shoulders, filled in the letters' color at
half strength, the shoulders running off the bottom edge like a portrait.
No face, nothing illustrated: it says "a person" and nothing more, in the
same place and weight as initials would sit.

## Layout

The circle is `size` square from the first render, so a photo arriving
moves nothing. The letters are drawn in a 40-unit SVG, like an icon, so
they scale with the circle instead of adding type sizes: two letters at
15 units, one at 19. A hairline in `--ui-border` sits inside the
edge, over the photo, so a white background in a photo doesn't melt into a
white surface.

In a group, each circle overlaps the one before it by a fifth of its
width, with a 2px ring in the surface color, so the overlap reads as a
clean cut, and the hairline inside each edge separates circles of the same
fill. Avatars in a group show one initial: two would be cut by the next
circle. The ring is a shadow and adds nothing to the group's size. On a
different background, set `--avatar-ring` to that color. The +N is a
circle like the rest: its number is 40% of the circle (10px at least) and
stops at 99+, while its accessible name keeps the exact count.

## Motion

| What | Duration | Easing |
|---|---|---|
| Initials, when a photo is slow | `--ui-dur-fast`, after 300ms | `--ui-ease-enter` |
| Photo fading in | `--ui-dur-fast` | `--ui-ease-enter` |

The photo fades only when it arrives after the avatar is on screen. Under
`prefers-reduced-motion: reduce` it appears at once.

## Accessibility

- By default the avatar is `role="img"` named with `name`. Beside the
  written name, pass `decorative` so it's hidden and the name isn't read
  twice.
- The `<img>` itself has `alt=""`: the circle carries the name, whether the
  photo or the initials show.
- A group is `role="group"` named with `label`. Each avatar in it is named,
  and the +N is an image named "3 more" (or your `moreLabel`), so the
  count is heard, not only seen.
- Initials are never the only way to tell people apart: write the
  name nearby.

## Before / after

Before: an `<img>` with no size and no fallback. The row jumps when it
loads, a broken link shows the broken-image mark, and a screen reader hears
the file name.

```tsx
<img src={guest.photo} className="avatar" />
```

After: a fixed circle, the initials until the photo arrives or if it
fails, and hidden from screen readers beside the written name.

```tsx
<Avatar name={guest.name} src={guest.photo} decorative />
<span>{guest.name}</span>
```
