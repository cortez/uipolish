# Agent task

The live view of an agent working through a task of several steps. One color,
the accent while it works, follows its state through the phases (reading,
searching, thinking, writing or reviewing), and everything that means "now"
takes it: the agent's tile, the
phase's name, the bar under the title, the checks on the steps, and the tool
in use. The tile shows the phase's own glyph (a file, a magnifier, an
ellipsis, a pencil, an eye), so you can tell what the agent is doing at a
glance. Under the steps, a panel of fixed height shows what the
agent is looking at: the file it's reading, its search and the results, the
notes it's weighing, the text it's writing with a caret, or a revision with
what it struck out and what it put in. At the foot: its tools, the model, and
tokens, cost and time that count up without moving anything. Pause, Stop, and
Run again when it's over.

```tsx
<AgentTask
  agent="Coding agent"
  task="Fix rounding in split bills"
  phase={run.phase} // "reading" | "searching" | "thinking" | "writing" | "reviewing"
  status={run.status} // "running" | "paused" | "done" | "failed" | "stopped"
  steps={run.steps} // [{ id, title, status }]
  context={run.context} // what the panel shows; see Context
  error={run.error}
  tools={[
    { id: "github", name: "GitHub", brand: "github" },
    { id: "files", name: "Files", icon: <Icon name="file" /> },
    { id: "linear", name: "Linear", brand: "linear" },
    { id: "npm", name: "npm", brand: "npm" },
  ]}
  activeTool={run.tool}
  usage={{ tokens: run.tokens, cost: run.cost, startedAt: run.startedAt, endedAt: run.endedAt, pausedMs: run.pausedMs }}
  model={model}
  models={models}
  onModelChange={setModel}
  onPause={() => agent.pause(run.id)}
  onResume={() => agent.resume(run.id)}
  onStop={() => agent.stop(run.id)}
  onRunAgain={() => agent.start(run.task)}
/>
```

It's controlled: your agent reports its phase, steps, what it's looking at
and what it has spent, and the card draws it. Nothing in it fakes progress;
the only timer is the clock.

## Anatomy

- **Head.** A 40px tile with the phase's glyph on its tint; the agent's name
  and the phase in words; the task as the title (the hero, at the heading
  step); then a 4px bar with "2/5" at its end.
- **Steps.** One 32px row each: a ring for to do, a small arc turning for
  the one in progress (the only loop in the card), a filled check for done,
  a red "!" for failed. The step in progress is in the text color; the rest
  step back.
- **Context.** A panel of fixed height that shows one thing at a time. When
  the kind changes, the old one leaves, then the new one rises in; the two
  are never seen at once.
- **Foot.** A 40px row of tools, the one in use lit, and the model picker;
  then a 48px row with tokens, cost and time on the left and the controls on
  the right.

## When to use it

- An agent running a task of 3 to 8 steps while the person watches: fixing
  a bug, drafting a document, planning an event, triaging an inbox.
- When the person needs to see what it's on, step in (pause, stop), and
  know what it cost.

## When not to

- One tool call, or a list of calls with their raw input and output. That's
  `tool-steps`, which sits in a thread and folds away.
- Research across many web pages. `research-progress` shows the pages.
- The same action on many items: `batch-progress`.
- Work that runs while the person is elsewhere: put it in a
  `background-run`, and show this on the run's own page.

## States

| `status` | Head | Bar | Steps | Context | Controls |
|---|---|---|---|---|---|
| `running` | The phase's glyph and name, in the accent | Accent | Checks in the accent; the arc turns | `context` | Stop, Pause |
| `paused` | A pause glyph, "Paused", grey | Holds | The arc holds where it was | Holds; the caret stops | Stop, Resume |
| `done` | A check, "Complete", green | Full, green | All green | A `summary` context, if you pass one | Run again |
| `failed` | "!", "Failed", red | Red, where it stopped | Done steps grey, the failed one red with "!" | "Step 5 of 5 failed: …" and `error` | Try again |
| `stopped` | A stop square, "Stopped", grey | Grey | Done steps grey; put the running one back to `pending` | What it was on, faded | Run again |

