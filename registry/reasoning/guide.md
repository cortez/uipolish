# Reasoning

The thinking block that sits above an AI reply. While the model thinks, a
"Thinking" label has a slow light band passing across it, a timer counts the
seconds, and the reasoning text streams into a short window that follows the
newest line. Pass `steps`, short headlines for what it's doing, and the label
becomes the newest one: each new step rises into place as the last rises
out, and the label's width glides to fit so the timer beside it shifts
instead of jumping. When thinking ends, the block folds to one line,
"Thought for 8s", which opens again on click.

```tsx
<Reasoning streaming={thinking} steps={["Reading the guest list", "Checking what's in season"]}>
  {reasoningText}
</Reasoning>
```

Keep a step to a few words, present tense, no trailing period: "Sizing the
sides", not "I am now going to work out the sides." Most model APIs stream a
summary heading per reasoning block; those are exactly what `steps` wants.

## When to use it

- A model that exposes its reasoning or a summary of it before answering.
- Long thinking where the user needs proof that something is happening: the
  timer and the moving label answer "is it stuck?" without a spinner.
- Showing the reasoning afterwards on demand, for users who want to check how
  an answer was reached.

## When not to

- Tool calls and actions (searching, reading files, editing): use tool steps,
  which show each action with its own status.
- A wait with no text to show and no meaningful duration: a plain pending
  state on the message is enough.
- The answer itself. Reasoning is secondary text, muted and smaller; the
  answer below it stays at full contrast.

## States

| State | What you see | How |
|---|---|---|
| Thinking, no text yet | "Thinking" with the light band, timer counting | `streaming`, empty `children` |
| Thinking, streaming | Text in a six-line window under a hairline; it glides to follow the newest line, each new paragraph rising in; the top edge fades once lines scroll under it | `streaming`, text in `children` |
| Thinking, with steps | The newest step is the label; a new one rises into place over the last | `streaming`, `steps` |
| Thinking, reader scrolled up | The window stops following until the reader scrolls back to the bottom | scroll position, no prop |
| Thinking, folded by the user | One line, label still moving, timer still counting | click the label |
| Done | One line: "Thought for 8s" in muted text with a chevron | `streaming={false}` |
| Done, opened | The full reasoning, no height cap | click, or `defaultOpen` |
| Hover | Label and chevron go to the text color | `@media (hover: hover)` |
| Press | A light fill behind the label, in 80ms | `:active` |
| Focus | 2px ring around the pill-shaped label | `:focus-visible` |

**The duration.** Pass `duration` in seconds when you know it (from the API,
or from history). Otherwise the block measures from when `streaming` turned
true, or from `startedAt` if the component remounts mid-thought. Durations
read "8s", "2m 14s", "2m".

**Opening and closing on its own.** Uncontrolled, the block opens when
thinking starts and folds when it ends; that is the only time it moves without
the user. Pass `open` and `onOpenChange` to own it, for example to keep it
open for a user who opened it last time.

## Motion

| What | Duration | Easing |
|---|---|---|
| Light band across "Thinking" | `--ui-dur-sweep` (2.4s) per sweep, repeating | `linear` |
| A new step, or "Thought for 8s": the old line rises out with a 2px blur | `--ui-dur-base` (200ms) | `--ui-ease-exit` |
| The new line rises in from below, 60ms later | `--ui-dur-move` (380ms) | `--ui-ease-enter` |
| The label's width glides to the new line; the timer and chevron move with it | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| The window follows new text; a new paragraph rises 6px and clears a 2px blur | 320ms scroll; `--ui-dur-base` (200ms) | ease-out; `--ui-ease-enter` |
| Timer folds away, chevron glides left | `--ui-dur-move` (380ms); timer fades out in 150ms | `--ui-ease-move`, `--ui-ease-exit` |
| Open: height | `--ui-dur-panel` (280ms) | `--ui-ease-expand` |
| Open: text fades in, 75ms after the height starts | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Close: height | `--ui-dur-base` (200ms) | `--ui-ease-collapse` |
| Close: text fades out | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Chevron turns a quarter turn, right to down | `--ui-dur-base` (200ms) | `--ui-ease-glide` |

Height animates through `grid-template-rows: 0fr → 1fr` with the clipping on
the inner element, never through `height` or `max-height`. The band is the one
thing that repeats, and it repeats because the model is still working: it
stops the moment thinking ends.

Under `prefers-reduced-motion: reduce` the label is static muted text (no
band), lines swap with a plain crossfade and no rise, the width snaps, the
window jumps to new text, and opening and closing are instant; only the
short opacity fades remain.

## Accessibility

- The label is a `<button>` with `aria-expanded` and `aria-controls` pointing
  at the panel. Enter and Space toggle it.
- The folded panel is `inert`, so its text is skipped by Tab and by screen
  readers until opened.
- The timer is `aria-hidden`; it would be noise read every second. A polite
  `role="status"` region says "Thinking" when it starts and "Thought for 8s"
  once when it ends.
- While capped, the scrolling window is a focusable `region` labelled
  "Reasoning", so keyboard users can scroll it with the arrow keys.
- The label is at least 40px tall on touch screens.
- Reasoning text uses `--ui-muted`, which stays above 4.5:1 on the surface in
  both themes.

## Before / after

Before: a spinner and a wall of reasoning that pushes the answer off screen,
then stays there.

```tsx
{thinking && <Spinner />}
<div className="reasoning">{reasoningText}</div>
<div className="answer">{answer}</div>
```

After: a moving label and a live timer while it works, a six-line window that
follows the text, then a single line the user can open.

```tsx
<Reasoning streaming={!answerStarted}>{reasoningText}</Reasoning>
<Answer>{answer}</Answer>
```

Loading a past conversation, where the thought is finished and its length is
known:

```tsx
<Reasoning streaming={false} duration={134}>{message.reasoning}</Reasoning>
```
