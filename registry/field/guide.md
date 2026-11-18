# Field

The shared parts of the form fields that hold more than one input:
combobox, date picker, number input, phone input and radio group use it.
It has no look of its own beyond what those fields share.

- `FieldMessage`: the line under a field. Hint and error share one grid
  cell and crossfade, so an error appearing moves nothing. The line is
  reserved whenever the field renders it.
- `field.module.css`, composed into a component's classes:
  - `field`, `label`: the stack and its label (6px apart, label 15px / 500).
  - `shell`: the edge of a field that holds buttons or a picker. Hover
    darkens it a step; focus anywhere inside darkens and thickens it,
    inside the field and never animated; `data-invalid` turns it to
    danger, `data-open` holds the focus edge while a popover is open.
    Sets `--shell-inset`, the gap from the edge to a 34px button.
  - `bare`: a text input with no edge, for inside a shell. 16px on touch
    screens so iOS doesn't zoom.
  - `inset`: a 34px icon button for inside a field, panel or banner. The
    fill is a layer under the icon, so a press shrinks only the fill
    (0.97). 40px hit area on touch screens. Set its radius to the outer
    radius less the inset.

```tsx
<div className={styles.field}>
  <label className={styles.label} htmlFor={id}>Guests</label>
  <div className={styles.shell} data-invalid={error ? "" : undefined}>…</div>
  <FieldMessage id={`${id}-message`} hint="The table seats 12." error={error} />
</div>
```

Link the message with `aria-describedby` only while it has text.

## Layout

A field is one column as wide as its container: the input narrows with it
rather than holding its default width of about 20 characters.
