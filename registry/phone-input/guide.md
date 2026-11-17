# Phone input

A phone number with a country picker. The number groups itself as you type
in the country's usual pattern without moving the caret; a pasted
`+44 7400 123456` or `0044…` picks its own country; the national trunk 0
drops. The form gets E.164 (`+447400123456`).

The country picker is Base UI's `Combobox` with its search inside the
popup: Base UI handles focus, keys, highlight, placement and dismissal.

```tsx
<PhoneInput label="Mobile" name="mobile" defaultCountry="GB" hint="Only for a text if the venue changes." />
```

## Countries

`countries.ts` is a short curated list (35 countries) with flag, calling
code, a grouping pattern, the minimum digits and a made-up example for the
placeholder. Flags are emoji made from the country code, so there's no
image or data dependency; on Windows they show as two letters. Pass
`countries` to reorder or replace the list. Patterns are for reading, not
validation: a number that doesn't fit is kept and grouped less.

## Props

| Prop | What it does |
|---|---|
| `value`, `defaultValue`, `onValueChange(e164, country)` | E.164 in and out |
| `defaultCountry` | ISO code used until a number says otherwise |
| `validate` | Runs on blur after the built-in check ("Enter the full number: 10 digits for United Kingdom") |
| `hint`, `error`, `name`, `required`, `disabled` | As on the text field |

## Keyboard

- The country button opens the picker (Enter, Space, ArrowDown). Focus
  moves to its search, which matches names, codes (`44`, `+44`) and ISO
  codes; the first match is highlighted as you type. Arrows move, Enter
  chooses and puts focus in the number, Escape goes back to the button.
- In the number, Backspace over a space or bracket removes the digit
  before it, so the caret never sticks on punctuation.

## Layout and motion

The country button sits inside the field, inset the same on three sides,
with the field's radius less the inset. Its code morphs when the country
changes (`TextMorph`) and the number moves over with it, on the move
spring, in answer to the choice. In the picker the search icon lines up
with the country names, `--ui-pad-row` inside each row. The picker opens 8px under the field and
centers the chosen country. Digits are tabular. The input is 16px on touch
screens.

## Accessibility

The button is named "Country: United Kingdom, +44" and opens a dialog
with a combobox search (`aria-activedescendant` follows the highlight) and
a listbox. The input is
`type="tel"` with `autocomplete="tel-national"`, so the browser can fill
it.
