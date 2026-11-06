# Motion & microinteractions

Goal: the interface responds to the user. Motion confirms actions, connects
states, and directs attention — it never performs for its own sake. Everything
here is CSS-first; do not add an animation library.

## The principle: least motion that keeps context

Every change of state animates, so the user never loses track of what became
what. But it animates with the least motion that gets there:

- **Only what differs moves.** If a property is the same in both states, it
  stays still. A field turning invalid changes its edge color and its message;
  nothing else.
- **Shortest distance, shortest duration that still reads.** Rises are 2–4px,
  scale stays within 0.97–1.03, and if the change reads at 150ms it doesn't
  get 300.
- **Move or morph the element that's already there** into its new place
  rather than fading one out and another in. Crossfade only when the two
  states have no spatial relationship (a hint trading places with an error,
  one panel replacing another).
- **No decorative secondary motion** riding along with the real one, and no
  stagger unless it shows an order the user should read (words arriving in
  reading order, yes; a row of chips, no).

## 1. Tokens: one curve per job

Define (or reuse) the motion vocabulary before writing any animation.
Scattered literal values are how motion languages fall apart. UI Polish names
curves after the job they do, not their shape, and pairs each with the
duration it was designed for. These are the roles in `tokens.css`:

```css
:root {
  /* Ladder for fades, enters, exits and height. */
  --ui-dur-instant: 120ms;  /* color feedback; small things leaving */
  --ui-dur-fast:    160ms;  /* small things arriving; blocks leaving */
  --ui-dur-base:    200ms;  /* blocks arriving; height closing; strokes drawing */
  --ui-dur-panel:   280ms;  /* height opening */

  --ui-ease-enter:    cubic-bezier(0.2, 1, 0.3, 1);    /* arriving: answers at once, short settle */
  --ui-ease-exit:     cubic-bezier(0.4, 0, 1, 1);      /* leaving: accelerates away, never lingers */
  --ui-ease-expand:   cubic-bezier(0.32, 0.72, 0, 1);  /* height opening: prompt push, firm stop */
  --ui-ease-collapse: cubic-bezier(0.4, 0, 0.2, 1);    /* height closing: eases in, folds, no tail */
  --ui-ease-color:  cubic-bezier(0.2, 0, 0, 1);      /* color/opacity feedback in place */
  --ui-ease-draw:   cubic-bezier(0.35, 0, 0.15, 1);  /* SVG strokes drawing on */
  --ui-ease-pulse:  cubic-bezier(0.37, 0, 0.63, 1);  /* breathing loops, with `alternate` */

  /* Springs: a little underdamped, sampled into linear() over their own duration. */
  --ui-dur-move: 380ms;  --ui-ease-move: linear(0, 0.0174, ...);  /* k 484, damping 0.72 */
  --ui-dur-snap: 240ms;  --ui-ease-snap: linear(0, 0.0228, ...);  /* k 1156, damping 0.8 */
  --ui-dur-glide: 320ms; --ui-ease-glide: linear(0, 0.0319, ...); /* k 484, critically damped */

  --ui-dur-pulse: 700ms;   /* half a breathing cycle */
  --ui-dur-sweep: 2400ms;  /* one pass of a light band, `linear` */
}
```

Which curve for which job, and why:

| Job | Curve | Duration | Why this shape |
|---|---|---|---|
| Something arrives: popover, menu, tooltip, toast, row, message | `--ui-ease-enter` | fast (small) or base (block) | Over 90% there by a third of the time, so it answers the click, with a shorter settle than quint-out so it reads as done sooner. Still a gentler first frame than expo-out, so opacity doesn't pop. |
| Something leaves | `--ui-ease-exit` | one step shorter than its entrance | Starts gently and accelerates out, so the eye lets go and it never hangs half-visible. |
| Something moves from where it was to where it is: FLIP, tab pill, toast stack, text morph letters and width | `--ui-ease-move` | `--ui-dur-move` | A spring with a little give (stiffness 484, damping ratio 0.72): it passes its target by about 4% and settles back, so things that move land with a touch of life instead of stopping dead. Interrupting and restarting from the current value looks continuous, which a cubic-bezier can't promise. |
| Small hops: press release, a highlight moving one row, a height that retargets as you type | `--ui-ease-snap` | `--ui-dur-snap` | Stiffer (1156, damping 0.8): about 1.5% past, then back, all in 240ms. Short distances on a long spring look floaty. |
| What a track or a count holds: a pill inside its group, a sheet against an edge, a height, a number counting to its value | `--ui-ease-glide` | `--ui-dur-glide` | The move spring without the give (critically damped): it lands without passing its target, so nothing swings past the end of its track or counts below where it stops. |
| Height opening (`grid-template-rows`) | `--ui-ease-expand` | `--ui-dur-panel` | Starts moving at once, so content below is pushed promptly, and brakes firmly instead of crawling. Not a spring: height drives reflow, so it should finish decisively. |
| Height closing | `--ui-ease-collapse` | `--ui-dur-base` | Eases in while the content fades, then folds and stops with no tail. On the expand curve a close loses its content in the first frames and then crawls shut, which reads as a jump and a drag. |
| Hover, highlight, selected, edge and tint changes; opacity as feedback | `--ui-ease-color` | `--ui-dur-instant` | Responds on the first frame with no travel to feel. |
| A stroke drawing on (`stroke-dashoffset`) | `--ui-ease-draw` | `--ui-dur-base` | A brief pen-down acceleration, then a long deceleration into the end point, like a hand. |
| Breathing loops (a working dot) | `--ui-ease-pulse` with `alternate` | `--ui-dur-pulse` each way | Sine in-out: smooth at both turns, no visible snap. |
| Light band sweeping across text | `linear` | `--ui-dur-sweep` | Constant travel; there are no ends to ease. Same for scroll-driven animation (scroll position is already the easing). |

