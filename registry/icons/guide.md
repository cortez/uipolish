# Icons

One component, `<Icon name="…" />`, over a small table of 16px stroke icons:
round caps and joins, `currentColor`, and a stroke that matches the weight of
the text beside it (`--ui-icon-stroke`). Changing `name` turns one icon into the
other: the ink on screen reshapes into the new icon, each stroke travelling
to the stroke nearest it, so nothing fades out and nothing is redrawn. Any
name can follow any other. A state is a name:
`<Icon name={copied ? "check" : "copy"} />`. No library, and nothing ever
changes the 16px box.

Text field, Code block, Message thread, Prompt input, Response actions,
Reasoning, Tool steps, Sidebar, Dropdown menu, Toast, Dialog and
Command palette use it.

**Sizes.** The icon draws at `--ui-icon-md` (16px). Size it to the text
it sits with, from the scale only: `--ui-icon-md` beside 14-16px text and in
every control, `--ui-icon-sm` (14px) beside 12px text, `--ui-icon-xs` (12px)
for a tiny mark in a node or badge, `--ui-icon-lg` (20px) for a glyph alone
in a tile. Every chevron in the same role is the same size.

## When to use it

- An icon that reports a state the user just changed: a password shown or
  hidden, a copy that worked, a section open or closed, Send turning into
  Stop, a menu button turning into close.
- Static icons in buttons, menu items and links, where every icon should share
  the same stroke and grid.

## When not to

- Illustrations or icons larger than about 24px: the stroke is in grid units
  and grows with the icon. Draw a separate set for large sizes.
- An icon whose motion has no cause. Nothing here loops or plays on mount.
- Brand marks and file-type badges: those are images, not stroke icons.

## The set

| Name | Strokes (keys) | What a change looks like |
|---|---|---|
| `eye`, `eye-off` | eye, pupil (+ slash) | The slash is a strike: it draws across and cuts its own gap in the eye, and retracts the way it came. |
| `copy`, `check`, `duplicate` | back, sheet, rim (+ add); tick | Copy turns into the check: the front sheet's bottom-left corner, turned an eighth of a turn anticlockwise, is a check. So the whole icon tilts 45° about that corner while the left edge shortens into the short stroke, the bottom edge lengthens into the long one and the rounded corner sharpens to the check's point; the rest of the front sheet and the back sheet are carried round with it as they erase. Check to copy is the same move in reverse, and a change of mind mid-way turns back from where it is. `duplicate` is copy with a plus that draws in. |
| `plus`, `close`, `minus`, `menu` | a, b (+ m) | Every end moves straight to its new place. Plus to close: the ends swing in to the cross. Menu to close: the top and bottom bars meet in the cross and the middle folds into it. Minus to plus: the upright grows out of the bar's middle. |
| `arrow-up`/`down`/`left`/`right`, `send` | s, h1, h2 | The shaft and the two sides of the head move straight to their new places. `send` is `arrow-up`. |
| `chevron-up`/`down`/`left`/`right` | a, b | Two arms that meet at the point. A flip slides the point straight across while the ends move the other way, both arms mirrored the whole way, so it never turns or twists. |
| `play`, `pause`, `stop` | a (+ b) | Solid, not stroked. Between the three they reshape in place, with nothing turning: each is two halves, left and right. Play's triangle is cut down its middle, so play to pause squares each half off into the bar beside it, and play to stop flattens the point into the square's edge. Every corner travels a short straight line. |
| `mic`, `send` → `stop` | | A line opens into the square's outline, the rest erases along itself, and the fill arrives once the outline has closed. |
| `info`, `alert`, `check-circle` | ring, stem, dot (tick) | One ring that stays still; the stem and dot change ends between `info` and `alert`, and reshape into the tick for `check-circle`. `warning` is its own triangle. |
| `thumbs-up`, `thumbs-down`, `pin` | hand, cuff; head, point | Down is up turned half round, so a flip turns the hand over. A pressed rating fills: set `--icon-fill: 1` on the icon or its control. |
| `diff-added`, `diff-modified`, `diff-removed`, `diff-renamed` | frame, bar (+ stem, dot, head) | One rounded square that stays still; the mark inside reshapes. |
| `more`, `pencil`, `sidebar`, `panel`, `search`, `link`, `download`, `upload`, `trash`, `external`, `file`, `retry`, `calendar`, `home`, `compose`, `settings`, `help`, `clock`, `share`, `folder`, `paperclip`, `at`, `list`, `terminal`, `branch`, `gauge` | | Everyday and app-frame icons. Each still turns into any other when its name changes. `trash`, `download`, `upload`, `share`, `external` and `arrow-right` move 1px while the control around them is hovered or keyboard-focused. |

## How it works

- **A table, not drawings.** Each name maps to keyed strokes, each a path.
  A stroke's subpaths are its *strands*: one unbroken line each.
- **Markup until it moves.** An icon that never changes is plain `<path>`
  markup, as the server sent it. On its first name change a small engine
  takes the strands over and moves their points itself, a frame at a time.
