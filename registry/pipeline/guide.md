# Pipeline

A run with a few named stages, in order: a deploy (build, test, preview,
production), an import (read, match, write), a nightly sync, an onboarding
job. Each stage is a node in one row, and the line out of a stage fills
toward the next as it finishes, so how far along it is reads as distance.
Under the row, the output of the stage being looked at streams in a panel
that keeps its height. A failure stops where it happened, turns that node
red, says why, and offers Retry.

```tsx
<Pipeline
  title="Deploy acme-web"
  meta={[{ label: "main", code: true }, { label: "a3f7c1d", code: true }]}
  stages={run.stages.map((s) => ({
    id: s.id,
    label: s.name,
    icon: <StageIcon name={s.id} />,
    status: s.status,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    log: s.lines,
    error: s.error,
  }))}
  doneLabel="Deployed"
  onCancel={() => runs.cancel(run.id)}
  onRetry={(stageId) => runs.retry(run.id, stageId)}
/>
```

## When to use it

- Two to about seven stages that run one after another, each with a name
  the person would recognize and output worth reading.
- The person watches it run, or comes back to see where it stopped.
- A stage can fail, and the fix is to retry from that stage.

## When not to

- Many similar items processed the same way: `batch-progress`.
- An agent's tool calls, which vary run to run: `tool-steps`.
- Work that runs while the person is elsewhere: `background-run`, which can
  open to a `Pipeline`.
- One step with a percentage: `progress`.
- Stages that run in parallel or branch. This is a line, not a graph.

## Anatomy

- **Header**: the title, then `meta` chips (a branch, a commit, a file;
  `code: true` sets one in mono). On the right, the status in the phase's
  color: "Running · Test", "Failed · Test", `doneLabel`, "Cancelled". Every
  value it can take is laid hidden underneath, so its box is the widest
  one's from the first frame: it never clips, and the title never moves.
- **Row**: one node per stage on the 40px control size, its `icon` or its
  number, the label under it, and its duration under that. Durations are
  mono, so a running count never jitters, and the slot holds its width.
  Each stage is a tab: pressing one shows that stage's output. The stage
  being shown tints its label and duration (hover tints them fainter); the
  node itself never carries the selection, so no tint meets a connector.
- **Connectors**: a 2px line between nodes that stops the same 8px short of
  the node at both ends, whatever is selected or running. Nothing but the
  corner badge is drawn outside a node, and the badge sits below the line.
  It fills when the stage before it is done. While a stage runs, the line
  out of it turns a faint accent and a brighter stretch of it travels
  toward what's next: one line lighting up, not a second stroke over it.
