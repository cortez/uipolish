# Background run

A task an agent keeps working on while the person does something else, and
what it reports when they come back. Each run is one calm row: a small status
mark, the task as a title, one line under it (what it's doing now, or how it
ended), and the time on the right. Opening the row shows only what the row
can't: how far it got, what changed, the agent's steps folded to one line,
and at most two buttons. A run that needs the person shows its button under
the row even while closed; every other button waits in the open run.

```tsx
<RunList label="Copper’s runs">
  {runs.map((run) => (
    <BackgroundRun
      key={run.id}
      agent="Copper"
      run={run} // { id, title, status, startedAt, step, progress, need, changes, … }
      seen={run.seen}
      onOpen={(id) => markSeen(id)}
      onRespond={(id) => openRequest(id)}
      onReview={(id) => openChanges(id)}
      onRetry={(id) => agent.retry(id)}
      onStop={(id) => agent.stop(id)}
    />
  ))}
</RunList>
```

Put the list in a sidebar or a "Runs" page; show the latest few and a "Show
all" under it rather than every run ever. On its own, outside `RunList`, a
`BackgroundRun` is a card: pass `defaultExpanded` for a run's own page, or
for the run the person just started from the prompt.

## When to use it

- Work that takes minutes or hours and doesn't need the person watching:
  scaling recipes, reconciling payments, messaging a list of guests.
- Several tasks at once, where the person wants to see at a glance which one
  needs them.

## When not to

- A reply the person is waiting for in the conversation. Show its actions
  inline with `tool-steps`.
- One approval in the thread. That's `tool-approval`; a run that needs one
  links to it with its button.
- Scheduled jobs the person set up once and never looks at. A log or a
  settings page says it with less.

## Anatomy

| Part | What it is |
|---|---|
| Mark | A 16px glyph, the only color on the row: an empty ring (queued), a ring with a breathing dot (running), an amber `!` (needs you), a green check (done), a red `×` (failed), a ring with a square (stopped). Each status has its own shape, so color only repeats it. |
| Title | `title`, medium weight, wraps; never cut. |
| Line | One line in the muted color, from the status (below). Wraps rather than cuts. |
| Time | On the right, in equal-width figures, with a muted chevron that points down, and up when open. |
| New | `seen={false}`: a 6px accent dot before the time. Nothing else on the row changes. |

## States

`run.status` is controlled. Your agent owns the run and says what state it's
in; the row follows.

| `status` | Mark | The line | Time | Closed | Open |
|---|---|---|---|---|---|
| `queued` | Ring | `detail`, or "Waiting to start" | "2m ago" from `queuedAt` | — | Stop |
| `running` | Ring, dot breathes | `step`, or "Copper is working" | Live: "12s", "4m 12s", "1h 4m" | — | Stop |
| `needs-input` | Amber `!` | `need.text` | "3m ago" from `need.since` | `need.action` | `need.action`, Stop |
| `done` | Green check | `summary`, or the changes joined | "4m ago" from `finishedAt` | — | Review changes |
| `failed` | Red `×` | `error` | "4m ago" | — | Retry, Review changes |
| `stopped` | Ring, square | "Stopped after 3 of 7 steps" | "4m ago" | — | Run again, Review changes |

A button shows only when you pass its callback (or `need.href`, `reviewHref`
for a link). Review changes on a failed or stopped run shows only when
`changes` has something in it. Stop is a quiet ghost button; the button that
moves the run on is the filled one.

**The open run.** Under the line, in this order, each only when there's
something to show:

| Part | Shows |
|---|---|
| Progress | With `progress`, a bar and "3 of 7". Red when failed. Hidden once done. |
| Changes | `changes`, one line each: a count in equal-width figures, or a check, and the label. Headed "What changed" when done, "Done so far" otherwise. An empty array on a failed or stopped run says "Nothing was changed." Over 4, the first 3 and "and 2 more". |
| Steps | With `steps`, the agent's actions as `tool-steps`, folded to "Ran 3 steps in 12s" until the person opens them. |
| Buttons | At most two, listed above. |

Everything else (the status word, when it started, how long it took) is
already on the row or in its accessible description, so it isn't repeated.

**Writing the run.** The `title` is the task as the person asked for it
("Plan Saturday’s shopping for 14 guests"). `step` is what it's doing now, in
the present tense ("Checking stock at Acme"). `need.text` is one short
sentence saying what's needed ("Needs your OK to message 12 guests from
Postbox."), and `need.action` is the button that takes them there ("Review
request"). `error` says what happened and what didn't get done because of it.
A change's `label` reads after its count: `{ count: 12, label: "messages
sent" }`. A change without a count gets a check ("Allergens checked"); pass
`summary` then, since the joined line would read oddly. `RunChange.detail` is
no longer shown (0.2.0); keep the label self-explanatory.

**New.** `seen={false}` puts a small accent dot before the time and adds
"New:" to the row's name for screen readers. `onOpen` fires when the person
opens the row or presses its main button; set `seen` there. Decide what
counts as away yourself; a run that finishes while its row is open and the
tab is visible was watched:

```tsx
const away = document.visibilityState === "hidden" || !openIds.has(run.id);
if (settled(run) && away) setSeen(run.id, false);
```

Mark `needs-input`, `done` and `failed` as new this way. A run the person
stopped themselves isn't news.

**Open and closed.** Uncontrolled by default, closed unless
`defaultExpanded`. Pass `expanded` and `onExpandedChange` to control it, for
example to keep one open at a time.

## Stopping

