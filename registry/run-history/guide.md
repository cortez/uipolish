# Run history

The screen where a team looks back at what their AI agent did. A table of
runs (status, agent, trigger, when, how long, tokens and cost) with search,
filters and a date range, and a page for any one run: its trace as a
waterfall of model and tool calls, retries and the failing step called out,
each call's prompt, arguments and result, a token and cost breakdown, the
final output, and **Re-run**, **Copy ID** and **Share link**.

Runs that are still going update in place. Their duration counts up in a
column that never changes width, the arc in the status turns into a tick
that draws on when they finish, and the row tints for a moment. New runs
don't push rows down under the pointer: they wait behind **Show 2 new
runs**.

```tsx
<RunHistory
  runs={page.runs}               // one page, filtered on the server, newest first
  total={page.total}
  page={pageNumber}
  onPageChange={setPageNumber}
  filters={filters}              // { query, status, agent, trigger, range, from?, to? }
  onFiltersChange={setFilters}   // search arrives 250ms after typing stops
  agents={["Menu planner", "Guest replies", "Shopping list"]}
  newRuns={held.length}
  onShowNewRuns={showHeld}
  loading={isFirstLoad}
  refreshing={isFetching}
  error={listError}
  onRetry={refetch}
  selectedId={params.run ?? null}
  onSelect={(id) => router.push(id ? `/runs/${id}` : "/runs")}
  detail={trace}                 // { id, steps, output?, cancelNote? }
  detailLoading={traceLoading}
  detailError={traceError}
  onRetryDetail={refetchTrace}
  onRerun={(run) => api.post(`/runs/${run.id}/rerun`).then((r) => r.id)}
  onShare={(run) => api.post(`/runs/${run.id}/share`).then((r) => r.url)}
  timeZone={viewer.timeZone}
  emptyAction={<Button onClick={startFirstRun}>Run Menu planner</Button>}
/>
```

## When to use it

- The "Runs" or "Activity" page of a product with an agent in it, for the
  people who need to know what it did, why it failed, and what it cost.
- Support and ops: find the run a customer is asking about by ID or by the
  words in its error, open it, and share a link to it.
- As the place a failed-run alert links to: pass `selectedId` and the page
  opens on the run, with the failing step open.

## When not to

- Watching one run as it works, in the product itself: use Agent task or
  Tool steps beside the conversation. This screen is for looking back.
- Aggregate analytics: cost per week, failure rates, latency percentiles.
  That's a dashboard; link to it from here.
- Raw logs or OpenTelemetry spans with dozens of nested levels. The trace
  here is one level of steps, in order, which is what an agent run is.

## States

| State | What shows |
|---|---|
| Loading (`loading`) | The title and filters, and "Loading runs…" shimmering in a card the height of ten rows, after 300ms |
| Didn't load (`error`) | An empty state in the table's place with your sentence and **Try again** (`onRetry`) |
| No runs yet | No filters set and `total` 0: a page empty state, "No runs yet", `emptyDescription` and `emptyAction` |
| No results | "No runs match "lamb tagine"" with the range it searched and **Clear filters**, in the table's space |
| Refreshing (`refreshing`) | The old rows stay put and dim after 300ms; the search icon breathes |
| Live run | The arc turning, the duration counting up in mono, "1 running" with a breathing dot over the table |
| A run finishes | The arc gives way to a tick that draws on, or the failed mark; the row tints green or red and fades over a second |
| New runs (`newRuns`) | **Show 3 new runs** on the line over the table, which is always there, so nothing moves |
| Failed run (row) | The error under the title, in danger text, wrapped, never cut |
| Run open | The status, title, ID, agent, trigger and start time; Re-run, Copy ID, Share link; a strip of duration, tokens, cost, steps and models |
| Failed run (open) | A red alert, "Failed at step 5 of 5: send_invites", the step's error, **Show step**. The step starts open and tinted |
| Retried step | An amber mark and bar, "attempt 2" on the next one, and "This attempt failed, so it was retried" with the reason inside |
| Cancelled run | An info alert with `cancelNote`; the steps that ran are listed |
| Running run (open) | The scale has headroom, so it changes rarely; the running bar grows and sweeps; its duration counts; Output says it's still working |
| Long prompt or result | The first 12 lines (or 1,600 characters of one long line), then **Show all 2,106 lines**. Open, it scrolls in its own box; lines wrap, so nothing runs off the side |
| Trace loading or failed | The header shows from the row; the trace's space holds "Loading the trace…" or the error with **Try again** (`onRetryDetail`) |
| Run not on the page | From a link: `detail.run` fills the header; before it lands, "Loading run…"; with neither, "No run called run_…" |
| Read only (`readOnly`) | No Re-run, and your sentence under the actions: who can |
| Re-run, Share pending | The button keeps its width and shimmers "Starting…" or "Making link…" after 300ms |
| Re-run, Share failed | The rejection's message under the actions |
| Copied | "Copy ID" becomes "Copied", "Share link" becomes "Link copied", in the same width, for a moment. If the clipboard is blocked, the link is shown to select |

## Props

