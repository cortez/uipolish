# Tag input

Many values in one field: the guests an invitation goes to, the labels on
a dish, the notes for the kitchen. Type and press Enter, Tab or a comma to
add one, or paste a whole list. Each value becomes a tag with its own
remove button; the tags wrap onto new rows and the field grows to hold
them, easing to its new height rather than jumping.

The field is the one every form field shares (Field's shell, label and
message line). Suggestions, when you give them, open in the same list the
combobox uses, on Base UI's `Combobox`; the tags, the keyboard between them
and the motion are this component's own.

```tsx
<TagInput
  label="Guests"
  name="guests"
  placeholder="Name or email"
  suggestions={contacts}
  value={guests}
  onValueChange={setGuests}
  max={12}
  validate={(v) => (isEmail(v) ? null : `Use a full email for “${v}”, like name@example.com`)}
  hint="Type a name, or paste a list of emails."
/>
```

## When to use it

- A short list of free values: recipients, labels, keywords, notes.
- Picking several from a long list of known ones, with suggestions as you
  type, when typing a new one is allowed too.

## When not to

- One value: a text field or a combobox.
- Several from a short, fixed list (under about eight): checkboxes or
  toggle chips, where every choice is in view.
- Filters over a table: a filter bar, whose chips each open an editor.

## Props

| Prop | What it does |
|---|---|
| `label` | The field's name, shown above it. `hideLabel` keeps it for screen readers only |
| `value`, `defaultValue`, `onValueChange` | The tags, as `string[]`. Controlled or uncontrolled |
| `suggestions` | Offered as you type: strings, or `{ value, label, description }`. Filtered in the browser (case and accents ignored, label starts first, value and description matched too). Ones already added are left out. A tag whose value is a suggestion shows its `label`; typing a suggestion's label in full adds its value |
| `validate(tag)` | A message saying how to fix one tag, or `null`. An invalid tag is still added, in the danger tone, and its message shows under the field |
| `max` | The most it takes. A count ("3 of 12") sits at the end of the label's line; past it, nothing more is added and the field says so |
| `placeholder` | Shown while there are no tags |
| `hint`, `error` | As on the text field. `error` (from a server) wins over everything |
| `duplicateMessage(tag)`, `maxMessage(max)` | The notices' words. Default `“Maya Chen” is already added` and `You can add up to 12` |
| `size` | `md` (40px, default) or `lg` (48px) |
| `disabled`, `name`, `id`, `className`, `ref` | `name` submits each tag as its own hidden input; `ref` is the text input |

## Adding

| How | What happens |
|---|---|
| Enter, Tab or a comma | Adds the highlighted suggestion, or else the text as typed. A semicolon works as a comma. With nothing typed, Enter submits the form and Tab moves on |
| Escape, then Enter | Closes the suggestions, so the text goes in as typed even when something matched |
| Paste | Text with commas, semicolons, tabs or new lines becomes one tag per piece; other text pastes as usual |
| Leaving the field | Text still in it is added: it's a tag the person meant |
| A repeat | Refused, case ignored. The tag that's already there lights up for a moment and a notice says so; the text clears |
| Past `max` | What fits is added; the rest stays in the field and a notice says how many it takes |

Notices are quiet: text-colored words in the message line, no shake and no
red. They show over a tag's error until the next change, then the error
comes back. A paste of fifty adds what fits in one beat and reads "Added 9".

## Keyboard

| Key | In the text | On a tag |
|---|---|---|
| Backspace | With no text, chooses the last tag | Removes it and chooses the one before; from the last tag, back to the text |
| ArrowLeft (ArrowRight in RTL) | At the start, chooses the last tag | The tag before |
| ArrowRight | | The next tag, or the text after the last |
| Delete | | Removes it and chooses the next |
| Enter, Space | | Removes it |
| Home / End | | First tag / the text |
| Escape, ArrowDown | | Back to the text |
| A letter | | Back to the text, where it's typed |
| ArrowDown / ArrowUp | Opens the suggestions and moves through them | |