- **Every strand finds a partner.** A strand both icons name and draw with
  the same commands (a chevron's arms) moves command by command,
  so a drawn correspondence holds. The rest pair off by how little ink has to
  travel: each strand's points are sampled evenly along its length (corners
  kept), and it goes to the strand of the new icon nearest it, turned
  whichever way moves it least.
- **Nothing flies in or out.** A new strand with no partner draws on along
  its own line, from the end nearest the ink already there; an old one with
  none erases back along its own line, into the end nearest the new icon,
  and is gone within the first 60% of the move so it never lingers beside
  the new shape. Its last stub fades rather than leaving the round cap's
  dot. So an icon with two strokes becomes one with five, and nothing
  travels sideways to get there.
- **Least movement.** Every point travels a straight line to its place, so
  nothing spins or pivots on the way: an icon changes shape where it
  stands. Copy to check is the one deliberate turn: its corner *is* the
  check, turned 45°, so the tilt is the change itself.
- **Solids.** A solid strand is filled. A line becoming a solid fills once
  its outline has closed; a solid becoming a line empties first.
- **Crisp at rest.** Mid-way a strand is a 49-point line; when it lands it is
  the icon's own path again, so a morphed icon is pixel-identical to one
  that never moved.
- **Interruptible.** A change mid-way starts from where the ink is: every
  strand on screen, the ones erasing included, is paired afresh.
- **Strikes.** A stroke marked `cut` (the eye's slash) isn't ink to
  reshape: it draws on and retracts along its own length with a CSS dash,
  and is drawn again in an SVG mask, black and three strokes wide, so the
  strokes under it open a gap. The mask id comes from `useId()`.
- **Stroke weight.** The root reads `stroke-width: var(--ui-icon-stroke, 1.5)`.
  Set `--ui-icon-stroke` on the control to the token for its label's weight
  (`--ui-icon-stroke-regular` beside 400 text, `-medium` beside 500)
  and every icon inside matches. See
  `foundation/rules/typography.md`, "Icons beside text".
- **Filling an outline.** `--icon-fill: 1` on the icon or a parent fills
  every closed outline in the text color (a pressed thumb).
- **Parent hover, no JS.** The 1px nudges react to the nearest `button`, `a`,
  `[role="button"]` or `[role="menuitem"]` being hovered (behind
  `@media (hover: hover)`) or keyboard-focused, and stay still when it's
  disabled.

## Motion

| What | Duration | Easing |
|---|---|---|
| One icon becomes another: every strand moves, draws on or erases (erasing ends at 60%) | `--ui-dur-glide` (320ms) | `--ui-ease-glide` (read from the page, so a changed token is followed) |
| Copy ↔ check: the icon tilts 45° about the front corner as it reshapes; the rest erases by 80% | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Play ↔ pause ↔ stop: the halves reshape in place | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| A line fills into a solid | 40% of the glide, after 35% of it | `--ui-ease-color` |
| A solid empties into a line | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| The strike draws on / retracts | `--ui-dur-base` (200ms) / `--ui-dur-fast` (160ms) | `--ui-ease-draw` / `--ui-ease-exit` |
| Hover nudges (1px) | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |

The glide never overshoots, so strokes that meet end to end stay joined all
the way and a result (a check landing) doesn't bounce.

Under `prefers-reduced-motion: reduce` every change lands at once: the new
icon is simply there.

## Accessibility

- Every icon is `aria-hidden="true"`. The control
  carries the name: `aria-label="Show password"`, a visible "Copy" label.
- An icon's state is never the only signal. A toggle also sets
  `aria-pressed` or `aria-expanded`; a copy result also goes to a
  `role="status"` region.
- Color is `currentColor`, so icons follow the text color of their control in
  every theme and in forced-colors mode.

## Before / after

Before: two icons stacked and swapped with opacity. The eye-off is a second
drawing, so the slash pops in, and interrupting the swap snaps.

```tsx
<button aria-label="Show password" aria-pressed={shown} onClick={() => setShown(!shown)}>
  {shown ? <EyeOffSvg /> : <EyeSvg />}
</button>
```

After: one icon, one name change. The eye stays still, the slash draws across
and cuts its own gap, and a second press halfway through turns it back.
Swapping two unrelated icons (search for close, a file for a folder) works
the same way: the ink of one becomes the other.

```tsx
<button aria-label="Show password" aria-pressed={shown} onClick={() => setShown(!shown)}>
  <Icon name={shown ? "eye-off" : "eye"} />
</button>
```

A copy button for the refund note on order #4471:

```tsx
<Button variant="ghost" onClick={copy}>
  <Icon name={copied ? "check" : "copy"} />
  <TextMorph>{copied ? "Copied" : "Copy"}</TextMorph>
</Button>
```

A menu button for a contractor's job list:

```tsx
<Button variant="ghost" aria-label="Jobs" aria-expanded={open} onClick={() => setOpen(!open)}>
  <Icon name={open ? "close" : "menu"} />
</Button>
```
