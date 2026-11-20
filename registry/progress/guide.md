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
| `valueText` | End of the label line, muted. Defaults to the percentage, its digits tabular, in a box as wide as "100%" so it never moves anything; `false` hides it |
| `tone` | `warning` near a limit (say from 80% of a quota); `danger` once the work failed, where the bar stays where it stopped, or once the limit is hit |
| `steps`, `current` (steps) | Step names, and the index in progress; `steps.length` when done |

## Look

The label and the value share one 12px line: a long label wraps, the
value sits at the end in the muted color and never wraps. The track is 4px
in `--ui-fill-strong`; the fill is the text color, `--ui-warning` near a
limit and `--ui-danger` once the work has failed. No accent.

## Motion

| What | How |
|---|---|
| Fill moves to a new amount | A full-width bar slid back by what's left (its round end stays round), `--ui-dur-glide` on `--ui-ease-glide`: held by the track, it lands on the amount without passing it. Updates mid-way retarget smoothly |
| Unknown turns known | The fill glides in from the start of the track to the amount, `--ui-dur-glide` on `--ui-ease-glide`, instead of cutting from wherever the sweep was |
| Unknown amount | A short pill of the fill slides across the track at constant speed (`linear`) and starts again off the other side. The track never moves |
| A step finishes | Its segment fills from its start edge with `clip-path`, `--ui-dur-base` on `--ui-ease-draw`; going back un-fills a step faster |
| The step in progress | Its track darkens, and lightens again as it's left, `--ui-dur-instant` on `--ui-ease-color` |
| Percentage, step count and step name | `TextMorph`: digits that change roll (up as the work advances), on `--ui-ease-glide`; at most five changes a second, the last always lands |

Under `prefers-reduced-motion` the fill jumps, figures swap at once, and an unknown amount is a
steady half-strength track. RTL fills from the right.

## Accessibility

Built on Base UI's `<Progress>`: the root is `role="progressbar"`, named
by the label, with `aria-valuenow`, `min`, `max` and `aria-valuetext`.
Unknown amounts omit `aria-valuenow`, set `aria-busy` and read as
"indeterminate progress". Steps read as "Step 2 of 4: Menu". Announce completion
yourself in a status region if it matters; a bar changing isn't an
announcement.
