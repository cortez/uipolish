# Code input

A one-time code as a row of boxes, one per character: digits by default,
or letters and digits with `characters="alphanumeric"`. Typing moves along,
Backspace steps back, a paste or the platform's autofill fills every box at
once, and the value never has holes in it. Digits are 24px semibold with
tabular figures, so every box holds the same weight of ink; each fades in
and settles 2px as it lands.

Give it a `status` and the check gets a shape of its own: while the code is
being verified the boxes fold toward the middle into one pill, "Verifying",
with a breathing dot; a good code draws a check in and the words morph to
"Verified", in the same ink and the same width; a wrong one opens the boxes
back up with the digits still in them.

```tsx
<CodeInput
  label="Verification code"
  name="code"
  hint="The code expires in 10 minutes."
  value={code}
  onValueChange={(next) => {
    setCode(next);
    if (status === "error" && next) setStatus("idle");
  }}
  status={status}
  onComplete={async (value) => {
    setStatus("verifying");
    setStatus((await verify(value)) ? "success" : "error");
  }}
/>
```

## When to use it

- Verification codes sent by email or text, two-factor codes, short PINs.

## When not to

- Anything longer than about 8 characters, or with a variable length: use a
  text field.
- Passwords. A code input shows every digit.

## Props

| Prop | What it does |
|---|---|
| `label` | Visible label for the whole code. Required. |
| `length` | Number of boxes, default 6. Every box is the same width and the same gap apart at any length. |
| `group` | Optional grouping the way the code is read aloud: `3` gives 123 456, `[3, 4]` gives 123 4567. Each group after the first opens with a small dot in a wider gap. Leave it out for one even row. |
| `value`, `onValueChange` | Controlled mode. `defaultValue` for uncontrolled. |
| `onComplete` | Called when a change leaves every box filled: the last digit typed, a paste, or one digit fixed in a full code. Verify here. |
| `characters` | `"digits"` (default) or `"alphanumeric"` (shown upper case). |
| `hint` | Guidance under the boxes. |
| `error` | What went wrong and what to do. Turns every edge to danger. |
| `status` | `"idle"`, `"verifying"`, `"success"` or `"error"`, set by your app as the check runs. Leave it out and the boxes never fold. |
| `labels` | `{ verifying, success, error }`: the pill's words (default "Verifying", "Verified") and the message for `status="error"` when there's no `error` prop. Keep pill words to one or two: the pill doesn't wrap. |
| `retry` | After `status="error"`: `"select"` (default) keeps the digits, all selected, so the next digit typed starts over while a click on one box fixes just that one; `"clear"` empties the boxes. Focus goes to the first box either way. |
| `name` | Submits the code as one hidden form value. |
| `disabled`, `autoFocus` | As on an input. |

## Behavior

| Input | Result |
|---|---|
| Type a digit | Fills the box and moves to the next. |
| Type the digit already there | Moves on. |
| Click or tap a box past the end | Focus goes to the first empty box. |
| Focus a filled box | Its digit is selected, so typing replaces it. |
| Backspace on a filled box | Clears it; later digits close up. Focus stays. |
| Backspace on an empty box | Clears the one before and steps back. |
| Delete | Clears the box and closes the gap. |
| ← → | Move between boxes (mirrored in right to left), never past the first empty one. |
| Home / End | First box / last reachable box. |
| Paste | A whole code replaces the value; part of one continues from the box pasted into. Non-digits (spaces, dashes) are dropped. |
| Platform autofill | The first box has `autocomplete="one-time-code"`; a code dropped into it fills every box. |
| Typing while `verifying` or `success` | Nothing changes: the boxes are read-only, so the code can't change under the check. |
| Typing after a failed code (`retry="select"`) | The first digit replaces the whole code and moves on; Backspace clears it all; an arrow key or a click keeps the digits and edits one. |

**Always contiguous.** The value is a string with no holes, so there's
never a "1_3456" to submit. That's why focus can't land past the first empty
box and why deleting from the middle closes the gap.

## States

| State | What you see | How |
|---|---|---|
| Empty or filled box | Hairline edge in `--ui-border-strong`, the same edge as a text field | |
| Hover | Edge darkens to `--ui-field-focus` | `@media (hover: hover)` |
| Active box | Edge in `--ui-field-focus`, instant. Empty: a drawn 2px caret blinks in the middle (steady under reduced motion). Filled: the digit is selected | `:focus` |
| Invalid | Every edge eases to danger; the hint fades out and the error fades in, in the same reserved line | `error` → `aria-invalid` |
| Disabled | 50% opacity, default cursor | `disabled` |

Only the active box has a dark edge, so where the next digit goes is never
in doubt. Nothing moves between these states: edges change color, messages
fade. Digits appear the instant they're typed, as in any field.

### Status

The check is the one place the component changes shape, because the shape
says what's happening: you can't type into a pill.

