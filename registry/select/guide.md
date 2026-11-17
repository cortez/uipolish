# Select

Picks one value from a list. The trigger is as wide as the chosen label:
when the choice changes, the label morphs into the new one and the trigger
springs to its new width. The list opens on press, has typeahead and a
highlight that slides between options. On touch screens the system picker
takes over, over the same trigger. Label, hint and error match the text
field.

The behavior (focus, keys, typeahead, placement, dismissal) is built on
Base UI's `Select`.

```tsx
<Select
  label="Seating"
  name="seating"
  options={[
    { value: "assigned", label: "Assigned seats" },
    { value: "open", label: "Open seating", description: "Guests sit wherever they like" },
  ]}
  defaultValue="open"
  hint="Printed on the invitation."
/>
```

## When to use it

- One value from about five or more known options: currency, a time
  zone, a country.
- A compact choice in a toolbar or inside another control (`size="sm"`).

## When not to

- Two to five short options that are worth seeing at once: use a segmented
  control or radio buttons.
- Options the user should search or that can be typed freely: use a
  combobox with a text input.
- Actions ("Duplicate", "Delete"): use a dropdown menu.

## Props

| Prop | What it does |
|---|---|
| `options` | `{ value, label, description?, icon?, disabled? }`, or groups `{ label, options }`. Labels are plain text, since the native picker shows them too. `icon` is a 16px mark before the label, in the list and on the trigger (a brand mark, a flag); give every option one or none, so the trigger keeps its shape |
| `label` | Visible label above. Without one, pass `aria-label` |
| `hint` | Guidance under the field until there's an error |
| `validate` | Returns a message that says how to fix the choice, or null. Runs on blur |
| `error` | An error from outside, such as the server. Wins over `validate` |
| `value`, `onValueChange`, `defaultValue` | Controlled or uncontrolled |
| `placeholder` | Shown while nothing is chosen. Defaults to "Choose…" |
| `size` | `md` (default): a form field, surface fill, hairline edge. `sm`: a 34px pill on a light fill, for toolbars and for sitting inside another pill |
| `name`, `required`, `disabled`, `id`, `ref` | As on a native select |

## Keyboard

| Key | Closed | Open |
|---|---|---|
| ArrowDown, ArrowUp, Enter, Space | Open on the chosen option | Down / Up: next or previous option. Enter, Space: choose and close |
| Home / End | | First / last option |
| Letters | Choose the first option that starts with them, without opening, like a native select | Jump to the next match; repeating one letter cycles |
| Escape | | Close without choosing; focus goes back to the trigger |
| Tab | Move on | Close without choosing and move on |

Disabled options are skipped by the keys and can't be chosen.

## Pointer

- The list opens on press. Pressing the trigger, dragging to an option
  and releasing chooses it, the way native menus do. A quick click opens
  it.
- Hovering highlights; a click chooses. A press anywhere else closes the
  list.
- Clicking the label focuses the trigger without opening it, like a native
  select.

## States

| State | What you see | How |
|---|---|---|
| Rest | Value, chevron; hairline edge (`md`) or light fill (`sm`) | |
| Placeholder | Placeholder in the subtle text color | nothing chosen |
| Hover | Edge one step darker (`md`), fill one step darker (`sm`) | `@media (hover: hover)` |
| Open | The hover edge, easing in and out with the list over `--ui-dur-instant`; chevron flips. The thicker focus edge is only for keyboard focus, so a click or tap never rings it | `[data-popup-open]` |
| Focus | `md`: edge darkens and thickens, inside the field. `sm`: a line just inside the pill | `:focus-visible`, never animated |
| Invalid | Danger edge, error with an icon in the hint's place | `aria-invalid` |
| Disabled | 50% opacity, default cursor | `disabled`, `[data-disabled]` |
| Highlighted option | One rounded fill under the option, sliding between options | `[data-highlighted]`, pointer or keyboard |
| Chosen option | A check at the end of its row | `[data-selected]` |

## Layout

- The trigger's width is the chosen label plus padding and the chevron. It
  never reserves the widest option.
- The list opens 8px under the trigger, at least as wide as it (Base UI's
  `--anchor-width`), and flips above when there's no room below. It is not
  laid over the trigger (`alignItemWithTrigger` is off). It shares
  the trigger's radius, its options sit 4px inside with the radius less
  4px (concentric, never pills), and option text sits `--ui-pad-row`
  (12px) in from the row's edge, clear of its curve: 16px from the panel's,
  just past the trigger's 14, so the list opens under the words. `sm`
  rows are 32px tall with the same radius.
- The list centers the chosen option when it opens, scrolls inside itself
  only, and is at most 320px tall (less when the viewport has less room:
  `--available-height`).
- With a hint, validation or an outside error, one message line is always
  reserved, so an error appearing moves nothing.

The open list's edge is the one in `--ui-shadow-floating`: the same outline color as the field (`--ui-border-strong`), drawn once. Don't add a ring of your own on top; two rings read as a darker edge.

## Motion

| What | Duration | Easing |
|---|---|---|
| Label morphs to the new choice and the trigger follows its width | `--ui-dur-move` (380ms) | `--ui-ease-move` (`TextMorph`) |
| List opens: fade, unblur and scale 0.97 → 1 from the trigger (`--transform-origin`) | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| List closes | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Highlight moves between options | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Chevron flips: its tip moves, its ends stay | `Icon` | |
| Error in | `--ui-dur-fast` (160ms), fade and 3px drop | `--ui-ease-enter` |

The width change is the one place a select moves its neighbors, and only in
answer to the user's choice. Under `prefers-reduced-motion: reduce` the
label swaps, the list appears and the highlight jumps.

## Touch screens

On `(pointer: coarse)` a real `<select>` lies invisibly over the trigger,
so a tap opens the system picker, which is easier to use with a thumb than
any custom list. The trigger still shows the value and morphs when it
changes. The native select is the focus target and carries the label, the
error and `required`. It's 16px, so iOS doesn't zoom the page.

With a mouse, Base UI's hidden input holds the form value; on touch
screens the native select does. Either way the field submits with a form.

## Accessibility

- The select-only combobox pattern from Base UI: a `button` with
  `role="combobox"`, `aria-haspopup="listbox"` and `aria-expanded`, named
  by the label. While the list is open, focus moves onto the highlighted
  `option` and comes back to the trigger when it closes.
- Groups are `role="group"` named by their heading.
- The hint or error is linked with `aria-describedby`; the message line is
  `aria-live="polite"`.
- `TextMorph` keeps the real label in a visually hidden copy, so the value
  is read as a word, not as letters.

## Before / after

Before: a native select stretched to the column width, with an arrow
drawn by a pseudo-element that doesn't flip and a value that jumps.

```tsx
<select className="select" value={seating} onChange={(e) => setSeating(e.target.value)}>
  <option value="assigned">Assigned seats</option>
  <option value="open">Open seating</option>
</select>
```

After:

```tsx
<Select label="Seating" options={SEATING} value={seating} onValueChange={setSeating} />
```