A tag is "chosen" when its remove button has focus: the tag's fill steps
darker, and from the keyboard a ring sits just inside its edge. The text
input is the field's one tab stop; the tags are reached with the arrows, as
in a toolbar.

## States

| State | What you see | How |
|---|---|---|
| Empty | The placeholder, at the 14px every field's text starts at | |
| Focus | The shell fills with `--ui-field-focus-fill` at once; the edge stays | `:focus-within` |
| Tag | 32px, its text 10px in, filled `--ui-fill-strong`, corner 8px (the field's 12 less its 4px inset) | |
| Chosen tag | Fill one step darker; a ring from the keyboard | the remove button has focus |
| Invalid tag | Danger tint, danger text and a danger edge; the reason under the field | `validate` |
| Repeat | The tag tints accent and settles back | `data-flash` |
| Long tag | Wraps onto more lines; the tag grows, its × stays at the top | |
| Full | The count turns to the text color; suggestions stop opening | `max` |
| Error | Danger edge, the message in the line under the field | `error`, or an invalid tag |
| Disabled | 50%; tags can't be removed | `disabled` |

## Motion

| What | Duration | Easing |
|---|---|---|
| A tag arrives: fades in, scales from 0.97 | `--ui-dur-fast` | `--ui-ease-enter` |
| A tag leaves: fades out, scales to 0.97, in place | `--ui-dur-instant` | `--ui-ease-exit` |
| The tags after it, and the input, slide into place | `--ui-dur-glide` | `--ui-ease-glide` |
| The field's height follows the rows | `--ui-dur-glide` | `--ui-ease-glide` |
| A repeat lights up, holds, settles back | `--ui-dur-panel` × 2 | `--ui-ease-color` |
| Count digits roll | Text morph | |
| Hint, notice and error trade places | `--ui-dur-instant` out, `--ui-dur-fast` in | as Field |
| Suggestions open, close, change height | as Combobox | |

**One beat.** The tags, the input and the field's edge all move on the
same glide, so a row closing or opening moves as one thing. It's the glide
and not the move spring because the field's edge holds the tags: a spring
would carry a tag that crosses to another row a few pixels past the edge
before it settles. The shell clips what's inside, so a tag arriving on a new
row is revealed as the edge reaches it; nothing inside ever overshoots, so
nothing is cut while it settles.

**Leaving follows the list rule** (`foundation/rules/motion.md`): a removed
tag fades where it is, and only then does its space close. Removing
quickly, holding Backspace, or a tag coming back before it has gone all
carry on from where things are drawn; nothing restarts from zero. Tags
there on the first paint don't animate. With reduced motion tags still fade
in and out; nothing slides, scales or eases its height.

## Accessibility

- The label is a real `<label>` for the text input. The hint, notice or
  error and the count are its description; an invalid tag sets
  `aria-invalid` on it.
- The tags and the input sit in a `toolbar` named by the label. Each tag's
  remove button is named for it ("Remove Maya Chen") and carries the tag's
  own problem as its description.
- "Added Maya Chen", "Added 9" and "Removed Maya Chen" go to a polite
  status region; the message line is a polite live region too.
- With suggestions, the input is a WAI-ARIA combobox from Base UI: focus
  stays in it and the highlighted row is its active descendant.
- Remove buttons are 24px for a mouse and 40px on touch screens; the input
  is 16px on touch screens so iOS doesn't zoom.

## Before / after

Before: an input that splits on commas when it loses focus. Typing a
duplicate adds it twice, pasting a list makes one long tag, Backspace in
an empty field does nothing, and the field jumps a row taller with every
wrap.

```tsx
<input value={text} onBlur={() => setTags([...tags, ...text.split(",")])} />
{tags.map((t) => <span key={t}>{t} <button onClick={() => remove(t)}>×</button></span>)}
```

After:

```tsx
<TagInput label="Notes for the kitchen" value={notes} onValueChange={setNotes} />
```
