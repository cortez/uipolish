# Field

The shared parts of the form fields that hold more than one input:
combobox, date picker, number input, phone input and radio group use it.
It has no look of its own beyond what those fields share.

- `FieldMessage`: the line under a field. Hint and error share one grid
  cell and crossfade, so an error appearing moves nothing. The line is
  reserved whenever the field renders it; set `--field-message-lines` on
  the field to reserve more when a longer error can arrive. Text field and
  select use it too.
- `field.module.css`, composed into a component's classes:
  - `field`, `label`: the stack and its label (8px apart, label 14px).
  - `shell`: the edge of a field that holds buttons or a picker. Focus
    anywhere inside fills it with `--ui-field-focus-fill`, at once, and
    the edge stays as it rests; `data-open` holds the fill while a popover
    is open; `data-invalid` turns the edge to danger.
    Sets `--shell-inset`, the gap from the edge to a 32px button.
  - `bare`: a text input with no edge, for inside a shell. 16px on touch
    screens so iOS doesn't zoom.
  - `inset`: a 32px icon button for inside a field, panel or banner. The
    fill is a layer under the icon, so a press shrinks only the fill
    (`--ui-scale-press`). 40px hit area on touch screens. Set its radius to the outer
    radius less the inset.

```tsx
<div className={styles.field}>
  <label className={styles.label} htmlFor={id}>Guests</label>
  <div className={styles.shell} data-invalid={error ? "" : undefined}>…</div>
  <FieldMessage id={`${id}-message`} hint="The table seats 12." error={error} />
</div>
```

Link the message with `aria-describedby` only while it has text.


The shell is a pill (`--ui-radius-control`), the same shape as the buttons beside it; a theme that wants rounded rectangles sets the token, and every field follows.

## Layout

A field is one column as wide as its container: the input narrows with it
rather than holding its default width of about 20 characters.
