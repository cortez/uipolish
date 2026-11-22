# Tool steps

What an agent did, as a vertical list of steps joined by a hairline. Each step
has a status icon in a fixed box, a title, an optional detail line and a time.
Steps with raw input and output open to show them in mono. A summary line on
top reads "Running 3 of 5…" while the agent works and "Ran 5 steps in 12s"
when it's done, and folds the list away.

## When to use it

- An agent that calls tools, reads files, searches or edits on the user's
  behalf, and the user should be able to see and check each action.
- Runs that take long enough for progress to matter: the running step's timer
  and the summary count show where it is.
- Any run where a step can fail and be retried without starting over.

## When not to

- The model's private reasoning: use the reasoning block.
- A single action with one result ("Saving…", "Saved"): a button's busy state
  or a toast says it with less.
- A checklist the user works through themselves. These steps are things that
  happened, not tasks.

## States

Per step:

| Status | Icon | Title | Right side |
|---|---|---|---|
| `pending` | Hollow circle, subtle | Subtle | nothing |
| `running` | The hollow circle with a dot breathing inside it | Text color | Live timer, whole seconds |
| `done` | Filled circle with a check | Text color | Time taken, one decimal: "2.4s", "2.0s" |
| `failed` | Danger circle with "!" | Text color, error message below in danger, Retry button | Time taken |
| `skipped` | Circle with a dash, subtle | Subtle | "Skipped" |
| `cancelled` | Circle with a dash, subtle | Subtle | "Cancelled" |

The icons are stacked in one 16px box and crossfade, so a status change never
moves the title.

Steps with `input` or `output` have a title that's a button: it opens the
input and output in a mono block capped at 180px that scrolls on its own.
Output appears once the step settles.

The summary:

| Situation | Label |
|---|---|
| Nothing started | "5 steps queued" |
| Working, or between two steps | "Running 3 of 5…" with a slow light band |
| A step failed and nothing is running | "Step 3 of 5 failed" (the list opens if it was folded) |
| Every step done or skipped | "Ran 5 steps in 12s" (the list folds) |
| Some steps didn't run | "Ran 2 of 4 steps in 2s" |

**Timing.** Give each step `startedAt` and `finishedAt` as `Date.now()`
values from your agent's events. Running steps count up from `startedAt`; the
summary's total runs from the first start to the last finish. Without them,
the times are left out rather than guessed.

**Titles.** Write them as the action in the past tense once done ("Read
menu.pdf", "Updated 4 recipes"), and in the present while running
("Reading menu.pdf"). The change morphs in place. Keep titles short, under
about 40 characters; put the rest in `detail`.

**Errors.** Say what happened and, if you can, why: "market.example.org didn't
respond within 10 seconds", not "Tool error". Retry calls `onRetry(id)`; set
that step back to `running` and the error clears.

## Motion

| What | Duration | Easing |
|---|---|---|
| A step added to a list already on screen: fade and 4px rise, while the list's height eases open for it (`animated-size`). The steps a list is first drawn with don't animate | `--ui-dur-fast` (160ms); height `--ui-dur-panel` (280ms) | `--ui-ease-enter`; `--ui-ease-expand` |
| A step's error opens when it fails: height, then the text fades in 60ms later. An error a list is first drawn with is simply there | `--ui-dur-panel` (280ms) height, `--ui-dur-fast` (160ms) fade | `--ui-ease-expand`, `--ui-ease-enter` |
| Retry: the error fades out first, then gives its space back, so the steps under it slide up instead of jumping | `--ui-dur-instant` (120ms) fade, then `--ui-dur-base` (200ms) height | `--ui-ease-exit`, `--ui-ease-collapse` |
| A step's time fades in where it will stay when the step starts (a time the row is drawn with is simply there) | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Status icon crossfade: old out, new in from scale 0.97 | out `--ui-dur-instant` (120ms), in `--ui-dur-fast` (160ms), scale `--ui-dur-snap` | `--ui-ease-color`, `--ui-ease-enter`, `--ui-ease-snap` |
| Title and summary label changes | `--ui-dur-glide` (320ms) | `--ui-ease-glide`, via text morph |
| Light band across the summary | `--ui-dur-sweep` (2.4s) per sweep, only while running | `linear` |
| List or input/output opens | `--ui-dur-panel` (280ms) height, `--ui-dur-fast` fade 75ms later | `--ui-ease-expand`, `--ui-ease-enter` |
| List or input/output closes | `--ui-dur-base` (200ms) height, `--ui-dur-instant` fade | `--ui-ease-collapse`, `--ui-ease-exit` |
| Done check draws on, left to right, 60ms after the circle | `--ui-dur-base` (200ms) | `--ui-ease-draw` |
| Chevron turns a quarter turn, right to down | `--ui-dur-base` (200ms) | `--ui-ease-glide` |
| Running dot grows and shrinks | `--ui-dur-pulse` (700ms) each way | `--ui-ease-pulse` |

Height animates through `grid-template-rows: 0fr → 1fr`. The list folds on its
own only once, when the run finishes cleanly.

Times are in tabular figures, set on each figure and never on the line, so
a ticking second moves nothing and the space in "1m 14s" keeps its width.

Under `prefers-reduced-motion: reduce` steps appear without rising, the band
is replaced by static muted text at full strength, the done check appears already drawn, labels
swap without morphing, status icons crossfade without scaling, panels and errors open instantly, and the running dot holds its
size and fades slowly instead.

## Accessibility

- The steps are an `<ol>` with an accessible name (`label`), so screen readers
  announce "list, 5 items" and each item's position.
- Each step starts with its status in visually hidden text ("Done:", "Failed:"),
  so the icon is never the only signal.
- A polite `role="status"` region announces each step once as it settles
  ("Read menu.pdf: done", "Checking wine prices failed: …") and the
  summary when the run ends. Timers are never announced.
- The summary and expandable titles are buttons with `aria-expanded` and
  `aria-controls`. Folded content is `inert`.
- Pressing Retry moves focus to that step's title, because the Retry button
  disappears once the step is running again.
- Input and output blocks are focusable, labelled ("Input for Read
  menu.pdf") and scroll with the arrow keys.
- Expandable titles get a 40px tall hit area on touch screens.

## Before / after

Before: a spinner and a line of text that's replaced by each new action, with
no record of what happened and nothing to do when it fails.

```tsx
{busy && <p><Spinner /> {currentAction}…</p>}
{error && <p className="error">Something went wrong</p>}
```

After: every action stays visible with its status and time, a failure says
why and can be retried, and the list folds into one line when it's over.

```tsx
<ToolSteps
  label="Steps for the 14 Alder Lane dinner"
  steps={[
    { id: "read", title: "Read menu.pdf", status: "done", detail: "3 pages, 18 dishes",
      startedAt: t0, finishedAt: t0 + 1600, input: readCall, output: readResult },
    { id: "search", title: "Searching 3 suppliers", status: "running", startedAt: t0 + 1850 },
    { id: "update", title: "Update shopping list", status: "pending" },
  ]}
  onRetry={(id) => agent.retry(id)}
/>
```