- **Output**: a flat well (a fill, no edge: it already sits inside the
  card's) with the viewed stage's name, then its log in mono. It starts six
  lines tall, so the first lines land without moving anything, grows with
  the longest log of the run up to `logHeight`, then scrolls. It never
  shrinks during a run, so following the work to a new stage doesn't jump. A line starting with `$ ` is
  a command and reads muted; `{ text, tone }` colors a result line.
- **Footer**: the total time, then where it is ("Stage 2 of 4"), or the
  failed stage's `error`. Cancel while it runs, "Retry Test" once a stage
  failed.

## States

`stages` is controlled: the runner owns the work and says where each stage is.

| Stage `status` | Node | Duration | Connector out of it |
|---|---|---|---|
| `queued` | Faint, its glyph subtle | "–" | Empty |
| `running` | Accent tint, its edge turned accent and breathing | Counting, accent | Faint accent, a brighter stretch travelling |
| `done` | Success tint, a check badge drawn on | Final, muted | Filled |
| `failed` | Danger tint, an x badge drawn on | Final, danger | Empty: what's after it stays queued |
| `skipped` | Dashed outline, no fill | "skipped", or its time if it had started | Filled only if a later stage ran |

| The run | Header | Footer |
|---|---|---|
| Queued (every stage queued) | "Queued" | "Not started" |
| Running | "Running · Test", accent, breathing dot | Total so far, "Stage 2 of 4", Cancel |
| Done | `doneLabel` ("Done"), success | Total, "4 of 4 stages done" |
| Failed | "Failed · Test", danger | Total, the stage's `error`, "Retry Test" |
| Cancelled (`cancelled`) | "Cancelled" | Total, stages done |

When a stage fails, leave the stages after it `queued`; the run stopped
there and they never started. When the person cancels, mark the running stage
and those after it `skipped` and pass `cancelled`.

### Which output shows

Without `activeId`, the panel follows the work: the running stage, else the
one that failed, else the last that ran. Pressing another stage pins it, and
a "Follow Test" link appears in the well while something else runs. Scrolling
up through a log also pins its stage, so finishing doesn't pull the reader
away; a "3 new lines" pill takes them back to the end. Pass `activeId` and
`onActiveChange` to control it yourself.

| The output well | Shows |
|---|---|
| Queued stage | "Waits for Build" |
| Running, no output yet | "Starting test…" as the first log line, with a light band crossing it |
| Skipped | "Skipped", or "Cancelled before it ran" |
| Done with no log | "No output" |
| Failed with no log | Its `error` |

## Props

| Prop | Type | Default |
|---|---|---|
| `stages` | `{ id, label, icon?, status, startedAt?, finishedAt?, log?, error? }[]` | Required |
| `title` | `string` | Required |
| `meta` | `(string \| { label, code? })[]` | None |
| `activeId`, `onActiveChange` | `string`, `(id) => void` | Follows the work |
| `onRetry` | `(stageId: string) => void` | No Retry button |
| `onCancel` | `() => void` | No Cancel button |
| `cancelled` | `boolean` | `false` |
| `doneLabel` | `string` | `"Done"` |
| `logHeight` | `number` (px): the most the log grows to | `216` |
| `className` | `string` | |

`log` lines are `string` or `{ text, tone?: "muted" | "success" | "warning" | "danger" }`.
Append to the array; don't rebuild it with a new first line, or lines will
rise in again. A retried stage gets a new `startedAt`, which starts its log
fresh.

## Layout

Below 520px of its own width (a container query, so a narrow sidebar counts
too), the row stacks into a timeline: 32px nodes down the start edge, joined
by 2px connectors that fill the gap between nodes, 4px clear of each; the
label beside each node and the duration at the end of the row on the same
baseline. The corner badge shrinks with the node (14px on 32px) and stays
centred on its rounded corner. The shown stage's tint covers the label and
duration only, the node's height, so the line down the left never runs
through it. Arrow keys follow: left and right across the row, up and down
the list. Labels and log lines wrap; a wrapped log line hangs, so where each
line starts stays clear.

## Motion

| What | How |
|---|---|
| Connector filling | `scale` from its start on `--ui-ease-glide`, `--ui-dur-glide`: it lands on the next node without passing it |
| A stage handing over | No fade, no delay: the finished node, its badge, both durations, the header, the footer, the selection and the log title all switch in the same frame, so no part ever disagrees with another and no node is ever part running, part done |
| Running edge | Fades in, then breathes on `--ui-ease-pulse`, `--ui-dur-pulse`, `alternate` |
| Bright stretch on the active line | Travels `linear` over half `--ui-dur-sweep` |
| Selection tint | Moves in one frame, so two stages never both look selected. Hover fades in on `--ui-ease-color`, `--ui-dur-instant` |
| Done or failed badge | Fades in on `--ui-ease-enter`, `--ui-dur-fast`; its stroke draws on `--ui-ease-draw`, `--ui-dur-base` |
| A log line arriving | Fades and rises 4px on `--ui-ease-enter`, `--ui-dur-fast`. No blur: it's reading content |
| Status label | Swaps in place, in the same frame as the rest |
| "New lines" pill | Floats in with a 2px blur clearing |

With reduced motion the accent edge stays, still; the connector fills at
once and the active line keeps its faint accent with nothing travelling;
lines and badges appear without moving, and the waiting line holds still.

## Accessibility

- The row is a `tablist` (Base UI tabs) of stages; each tab's name says the
  stage, its status and its time. The output well is its `tabpanel`, and it
  scrolls from the keyboard once focused.
- A polite status announces each stage starting, finishing with its time,
  and failing with its `error`. Log lines are never announced.
- Cancel and Retry are ordinary buttons, with the stage in Retry's label.
- Color is never alone: done and failed nodes carry a check or an x, and
  the header says the phase in words.

## Before and after

```tsx
// Before: a spinner, a stage name, and a log that pushes the page down.
<p><Spinner /> Deploying… (test)</p>
<pre>{log.join("\n")}</pre>

// After: where it is, how long each part took, and the output in a fixed panel.
<Pipeline title="Deploy acme-web" stages={stages} onRetry={retry} onCancel={cancel} />
```
