# Stepper

Where someone is in a flow of steps: a row (or a column) of round marks
joined by a hairline that fills toward the current step. Done steps show
the icon set's check, drawn on; the current step's mark is a ring with its
number; a step in trouble turns danger; a skipped step shows a dash. Give it
`onStepClick` and the steps behind the current one become buttons back.
In a narrow container the row becomes dots and a count ("Step 2 of 4") on
its own, with no script and no flash.

```tsx
<Stepper
  label="Booking steps"
  steps={[
    { id: "menu", title: "Menu", description: "Six courses, two swaps" },
    { id: "guests", title: "Guests", description: "12 seats, 3 allergies" },
    { id: "venue", title: "Date and venue" },
    { id: "pay", title: "Deposit" },
  ]}
  current={step}
  onStepClick={setStep}
/>
```

## When to use it

- A flow with a known number of steps that someone moves through in order:
  onboarding, a checkout, a booking, a form split into parts.
- An agent's plan, where the steps are known up front and the list shows
  how far it has got (vertical, with descriptions).
- The steps of a dialog: the compact form takes the place of a "Step 1 of
  3" line in the footer.

## When not to

- Progress you can measure but not name (an upload, an import): use
  progress.
- What an agent did, with times, inputs and outputs: use tool steps. A
  stepper is a map of a flow, not a log.
- Sections someone can visit in any order: use tabs. A stepper's order
  means something, and only steps already done can be revisited.
- One or two steps: say "Step 2 of 2" in the heading instead.

## Props

| Prop | What it does |
|---|---|
| `steps` | `{ id, title, description?, status? }[]`. `title` and `description` take any node; plain strings are also announced |
| `current` | Index of the step in progress; `steps.length` once all are done. Steps before it are `complete`, it is `current`, the rest `upcoming`. Leave it out and give each step a `status` instead |
| `steps[].status` | Overrides what `current` implies: `error` on the step that failed, `skipped` on one that was passed over. `complete`, `current` and `upcoming` work too |
| `orientation` | `horizontal` (default): a row, titles under the marks. `vertical`: a column, titles beside the marks, for longer titles and descriptions |
| `variant` | `auto` (default): a horizontal stepper turns compact when its container is under 128px a step (384px for three). `full` never does; `compact` always is |
| `onStepClick` | `(index, step) => void`. Makes the steps behind the current one buttons (marks and dots alike). Without it the stepper only shows where you are |
| `label` | The list's accessible name. Default "Steps" |
| `className` | On the root |

The `auto` form needs a width to measure: put the stepper in a block, or
give it `flex: 1` in a row.

## States

| Status | Mark | Title |
|---|---|---|
| `upcoming` | The empty control fill and edge, number in muted | Muted |
| `current` | The surface inside a hairline ring in the text color, number in text | Text, title weight |
| `complete` | Filled ink, the check drawn on in the surface color | Text |
| `error` | Filled danger with a "!" | Danger text; the description too, so put what went wrong there |
| `skipped` | The empty mark with a dash | Subtle |

The line between two marks fills once the step before it is behind the
current one. Compact shows the same: dots behind the current one in ink,
upcoming dots in the strong fill, an error dot in danger, a skipped dot as a
ring, and one pill over the current dot.

Clickable steps are the ones behind the current step. Hovering one turns its
title muted; pressing it goes down to 98.5%. The current and upcoming steps
are never buttons.

## Layout

- Horizontal: every column is equal except the last, which is only as wide
  as its title needs (at most an equal share), so the line runs to the last
  mark and nothing hangs past it. Titles wrap inside their column and never
  push the marks apart.
- The line starts and ends 8px from each mark.
- Vertical: a 24px mark column, 12px to the text, 24px between steps; the
  first line of a title sits on the mark's center.
- Compact: 20px slots for 6px dots, a 16px pill, then the count 12px
  after. The slots are 32px tall, so a dot that goes back is a 32 × 20
  target; on a touch screen its hit area grows to 40px tall.

## Motion

| What | Duration | Easing |
|---|---|---|
| The line fills toward the next step (scale from the mark it leaves), or drains back | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Going forward, the new current mark lights half a glide later, as the line arrives; going back it lights at once | `--ui-dur-instant` (120ms), delayed 160ms forward | `--ui-ease-color` |
| A mark's number, check, "!" and dash trade places in one cell: in from 97% | in `--ui-dur-fast` (160ms), scale `--ui-dur-snap`; out `--ui-dur-instant` | `--ui-ease-enter`, `--ui-ease-snap`; `--ui-ease-color` |
| The check draws on along its length, 60ms after the mark fills; erases fast when the step reopens | `--ui-dur-base` (200ms); erase `--ui-dur-instant` | `--ui-ease-draw`; `--ui-ease-exit` |
| Compact: the pill glides from dot to dot, no overshoot | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Compact: the count rolls ("Step 2 of 4" to "Step 3 of 4") | `--ui-dur-glide` | text morph |
| Press on a step that goes back | down in `--ui-dur-press`, back on `--ui-dur-snap` | `--ui-ease-snap` |

Every change is a transition, so pressing Next and Back as fast as you can
retargets from wherever the line and the pill are; nothing restarts or
queues. A stepper first drawn on a step is simply there.

Under `prefers-reduced-motion: reduce` the line fills and the pill moves at
once, the check appears already drawn, and the marks swap their contents
with a fade only, with no delay and no scale.

## Accessibility

- The steps are an `<ol>` named by `label`, so a screen reader says "list,
  4 items" and each step's position.
- Each step starts with its status in visually hidden text ("Done:",
  "Current:", "Not started:", "Needs attention:", "Skipped:"), so the mark
  is never the only signal.
- The current step carries `aria-current="step"`.
- A step that goes back is a `<button>` described as "Go back to this
  step"; in compact each dot is a button named for its step and status
  ("Menu, done. Go back to this step"). Its focus ring is drawn around the
  mark, for keyboards only.
- A polite `role="status"` region says "Step 3 of 4: Date and venue" when
  the current step changes, "All 4 steps done" at the end, and "Deposit
  needs attention: Card ending 4242 was declined" when a step turns to an
  error.
- The full and compact forms are both in the markup; the one not shown is
  `display: none`, so only one is ever read.

## Before / after

Before: a row of numbered circles that all look the same but for color, a
line that jumps when the step changes, and a "Step 2 of 4" that's the only
thing a screen reader gets.

```tsx
<div className="steps">
  {steps.map((s, i) => <span className={i <= step ? "on" : ""}>{i + 1}</span>)}
</div>
```

After: each step says what it is and how it stands, the line glides to the
next step and the check draws as it lands, finished steps are a way back,
and a narrow screen gets dots and a count.

```tsx
<Stepper
  label="Booking steps"
  steps={[
    { id: "menu", title: "Menu" },
    { id: "guests", title: "Guests" },
    { id: "pay", title: "Deposit", ...(declined && { status: "error", description: "Card ending 4242 was declined" }) },
  ]}
  current={step}
  onStepClick={setStep}
/>
```

In a dialog with steps, put the compact form in the footer, where "Step 1
of 3" would go, with `flex: 1` so it takes the room the buttons leave:

```tsx
<Dialog
  step={step}
  footer={
    <>
      <Stepper variant="compact" steps={STEPS} current={step} onStepClick={setStep} label="Dinner steps" className={styles.steps} />
      <DialogActions>…</DialogActions>
    </>
  }
>
  {(s) => renderStep(s)}
</Dialog>
```
