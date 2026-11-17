# Inline edit

Text that turns into an input where it stands, for renaming: a page title,
a list item, a field name. The input is laid over the text in exactly the
same type, at exactly the same place, and grows with what's typed, so not a
letter moves between reading and editing. Click it, or focus it and press
Enter or F2. Enter saves, Escape puts the text back, and leaving the field
saves too. Empty or invalid text keeps you editing with a message that
floats under the box, so nothing on the page shifts. A save that returns a
promise holds the editor in a saving state until it settles.

```tsx
<InlineEdit
  as="h1"
  className={styles.title}
  label="Event name"
  value={name}
  onCommit={async (next) => {
    await renameEvent(id, next);
    setName(next);
  }}
/>
```

## When to use it

- Renaming something on the page it belongs to: a document title, a
  project, a column, a playlist.
- Short single values in a list or table that people change now and then.

## When not to

- Several fields edited together, or anything that needs a Save step: use
  a form with text fields.
- Long text: it wraps, but it's one paragraph with no line breaks. Use a
  textarea.
- Text people mostly read and rarely change, where a click is more likely
  to be a misclick. Put an Edit button beside it instead.

## Props

| Prop | What it does |
|---|---|
| `label` | What the text is ("Event name"). Names the input while editing |
| `value`, `defaultValue` | Controlled or uncontrolled. Controlled: update it in `onCommit`, before any promise it returns settles |
| `onCommit` | Called with the new text, trimmed, when it changed. Return a promise to show the saving state; a rejection keeps editing and shows its message (an `Error`'s `message`, or a string) |
| `onCancel` | Called when Escape puts the text back |
| `validate` | Return a message that says how to fix the text, or null. Empty text is refused with "Enter a name" unless `validate` returns its own message for it |
| `as` | The text element: `span` (default), `strong`, `p`, `div`, `h1`–`h6` |
| `verb` | The control's name is the verb and the text: "Rename Saturday supper" |
| `placeholder` | Shown when the text is empty |
| `maxLength` | Passed to the input |
| `disabled` | Plain text, no control |

**Type comes from where it sits.** The component sets no font. The text and
the input both inherit everything (family, size, weight, line height,
tracking, wrapping) from the root, so put the look on `className` or on the
parent. `as="h1"` only changes the element; its browser margins and sizes
are reset.

## States

| State | What you see | How |
|---|---|---|
| Rest | The text, as it would be anyway | |
| Hover | A faint fill behind the text, 8px past it on each side, 4px above and below | `@media (hover: hover)` |
| Press | The fill a step stronger, at once | `:active` |
| Focus | A line just inside the fill's edge | `:focus-visible` |
| Editing | The same text on the surface color, inside a 1px focus edge, caret where you clicked; from the keyboard, all the text selected | `data-editing` |
| Emptied | The box keeps the width of the placeholder, or of the text it started from, instead of collapsing | |
| Invalid | The edge eases to danger; the message floats under the box with an alert icon. Typing a fix clears it at once | `aria-invalid`, `aria-describedby` |
| Saving | After 300ms the text dims and a light band passes across it; the edge stays solid; typing is paused | `aria-busy`, `readOnly` |
| Save failed | Back to editing, with the message from the rejection | |
| Disabled | Plain text, no fill, not focusable | `disabled` |

**When it saves.** Enter, or leaving the field. Unchanged text closes the
editor without calling `onCommit`. Text that fails `validate` (or is empty)
never saves: the editor stays open with the message, even after a blur.

## Layout

The box is the text plus 8px on the sides and 4px above and below, given
back as negative margin, so in a line of text, a list row or under a page
heading the letters sit exactly where plain text would. Leave that much
room around it if a neighbour is closer. The input is laid over the text
in the same box, and the text stays underneath, unseen, holding the size:
as you type, the box grows with the text, then wraps at the container's
width, line for line as the text would. Measured in Chromium: the root's
box and every glyph are pixel-identical in view and edit, for a 38px title
and 15px body text. On touch screens text under 16px is set at 16px in
both states, so iOS doesn't zoom and the two still match. The hit area is
at least 40px tall on touch.

## Motion

| What | Duration | Easing |
|---|---|---|
| Hover fill | `--ui-dur-instant` | `--ui-ease-color` |
| Press fill | `--ui-dur-press` | `--ui-ease-color` |
| Editing: edge and surface | 0ms, like any focus | n/a |
| Edge to danger | `--ui-dur-fast` | `--ui-ease-color` |
| Error arrives, leaves | `--ui-dur-fast`, `--ui-dur-instant` | `--ui-ease-enter`, `--ui-ease-exit` |
| Saving dims, after 300ms | `--ui-dur-base` | `--ui-ease-color` |
| Saving band | `--ui-dur-sweep`, repeating | `linear` |

Nothing moves: switching to editing changes color and edge only, because
the text is already where the input puts it. Under
`prefers-reduced-motion: reduce` the saving text dims and holds still, and a
replaced error swaps without fading.

## Accessibility

- At rest it's a `<button>` laid over the text, named "Rename Saturday
  supper", so it says what it does and to what. The text stays in its own
  element, so a heading keeps its own name ("Saturday supper") in the
  headings list.
- Enter, Space and F2 start editing with the whole text selected. A click
  puts the caret where it landed.
- The input is labelled with `label`. Enter saves; Escape cancels and is
  stopped there, so a dialog around it stays open.
- After Enter or Escape, focus goes back to the text's button. After a save
  by clicking elsewhere, focus stays where the click put it.
- Errors are linked with `aria-describedby` and announced through a polite
  live region. Saving sets `aria-busy`.

## Before / after

Before: the heading is swapped for an input with its own font, padding and
border, so the title jumps, shrinks and changes width, and Escape does
nothing.

```tsx
{editing ? (
  <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={save} />
) : (
  <h1 onClick={() => setEditing(true)}>{name}</h1>
)}
```

After: the same title, in place, with a name, a keyboard path and a saving
state.

```tsx
<InlineEdit
  as="h1"
  className={styles.title}
  label="Event name"
  value={name}
  validate={(v) => (v.length > 40 ? "Keep it under 40 characters, so it fits the invitation" : null)}
  onCommit={async (next) => {
    await renameEvent(id, next);
    setName(next);
  }}
/>
```
