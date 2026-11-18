# Copy field

A read-only value with a Copy button inside the field: a link to share, a
key, a code. On copy the icon turns into a check for two seconds and a
status line says "Copied" to screen readers. A secret shows a fixed row of
dots, the same for every secret, so the mask gives nothing away about its
length; a Show button reveals it in place, and Copy copies the real value
either way. The value stays on one line: a long one fades out at its cut
end, shows in full on hover (`title`), and one press selects all of it.

```tsx
<CopyField
  label="RSVP link"
  mono
  value="https://supperclub.example/rsvp/saturday-supper"
  hint="Anyone with the link can RSVP until Friday at noon."
/>
```

## When to use it

- A value the user needs to take somewhere else: an invitation link, an API
  key, a webhook secret, a door code.
- Secrets that should stay hidden on screen until asked for, but copy in
  one press.

## When not to

- A value the user can edit: use a text field.
- Code of more than one line: use a code block, which has its own Copy.
- A secret that must never be shown again after it's made: show it once,
  in a dialog, with a warning, and keep only a masked hint afterwards.

## Props

| Prop | What it does |
|---|---|
| `label` | The visible label. Also names the buttons: "Copy RSVP link", "Show Wi-Fi password" |
| `value` | What's shown, and what Copy puts on the clipboard |
| `mono` | Set the value in the monospace face, a step smaller: keys, tokens, URLs, hashes |
| `size` | `sm` 32px, `md` 40px (default), `lg` 48px: the control heights. Give the `action` button the same size |
| `secret` | Mask the value behind 16 dots, with a Show button |
| `revealed`, `defaultRevealed`, `onRevealedChange` | Controlled or uncontrolled reveal, for a secret |
| `hint` | Guidance under the field. A failed copy says so in its place |
| `onCopied` | Called once the value is on the clipboard |
| `action` | A control beside the field, the field's height: a "Rotate" or "Regenerate" button |

**The action slot.** `action` sits to the right of the field, on the field's
row, 8px from it. Pass a full-height button so the two line up:
`<Button variant="secondary">Rotate</Button>` (with `size` matching the
field's). It's outside the field, not
inside it, because a pill button can't nest in the field's corners. When the
action replaces the value, change `value` and the field updates in place;
say what happened in `hint` ("New link made. The old one stopped working.").

## States

| State | What you see | How |
|---|---|---|
| Rest | Hairline edge, the value, a copy icon | |
| Hover on a button | That button's fill and icon darken; the field's edge doesn't change, since the field itself does nothing | `@media (hover: hover)` |
| Copied | Copy icon turns into a check for 2 seconds; tooltip "Copied"; "Copied" announced | `role="status"` |
| Copy failed | The icon turns into an alert in the danger color for 4 seconds. A shown value is selected, so the copy shortcut works on it at once; the hint line, if there is one, says how | |
| Secret, hidden | 16 dots in the muted color, a Show (eye) button | `secret` |
| Secret, shown | The value crossfades in where the dots were; the eye gets its slash | the button's `aria-pressed="true"` |
| Long value | One line; the end fades out over 24px, only when it's cut. The full value is the `title` | `text` truncate |
| Focus on a button | A line just inside the button's edge | `:focus-visible` |

**Selecting by hand.** The value is real text, selectable with
`user-select: all`, so one press selects the whole value, including the part
that's cut off, and it copies whole. The dots aren't selectable: copying
them would only paste dots.

## Layout

The field is a control height, 40px by default (32px `sm`, 48px `lg`), and
fills its row. The value is one line, centered on the field's middle; the
text starts 14px in, where a text field's does. The buttons sit
concentrically inside: 4px from the top, bottom and end at every size (so
24, 32 or 40px), with the field's radius less those 4px, and 2px apart. On
touch each hit area reaches out to the field's edge. The value takes the
rest of the row and truncates with a fade; the field never grows with it,
and the value never wraps or spills out of it. A small field sets the value
a step smaller (13px).

## Motion

| What | Duration | Easing |
|---|---|---|
| Copy → check, check → copy (`Icon`) | see the icon set's guide | |
| Dots and value crossfade: leaving | `--ui-dur-instant` | `--ui-ease-color` |
| Dots and value crossfade: arriving, 60ms after | `--ui-dur-fast` | `--ui-ease-enter` |
| Eye → eye-off, the slash draws across | see the icon set's guide | |
| Button hover color | `--ui-dur-instant` | `--ui-ease-color` |
| Button press release | `--ui-dur-snap` | `--ui-ease-snap` |

Nothing moves. Showing a secret swaps the text in the same cell; the field
keeps its size. Under `prefers-reduced-motion: reduce` icon changes land at
once and the crossfade stays (it's short feedback, not motion).

## Accessibility

- The field is a `group` named by the label. The value is plain text that a
  screen reader reads in place; masked, it reads "Hidden".
- The buttons are named from the label: "Copy RSVP link", "Show Wi-Fi
  password". The tooltips only repeat them, so they don't describe.
- Show is a toggle with `aria-pressed` and `aria-controls` pointing at the
  value. Its name stays "Show …"; the pressed state carries the change.
- "Copied", or the failure, goes to a `role="status"` region; with a hint,
  the failure is in the hint's live line instead. An icon change alone
  would be silent.
- The clipboard is feature-detected; a failure is never silent.

## Before / after

Before: a disabled input, which is hard to read and can't be selected, a
password-type mask that shows exactly how long the key is, and a copy
button that does nothing visible and nothing audible.

```tsx
<input disabled type={shown ? "text" : "password"} value={key} />
<button onClick={() => navigator.clipboard.writeText(key)}>Copy</button>
```

After:

```tsx
<CopyField
  label="Calendar feed"
  secret
  mono
  value={feedUrl}
  hint="Adds every supper to a calendar. Rotate it if it leaks."
  action={<Button variant="secondary" busy={rotating} onClick={rotate}>Rotate</Button>}
/>
```
