# Text field

A labeled single-line input with a hint and an error. It checks the value when
you leave the field, and once an error shows it clears the moment the value is
fixed. The hint and the error share one reserved line, so nothing below the
field moves. A field with no hint, `validate` or `error` reserves nothing, so a
stack of plain fields keeps the form's own gap.

## When to use it

- Any single-line text, email, number, password or URL input that needs a
  visible label.
- Forms where errors should be fixable in place, field by field.

## When not to

- Multi-line text: use a textarea with the same label and message slot.
- Picking from known options: use a select or combobox.
- Search boxes in a toolbar: they usually need no visible label, an icon, and
  a clear button, so use a search field built for that.

## States

| State | What you see | How |
|---|---|---|
| Rest | Hairline edge in `--ui-border-strong`, hint in muted text below | |
| Hover | Edge one step darker, eased in and out | `@media (hover: hover)`, skipped when focused, invalid or disabled |
| Focus | Edge thickens to 1px and darkens to `--ui-field-focus`, the instant focus lands; leaving eases back | `:focus` (fields show focus on click too) |
| Invalid | Edge eases to danger; the hint fades out and the error, with its icon, fades in in the same place | `aria-invalid`, set on blur by `validate` or by `error` |
| Invalid + focus | 1px danger edge | |
| Fixed while typing | Edge eases from danger back to the focus color; the error fades out and the hint fades back in | `validate` re-runs on each keystroke once an error showed |
| New error over an old one | The new message fades in where the old one was | |
| Disabled | 50% opacity, default cursor, no transitions in or out | native `disabled` |
| Password, hidden | Dots, an eye button inside the end of the field | `type="password"` |
| Password, shown | Plain text, the eye gets a slash, the button turns to the text color | the button's `aria-pressed="true"` |

**One reserved slot.** The hint and the error sit in the same grid cell and
trade places with a crossfade. The cell is as tall as the taller of the two,
and the last error stays in it (faded out and `visibility: hidden`) after
it's fixed, so the field's height never changes when the error comes and goes.
Only the line showing is visible, so only it is in the description and the
live region.

**When it validates.** Not while the user is typing a first attempt. On
blur it runs `validate`. If that returns a message, the field re-checks on
every keystroke after that and clears the error as soon as the value passes.
Errors from the server go in `error` and win over `validate`.

**What an error says.** How to fix it: "Enter an email like name@example.com",
not "Invalid input". "Use at least 8 characters", not "Too short".

**Passwords.** `type="password"` adds a reveal button inside the field. The
input reserves the button's room whether or not anything is shown, so the
field never changes width or height and the text never moves. The button is
32px, centered in the field's height, and its radius is the field's minus the
gap around it. A pointer press doesn't take focus from the input, so the caret
and the on-screen keyboard stay put, and the caret is put back where it was
after the type changes. From the keyboard the button is the next Tab stop
after the input; Space or Enter toggles it and focus stays on the button, so
it can be pressed again.

## Motion

| What | Duration | Easing |
|---|---|---|
| Edge on hover, and back from focus | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Edge on focus | 0ms, never animated | n/a |
| Edge to danger and back | `--ui-dur-fast` (160ms), also while focused | `--ui-ease-color` |
| Leaving message (hint or error) fades out | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Arriving message fades in, 75ms after | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| A new error replacing a shown one | `--ui-dur-fast` (160ms) fade | `--ui-ease-enter` |
| Reveal: slash draws across the eye (`Icon` eye → eye-off) | see the icon set's guide | |
| Reveal button hover color | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Reveal button press release | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |

Nothing in the field moves: the edge only changes color and width, and the
messages only fade. The edge is drawn from two registered custom properties,
one for the neutral color and one for how far it's mixed toward danger, so
focus can land instantly while validity still eases. Under
`prefers-reduced-motion: reduce` the colors and fades stay (they're short
feedback, not motion), a replaced error swaps without fading, and the reveal
button doesn't scale.

## Layout

Stack fields with a 16px gap (`--ui-space-4`). Inside a field the label,
input and message sit 6px apart, so each field reads as one group and the
reserved message line never crowds the next label.

## Accessibility

- The label is a real `<label for>`, so clicking it focuses the input and
  screen readers announce it.
- The hint or error is linked with `aria-describedby`. Invalid fields get
  `aria-invalid="true"`.
- The message slot is `aria-live="polite"`, so an error that appears on blur is
  read out without stealing focus.
- Inputs are 16px on touch devices so iOS doesn't zoom the page on focus.
- The reveal button is a toggle: `aria-label="Show password"`,
  `aria-pressed`, `aria-controls` pointing at the input. The label stays the
  same and the pressed state carries the change, so a screen reader says
  "Show password, toggle button, pressed" rather than a label that
  contradicts its state. Its hit area grows to 40px on touch.
- Password fields turn off spellcheck and autocorrect, so a shown password is
  never underlined or sent to a spelling service.

## Before / after

Before: the error renders only when there is one, so the form jumps down, and
it shows on the first keystroke.

```tsx
<label>Email</label>
<input value={email} onChange={(e) => setEmail(e.target.value)} />
{!isEmail(email) && <p className="error">Invalid email</p>}
```

After: checked on blur, cleared as soon as it's fixed, no jump, linked to the
input for screen readers.

```tsx
<TextField
  label="Email"
  type="email"
  autoComplete="email"
  hint="We'll send the invitation here."
  validate={(v) => (isEmail(v) ? null : "Enter an email like name@example.com")}
/>
```

A password, with a reveal button that doesn't move anything:

```tsx
<TextField
  label="Guest page password"
  type="password"
  autoComplete="new-password"
  hint="Guests enter this to see the menu and RSVP."
  validate={(v) => (v.length >= 12 ? null : "Use at least 12 characters")}
/>
```
