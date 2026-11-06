# Search field

A search input with a magnifier at the start and a clear button at the end.
The clear button fades in when there's text, over room the input already
keeps for it, so the text never moves. Escape clears the field and stays in
it; a second Escape leaves. The browser's own clear button is switched off,
so there's only ever one. An optional shortcut key ("/") shows while
the field is empty and unfocused, and the field can take that shortcut from
anywhere on the page. While results load, the magnifier breathes in place.

```tsx
<SearchField
  label="Search guests"
  placeholder="Search guests"
  shortcut="/"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
/>
```

## When to use it

- Filtering a list, table or menu on the page as you type.
- A site or app search in a toolbar or header, with a shortcut to reach it.
- Searching a server, where results take a moment: pass `loading`.

## When not to

- Picking one value from a known list for a form: use a combobox or select.
- Running commands or jumping anywhere in the app: use a command palette.
- Any other text a form collects: use a text field, which has a visible
  label, a hint and validation.

## Props

Every `<input>` prop passes through (`value`, `defaultValue`, `onChange`,
`placeholder`, `name`, `disabled`, `autoFocus`), except `type`, which is
always `search`.

| Prop | What it does |
|---|---|
| `label` | The field's name for screen readers. Hidden unless `showLabel` is set |
| `showLabel` | Show the label above the field, as in a form |
| `shortcut` | A single key, such as `"/"`. Pressing it anywhere but in another field focuses this one and selects what's in it; its label shows at the end while the field is empty and something else has focus. Set as `aria-keyshortcuts`. For ⌘K, use the command palette |
| `loading` | Results are on their way: after 300ms the magnifier breathes |
| `onClear` | Called after the clear button or Escape empties the field, after `onChange` |

Clearing goes through the input like typing does, so `onChange` fires with
an empty value whether the field is controlled or not.

## States

| State | What you see | How |
|---|---|---|
| Empty | Magnifier, placeholder, and the key label if there is one | |
| Hover | Edge one step darker | `@media (hover: hover)` |
| Focus | Edge darkens and thickens to 1px at once; the key label fades out | `:focus-within` on the shell |
| Has text | The clear button fades in at the end | `data-filled` |
| Loading | After 300ms, the magnifier breathes between full and 30% | `loading`, `aria-busy` on the input |
| Disabled | 50% opacity; no clear button, no key label, the shortcut is off | native `disabled` |

**A bare key only works outside fields.** A shortcut with no modifier, like
"/", is ignored while the user is typing in another field (or in this
one), so it can still be typed. One with Control, Meta or Alt works from
anywhere. Shift only counts when the combination names it or the key is a
letter, since "/" needs Shift on some layouts.

**Escape.** The first Escape clears the text and keeps focus; it's stopped
there, so a dialog around the field doesn't close too. With the field
already empty, Escape leaves the field and carries on to whatever else
listens for it.

## Layout

The field fills its container's width and is 48px tall, like every field.
The magnifier and the clear button each sit in a 34px slot, 7px in from the
edge, so their marks sit the same distance from either end; the text starts
9px after the magnifier. The clear button and the key label share one cell
at the end, as wide as the wider of the two, so the text never makes room
for either. The clear button grows to a 40px hit area on touch; the key
label is hidden on touch screens, which have no key to press. A press on
the magnifier or the shell's padding puts the caret in the text.

## Motion

| What | Duration | Easing |
|---|---|---|
| Edge on hover, and back from focus | `--ui-dur-instant` | `--ui-ease-color` |
| Edge on focus | 0ms, never animated | n/a |
| Clear button fades in | `--ui-dur-fast` | `--ui-ease-enter` |
| Clear button fades out, then hides | `--ui-dur-instant` | `--ui-ease-exit` |
| Key label fades in, out | `--ui-dur-fast`, `--ui-dur-instant` | `--ui-ease-color` |
| Magnifier breathes, after 300ms | `--ui-dur-pulse` each way, alternating | `--ui-ease-pulse` |

Nothing moves: the clear button and key label only fade, in space the
field already holds. Loading never turns anything; the magnifier fades in
and out where it is. Under `prefers-reduced-motion: reduce` it fades three
times slower, so it still says the field is working.

## Accessibility

- A native `<input type="search">`, so its role is `searchbox` with no
  extra attribute. Put the field inside a `<search>` element or a form with
  `role="search"` when it searches the page or site.
- The label is a real `<label for>`, visually hidden by default. Placeholder
  text is not a name.
- The clear button is named "Clear search" and sits in the tab order after
  the input while there's text. A pointer press doesn't take focus from the
  input, and after a clear by any means the caret is back in the input.
- The key label is `aria-hidden`; the bound shortcut is announced through
  `aria-keyshortcuts` instead.
- Announce result counts yourself, in a `role="status"` region near the
  results: "2 of 6 guests".
- The input is 16px on touch devices so iOS doesn't zoom.

## Before / after

Before: a text input with an icon drawn over it, the browser's own clear
button in WebKit next to a custom one, and a clear button that only renders
with text, so the text jumps left when it appears.

```tsx
<div className="search">
  <SearchIcon />
  <input type="search" value={q} onChange={(e) => setQ(e.target.value)} />
  {q && <button onClick={() => setQ("")}>×</button>}
</div>
```

After: one clear button, no jump, Escape to clear, and a shortcut to get
there.

```tsx
<SearchField
  label="Search guests"
  placeholder="Search guests"
  shortcut="/"
  value={q}
  onChange={(e) => setQ(e.target.value)}
/>
```
