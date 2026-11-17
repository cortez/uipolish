# Plan approval

The card an agent shows when it has a plan of several steps and wants the
person to look it over before anything runs. Each step is a row: its icon,
what it will do, and a status chip. One row is open at a time, showing what
exactly will happen, the tool it calls, and Approve and Skip. The footer
counts what's approved and holds Approve all and Run plan. Once the plan
runs, the steps check in one after another: the running one turns a small
spinner and fills its chip, finished ones draw a check, and a line along the
footer travels as the work moves on.

```tsx
<PlanApproval
  title="Copper’s plan for Saturday"
  agent="Copper"
  steps={[
    {
      id: "guests",
      title: "Check the guest list",
      status: "planned",
      icon: <Icon name="search" />,
      detail: "Read Saturday’s RSVPs and note dietary needs.",
      tool: "acme.list_rsvps",
    },
    // …
  ]}
  running={running}
  onDecide={(id, decision) => setStatus(id, decision === "approve" ? "approved" : "skipped")}
  onApproveAll={approveRemaining}
  onRun={run}
  onStop={stop}
  onRetry={retry}
/>
```

Everything is controlled: your agent owns the plan, and the card shows it.
Pair it with `message-thread`, where it sits as the agent's turn, and
`tool-steps` for what the agent does after the plan is over.

## When to use it

- An agent that proposes several actions at once and should get the go-ahead
  before starting: planning an event, a migration, a batch of emails.
- Plans where the person may want some steps and not others. Skipping one is
  as easy as approving it.

## When not to

- A single tool call that needs an OK: use `tool-approval`.
- Steps the agent has already decided to take and is reporting: use
  `tool-steps`.
- A checklist the person works through themselves. These steps are the
  agent's.

## Steps

| Field | What to put there |
|---|---|
| `id` | Stable across updates; decisions and focus follow it. |
| `title` | The action as a verb phrase, with the count: "Text the 12 guests". |
| `status` | `planned`, `approved`, `skipped`, `running`, `done` or `failed`. |
| `detail` | Optional. What exactly will happen, in a sentence or two. Quote what will be sent. Shown when the step is open. |
| `tool` | Optional. The tool the step calls, in mono under the detail. |
| `icon` | Optional. A 16px icon (`<Icon name="send" />`). Without one, the step's number shows. |
| `error` | Optional. Shown on a failed step: what happened and what to do. |

## Props

| Prop | What it does |
|---|---|
| `title` | The card's title. Defaults to "Plan". |
| `agent` | Who made the plan, used in announcements and the empty state. |
| `running` | The plan is running. Defaults to whether a step is `running`; set it yourself to cover the gap between steps. |
| `onDecide(id, decision)` | `decision` is `"approve"` or `"skip"`. Without it, the card is read-only. |
| `onApproveAll()` | Approve every step that's still planned. |
| `onRun()` | Start the plan. Steps still `planned` when it's pressed are yours to decide; skipping them is the safe call. |
| `onStop()` | Shows Stop in the footer while the plan runs. |
| `onRetry(id)` | Shows Retry on a failed step. |

## States

The card's phase follows from the steps:

| Phase | When | Header | Footer |
|---|---|---|---|
| Review | Nothing has run yet | "2 of 5 decided" | "2 approved", Approve all, Run plan (disabled at 0 approved) |
| Running | `running`, or a step is `running` | A breathing dot and "Running" | "1 of 4 done · 1 skipped", Stop, and Run plan busy as "Running…" |
| Paused | Something ran, approved steps remain, nothing running (a failure, or Stop) | "Stopped" after a failure, "Paused" otherwise | The done count, and Resume |
| Finished | Nothing approved or planned is left | A check and "Plan done", or "Stopped" if a step failed | The done count; the buttons step away |

Per step:

| Status | Glyph | Chip | Title |
|---|---|---|---|
| `planned` | The step's icon, muted | "Planned", neutral | Text color |
| `approved` | The icon in the accent | "Approved", accent tint | Text color |
| `skipped` | The icon, faded | "Skipped", outline only | Muted, regular weight: back, but readable |
| `running` | A small spinner in the accent | "Running", solid accent; the row takes a trace of accent | Text color |
| `done` | A check draws in on a success disc | "Done", success tint | Text color |
| `failed` | A mark on a danger disc; the step opens with its error | "Failed", danger tint | Text color |

**Which step is open.** The first planned step opens on mount. Deciding a
step folds it and opens the next one still planned, so a plan can be read
and decided from the top without reaching for the pointer. Clicking a row,
or Enter on it, opens or closes it. Starting the run folds them all; a
failure opens the failed step, with Retry and Skip. Skipping a failed step
is a decision like any other: carry on with the rest of the plan.

