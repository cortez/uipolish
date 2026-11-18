# Number input

A number with − and + buttons: guests, quantities, hours, prices. The
field is one fixed width, the number is set in tabular figures, and a
step swaps only the digits that changed, so nothing moves sideways; typing
edits the real input underneath. For money and other
values nobody steps through, the buttons come off and it reads like a text
field, with the currency symbol pinned beside the digits.

The behavior is built on Base UI's `<NumberField>`.

```tsx
<NumberInput label="Guests" name="guests" defaultValue={6} min={1} max={12} hint="The long table seats 12." />
<NumberInput label="Rate" value={rate} onValueChange={setRate} step={5} format={{ style: "currency", currency: "USD" }} />
<NumberInput label="Deposit per guest" value={deposit} onValueChange={setDeposit} format={{ style: "currency", currency: "USD" }} steppers={false} />
```

## When to use it

- Small adjustments around a known value, where stepping is quicker than
  typing.
- Amounts that are typed, like prices and deposits, with
  `steppers={false}`: the field still formats, clamps and reads the
  locale's decimal mark, without buttons that suggest $1 nudges.

## When not to

- Numbers that aren't amounts: phone numbers, card numbers, ZIP codes. Use
  a text field with `inputMode="numeric"`.
- Large ranges set roughly: a slider.

## Props

| Prop | What it does |
|---|---|
| `min`, `max` | A typed value outside is pulled in on commit, with a note: "Up to 12" |
| `step` | One press or arrow. Shift, PageUp and PageDown move ten |
| `format`, `locale` | `Intl.NumberFormat` options. Typed text is read with the locale's decimal mark |
| `hint`, `error` | The note and error take the hint's reserved line |
| `value`, `defaultValue`, `onValueChange` | Controlled or uncontrolled |
| `name` | Base UI's hidden input carries the plain number |
| `steppers` | `false` hides − and +. The number starts where a text field's text does, and a currency symbol or unit is pinned to the edge on the side the locale writes it |
| `arrowKeys` | With `steppers={false}`, `false` also turns off the stepping keys: a plain text box for a number. Ignored while the buttons show |

### Without steppers

| | Steppers (default) | `steppers={false}` |
|---|---|---|
| Number | Centered between − and + | At the start, 15px in, lined up with text fields |
| Currency or unit | Inside the formatted number | Muted, pinned to the edge: "$" at the start, "€" at the end in `de-DE`. Typing edits the digits only |
| Width | `--number-width`, 136px | The same; set `--number-width: 100%` to match the fields around it |
| Keys | Arrows, Page Up/Down, Home/End step | The same, unless `arrowKeys={false}` |
| Stepping keys | On | On, unless `arrowKeys={false}` |

Values keep as many decimals as the step, the minimum or the format shows,
so a currency field keeps typed cents ("86,75" stays 86.75 with a step of
1), and its on-screen keyboard has a decimal key.

## Keyboard and pointer

| Input | Does |
|---|---|
| ArrowUp / ArrowDown | One step (Shift: ten) |
| PageUp / PageDown | Ten steps |
| Home / End | `min` / `max`, when set |
| Typing, then Enter or leaving | Commits; text that isn't a number goes back to the value. Escape undoes the typing |
| Press − or + | One step at once; holding repeats (Base UI's press-and-hold) |

The buttons are out of the tab order (the arrow keys do their job) and
never take focus from the input, so the caret and on-screen keyboard stay.
A press anywhere on the field's shell puts the caret in the number. At the
end of the range a button stays in place, quiet, and does nothing.

## Motion

No layout moves when the value changes. The field keeps `--number-width`
whatever the number, and its box, the buttons and the digits that stay
hold their place to the pixel. Each character is keyed by its place from
the right, so only the digits that changed are replaced, and they rise
0.25em into place (up for a larger value, down for a smaller one) on
`--ui-dur-fast` and `--ui-ease-enter`: transform and opacity only, no
width animation, no spring. Kept digits don't animate, and nothing
animates on first paint or when typing ends. When the digit count changes
(9 to 10), the centered number recenters at once.

Tabular figures only hold if the face has them (`tnum`). In a face
without them, digits of different widths recenter the number by a pixel
or two as it steps.

Press shrinks only the button's fill. The note and error fade into the
reserved line. Under `prefers-reduced-motion` changed digits fade in
without the rise.

## Accessibility

In a settings row whose own text already names it, pass `hideLabel`: the
label stays as the field's name for screen readers but isn't shown.

The input is Base UI's: a text input with `aria-roledescription="Number
field"` whose text is the formatted value, named by the label. The buttons
are named "Increase Guests" and "Decrease Guests" and are out of the tab
order; at the end of the range they take `aria-disabled`. The digits
shown over the input are `aria-hidden`; the input carries the value.

Without steppers the input reads only the digits, so a pinned symbol is
linked as a description and read after them. With `arrowKeys={false}`,
Home and End move the caret.