Usage rules:

- **The spring tokens only mean what they say at their own duration.** A
  `linear()` spring sampled over 400ms and played over 600ms is a softer
  spring, not a slower one. Always pair `--ui-ease-move` with `--ui-dur-move`
  and `--ui-ease-snap` with `--ui-dur-snap`.
- **Exits are faster than entrances**, one step down the ladder. Appearing
  should feel gentle; disappearing, decisive.
- **Never use the enter curve for an exit.** Decelerating out leaves a ghost
  hanging at low opacity.
- **A crossfade in one cell offsets its halves:** the leaving layer drops on
  `--ui-dur-instant` with `--ui-ease-color` (the exit curve would hold it
  on top of the arriving one), and the arriving one enters on
  `--ui-ease-enter` half a beat later, so the two never read on top of each
  other.
- Overshoot stays small and belongs to things that move: the two springs pass
  their target by 4% and 1.5% and settle. Never on opacity or on height (a
  box that grows past its content shows a gap), and the bounce curve only
  for a thumb landing on a stop.
- A quiet default worth setting once if the project has no motion language:
  `* { transition-timing-function: var(--ui-ease-color); }`, so every
  transition inherits a designed curve instead of browser `ease`.

Springs are generated, not hand-written: simulate `x'' = -k(x - 1) - c x'`
from rest, sample it evenly over the duration (25–35 points, 4 decimals),
force the last point to 1, and write the stiffness, damping and duration next
to the token.

## 2. Hover & press: restraint is the signature

**Hover changes color only.** No scale, no lift, no shadow transitions on
controls when the pointer arrives.

- Primary buttons: shift background one step, e.g.
  `color-mix(in oklch, var(--ui-accent) 88%, var(--ui-surface))`, or a small
  alpha ramp (rest 8% → hover 12% → active 16% of foreground). Color
  transition only, `--ui-dur-instant` on `--ui-ease-color`.
- **Press may scale, a little.** `scale: var(--ui-scale-press)` (0.985) on `:active`, applied with
  `transition-duration: var(--ui-dur-press)` (80ms), so the press lands at once
  without reading as a cut, released back on
  `--ui-ease-snap` over `--ui-dur-snap`. Never below 0.97, never on hover, never on
  `[aria-haspopup]` triggers (the menu opens from a shrunken anchor), and
  never on disabled or busy controls.
- Press color goes down in the same 80ms; the release eases back:

```css
.button { transition: background-color var(--ui-dur-instant) var(--ui-ease-color), scale var(--ui-dur-snap) var(--ui-ease-snap); }
.button:active { scale: var(--ui-scale-press); transition-duration: var(--ui-dur-press); }
```

- Links/nav: `hover:opacity-80` or one color step. In grouped nav/menus,
  dim siblings instead of highlighting the target:
  `group-hover:opacity-50 hover:!opacity-100` — the group recedes, the
  hovered item holds.
- The arrow nudge is the classic link affordance:
  `group-hover:translate-x-0.5` on a trailing arrow icon, ~150–200ms,
  `transform` only.
- **Scale never moves more than 3%.** Anything from `0.97` to `1.03`, in any
  state: press, enter, exit, icon swaps, stacked layers (3% per layer). A
  bigger scale reads as a toy. Images inside cards may go to `1.03` on hover,
  `--ui-dur-panel` on `--ui-ease-enter`, inside `overflow: hidden`; never
  scale text on hover.
