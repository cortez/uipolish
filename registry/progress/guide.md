# Progress

How much of a job is done. `Progress` is a linear bar: determinate when
you know the amount, indeterminate when you don't. `ProgressSteps` is
segmented progress through named steps. Neither ever spins.

```tsx
<Progress label="Sending invitations" value={18} max={48} />
<Progress label="Importing guests" value={null} />
<ProgressSteps label="Plan the supper" steps={["Guest list", "Menu", "Seating", "Invitations"]} current={1} />
```

## When to use it

- Work that takes more than a second or two and that the user waits on:
  uploads, sends, imports.
- A multi-step flow where knowing how far along you are helps.

## When not to

- Waits under about 300ms: show nothing. Delay mounting an indeterminate
  bar by 300ms yourself.
- Loading a page's content: a skeleton the shape of the content.
- A short wait on one button: the button's own busy state.

## Props

| Prop | What it does |
|---|---|
| `value` | 0 to `max`, or `null` for unknown |
| `max` | Defaults to 100 |
| `label` | What the work is; names the bar |
| `valueText` | End of the label line, muted. Defaults to the percentage, in tabular digits in a fixed box so it never moves anything; `false` hides it |
| `tone` | `warning` near a limit (say from 80% of a quota); `danger` once the work failed, where the bar stays where it stopped, or once the limit is hit |
| `steps`, `current` (steps) | Step names, and the index in progress; `steps.length` when done |

## Look

The label and the value share one 13px line: the label truncates, the
value sits at the end in the muted color. The track is 4px in
`--ui-fill-strong`; the fill is the text color, `--ui-danger` once the
work has failed. No accent.

## Motion

| What | How |
|---|---|
| Fill moves to a new amount | A full-width bar slid back by what's left (its round end stays round), `--ui-dur-move` on `--ui-ease-move`. Updates mid-way retarget smoothly |
| Unknown amount | A short pill of the fill slides across the track at constant speed (`linear`) and starts again off the other side. The track never moves |
| A step finishes | Its segment fills from its start edge with `clip-path`, `--ui-dur-base` on `--ui-ease-draw`; going back un-fills a step faster |
| Step name and count | `TextMorph` |

Under `prefers-reduced-motion` the fill jumps, and an unknown amount is a
steady half-strength track. RTL fills from the right.

## Accessibility

Built on Base UI's `<Progress>`: the root is `role="progressbar"`, named
by the label, with `aria-valuenow`, `min`, `max` and `aria-valuetext`.
Unknown amounts omit `aria-valuenow`, set `aria-busy` and read as
"indeterminate progress". Steps read as "Step 2 of 4: Menu". Announce completion
yourself in a status region if it matters; a bar changing isn't an
announcement.