A control shows only when you pass its callback. Pause and Resume, then Run
again, are one button that changes its name, so focus stays on it; Pause
and Resume reserve each other's width, so trading them moves nothing. When
Stop goes, focus that was on it moves to that button.

**Phases.** Every phase is the accent: its name and glyph say which one,
so the card adds no hues of its own.

| `phase` | Default label | Glyph |
|---|---|---|
| `reading` | Reading file | `file` |
| `searching` | Searching web | `search` |
| `thinking` | Thinking | `more` (an ellipsis) |
| `writing` | Writing | `pencil` |
| `reviewing` | Reviewing | `eye` |

Green and red stay for done and failed. Each phase is still its own
variable on the root (`--at-reading`, `--at-reading-text` and so on), so a
product can give one a color. Pass `phaseLabel` for your own
words ("Reading the issue"); keep it to two or three.

**Progress.** The bar defaults to the steps: each done or skipped step counts
one and the running one a half. Pass `progress` (0 to 1) if you know better.

## Context

`context` is one of six kinds. When the kind changes (or the file's path
does), the panel trades layers; within one, the content updates in place and
only what's new arrives. A search keeps its layer while the query is typed
and the results come in.

| `kind` | Fields | What it shows |
|---|---|---|
| `file` | `path`, `lines?`, `startLine?` | The path in mono, then the lines with their numbers. Without `lines`, placeholder lines with one band of light across them. |
| `search` | `query`, `results`, `running?` | The query in a chip, a caret after it while `running`; results arrive one by one, each with its site's mark from `brand-marks`. |
| `notes` | `notes` | What it's weighing, a few words each. The newest is in the phase's tint; the rest step back. |
| `writing` | `path?`, `text`, `streaming?`, `code?` | The text so far with a caret. The panel follows the end while the reader hasn't scrolled up. `code` sets it in mono. |
| `review` | `path?`, `note?`, `parts`, `code?` | Text where `{ removed }` is struck by a line drawn across it and `{ added }` arrives in the phase's color once the strike lands. |
| `summary` | `title`, `detail?` | A check and one line: "Split bills add up to the cent". `detail` defaults to "5 steps · 10.5k tokens · 0:15". |

The panel is 160px tall in every phase, so the card never changes height as
the phases go by. Set `--at-context-height` on the card for more. Anything
taller than the panel scrolls inside it, fading at the edge that has more,
and the panel takes focus so a keyboard can scroll it too.

## Props

| Prop | Type | Default | |
|---|---|---|---|
| `agent` | `string` | `"Agent"` | The agent's name in the head and in what screen readers hear. |
| `task` | `string` | | The task, as its title. Names the card. |
| `phase` | `AgentPhase` | | What it's doing now. Sets the color. |
| `phaseLabel` | `string` | per phase | The phase in words, after the agent's name, while running. |
| `status` | `AgentStatus` | `"running"` | |
| `steps` | `AgentStep[]` | | `{ id, title, status: "pending" \| "running" \| "done" \| "failed" \| "skipped" }`. |
| `context` | `AgentContext` | | See Context. Without one, "Getting started…". |
| `error` | `string` | | `failed`: what happened, and what it means. |
| `progress` | `number` | from steps | 0 to 1. |
| `tools` | `AgentTool[]` | `[]` | `{ id, name, brand?, icon? }`. A tool without `brand` or `icon` shows its first letter. |
| `activeTool` | `string` | | The tool in use. Nothing is lit once the run is over. |
| `usage` | `AgentUsage` | | `{ tokens, cost, startedAt?, endedAt?, pausedMs? }`. |
| `formatCost` | `(dollars) => string` | `"$0.032"` | |
| `model`, `models`, `onModelChange` | | | The model picker shows when all three are passed. |
| `onPause`, `onResume`, `onStop`, `onRunAgain` | `() => void` | | |
| `className` | `string` | | |

`formatTokens(n)` is exported too: 842 gives "842", 10480 gives "10.5k".

## Counters