- Focus appears instantly — never transition focus styles.
- Kill the mobile tap flash once globally:
  `html { -webkit-tap-highlight-color: transparent; }` and make sure
  `:active` states exist to replace it.

## 3. Enter & reveal

Grammar for on-scroll or on-mount entrances:

- **Blocks**: `opacity: 0; translate: 0 4px` → settled, `--ui-dur-base` on
  `--ui-ease-enter`. Popovers and cards may use `scale(0.97)` instead of a
  rise; not both.
- **Things that float in** (popovers, menus, list popups, tooltips, toasts)
  also clear a 2px blur on the same timing: `filter: blur(2px)` → `none`.
  It reads as coming into focus instead of switching on, and it hides the
  first frame's half-drawn edges. Only on small surfaces that appear and
  leave; never on long lists, page sections or anything that scrolls. Rises stay at 2–4px for UI (on-scroll page sections may go
  to 8px over `--ui-dur-panel`); long travel reads as theatrical.
- **Never animate reading content from opacity 0 without a fallback.** If JS
  fails or the element is above the fold, text must be visible. Set the final
  state when reduced motion is on, fire reveals for above-the-fold content on
  mount, and disconnect observers after first fire (content does not
  re-animate on scroll-back).
- **Stagger** only when it shows an order the user reads (words in reading
  order, steps in sequence). Then 60–100ms between siblings, capped (after ~6
  items, bring remaining delays to 0). A group with no order arrives as one.
  Character-level stagger, if ever, is ~10–15ms.
- **Popovers/dropdowns/tooltips**: `opacity 0 → 1` + `scale(0.97 → 1)` with
  `transform-origin` at the trigger side, `--ui-dur-fast` on `--ui-ease-enter`
  in, `--ui-dur-instant` on `--ui-ease-exit` out.
- Native `<dialog>`/popover animation without JS:

```css
dialog { transition: opacity var(--ui-dur-instant) var(--ui-ease-exit), display var(--ui-dur-instant) allow-discrete, overlay var(--ui-dur-instant) allow-discrete; opacity: 0; }
dialog[open] { opacity: 1; transition-duration: var(--ui-dur-fast); transition-timing-function: var(--ui-ease-enter); @starting-style { opacity: 0; } }
```

- IntersectionObserver reveals: threshold ~0.15–0.25 for sections, plus a
  negative bottom `rootMargin` (e.g. `0px 0px -10% 0px`) so elements reveal
  after actually entering, not at the pixel edge. Use one shared observer,
  not one per element.

## 4. Expanding content (the auto-height problem)

Animate `grid-template-rows`, not `height`/`max-height`:

```html
<div class="grid transition-[grid-template-rows] duration-[var(--ui-dur-panel)] ease-[var(--ui-ease-expand)]
            data-[open=true]:grid-rows-[1fr] grid-rows-[0fr]">
  <div class="overflow-hidden"><!-- content --></div>
</div>
```

The `overflow-hidden` must be on the inner element. Open over `--ui-dur-panel`
on `--ui-ease-collapse`; close over `--ui-dur-base` on `--ui-ease-collapse`.
Pair with opacity: content fades in (`--ui-dur-fast`, `--ui-ease-enter`) half
a beat *after* the box starts opening, and fades out (`--ui-dur-instant`) on
`--ui-ease-exit` as it closes: the collapse barely moves for its first frames,
so the text is gone before the edge reaches it, and the fold that follows is
quick and has no slow tail. When one panel closes because another opens (an accordion that
keeps one open), close it on the opening's duration and curve, so the two
heights trade off exactly and what's below holds still.

**Removing an item from a list** (a file, an attachment, a dismissed alert,
a toast) is the same collapse, never its own curve: the item fades out over
`--ui-dur-instant` on `--ui-ease-exit`, starting on the press, and its space
closes over `--ui-dur-base` on `--ui-ease-collapse` once the fade is done
(delay it by `--ui-dur-instant`). A close that starts with the fade crushes
an item that's still visible and drags everything below up past it. Nothing slides
sideways or shrinks.
Never close a height on `--ui-ease-exit`: an accelerating collapse starts
slow and lands hard, so what's below drifts and then jumps.

### Dialogs enter like popovers

At block size: opacity on `--ui-dur-fast`, scale 0.97 and a 2px blur
clearing on `--ui-dur-base`, all on `--ui-ease-enter`. No spring: nothing
travels. On a phone it docks at the bottom and rises from its bottom edge.

### Numbers that change in place

