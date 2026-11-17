# Button

A pill-shaped button. Hover changes color only. Press goes down in 80ms and springs
back. A busy state keeps the button's width, and string labels morph in place
when they change (Copy → Copied).

## When to use it

- Any action on the current page: submit, save, copy, open a dialog.
- `primary` for the one main action in a view. `secondary` for the rest.
  `ghost` in toolbars and dense rows. `danger` only for the button that
  confirms a destructive action, never for the button that opens the
  confirmation.

## When not to

- Navigation to another page: use a link (`<a>`), styled like a button if you
  must. A button that navigates breaks middle-click and "open in new tab".
- More than one `primary` in the same view. If two actions compete, one of
  them is secondary.
- Toggles that stay on or off: use a switch or a pressed toggle
  (`aria-pressed`) so the state is announced.

## States

| State | What you see | How |
|---|---|---|
| Rest | Fill, and an even hairline on secondary | `data-variant` |
| Hover | Background one step toward the text color, 150ms | `@media (hover: hover)` only, so taps don't stick |
| Press | Darker step and `scale: var(--ui-scale-press)` (0.985) with no transition; release springs back over 300ms | `:active`, skipped on `[aria-haspopup]` |
| Focus | 2px ring, 2px offset, appears instantly | `:focus-visible` |
| Busy | Presses are ignored at once. If the work is still running after 300ms, the label dims to 40% and a light band passes across it, left to right, and `busyLabel` (if given) morphs in; once shown it stays at least 400ms. No spinner. | `busy` prop → `aria-busy`, `aria-disabled` at once; `data-busy-shown` and the `mask-image` gradient after the delay (`useDelayedBusy`) |
| Disabled | 50% opacity, default cursor, no hover or press | native `disabled` |
| Label change | Shared letters slide, leaving letters fade out, new letters fade in, width follows | string children use `TextMorph` |

**Fast work shows nothing.** Most saves answer in well under 300ms, and a
"Saving…" that flashes for 80ms reads as a glitch, not feedback. So `busy`
takes effect at once (no double submits) but only shows past 300ms, and
then holds for 400ms so it never flickers off. Pass the in-progress wording
as `busyLabel` instead of swapping the children yourself, so the timing
applies to it too:

```tsx
<Button busy={saving} busyLabel="Saving…" onClick={save}>Save changes</Button>

// The one action of a narrow form or a sheet: the full width.
<Button block onClick={signIn}>Continue with email</Button>
```

The same timing is exported as `useDelayedBusy(busy)` for busy text outside a
button.

**Icon buttons are capsules.** A button whose only child is one element
(an icon) and that has an `aria-label` is drawn 1.375 times as wide as it is
tall (`--ui-capsule`), not as a circle, so every button shares one shape. A
button with an icon and text is an ordinary button.

**Busy vs disabled.** Busy means "working on it": the button keeps focus,
stays in the tab order and ignores presses. Disabled means "you can't do this
yet", and it is a last resort. If you disable a button, put the reason on the
page, not in a tooltip.

## Motion

| What | Duration | Easing |
|---|---|---|
| Color on hover and release | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Press in | 0ms | n/a |
| Press release (scale) | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Label dims for busy, once shown (after 300ms of work) | `--ui-dur-base` (200ms); back in `--ui-dur-fast` (160ms) | `--ui-ease-color` |
| Light band across the busy label | `--ui-dur-sweep` (2.4s) per sweep | `linear` |
| Text morph | `--ui-dur-move` (380ms), letters out in 150ms | `--ui-ease-move` |

Under `prefers-reduced-motion: reduce` the press doesn't scale, the label
swaps without morphing, and a busy label dims to 50% and holds still.

## Layout

Every button is the default size, `md` (40px): page and card actions, row
actions in a list, dialog footers, banners, empty states, form submits and
demo toolbars. Leave `size` off.

`size="sm"` (32px) is only for a button inside another control or a compact
control strip, where 40px would break the control: Copy and Wrap in a code
block's header, send or attach inside a prompt input, the copy button in a
command field, an icon button in a dense toolbar or a row's overflow menu.
When in doubt, use the default. `tests/button-size.test.mjs` lists every
small button in this repo with its reason.

A ghost button that lines up with the text beside it pulls back by its 20px
padding (`margin-inline-start: -20px`).

On touch screens a small button's hit area grows to 40px tall (4px above and
below its 32px shape), so it is as easy to press as the medium size without
changing the row it sits in.

## Accessibility

- Always a real `<button>`, `type="button"` by default so it doesn't submit
  forms by accident. Pass `type="submit"` when it should.
- Busy sets `aria-busy` and `aria-disabled` instead of `disabled`, so focus
  doesn't drop to `<body>` mid-save.
- An icon-only button needs `aria-label`.
- When the label changes to report a result (Copied, Saved), also put that
  word in a `role="status"` region so screen readers hear it. The morph
  itself is `aria-hidden`; the accessible name is the current label.

## Before / after

Before: the label swaps to a spinner, the button collapses to the
spinner's width and pushes everything beside it, and the user loses the
word that said what is happening.

```tsx
<button onClick={save} disabled={saving}>
  {saving ? <Spinner /> : "Save changes"}
</button>
```

After: same width, focus kept, presses ignored while saving.

```tsx
<Button onClick={save} busy={saving}>Save changes</Button>
```

Before: a copy button whose label snaps from "Copy" to "Copied" and jumps
wider.

```tsx
<button onClick={copy}>{copied ? "Copied" : "Copy"}</button>
```

After: "Cop" stays put, "y" blurs out, "ied" blurs in, and the pill grows into
the new word. Screen readers hear "Copied" from the status region.

```tsx
<Button variant="secondary" onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
<span role="status" className="sr-only">{copied ? "Copied" : ""}</span>
```
