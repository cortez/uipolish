# Switch

Turns one setting on or off, and the change takes effect at once. It's
built on Base UI's `<Switch>`: a `role="switch"` element with a hidden
checkbox beside it, so it submits with a form, Space toggles it, and screen
readers say "on" and "off". It's the segmented control in miniature: a
sunken track with a raised capsule in it that glides across, and on, the
track takes the accent, like a checked box and a slider's range. The whole
row, label and description included, is the hit area.

```tsx
<Switch
  side="end"
  label="Late RSVPs"
  description="Email me the morning after the RSVP deadline passes."
  checked={lateRsvps}
  onChange={(e) => setLateRsvps(e.target.checked)}
/>
```

## When to use it

- A setting that applies the moment it's flipped: notifications, auto-save,
  a feature toggle.
- Lists of settings, each with a short label and a line saying what it does.

## When not to

- A choice that only applies when a form is submitted: use a checkbox.
  A switch promises the change has already happened.
- Picking one of several options: use a segmented control or radio group.
- A choice that needs confirming or takes time (deleting data, a paid
  upgrade): use a button, with a confirmation where it's destructive.

## Props

`checked`, `defaultChecked`, `name`, `value`, `disabled`, `required`
and the `aria-*` props pass through to Base UI's `Switch.Root`.
`onChange` gets the hidden checkbox's change event, so
`e.target.checked` is the new state; `onCheckedChange(checked)` works
too.

| Prop | What it does |
|---|---|
| `label` | The setting's name. It's the accessible name; the description isn't part of it |
| `description` | A second line: what happens, or why the switch is disabled |
| `side` | `start` (default) puts the switch before the text. `end` puts it at the far edge of a full-width row, as in a settings list |
| `size` | `md` (default): a 44 × 24 track with a 40px hit area, to sit beside a 40px button. `sm`: 36 × 20 with a 32px hit area, beside a 32px button |
| `busy` | The change is being saved. Presses are ignored (`readOnly`, not disabled, so focus stays), `aria-busy` is set, and once the save has lasted 300ms a dot breathes in the thumb, staying at least 400ms |

Saving a switch: flip it at once (optimistic), set `busy` while the save
runs, and flip it back with a message if the save fails.

## States

| State | What you see | How |
|---|---|---|
| Off | Sunken track (`--ui-fill-strong`, hairline `--ui-border-strong` edge, like every control at rest), raised thumb at the start | |
| On | `--ui-accent` track, `--ui-on-accent` thumb at the end | `[data-checked]` |
| Hover | Track one step darker (on: one step lighter, as a checked box) | `@media (hover: hover)`, anywhere on the row |
| Press | Track another step, in 80ms; the thumb reaches 3px toward its new side | `:active` on the row |
| Focus | A line just inside the track's edge, in a color that reads on it, instantly | `:focus-visible` |
| Busy | Presses ignored; after 300ms a 6px dot breathes in the thumb (muted off, accent on) | `busy` |
| Disabled | Switch and label at 50%; the description stays readable to say why | `disabled` |

On and off differ in position as well as color, so the state never rests on
color alone.

## Layout

The switch sits on the first line of its label, not in the middle of the
label and description together. Its center is placed on the middle of the
capital letters of that line, using the label's baseline and the `cap` unit,
so it stays put in any font, size or line height (browsers without `cap`
use `0.35em`, the system face's half cap height). Without a label (a switch
in a table row, beside a button) it's centered like any control.

| Size | Track | Thumb | Hit area |
|---|---|---|---|
| `md` | 44 × 24 | 18px tall capsule, 3px in | 40px (`--ui-control-md`) |
| `sm` | 36 × 20 | 16px tall capsule, 2px in | 32px (`--ui-control-sm`) |

The hit area is a control height, so the switch lines up with a button of
the same size beside it, and it lays nothing out: a pseudo-element past the
track's ends. Track and thumb are both full radius with the thumb inset
evenly, so their ends are concentric, and the thumb is a capsule
(`--ui-capsule` wide), the shape of every pressable thing.

**Surfaces.** The track is the segmented control's sunken track, with the
strong fill: with no labels in it, the faint one barely reads as a control.
The thumb is its raised pill: the surface, a `--ui-border-strong` hairline
and `--ui-shadow-control`. In dark mode the off thumb is a light gray
rather than the dark surface, which would read as a hole in a dark track;
on, it's `--ui-on-accent` in both themes.

## Motion

| What | Duration | Easing |
|---|---|---|
| Thumb across the track | `--ui-dur-glide` (320ms) | `--ui-ease-glide`: held by the track, it lands without passing its end |
| Press: leading edge reaches 3px | `--ui-dur-press` (80ms) | `--ui-ease-glide` |
| Track color | `--ui-dur-fast` turning on, `--ui-dur-instant` turning off; press in `--ui-dur-press` | `--ui-ease-color` |
| Busy dot | fades in over `--ui-dur-fast` on `--ui-ease-enter`, breathes `--ui-dur-pulse` each way | `--ui-ease-pulse`, alternate |

The thumb is placed by its two logical insets rather than moved as a block,
so a press can stretch it toward its new side; the release glides on from
there. The control is `contain: layout`, so the insets lay out nothing
else, and logical insets make right-to-left free. Nothing else on the row
moves. Under `prefers-reduced-motion: reduce` the thumb jumps and doesn't
reach, the busy dot holds still at 70%, and the colors still change.

## Accessibility

- A `role="switch"` element with `aria-checked` inside a `<label>`:
  clicks on the text toggle it, Space toggles it, and its state is read as
  on or off. The hidden checkbox beside it is only for the form.
- The name comes from `label` alone (`aria-labelledby`); the description is
  linked with `aria-describedby`, so it's read after the name instead of
  inside it.
- If a disabled switch has a reason, put it in `description`. It stays at
  full contrast.
- Without a visible label, pass `aria-label`.
- While `busy`, the switch carries `aria-busy` and stays focusable; Space
  and presses do nothing until the save lands.

## Before / after

Before: a `div` with a click handler. It can't be reached with Tab, Space
does nothing, a screen reader hears nothing, and the knob is centered on two
lines of text instead of the first.

```tsx
<div className="row" onClick={() => setOn(!on)}>
  <div>
    <div>Late RSVPs</div>
    <div className="muted">Email me the morning after the RSVP deadline passes.</div>
  </div>
  <div className={on ? "toggle on" : "toggle"} />
</div>
```

After:

```tsx
<Switch
  side="end"
  label="Late RSVPs"
  description="Email me the morning after the RSVP deadline passes."
  checked={on}
  onChange={(e) => setOn(e.target.checked)}
/>
```