Never animate their width or position. Keep the box a fixed width, swap only
the digits that changed (transform and opacity), and nothing on first paint.
A number fed faster than it can be read (a count ticking forty times a
second) shows its latest value at most about five times a second, and its
last value always lands; a rate or an estimate settles once a second. The
same goes for a name swapping in place: pace it, or it never finishes
fading in.
A pill that marks one item in a row (the current page, the chosen tab) is
sized and placed from the same variables as the item boxes, with odd-width
items like arrows counted explicitly, so the number sits dead center in it.

### A status that changes in place keeps its box

Every label a status can show sits in one grid cell, so the box holds the
widest and nothing beside it moves. Its color changes over `--ui-dur-base`
on `--ui-ease-color`, and the label swaps as an offset crossfade. A spinner,
where one is earned (a step running in a list of steps), is a 16px glyph in
the slot of the icon it replaces, never a new element beside it; with reduced
motion it stops turning and breathes.

### One tooltip per rail or toolbar

Triggers in a row share a single tooltip. Once it's on screen it glides to
the next trigger (glide spring, no overshoot), eases its width to the new
label and crossfades the label with a small shift in the direction of travel.
It never re-enters while you move along the row, and the first one still
waits for the delay.

### A sidebar folds to its rail without moving an icon

Lay the rows out from the collapsed rail: each icon sits where it would be
centered in the rail's capsule (content inset = (capsule − icon) / 2), so
when the width changes no icon moves. The width eases like a height
(`--ui-ease-expand` over `--ui-dur-panel` opening, `--ui-ease-collapse` over
`--ui-dur-base` closing). Rows narrow with it, so the current row's pill
becomes the rail's capsule; their labels leave on `--ui-dur-instant` in the
first frames and come back half a beat after it starts opening, so no word
is read while it moves. What has no icon (headings, a history list) is held
at the open width so it never rewraps, fades first, and goes `inert`. With
reduced motion it switches at once.

### A field that waits folds into its answer

A field that can't take input while work runs (a one-time code being
checked) may fold into a pill the same height on the glide spring, and that
pill carries the result: a success tint and a check, or it opens back into
the field with the input intact and the error below. Lock it at once, fold
only after the 300ms busy delay, and keep the space it held so nothing below
moves. Focus waits on the group while it's folded and returns to the field
only if it was there before.

### Results land, they don't bounce

A change that shows an outcome (a card resizing to its result, a link
turning into a check) glides into place on `--ui-ease-glide`. Overshoot is
for things a person moves or toggles; on a result it reads as a wobble.

### Views that page

A view that pages (calendar months, carousel steps) slides 16–24px in the
direction of travel on the glide spring while the old one fades out first
and the new one fades in just after, so the two never sit on top of each
other. Clip it inside its panel and fade the clip edge through the panel's
padding with a mask; nothing at rest sits in the fade. Interrupted midway,
a view leaves from where it visibly is.

### Nothing below moves while content streams

Reserve the space before content arrives. A thinking window, a progress
area or a result panel opens once, to its full height, and stays that size
while text streams into it; it doesn't grow line by line and push what's
below. A label whose width changes glides to the new width (the glide spring)
so what sits beside it slides rather than jumps, and at rest has no fixed
width, so a late webfont can't cut it.

A streaming log follows its end only while the reader is there. Once they
scroll up it holds still, keeps what they're reading pinned (a stage
switching underneath counts as moving it), and offers one floating "3 new
lines" control back to the end.

### Reveals with no hard edge

Opening height clips its content, and a solid box swept by the clip edge
shows a hard line. While the space opens, the content stays faint and soft:
fade, a blur clearing and a small scale from the top, all over the full
opening; and fade the bottom few pixels of the clip with a mask. Done right,
you can't tell how it animated.

### Page transitions