Stop on a `running` or `needs-input` run asks first, in place of the buttons:
"Stop this run? What’s finished stays done, and anything sent stays sent."
with Keep going and a danger Stop run. Pass `stopNote` when you know more
("4 recipes are already scaled. No messages have gone out."). A queued run
stops on the first press, since nothing has run yet.

Stop run calls `onStop(id)`. The Stop button then says "Stopping…" until you
set `status="stopped"`, so the agent can finish the step it's in. If `onStop`
returns a promise that rejects, the button goes back to Stop and "Copper
didn’t stop. Try again." shows under it. When stopped, record `finishedAt`
and keep `progress` and `changes`: the line becomes "Stopped after 3 of 7
steps" and the open run lists what was done so far.

## Time

Pass `queuedAt`, `startedAt`, `finishedAt` and `need.since` as `Date.now()`
values. Running time counts whole seconds and ticks twice a second; relative
times ("just now", "4m ago", "3h ago", "yesterday", "2d ago") update every 15
seconds. The helpers are exported as `formatDuration` and `formatAgo`.

Times appear after the component mounts, so the server and the browser
render the same HTML and nothing mismatches on hydration. The time has its
own column on the right, so the row's height doesn't change when it arrives.
To render times on the server, or tick a long list with one timer, pass `now`
from your own clock; the run then doesn't run a timer of its own.

## Motion

Only what explains a change moves.

| What | Duration | Easing |
|---|---|---|
| The run opens; the needs-you button's strip opens | `--ui-dur-panel` (280ms) height, `--ui-dur-fast` fade 60ms later | `--ui-ease-expand`, `--ui-ease-enter` |
| They close | `--ui-dur-base` (200ms) height, `--ui-dur-instant` fade | `--ui-ease-collapse`, `--ui-ease-exit` |
| Status mark changes: old fades out, new fades and settles in | `--ui-dur-instant` out; `--ui-dur-fast` fade, `--ui-dur-snap` scale in | `--ui-ease-exit`; `--ui-ease-enter`, `--ui-ease-snap` |
| The line under the title, on a new status or step | `--ui-dur-fast` fade | `--ui-ease-enter` |
| Chevron morphs from down to up; the arms move, nothing spins | `--ui-dur-move` (380ms) | `--ui-ease-move` (from the icon set) |
| The open run's contents change | `--ui-dur-panel` growing, `--ui-dur-base` shrinking | animated size |
| Running dot breathes | `--ui-dur-pulse` each way | `--ui-ease-pulse`, alternate |
| Row hover tint | `--ui-dur-instant` | `--ui-ease-color` |

Nothing animates on mount: a list the person opens twenty times a day shows
as it is. Under `prefers-reduced-motion: reduce` heights change at once and
only opacity fades, the mark swaps without scaling, the chevron swaps without
morphing, and the running dot only fades, three times slower.

## Accessibility

- In `RunList` the runs are a `<ul>` named by `label`; each run is an `<li>`.
  An empty list says "Nothing running" with a line on what shows up here;
  pass `empty` to change it.
- The title is a button with `aria-expanded`, covering the whole row. It's
  described by the status in words, the line and the time, so a screen
  reader hears "New: Scale the autumn recipes, collapsed, button, Done,
  Updated 4 recipes and checked allergens, Done 14m ago". The time is a
  `<time>` with its `dateTime`. The mark is decorative.
- A polite `role="status"` region speaks only the changes that ask something
  of the person: "Plan Saturday’s shopping, needs you: Needs your OK…",
  "…, done: Scaled 4 recipes, sent 12 messages", "…, failed: Ledger asked…".
  Queued, running and stopped are quiet. A row that mounts already settled
  says nothing.
- In the confirm, focus starts on Keep going; Escape cancels. Either way
  focus goes back to Stop, which becomes "Stopping…" with `aria-busy`.
- When a status change removes the button focus was on (Retry, the main
  button, Stop), focus moves to the row's title. It never moves when focus
  was somewhere else on the page.
- Closed parts are `inert`, so tab order is the row, then its buttons.
- The row's hit area is the whole head, at least 56px tall; its buttons are
  the standard 40px.

## Before / after

Before: a spinner with the task's name, a toast when it ends that's gone by
the time the person looks, and no way to stop it.

```tsx
{jobs.map((job) => (
  <li key={job.id}>
    {job.name} {job.done ? "✓" : <Spinner />}
  </li>
))}
```

After: one quiet row per run says how it's going and for how long, which
ones need the person and what for, and opens to what changed and what was
finished before it failed. Stop asks before it stops anything.

```tsx
<RunList label="Copper’s runs">
  {runs.map((r) => (
    <BackgroundRun
      key={r.id}
      agent="Copper"
      run={{
        id: r.id,
        title: r.task,
        status: r.state,
        startedAt: r.startedAt,
        finishedAt: r.endedAt,
        step: r.currentStep?.description,
        progress: r.plan && { done: r.plan.completed, total: r.plan.steps.length },
        need: r.blockedOn && { text: r.blockedOn.reason, action: "Review 1 request", href: `/runs/${r.id}/approve` },
        changes: r.effects.map((e) => ({ count: e.count, label: e.label })),
        error: r.error?.message,
      }}
      seen={r.seenAt !== null || r.state === "running"}
      onOpen={(id) => runs.markSeen(id)}
      onReview={(id) => router.push(`/runs/${id}/changes`)}
      onRetry={(id) => runs.retry(id)}
      onStop={(id) => runs.stop(id)} // a rejection shows "Copper didn’t stop"
    />
  ))}
</RunList>
```