| Prop | What it does |
|---|---|
| `runs` | `RunSummary[]`: `{ id, agent, title, status, trigger, triggeredBy?, startedAt, durationMs?, tokens, cost, error? }`. One page, newest first. `status` is `"running"`, `"succeeded"`, `"failed"` or `"cancelled"`; `trigger` is `"user"`, `"schedule"` or `"webhook"`. Leave out `durationMs` while it runs |
| `total`, `page`, `pageSize`, `onPageChange` | Runs across every page, the page (from 1), 25 by default. No `onPageChange`, no pager |
| `filters`, `onFiltersChange` | Controlled `{ query, status, agent, trigger, range, from?, to? }`. `range` is `"1h"`, `"24h"`, `"7d"`, `"30d"`, `"all"` or `"custom"` with ISO `from` and `to`. `DEFAULT_FILTERS` is exported |
| `agents` | Names for the Agent filter; fewer than two hides it |
| `newRuns`, `onShowNewRuns` | How many runs you're holding back, and putting them in |
| `loading`, `refreshing`, `error`, `onRetry` | First load, a fetch for new filters or a page, and failure |
| `selectedId`, `onSelect` | The open run, or `null` for the list. Put it in the URL |
| `detail` | `{ id, run?, steps, output?, cancelNote? }`. Each step: `{ id, kind, name, status, startMs, durationMs?, model?, attempt?, input?, output?, error?, tokens?: { input, output, cached? }, cost? }`. `kind` is `"llm"` or `"tool"`; `status` adds `"retried"`. `startMs` counts from the run's start |
| `detailLoading`, `detailError`, `onRetryDetail` | The trace's own loading and failure |
| `onRerun(run)` | Resolve with the new run's id and the block opens it |
| `onShare(run)` | Return the link, or a promise of it; the block copies it |
| `readOnly` | A sentence: why they can't re-run, and who can |
| `emptyDescription`, `emptyAction` | For "No runs yet": how runs start in your product, and the button that starts one |
| `currency`, `locale`, `timeZone`, `now` | Defaults `"USD"`, `"en-US"`, `"UTC"`, now. Pass the viewer's time zone; "Today, 14:02" follows it |
| `title`, `description`, `headingLevel` | Default "Runs", none, 1. Sections are one level down |

Every callback can return a promise; the block shows busy until it
settles and the rejection's message if it fails. It never fetches: filters,
pages and traces come in as props.

## Customizing

- **Columns** are in `RunRow` and the `<thead>` in `run-history.tsx`. Widths
  are on the header cells, because the table is fixed-layout: that's what
  keeps a counting duration from nudging anything.
- **Step colors**: `--rh-llm` and `--rh-tool` on `.root`. A model call is
  accent mixed toward danger, so green and red keep meaning done and failed.
- **Fold length**: `FIRST_LINES` and `FIRST_CHARS` in `detail.tsx`.
- **Trigger wording**: `triggeredBy` is shown as is ("Mondays at 07:00",
  "Stripe · checkout completed"). Keep it short; it wraps if it isn't.
- **Inset**: every panel is padded `--ui-pad-card` (16 narrow, 24 from
  560px), read once as `--rh-inset`.
- **Widths**: the Trigger and Tokens columns move under the title below
  880px, and every run becomes a card below 600px. The trace puts each bar
  under its name below 560px. The filter selects sit two to a line, and
  one to a line below 300px. All container queries, so it fits a narrow
  pane.

## Accessibility

- A real `<table>` named by the title. Each run's title is a button whose
  hit area covers the row, read as "Draft the menu for Saturday's harvest
  supper, Running". As cards, the header row is visually hidden but read,
  and every value is still in the card.
- Opening a run moves focus to its title; **Runs** goes back and returns
  focus to the row it came from.
- Status is a glyph and a word, never color alone. Each step reads "Step 5
  of 5, Failed: send_invites, took 2.3s" and is a disclosure button with
  `aria-expanded`; folded content is `inert`.
- The failure alert's **Show step** opens the step, scrolls it into view
  (no smooth scroll with reduced motion) and focuses it.
- A polite status region announces what lands: "Copied run_W7kQ2mPx.",
  "Link copied.", "Started run_…", "3 new runs added at the top."
- `/` focuses search. Escape clears it.
- Reduced motion: the arc breathes instead of turning, bars land at their
  length, steps open without a slide.

## Before / after

Before: a log table with a JSON blob per row, a status string, and no way
to see which call failed without reading all of it.

```tsx
<table>
  {runs.map((r) => (
    <tr key={r.id}><td>{r.id}</td><td>{r.status}</td><td><pre>{JSON.stringify(r.trace)}</pre></td></tr>
  ))}
</table>
```

After: what each run was asked and how it ended, at a glance; one click to
its trace, with the failing step open and its error in words; long outputs
folded; and the cost of every call.

```tsx
<RunHistory
  runs={runs}
  total={total}
  filters={filters}
  onFiltersChange={setFilters}
  selectedId={runId}
  onSelect={openRun}
  detail={trace}
  onRerun={rerun}
  onShare={share}
/>
```
