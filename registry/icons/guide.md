# Icons

One component, `<Icon name="…" />`, over a small table of 16px stroke icons:
round caps and joins, `currentColor`, and a stroke that matches the weight of
the text beside it (`--ui-icon-stroke`). Changing `name` animates from one
icon to the other with the least motion: strokes both icons share stay where
they are or move into their new shape, strokes only the old icon has retract,
strokes only the new one has draw in. A state is a name:
`<Icon name={copied ? "check" : "copy"} />`. CSS transitions only, no
library, and nothing ever changes the 16px box.

Text field, Code block, Message thread, Prompt input, Reasoning, Tool steps,
Sources, Dropdown menu, Toast, Dialog and Command palette use it. It's free
because free components depend on it.

**Sizes.** The icon draws at `--ui-icon-md` (16px). Size it to the text
it sits with, from the scale only: `--ui-icon-md` beside 14-16px text and in
every control, `--ui-icon-sm` (14px) beside 13px text, `--ui-icon-xs` (12px)
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

| Name | Strokes (keys) | Pairs that share strokes |
|---|---|---|
| `eye`, `eye-off` | eye, pupil (+ slash) | The slash draws across and cuts its own gap in the eye. |
| `copy`, `check`, `duplicate` | back, sheet, rim (+ add) | The front sheet is two strokes meeting end to end: `sheet` (left edge, bottom-left corner, bottom edge) and `rim` (the rest). Copy → check: the square opens at its bottom-right corner, the rim erases back round to the top-left, and the sheet's corner turns 45° into the check, its bottom edge swinging up into the long stroke; the back sheet retracts. Back to copy, the check turns back into the corner and the rim draws round from the top-left to close it. `duplicate` is copy with a plus drawn on. |
| `plus`, `close`, `minus`, `menu` | a, b (+ m) | Plus to close: both lines' ends move 45° round. Menu to close: the top and bottom bars swing into the cross, the middle retracts. Plus to minus: the upright retracts. |
| `arrow-up`/`down`/`left`/`right`, `send` | s, h1, h2 | Left and right share the shaft, so a flip moves only the head (up and down likewise). `send` is `arrow-up`. |
| `chevron-up`/`down`/`left`/`right` | a, b | Two rigid arms, each turned 45° about its own midpoint. A flip turns both arms through level to the other side; they keep their length and the chevron stays centered. |
| `mic` | capsule, cradle, stand | Mic to stop: the mic retracts the way it was drawn while the block sweeps in. |
| `stop` | block | One 4-unit stroke round a small square, which round joins fill out to a rounded block, so it sweeps in like any stroke. Send to stop: the arrow retracts into its tip, the block sweeps in. |
| `play`, `pause` | l, t | The left edge stays the left bar; the triangle's point (one bent stroke) straightens into the right bar, on the glide so it never bows past straight. |
| `info`, `alert`, `check-circle` | ring, stem, dot (tick) | One ring; the stem and dot swap ends between `info` and `alert`, and the tick draws in for `check-circle`. `warning` is its own triangle. |
| `more`, `pencil`, `sidebar` | dots; body, edge; frame, rail | Row and card overflow menus, rename or edit, and showing or hiding a side panel. |
| `upload`, `file`, `retry`, `calendar` | | Static. |
| `home`, `compose`, `settings`, `help`, `clock`, `share`, `folder`, `paperclip`, `at`, `list`, `terminal`, `branch`, `gauge`, `panel` | | Static: an app's frame. Places, a new item, settings and help, history, sharing, files, attaching, mentioning, a plan, a terminal, a branch, an amount of effort, and showing or hiding a panel at the end (`sidebar` is the one at the start). `share` lifts its arrow 1px while the control around it is hovered or focused. |
| `diff-added`, `diff-modified`, `diff-removed`, `diff-renamed` | frame, bar (+ stem, dot, head) | What happened to a file: one rounded square with a plus, a dot, a minus or an arrow. They share the square and the bar, so a change of kind morphs only the mark. |
| `search`, `link`, `download`, `trash`, `external` | | Static. `trash`, `download`, `external` and `arrow-right` move 1px while the control around them is hovered or keyboard-focused. |

## How it works

- **A table, not drawings.** Each name maps to keyed strokes: a path, and
  optionally a window along it (`f`/`t`, 0–1). Every path has
  `pathLength="1"`, so dash math is length-free: `stroke-dasharray: len 3`,
  `stroke-dashoffset: -f`.
- **Shared keys move.** On a name change, a stroke whose key both icons have
  keeps its element. If only its window changed, the dash
  length and offset transition and the stroke slides along the path. If its
  path changed and the commands line up, the CSS `d: path()` property
  transitions and its points move in straight lines (Chromium, Firefox). In a
  browser that can't interpolate `d` (Safari), the old stroke retracts and the
  new one draws instead.
- **Draw and retract, no dots.** A stroke leaves by the end its window touches:
  the dash slides back off the start, or on past the end, to 0.3 beyond it. A
  round cap is never left behind, and the last stub is gone while the dash is
  still moving fast. New strokes draw from the same end with
  `@starting-style`, only after the first change, so nothing plays on mount.
  Retracted strokes are removed on `transitionend`.
- **Interruptible.** The next pose is worked out from the strokes on screen,
  and everything is a transition, so a change mid-way heads to the new icon
  from where it is; a stroke that was retracting turns round and draws back.
- **Seams.** A stroke marked `seam` meets another end to end at rest (copy's
  `sheet` and `rim`). It moves on the glide curve, which never overshoots, so
  the joint closes cleanly, and when it leaves it erases in place along its
  path instead of fading and shrinking, so the shape reads as one line
  opening rather than a drawing swapped out. Without `d` interpolation the
  sheet erases like the rim and the check draws in after.
- **Cutting a stroke.** A stroke marked `cut` (the eye's slash) is drawn
  again in an SVG mask, black and three strokes wide, so the eye's outline
  opens a gap just ahead of it. The mask id comes from `useId()`.
- **Stroke weight.** The root reads `stroke-width: var(--ui-icon-stroke, 1.5)`.
  Set `--ui-icon-stroke` on the control to the token for its label's weight
  (`--ui-icon-stroke-regular` beside 400 text, `-medium` beside 500,
  `-semibold` beside 600) and every icon inside matches. See
  `foundation/rules/typography.md`, "Icons beside text".
- **Parent hover, no JS.** The 1px nudges react to the nearest `button`, `a`,
  `[role="button"]` or `[role="menuitem"]` being hovered (behind
  `@media (hover: hover)`) or keyboard-focused, and stay still when it's
  disabled.

## Motion

| What | Duration | Easing |
|---|---|---|
| A shared stroke moves (points, or its window along the path) | `--ui-dur-move` (380ms) | `--ui-ease-move` |
| A stroke draws in | `--ui-dur-base` (200ms) | `--ui-ease-draw` |
| A stroke retracts | `--ui-dur-fast` (160ms) | `--ui-ease-draw` |
| Strokes that meet end to end (copy's sheet and rim): the shared one moves; the other erases in place, no fade or shrink | `--ui-dur-glide` (320ms); erase `--ui-dur-instant` (120ms) | `--ui-ease-glide`; erase `--ui-ease-draw` |
| Hover nudges (1px) | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |

A morph that shows a result (a link landing as a check) shouldn't bounce:
set `--icon-morph-ease: var(--ui-ease-glide)` on a parent and the shared
strokes glide there instead of overshooting.

Under `prefers-reduced-motion: reduce` every change lands at once: the slash
is there or not, the check is drawn or not.

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
