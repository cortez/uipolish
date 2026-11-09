# Text morph

Animates a label from one string to another. Letters the two strings share
slide to their new place, letters that leave fade out, letters that arrive
fade in with a small rise and a 2px blur on the plain enter curve (no
bounce: vertical overshoot in a line of text reads as jitter), and the width
follows on the glide, which never overshoots, so a button resizes once and stops. It uses React, the Web
Animations API and CSS, with no animation library.

Button uses it for string labels.

## When to use it

- A short label that changes in place to report a result or a step: Copy →
  Copied, Save → Saving… → Saved, Follow → Following.
- Counters and short values that change while the user is looking at them.

## When not to

- Paragraphs or anything longer than a few words: per-letter motion on a
  sentence is noise.
- Text that changes on its own, without the user doing anything. Motion should
  have a cause the user can name.
- Big content swaps (a whole panel, a route): crossfade those instead.

## How it works

1. Until the label first changes, it renders as plain text: one node, kerned
   as the font intends, so a page of labels that never change carries no
   per-letter boxes. Each letter's place is measured from the text, so the
   first morph starts from exactly where the letters were drawn.
2. The string is split into graphemes (`Intl.Segmenter`, so emoji and accents
   stay whole). Whole words the two labels share move as one piece; between
   them, only letters at a shared start or end stay. "Copy" and "Copied"
   share `C`, `o`, `p`. Unrelated labels ("1 week before" → "No deadline")
   crossfade instead of sliding stray letters through each other.
3. After React commits the new string, each shared letter is measured, then
   animated with `translateX` from where it was on screen to zero (FLIP). If a
   morph is interrupted, it starts from the letter's current position, so
   rapid changes never jump.
4. Leaving letters are drawn once more in a layer React never renders into,
   then fade and lift out.
5. The wrapper's width animates from its old width to the new one.
   Arriving letters are timed to finish with it, never after: the stagger
   shrinks for long labels so the last letter still lands on the glide's
   final frame.

## Motion

| What | Duration | Easing |
|---|---|---|
| Shared letters slide, width follows | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Leaving letters | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Arriving letters | Start after 40% of the leave time, or 85% when letters are leaving, then up to 15ms apart; each ends on the same frame as the width glide | `--ui-ease-enter` |

The width animation is a sanctioned exception to "animate transform and
opacity only": it's one inline box, and the alternative is a jump. Under
`prefers-reduced-motion: reduce` the text swaps instantly.

## Accessibility

- The full string is rendered once, visually hidden, as the accessible text.
  The animated letters are `aria-hidden`.
- The morph doesn't announce changes. If the new text reports a result, put it
  in a `role="status"` region too.

## Before / after

Before: the label snaps and the button jumps wider.

```tsx
<button>{copied ? "Copied" : "Copy"}</button>
```

After:

```tsx
<button><TextMorph>{copied ? "Copied" : "Copy"}</TextMorph></button>
```
