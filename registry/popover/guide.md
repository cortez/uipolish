# Popover

A panel that opens next to the button that opened it. It is portalled above
the page, flips and shifts to stay on screen, and closes on Escape or a press
outside. It either moves focus into itself, for small forms, or leaves focus
on the trigger, for explanations. Either way, focus comes back to the trigger
when it closes.

The behavior is built on Base UI's `<Popover>`: it handles focus, dismissal,
positioning and the open and close lifecycle.

## When to use it

- A small edit in place: change a deposit, rename a course, set an RSVP
  date. One to three fields and a Save button.
- An explanation the user asked for by pressing an info button: what a fee
  is, how a total was calculated.
- Content with links or buttons that a tooltip can't hold.

## When not to

- A list of actions: use a dropdown menu, which has the right roles and
  arrow-key navigation.
- Anything that needs the user's full attention or blocks the page until
  answered, like confirming a delete: use a dialog.
- A hint on hover: use a tooltip.
- Long forms. If it scrolls, it's a dialog or a page.

## Focus

| `focus` | Where focus goes on open | Panel role | Use for |
|---|---|---|---|
| `"content"` (default) | The first `[autofocus]` element, or else the first focusable element | `role="dialog"`, named by `label` or `labelledBy` | forms |
| `"none"` | Stays on the trigger | none; the trigger is a disclosure button | explanations |

On close by Escape, Cancel, Save or a press outside on nothing focusable,
focus goes back to the trigger. A press on another control leaves focus
there. Tabbing past the last element closes the panel and moves focus to
whatever follows the trigger. The panel is portalled, but focus guards keep
Tab and Shift+Tab moving between it and the trigger as if it sat right after
the trigger. Focus is not trapped: this is a non-modal panel.

## States

| State | What you see | How |
|---|---|---|
| Closed | Trigger only; `aria-expanded="false"` | |
| Open | Panel 8px from the trigger (12px with the arrow), on the side you chose | press on the trigger, Enter or Space |
| Flipped / shifted | Opens on the other side, or slides along the edge, 8px inside the viewport | Base UI `Positioner` |
| Arrow | A 16×8 notch pointing at the trigger's center, in the panel's own border | `arrow` |
| Pressed again | Closes; doesn't flash closed and open | |

The panel's edge is the one in `--ui-shadow-floating`: the same outline color as fields (`--ui-border-strong`), drawn once. Don't add a ring of your own on top; two rings read as a darker edge.

## Motion

| What | Duration | Easing |
|---|---|---|
| Open: fade, unblur and scale 0.97 → 1 from the side facing the trigger | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Close: fade and scale back | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |

The panel also unblurs from 2px as it opens. The scale grows from Base UI's
`--transform-origin`, so a panel opening below a right-aligned button grows
down and out of that button. The positioner holds the position and is never
scaled; the panel inside it animates between `[data-starting-style]` and
`[data-ending-style]`, and Base UI keeps it mounted until the exit finishes.
Under `prefers-reduced-motion: reduce` it appears and disappears at once.

## Accessibility

- The trigger gets `aria-expanded` and `aria-controls`. With
  `focus="content"` it also gets `aria-haspopup="dialog"`, and the button's
  press-scale is skipped, so the panel doesn't open from a shrunken anchor.
- A panel that takes focus is `role="dialog"` and needs a name: pass
  `labelledBy` with the id of its heading, or `label`.
- Escape closes it, whether focus is inside the panel or on the trigger.
- The panel is portalled into the nearest `[data-theme]` ancestor of the
  trigger, so it picks up that section's tokens; otherwise into `body`.
- Field errors inside follow the text field's own rules: shown on blur or
  submit, read out through its live message slot.
- After a save that closes the panel, report the result in a
  `role="status"` region ("Deposit updated to $3,000.00"), since the panel
  that showed the field is gone.

## Before / after

Before: an absolutely positioned `div` inside the row. It's clipped by the
card's `overflow: hidden`, needs a `z-index` to clear the next row, ignores
the viewport edge, and leaves focus on `<body>` when it closes.

```tsx
{editing && (
  <div className="absolute right-0 top-full z-50">
    <input value={deposit} onChange={...} />
    <button onClick={() => setEditing(false)}>Save</button>
  </div>
)}
```

After: above the page, flips near the edge, focus goes into the field and
back to Edit when it closes.

```tsx
<Popover
  labelledBy="deposit-title"
  align="end"
  trigger={<Button variant="secondary">Edit</Button>}
>
  {({ close }) => (
    <form onSubmit={save}>
      <h3 id="deposit-title">Edit deposit</h3>
      <TextField label="Amount" inputMode="decimal" defaultValue="2,500" />
      <Button variant="ghost" onClick={close}>Cancel</Button>
      <Button type="submit">Save deposit</Button>
    </form>
  )}
</Popover>
```

An explanation keeps focus on the info button:

```tsx
<Popover
  focus="none"
  side="top"
  arrow
  trigger={
    <Button variant="ghost" size="sm" aria-label="About the card processing fee">
      <InfoIcon />
    </Button>
  }
>
  <strong>2.9% of the total</strong>
  <p>Charged by the card network when a guest pays by card.</p>
</Popover>
```
