# Dialog

A modal built on Base UI's `Dialog` (and `AlertDialog` for confirms), which
traps focus, makes the page behind it inert, locks scroll and handles Escape
and outside presses. The panel grows out
of the button that opened it and shrinks back into it on close. Focus goes to
the first field, then back to the trigger. The panel eases to its content's
size whenever it changes (a new step, a section opening, an error), and
steps crossfade in place. If the form has unsaved edits,
Escape, the backdrop and the close button ask "Discard changes?" inside the
dialog instead of throwing the edits away.

The file exports three things:

- `Dialog`: title, description, a scrolling body, a footer, and the
  unsaved-changes guard.
- `ConfirmDialog`: one question with a safe default and a button that says
  the verb.
- `Modal`: the bare behavior (open, animate, lock scroll, return focus) with no
  layout. The command palette is built on it. It portals to `<body>`, or into
  the nearest `[data-theme]` element around the trigger so a themed subtree
  keeps its tokens.

## When to use it

- Editing something in place without leaving the page: a course on the
  menu, a guest's address, dietary notes.
- Confirming something that can't be undone: cancelling a dinner, deleting
  a menu.
- Any task short enough to finish in one sitting that needs the page to wait.

## When not to

- Something the user should be able to read while working on the page behind
  it: use a popover or a side panel.
- Messages that need no answer ("Invitations sent"): use a toast.
- Long flows: give them a page. Two or three short steps fit a dialog;
  more is a page that can't be bookmarked.
- Confirming things that can be undone. Do it, then offer Undo in a toast.
- On top of another dialog or a drawer, except a short confirm (discard,
  delete). Two panels stacked read as a maze, and on a phone, where both
  fill the screen, as being stuck. Change what the open one shows instead,
  with a Back button, or close it first.

## States

| State | What you see | How |
|---|---|---|
| Opening | Panel fades in, grows from 0.97 toward the trigger's center and clears a 2px blur; backdrop fades in | `transform-origin` set from the trigger's rect relative to the centered panel; `[data-starting-style]` |
| On a phone | Docked at the bottom, 8px off the edges and above the home indicator, in reach of a thumb; it rises from its bottom edge and grows upward when its content does | `max-width: 480px` |
| Open | Panel on a dimmed page; page doesn't scroll | Base UI's modal `Dialog.Root`, which locks scroll |
| Body overflow | Body scrolls on its own; header and footer stay put | `overflow-y: auto; overscroll-behavior: contain` |
| Content changes size | The panel eases to the new height; it stays centered, so it grows evenly up and down | `AnimatedSize` around the panel's layout |
| Step changes | The old step fades out over the top while the new one fades in, half a beat later, and the panel eases to the new step's height | `step`, with `children` as a function of the step |
| Size changes | The panel eases to the new width | `size` (`sm` 420, `md` 480, `lg` 640) |
| Guard | Footer swaps for "Discard changes?" with Keep editing / Discard; body and header dim and go inert; focus on Keep editing | `dirty` is true when the user tries to leave |
| Locked | Escape, backdrop and close do nothing | `locked`, e.g. while saving |
| Confirm busy | Confirm button's label dims and shimmers, keeps its width; Cancel disabled | `onConfirm` returns a promise |
| Confirm failed | Error message in danger text beside the buttons; dialog stays open | the promise rejects; its message is shown |
| Closing | Panel fades, blurs and shrinks toward the trigger; backdrop fades; then it unmounts | `[data-ending-style]`; Base UI waits for the transition before unmounting |

**The guard.** Pass `dirty` as a boolean or a function. It's read the moment
the user tries to leave, not on every render. Escape on the guard means "Keep
editing" and puts focus back in the field the user was in. Saving or
cancelling with your own buttons calls `onOpenChange(false)` directly and
never hits the guard: it only catches the ways out the user might take by
accident.

**Steps.** Pass `step` and give `children` as a function of it:

```tsx
<Dialog open={open} onOpenChange={setOpen} title="Host a dinner" step={step} footer={…}>
  {(s) => (s === 1 ? <WhenAndWhere /> : s === 2 ? <Guests /> : <Review />)}
</Dialog>
```

The function lets the leaving step be drawn with current values while it
fades. It's lifted out of the flow, so the panel measures only the arriving
step and eases straight to its size. If focus was inside the step that left
(Enter in a field), it moves to the first control of the new step. Keep the
title the same across steps and put the step's own name in its body; say
"Step 2 of 3" in the footer in an `aria-live="polite"` element. Keep `size`
the same across steps: a width and a height change at once make the
height snap (`AnimatedSize` applies content reflow from a width change
instantly).