| `status` | What you see | How |
|---|---|---|
| `idle` | The boxes. | `data-phase="cells"` |
| `verifying` | Boxes locked at once. If the check is still running after 300ms, they drift toward the middle and fade into one pill: a quiet `--ui-fill` with no edge, `--ui-control-md` (40px) tall, centered on the row both ways, which tightens from both sides to fit a ring with a breathing dot and "Verifying" in muted ink. Once shown it stays 400ms at least, so a fast answer never flickers. | `data-phase="verifying"`, `aria-busy` |
| `success` | No color comes in, only ink: the dot gives way to a check drawing in, the ring fills in, and "Verifying" morphs to "Verified" (shared letters stay put) as the ink goes from muted to foreground. The pill eases to the shorter word's width from both sides, so it stays centered; no tint, no light band. A fast answer goes straight from the boxes to this. | `data-phase="success"` |
| `error` | The pill widens back to the row from its middle and dissolves as the boxes come out of it with their digits and danger edges, then the row nudges sideways once. The error fades in below with a 2px drop. | `data-phase="cells"`, `aria-invalid` |

The pill is centered on the digit row's own box, horizontally and
vertically, at every frame of the fold, in the same space, so nothing below
or beside it moves: the boxes stay in the layout, invisible, while it shows,
and the field keeps its height and width. The padding is even on both sides,
so the glyph and words sit on that center too. In a left-aligned form the
pill centers under the digits, not under the label or the form: the row is
as wide as its boxes, and the pill takes its middle.

## Motion

| What | Duration | Easing |
|---|---|---|
| Edge on hover | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Caret blink | `--ui-dur-pulse` on, `--ui-dur-pulse` off, while the active box is empty | steps |
| Edge on focus | 0ms | n/a |
| Edge to danger and back | `--ui-dur-fast` (160ms) | `--ui-ease-color` |
| Hint ↔ error crossfade | 150ms out, 200ms in after 75ms | `--ui-ease-color`, `--ui-ease-enter` |
| Error arriving | 2px drop and a 2px blur clearing, `--ui-dur-base` | `--ui-ease-enter` |
| Boxes into the pill | fade and 2px blur `--ui-dur-fast`; drift toward the middle `--ui-dur-glide` | `--ui-ease-exit`; `--ui-ease-glide` |
| Pill width, either way, from both sides | `--ui-dur-glide` (320ms) | `--ui-ease-glide`, no overshoot |
| Pill label and glyph in / out | `--ui-dur-base` after `--ui-dur-instant` / `--ui-dur-instant` | `--ui-ease-enter` / `--ui-ease-exit` |
| Breathing dot | `--ui-dur-pulse` each way, while verifying | `--ui-ease-pulse`, alternate |
| "Verifying" → "Verified" | Text morph; the pill follows its width from both sides | as Text morph |
| Label ink, muted → foreground | `--ui-dur-base` | `--ui-ease-color` |
| Check drawing in | `--ui-dur-base` after 60ms | `--ui-ease-draw` |
| Pill dissolving as it opens | `--ui-dur-base` after `--ui-dur-instant` | `--ui-ease-color` |
| Boxes out of the pill | fade and blur `--ui-dur-base` after 60ms; drift back `--ui-dur-glide` | `--ui-ease-enter`; `--ui-ease-glide` |
| Nudge on error | 4px, 3px, 1px over `--ui-dur-move`, after the boxes are back | `--ui-ease-pulse` |

Reduced motion keeps every state and drops the movement: the boxes and the
pill crossfade in place, the pill takes its width while unseen, the label
swaps without morphing, the caret holds steady, and there's no drift, blur,
breathing or nudge. The
check still appears.

## Accessibility

- The boxes are a `role="group"` labelled by the visible label and described
  by the hint or error. Each box is named "Digit 1 of 6" and so on.
- `inputmode="numeric"` and `pattern="[0-9]*"` bring up the number pad.
- Digits are 24px, over the 16px below which iOS zooms into a field.
- The message line is `aria-live="polite"`, so an error is read out without
  moving focus. Clear `error` as soon as the user edits.
- Clicking the label focuses the first empty box.
- With `status`: the group is `aria-busy` while verifying. A polite status
  region says "Verifying" and then "Verified" as the pill shows them, and the
  error is read from the message line. While the boxes are a pill, focus
  waits on the group (which says its label and status); when they come back
  it returns to the first box, but only if it was in the code input before,
  so a person who tabbed away isn't pulled back.

## Before / after

Before: six separate inputs with `maxLength={1}`. A paste fills one box,
autofill never fires, and Backspace on an empty box does nothing.

After:

```tsx
<CodeInput label="Verification code" onComplete={verify} error={error} />
```

## Layout

The row is as wide as its boxes (44 × 48px each, `--ui-control-lg` tall), and nothing reflows while
digits arrive. In a parent narrower than that, every box shrinks by the same
amount down to `--code-box-min` (24px), so it fits its container, not the
viewport, at any length. Gaps stay equal at every length (`--code-gap`, 8px;
`--code-group-gap`, 24px between groups, with the dot in its middle). The message
under the boxes always holds one line, and hint and error trade places in
it. If an error can arrive on its own (a server check after the last digit)
and run past one line, set `--code-message-lines: 2` on the component so the
slot is already that tall. The same goes for `labels.error`.

The boxes never push past their container: the row is as wide as the boxes
when there's room, and on a narrow phone each box narrows evenly, down to
24px, instead of the row running off the edge.