**Changing your mind.** A decided step still opens to Approve and Skip
while the plan is in review or paused, so a person can skip what they
approved. The button for the current choice is pressed.

**Nothing shifts.** Every chip label sits in one cell, so the chip keeps
the width of "Approved" whatever it says, and only its color and label
change. The header's and footer's labels for every phase share a cell the
same way. Counts hold the width of their widest digits, since the system
face has no tabular figures, and a new value rolls up into place.

**Empty.** With no steps the card says "No steps yet. Copper will list them
here before anything runs." Render it while the agent is still planning, or
wait for the plan.

## Keyboard

The steps are one tab stop. From a step:

| Key | Does |
|---|---|
| ↑ / ↓, Home / End | Move between steps |
| Enter or Space | Open or close the step |
| A | Approve the step, then move to the next one still planned |
| S | Skip the step (a failed step too), then move on |
| Tab | Into the open step's buttons, then the footer |

A and S work from anywhere in a step, its buttons included, and do nothing
while the plan runs. The open step's buttons show their key; touch screens
don't.

## Motion

| What | Duration | Easing |
|---|---|---|
| A step opens: height, then its content clears from faint, 2px blur and 98.5% scale, the clip's bottom edge a fade | `--ui-dur-panel` (280ms) | `--ui-ease-expand`; content `--ui-ease-enter`, 60ms later |
| One step closes as another opens | The same 280ms, so the heights trade off and the steps below hold still | `--ui-ease-expand` |
| The open step closes | `--ui-dur-base` (200ms) height, `--ui-dur-instant` fade | `--ui-ease-collapse`, `--ui-ease-exit` |
| Chip color changes | `--ui-dur-base` | `--ui-ease-color` |
| Chip label swaps: old fades, new rises 2px | `--ui-dur-instant` out, `--ui-dur-fast` in, half a beat later | `--ui-ease-color`, `--ui-ease-enter` |
| Glyph swaps (icon, spinner, check, mark) | `--ui-dur-fast` fade, scale from 97% | `--ui-ease-enter`, `--ui-ease-snap` |
| The check draws in | `--ui-dur-base`, after the disc | `--ui-ease-draw` |
| Spinner turns | Three `--ui-dur-panel` per turn | `linear` |
| A count rolls up | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| The footer line fills to the share done | `--ui-dur-glide` | `--ui-ease-glide`: it never passes its end |

Under `prefers-reduced-motion: reduce`, steps open and close at once, the
content and labels fade without blur, scale or rise, the check appears
whole, counts change in place, and the spinner stops turning and breathes
instead.

## Accessibility

- The card is a `section` named by its title. The steps are an ordered list.
- Each row is a button with `aria-expanded` and `aria-controls`, named by
  the step and its status ("Check the guest list, Approved"). Closed steps
  are `inert`.
- Rows carry `aria-keyshortcuts="A S"` and a description, "Press A to
  approve, S to skip", while there's something to decide.
- Status is in words in every row; color only repeats it.
- A polite `role="status"` region says what changed: "Text the 12 guests:
  approved", "Copper is running 4 steps", "Text the 12 guests failed:
  Postbox couldn’t reach…", "Plan done".
- After a decision the open step's buttons fold away, so focus moves to the
  next step it opened (or stays on the step).
- Rows are 40px tall, and so are the buttons. In a plan narrower than
  360px, Approve and Skip drop their key hints to stay on one line. In one
  narrower than 400px the header's status moves under the title, and the
  footer folds: the tally and Approve all (or Stop) share the top line and
  Run plan spans the card under them.
- Long titles and details wrap; nothing is cut.

## Before / after

Before: a wall of text with the plan as a numbered list, and "Reply yes to
go ahead". The person can't take one step out, and once it runs there's no
telling where it is.

```tsx
<Message>
  Here’s my plan: 1. Check the guest list 2. Draft a menu 3. Text the guests…
  Shall I go ahead?
</Message>
```

After: every step can be read, approved or skipped from the keyboard, and
the same card shows the plan running, with a failure where it happened.

```tsx
<PlanApproval
  title="Copper’s plan for Saturday"
  agent="Copper"
  steps={plan.steps}
  running={plan.running}
  onDecide={(id, d) => agent.decide(id, d)}
  onApproveAll={() => agent.approveAll()}
  onRun={() => agent.run()}
  onStop={() => agent.stop()}
  onRetry={(id) => agent.retry(id)}
/>
```
