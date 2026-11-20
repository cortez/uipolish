# Textarea

A labeled multi-line field: Text field's sibling, with the same label, hint,
error, edge, insets and focus fill, so the two stack in one form and line up.
It starts at `minRows`, grows a row at a time as the text wraps, and at
`maxRows` it scrolls, the text fading at the edge it runs past. The box eases
to each new height, so what's below is carried down instead of jumping. An
optional character count sits at the end of the hint's line and never changes
width.

```tsx
<Textarea
  label="Message"
  hint="Sent with the invitation."
  limit={280}
  validate={(v) => (v.trim() ? null : "Write a line or two for your guests")}
/>
```

## When to use it

- Text that can run past one line: a message, a note, a description, a
  reason.
- Anything with a length to keep an eye on (a text message, a bio): add
  `limit` or `maxLength` with `count`.

## When not to

- A single line (a name, an email, a URL): use a text field. A one-row
  textarea still takes Enter as a new line.
- A chat composer with attachments and a send button: use the prompt input.
- Formatted text (headings, lists, links): that's an editor, not a field.

## Props

Takes every `<textarea>` prop except `rows` (`value`, `defaultValue`,
`onChange`, `placeholder`, `maxLength`, `disabled`, `name`, `ref`, …), which
go to the textarea. `className` goes on the field's root.

| Prop | What it does |
|---|---|
| `label` | The visible label, a real `<label for>` |
| `hideLabel` | Hides the label from sight; screen readers still read it |
| `hint` | Guidance under the field, until there's an error to show in its place |
| `validate` | Runs on blur; return how to fix the value, or `null` |
| `error` | An error from outside, such as the server. Wins over `validate` |
| `size` | `md` (default) or `lg`: the padding of a 40px or 48px text field, so one row is exactly that tall |
| `minRows` | Rows it shows when empty. Default 3 |
| `maxRows` | Rows it grows to before it scrolls. Default 8 |
| `limit` | A soft limit in characters. Typing past it is allowed: the count turns to danger and the field is invalid |
| `count` | Shows the character count. On by default with `limit`; with the native `maxLength` it reads "50 / 80" and the browser stops the typing |

## States

| State | What you see | How |
|---|---|---|
| Rest | Hairline edge in `--ui-border-strong`, hint in muted text below, `minRows` tall | |
| Hover | Nothing changes; the text cursor is the cue | |
| Focus | Fills with `--ui-field-focus-fill` the instant focus lands; the edge stays as it rests; leaving eases back | `:focus-within` on the box (fields show focus on click too) |
| Growing | A wrap or a new line adds a row: the text is laid out at once and the box eases down to it | measured on input, on a value from outside and on a form reset |
| Shrinking | Deleting rows eases the box back up, never under `minRows` | |
| Full | At `maxRows` the box stops and the text scrolls; text past the top or bottom edge fades over 24px, and the fade lifts at each end | scroll position, as in Scroll area |
| Invalid | Edge eases to danger; the hint fades out and the error, with its icon, fades in in the same place | `aria-invalid`, set on blur by `validate` or by `error` |
| Invalid + focus | Danger edge at the hairline weight, and the focus fill | |
| Fixed while typing | Edge eases back; the error fades out and the hint fades back in | `validate` re-runs on each keystroke once an error showed |
| Near the limit | The count is unchanged to look at; a screen reader hears "12 characters left" once typing pauses | the last tenth of the limit, or the last 20 characters |
| Over the limit | The count turns to `--ui-danger-text` and the edge to danger; the text is kept, and nothing is cut | `limit`; `data-over` on the count |
| Disabled | 50% opacity, default cursor, no transitions in or out | native `disabled` |
| Label hidden | No visible label; screen readers still read it | `hideLabel` |

**One reserved line.** The hint and the error share one grid cell and trade
places with a crossfade (Field's `FieldMessage`), and the count sits at the
end of the same line. A field with no hint, `validate`, `error` or count
reserves nothing.

**A count that holds still.** The typed figure is as wide as the limit's
digits and set in tabular figures, right-aligned against the "/", so "9",
"99" and "160" all end at the same place and the line never shifts. Only the
digits are tabular; the "/" and its spaces keep their own width.

**Soft limit or hard stop.** `limit` lets a pasted draft land whole and shows
how far over it is, which is kinder than cutting it: the person trims it
themselves. `maxLength` is the browser's hard stop, for values that can't be
longer. The count is the length the browser counts (`value.length`), so the
two always agree.

**When it validates.** As Text field does: not while the first attempt is
being typed, on blur, and after an error on every keystroke until it's fixed.

## Motion

| What | Duration | Easing |
|---|---|---|
| Fill on focus | 0ms, never animated | n/a |
| Fill easing back on blur | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Height following the text, growing and shrinking | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Scroll fade at the top and bottom | tied to the scroll position over the first and last 24px | `linear` (a scroll timeline) |
| Edge to danger and back | `--ui-dur-fast` (160ms), also while focused | `--ui-ease-color` |
| Count to danger and back | `--ui-dur-fast` (160ms) | `--ui-ease-color` |
| Hint and error trading places | as Field: out in 120ms, in over 160ms half a beat later | |

The textarea itself takes its new height at once, so the browser never
scrolls it to keep the caret in view; the box around it, which draws the edge
and the fill, eases to that height and clips the difference on the way. The
spring is the short one for a height that retargets as you type: a new row
arriving mid-way retargets it from where it is. Nothing eases on mount, and a
change of width (the text rewrapping) applies at once. Without scroll
timelines the two fades ease in and out over `--ui-dur-fast` instead. Under
`prefers-reduced-motion: reduce` the height changes at once; colors and
fades stay.

## Layout

Stack it with text fields at a 16px gap (`--ui-space-4`). Inside the field
the label, box and message sit 8px apart. The text starts 14px in from the
edge and 10px down (`md`), the same insets as a text field, and the corner
is `--ui-radius-md`. One row is 40px (`md`) or 48px (`lg`); each further row
adds 20px. The field is as wide as its container.

## Accessibility

- The label is a real `<label for>`. The hint or error is linked with
  `aria-describedby`, and an invalid field (an error, or over `limit`) gets
  `aria-invalid="true"`.
- The message line is `aria-live="polite"`, so an error that appears on blur
  is read without stealing focus.
- The count is in the description too, as words ("118 of 160 characters"), so
  it's read when the field takes focus. While typing it stays quiet until the
  end is near; then one polite `role="status"` line ("12 characters left",
  "5 characters over the limit") is spoken a second after typing pauses,
  never on every keystroke.
- 16px text on touch screens, so iOS doesn't zoom the page on focus.
- It can't be dragged to a new size: it sizes itself, between `minRows` and
  `maxRows`.

## Before / after

Before: a fixed three rows with a drag handle, an inner scrollbar after the
third line, and a count that appears from nowhere and nudges the hint.

```tsx
<label>Message</label>
<textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
{note.length > 150 && <p>{160 - note.length} left</p>}
```

After: it grows with the text, the count is always there and always the same
width, and going over says so without cutting anything.

```tsx
<Textarea
  label="Text reminder"
  minRows={2}
  limit={160}
  hint="One text message holds 160 characters."
  value={note}
  onChange={(e) => setNote(e.target.value)}
/>
```
