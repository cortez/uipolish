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
6. **Numbers roll.** When two strings differ only in their numbers ("12
   guests" → "13 guests", "$9.95" → "$10.00", "1–25 of 240" → "26–50 of
   240", "62%" → "63%"), digits pair by place value (the whole part from the
   right, the fraction from the point) and a digit that changes rolls in
   its place: the old one leaves a full step (0.6em) up and the new one
   comes from below, the other way when the number drops. While digits
   roll, the row's block padding fades out with a mask, so a digit is whole
   on the line and gone past it, like a wheel behind a window. The digits
   alone are tabular (never the whole label, so letters and spaces keep the
   font's own widths), so a roll never changes the width; a new place (9 → 10) rolls
   in beside the others and the width follows.
7. **Paced.** A change that arrives within 200ms of the last one waits its
   turn, so the text changes at most five times a second and the latest
   value always lands. The accessible copy updates at once.

This is the one number animator in the registry: Number input, Usage
meter, Progress, Pagination, Badge counts, Tab counts and the Data table's
footer count all render their changing figures through it.

## Motion

| What | Duration | Easing |
|---|---|---|
| Shared letters slide, width follows | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Leaving letters | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Arriving letters (labels) | 75% of `--ui-dur-glide`, after 40% of the leave time, or 85% when letters are leaving, +15ms per letter | `--ui-ease-enter` |
| Rolling digit: old and new travel together | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Rolling digit: the old one fades | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Rolling digit: the new one fades in, half a beat later (60ms) | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |

The width animation is a sanctioned exception to "animate transform and
opacity only": it's one inline box, and the alternative is a jump. Under
`prefers-reduced-motion: reduce` the text swaps instantly, digits included.

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