A straight crossfade, both pages visible the whole time (`plus-lighter` so
there's no dip halfway), and never a blank frame. Chrome that doesn't change
between pages (a docs sidebar) gets its own `view-transition-name` and stays
still, and when it appears or leaves with the page it moves a short way (24px)
from its own edge as it fades. Opening an item from an overview (a tile into
its page) shares a name between the two, so the item glides into place on the
glide spring, no overshoot, while everything else fades.

## 5. Micro-recipes

- **Disclosure chevron**: which motion follows from its axis. At the end of a
  row or under a list ("Show all"), the content opens below it, so it points
  down and turns up: render the icon for the state
  (`<Icon name={open ? "chevron-up" : "chevron-down"} />`) and let the icon
  set morph the arms; no CSS rotate. Trailing or leading a short inline
  label ("4 sources ›", "Thought for 8s ›"), it points right and opens
  downward: that changes axis, and a morph between the two shapes reads as
  the arrow coming apart, so it turns a quarter turn instead
  (`<Icon name="chevron-right" data-turn={open ? "open" : ""} />`), over
  `--ui-dur-base` on `--ui-ease-glide`, never with overshoot. Either way it
  rests in `--ui-muted` and goes to `--ui-foreground` while its trigger is
  hovered, a color change only (`--ui-dur-instant`, `--ui-ease-color`). If
  the open state can change between mount and first paint (opened by the
  URL), remount the icon after first paint (`key={String(ready)}`) so it
  shows the open shape instead of moving into it.
- **Underline that doesn't shift layout**: a `scaleX(0 → 1)` pseudo-element
  with `transform-origin: left`, `--ui-dur-base` on `--ui-ease-enter` — not
  `text-decoration` toggling.
- **Toast**: enter with fade + a 4px rise, `--ui-dur-base` on
  `--ui-ease-enter`; exit with fade + a 4px drop, `--ui-dur-fast` on
  `--ui-ease-exit`; the stack moves on `--ui-ease-move`. Defer unmount until
  the exit finishes.
- **Text morph** (a label changing in place: Copy → Copied, Save → Saving…):
  match whole words the two labels share first, so a shared word slides as
  one piece ("Send invitation" → "Invitation sent"). Then pair leftover
  letters only within the same gap between those words, in order, so no
  letter ever crosses a word. Paired letters slide from their old x to the
  new one (FLIP: measure, invert with `translateX`, play to zero on
  `--ui-ease-move` over `--ui-dur-move`). Letters that leave fade and lift
  out in `--ui-dur-instant` on `--ui-ease-exit`; letters that arrive fade in
  on the move spring with ~15ms stagger. No blur.
  The wrapper's width animates on the same spring so the container grows into
  the new word. This is one sanctioned exception to "never animate width": it
  is one inline box, and the alternative is a jump. Screen readers get the
  full label from a visually hidden copy; the letters are `aria-hidden`.
- **Content swap in place** (theme, route, a hint becoming an error):
  crossfade two stacked layers in the same grid cell rather than animating
  one element through empty. The cell holds the taller of the two, so
  nothing below moves.
- **Shimmer** (work in progress): the label dims and a light band sweeps
  across it, `linear` over `--ui-dur-sweep` (`sweep` in `registry/text`).
  Never a fast blink, and still under reduced motion.
- **Marquee** (if one exists): duplicate content, animate `translateX(0 → -50%)`
  linear, mask the edges with a gradient, pause on hover, and pause offscreen.
- Derive related delays from durations instead of hardcoding: if a line draws
  in 600ms and its endpoint dot fades in 300ms, delay the dot by 300ms so it
  lands as the line arrives.

## 6. Performance discipline

- Animate **`transform`, `opacity`, `filter`, and colors only.** Never
  `width`/`height`/`top`/`left`/`margin` (exception: `grid-template-rows`
  above). Never `transition: all` on anything that moves.
- `will-change: transform` only on elements that continuously animate
  (marquee tracks, pinned sections) — a handful per page, never globally.
- Scroll-linked effects: `requestAnimationFrame`-coalesced with a passive
  listener writing a transform, or CSS `animation-timeline: scroll()/view()`
  behind `@supports (animation-timeline: scroll())` with a static fallback.
- Ambient/looping decoration (if kept at all): slow (3s+) and low-amplitude,
  paused when offscreen. Nothing loops fast enough to draw the eye while
  reading.

## 7. Reduced motion — non-negotiable

Every animation you introduce is guarded, and the guard produces the **end
state**, not a missing element:

```css
@media (prefers-reduced-motion: reduce) {
  .reveal { animation: none; opacity: 1; transform: none; }
  html { scroll-behavior: auto; }   /* often forgotten next to scroll-smooth */
}
```

- With utility classes, prefer a `motion-safe` variant for anything that moves.
- JS-driven animation branches on
  `matchMedia('(prefers-reduced-motion: reduce)').matches` and sets final
  values instantly. Reduced motion means *instant state change*, not *no
  state change*.
- Sub-200ms opacity/color transitions may remain — they are feedback, not
  motion.
- Colocate the reduce override with each animation it guards, so copies of
  the component keep the guard.

## 8. What NOT to do

- No entrance animation on every element — reveal groups/sections, not each
  paragraph.
- No re-triggering reveals on every scroll pass.
- No animated focus rings, no animated disabled states.
- No spring physics on functional UI (menus, accordions, inputs).
- No hover-dependent information (touch devices exist); hover only enhances.
- No motion added to an app that already has a motion language you haven't
  matched — extend theirs.