Tokens, cost and time are set in mono, and each sits in a box sized by the
widest value of its shape ("88.8k", "$8.888", "88:88"), so a 1 turning into
an 8 never nudges what's beside it. The "2/5" by the bar is in the text face,
which has no tabular figures, so it reserves every digit in turn. The clock counts while `running`, from
`startedAt`, less `pausedMs`; it holds while paused and stops at `endedAt`.
When you resume, add the time spent paused to `pausedMs`. It starts after
the card mounts, so the server and the browser render the same HTML.

## Motion

| What | Duration | Easing |
|---|---|---|
| The phase color moves through the card (tile, name, bar, checks, tool) | `--ui-dur-base` | `--ui-ease-color` |
| The tile's glyph: the old one's strokes retract, the new one's draw in | as `icons` | as `icons` |
| The phase's name morphs into the next; nothing sits after it, so nothing moves | `--ui-dur-move` | `--ui-ease-move`, via text morph |
| The bar grows to its new length | `--ui-dur-glide` (320ms) | `--ui-ease-glide`: lands without passing its end |
| The arc on the step in progress turns (the one loop)  | a third of `--ui-dur-sweep` per turn | `linear` |
| A step's icon changes | `--ui-dur-fast` in, `--ui-dur-instant` out, scale on `--ui-ease-snap` | |
| A check's tick draws on | `--ui-dur-base` | `--ui-ease-draw` |
| The context trades layers in turn: the old fades out, then the new fades in and rises 4px | `--ui-dur-instant` out, then `--ui-dur-base` in | `--ui-ease-exit`, `--ui-ease-enter` |
| A result or note arrives: fade and 3px rise | `--ui-dur-fast` | `--ui-ease-enter` |
| A strike draws across what's removed, then what's added fades in | `--ui-dur-base`, then `--ui-dur-fast` | `--ui-ease-draw`, `--ui-ease-enter` |

What's there when it mounts doesn't animate. Pause holds every loop where it
is. Under `prefers-reduced-motion: reduce`, nothing loops or travels: the
caret stops, the arc breathes slowly in place instead of turning, the bar
changes at once, layers and items fade in without rising, and the strike is
there from the start.

## Layout

The card is one column as wide as its container, so on a 320px phone its
panels narrow with it instead of widening it.

## Accessibility

- The card is a `section` named by the task. The steps are an `<ol>`, each
  with its status in words ("Done: Read split-bill.ts").
- The bar is a `progressbar` with "3 of 5 steps done".
- A polite `role="status"` region speaks milestones only: each phase
  ("Coding agent: Writing"), a pause, and how it ended, with the error.
  Never the counters or the streaming text.
- The context panel is a region. Removed and added text are `<del>` and
  `<ins>` with "Removed:" and "Added:" for screen readers. The tool in use
  is named in words ("npm, in use").
- Phase and status are always in words; color only repeats them. Their
  text reads the status text roles, so it holds 4.5:1.
- Under 460px wide, every tool folds to its mark in a capsule of one width;
  names stay for screen readers, and nothing folds or opens as the tool in
  use changes. Under 400px, Stop and Pause fold to icon capsules named by
  `aria-label`; "Run again" keeps its words. Under 330px the tools and
  model, and the counters and controls, take a row each, and the controls
  get their names back. The card keeps one height in every state at every
  width. Nothing is cut: titles, paths, results and notes wrap.

## Before / after

Before: a spinner and "Working…", then a wall of text.

```tsx
{working ? <Spinner label="Working…" /> : <Markdown>{result}</Markdown>}
```

After: the person sees the plan, what's being read, searched, weighed and
written, which tool and model it's using, and what it costs, and can pause
or stop it.

```tsx
<AgentTask
  agent="Coding agent"
  task={run.title}
  phase={phaseOf(run.lastEvent)} // map your agent's events onto the five phases
  status={run.status}
  steps={run.plan.map((s) => ({ id: s.id, title: s.title, status: s.state }))}
  context={contextOf(run.lastEvent)} // { kind: "file", path, lines } and so on
  error={run.error?.message}
  tools={tools}
  activeTool={run.lastEvent?.tool}
  usage={run.usage}
  onPause={() => agent.pause(run.id)}
  onResume={() => agent.resume(run.id)}
  onStop={() => agent.stop(run.id)}
  onRunAgain={() => agent.start(run.title)}
/>
```