**Confirm dialogs.** Name the thing ("Cancel the dinner at 14 Alder Lane?"),
say what goes with it, and make the confirm button the verb ("Cancel
dinner"), never "OK" or "Yes". The safe action ("Keep dinner") has focus
when it opens, so a reflexive Enter does nothing harmful.

## Layout

- **Header.** The title is the Heading step (22/28, semibold, tracked
  `--ui-tracking-heading`), the description Body in muted, 4px under it.
  The top padding is a step short of the sides (28 against 32), since the
  title's line height already puts air above its capitals.
- **Body.** The sides' padding, 32px (24px on phones), and scrolls on its
  own when tall.
- **Footer.** A hairline above it. Buttons are the 40px control size and sit
  16px from the panel's edges, concentric with its corner: the radius is
  16px plus half a button. Text in the footer (a step count, an error, the
  guard's question) lines up with the content's edge instead. On phones the
  actions share the row in halves while both labels fit and stack full
  width, main action last, when one doesn't.
- **Phones.** Docked at the bottom, 8px off the edges. For a panel that
  swipes away, use the drawer.

The dialog's edge is the one in `--ui-shadow-floating`: the same outline color as the fields inside it (`--ui-border-strong`), drawn once, outside the box. No inset ring as well; the two together drew a 2px edge.

## Motion

| What | Duration | Easing |
|---|---|---|
| Panel opacity in | `--ui-dur-fast` | `--ui-ease-enter` |
| Panel scale in, 0.97 → 1 from the trigger, and blur 2px → 0 | `--ui-dur-base` | `--ui-ease-enter` |
| Backdrop in | `--ui-dur-fast` | `--ui-ease-enter` |
| Panel and backdrop out (scale to 0.97, blur to 2px) | `--ui-dur-instant` | `--ui-ease-exit` |
| Footer out when the guard appears | `--ui-dur-instant` | `--ui-ease-color` |
| Guard in, in the footer's place, 75ms after | `--ui-dur-fast` | `--ui-ease-enter` |
| Body and header dim behind the guard | `--ui-dur-fast` | `--ui-ease-color` |
| Close button press release (it's a `Button`) | `--ui-dur-snap` | `--ui-ease-snap` |
| Panel height to new content (open / close) | `--ui-dur-panel` / `--ui-dur-base` | `--ui-ease-expand` |
| Panel width to a new `size` | `--ui-dur-panel` | `--ui-ease-expand` |
| Leaving step fades | `--ui-dur-instant` | `--ui-ease-color` |
| Arriving step fades in, half a beat later | `--ui-dur-fast` | `--ui-ease-enter` |

The panel arrives like a popover, at a block's size: it fades, scales up
from 0.97 and comes into focus from a 2px blur, all on the enter curve.
Nothing travels, so nothing springs; the only springs are the ones that
size it to new content. Opacity finishes first, so the panel is solid
before it's settled. Under `prefers-reduced-motion: reduce` there is no
scale or blur (the panel and backdrop fade in `--ui-dur-instant`), sizes
change at once and steps swap without fading. The backdrop is a plain dim
in `--ui-scrim`, never blurred.

Panel and backdrop are CSS transitions on Base UI's `[data-starting-style]`
and `[data-ending-style]`. The panel's `transform-origin` is set when it
mounts, measured against its centered spot in the fixed viewport.

## Scroll lock

Base UI locks page scroll while the dialog is open and restores it on close,
counting nested modals so a palette that opens a dialog doesn't unlock early.
It avoids a sideways jump most reliably when the page reserves the
scrollbar's space:

```css
html { scrollbar-gutter: stable; }
```

Without it, the page gets wider by the scrollbar's width when the dialog
opens and everything behind it shifts. Put that rule in your global CSS.

## Accessibility

- Base UI's modal Dialog: focus is trapped and the rest of the page is inert,
  so Tab can't reach it and screen readers don't read it.
- `aria-labelledby` points at the title and `aria-describedby` at the
  description. Confirm dialogs use `role="alertdialog"`.
- Focus on open: `initialFocus` if given, otherwise the first field or button
  in the body, otherwise the first footer button. Never the close button.
- Focus on close: back to the trigger. If the trigger is gone (the row was
  deleted), to `finalFocus`.
- Escape and outside presses come through Base UI's `onOpenChange`. The
  dialog is controlled, so each one calls your dismiss path and the guard
  can keep it open as many times as it needs. A select or popover open
  inside the dialog takes Escape first and closes on its own.
- Confirm dialogs use `AlertDialog`: Escape cancels, but a press on the
  backdrop doesn't, so a stray tap can't answer the question.
- The guard is a labelled group; focus moves to Keep editing, so the
  question is read out with it.
- The close button is the ghost icon `Button`, a capsule like every other
  icon button: 32px tall, 40px on touch screens, with `aria-label="Close"`.
  It's centered on the title's first line, with its X on the content's edge,
  so it lines up with the text at any padding.

## Before / after

Before: a `div` overlay with a click handler. Tab walks out into the page
behind it, the page scrolls under it, focus is lost on close, and Escape
throws away a half-finished edit.

```tsx
{open && (
  <div className="overlay" onClick={() => setOpen(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h2>Edit course</h2>
      <form>…</form>
    </div>
  </div>
)}
```

After: a real modal, grows from the Edit button, focus in the first field,
and leaving with edits asks first.

```tsx
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Edit course"
  description="Changes show on the menu your guests see."
  dirty={draft.name !== course.name || draft.servings !== course.servings}
  footer={
    <DialogActions>
      <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      <Button type="submit" form="course" busy={saving}>Save course</Button>
    </DialogActions>
  }
>
  <form id="course" onSubmit={save}>
    <TextField label="Name" value={draft.name} onChange={…} />
  </form>
</Dialog>
```

Before: a confirm that says "Are you sure?" with OK focused.

```tsx
if (window.confirm("Are you sure?")) cancelDinner();
```

After: specific, the safe action focused, the danger button says the verb, and
a failed delete keeps the dialog open with the reason.

```tsx
<ConfirmDialog
  open={confirming}
  onOpenChange={setConfirming}
  title="Cancel the dinner at 14 Alder Lane?"
  description="All 8 guests are told it’s off, and their RSVPs and the seating plan are removed. This can’t be undone."
  confirmLabel="Cancel dinner"
  cancelLabel="Keep dinner"
  onConfirm={() => api.cancelDinner("dinner-0412")}
/>
```
