# Research progress

The live view of an agent researching the web, kept to one quiet line: what
it's doing ("Searching…", "Reading 4 of 9 sources", "Read 12 sources in
48s"), a small stack of the sites' marks, and the elapsed time. The line is a
disclosure, closed by default. Open it for the searches the agent ran, one
short line each, and every source it found, one row each: its mark, title,
site and status, each a link. A source that couldn't be read says why, in
small red text, and the count never quietly drops it.

```tsx
<ResearchProgress
  agent="Copper"
  label="Copper’s research for Saturday’s menu"
  status={research.status} // "searching" | "reading" | "done" | "failed" | "stopped"
  queries={research.queries} // [{ text, status, results }]
  pages={research.pages} // [{ url, title, brand, favicon, status, reason }]
  startedAt={research.startedAt}
  finishedAt={research.finishedAt}
  error={research.error}
  onStop={() => agent.stop(research.id)}
  onRetry={() => agent.retry(research.id)}
/>
```

Put it in the thread where the answer will appear, above it. It's
controlled: your agent reports what it searched and read, you pass that in,
and the component draws it. Nothing in it fakes progress; the only timer is
the elapsed time.

## Anatomy

- **Line.** The summary and its chevron on the left; on the right, up to
  three of the sites' marks, overlapping, the elapsed time and Stop. The
  whole line opens and closes the details. Nothing else shows until it's
  opened, except what went wrong and Try again when it fails.
- **Searches.** Behind the line: one short line per query, a search glass in
  the marks column, the query, and "8 results" on the right, all in the
  small muted size.
- **Sources.** Under the searches, on hairlines: one row per page, in the
  order found. Three columns line up on every row: the mark (20px), the text
  (the title, then its site, which drops to the next line whole rather than
  breaking), and the status (a check, or the spinner on the one being read).
  Rows are at least `--ui-control-lg` tall.
- **Actions.** Stop, a ghost button at the end of the line while it works.
  Try again or Search again, under the line, once it has failed or stopped.

One body size and one muted meta size; the summary is the only medium weight.
The only hue while it works is the accent on the spinner; the only red is a
failed source's reason.

## When to use it

- "Deep research" turns, where the agent searches and reads several pages
  before answering and the person waits seconds to minutes.
- Any agent step that gathers from the web and should show its working: what
  it looked for, where it looked, and what it couldn't get.

## When not to

- Citing the sources in the answer. That's `sources`: numbered markers in the
  text and a list under it. Use both: research progress while the agent
  reads, then `sources` for the pages the answer actually used. A page read
  isn't a page cited.
- One quick lookup that comes back in a second or two. A shimmering line in
  `tool-steps` ("Searched 3 grocers") says it with less.
- Searching your own data (a database, files, a knowledge base). The site
  marks and domains are about the web; `tool-steps` fits better.
- Long work that runs while the person is elsewhere. Put it in a
  `background-run`, and show this on the run's own page.

## States

`status` is controlled. Each page's `status` is too; the component counts
them.

| `status` | The line | Marks | Time | Under the line | Button |
|---|---|---|---|---|---|
| `searching` | "Searching…", a light band crossing it | The sites found so far | Live: "12s" | Nothing | Stop |
| `reading` | "Reading 6 of 14 sources", the count ticking in place | The sites found | Live | Nothing | Stop |
| `done` | "Read 14 sources in 48s" | Sites it read | In the summary | Nothing | None |
| `done`, some missed | "Read 11 of 14 sources in 52s" | Sites it read | In the summary | Nothing; the list says why | None |
| `failed` | "Failed after reading 6 of 14", or "Research failed" | Sites it read | Hidden | `error`, muted, never cut | Try again |
| `stopped` | "Stopped after reading 4 of 14", or "Stopped while searching" | Sites it read | Hidden | Nothing | Search again |

A button shows only when you pass its callback: `onStop` while searching or
reading, `onRetry` when failed or stopped. Stop calls `onStop`; set
`status="stopped"` once the agent has stopped, and put a page it was reading
back to `queued`, since it wasn't read.

**Pages.**

| `page.status` | Mark | Title | Status column |
|---|---|---|---|
| `queued` | Grey and faint | Muted | Empty ("Queued", or "Not read" once over, for screen readers) |
| `reading` | Full color | Foreground | The spinner, in the accent |
| `read` | Full color | Foreground | A check |
| `skipped` | Grey and faint | Muted | Empty; "Skipped: `reason`" under the site, muted |
| `failed` | Grey and faint | Muted | Empty; "Couldn’t read: `reason`" under the site, in red |

Add pages as the searches return them, in the order found, with
`status: "queued"`, so the count shows how much is left. A page that's
skipped (a repeat, off topic) or failed (a paywall, a timeout) stays in the
list with a `reason` of a few words: "Behind a paywall", "Didn’t load in
10s". The counts never quietly drop a page.

**Marks.** For a site in `brand-marks` (Wikipedia, Reddit, YouTube, the New
York Times, Medium, Substack, Quora, Pinterest and more), pass `brand` with
its name and the row draws that mark inline. Otherwise pass `favicon`: a URL
you already have, such as one your search API returned, or your own node.
Without either, or if the URL doesn't load, the site's first letter shows in
a small grey circle. Nothing is fetched from a favicon service. Map domains to brands in
your code (`"en.wikipedia.org"` to `"wikipedia"`); the component doesn't
guess.

**Searches.** `text` is the query as the agent ran it. Mark the one that's
out `status: "running"` (a light band crosses it); pass `results` once it's
back to show "8 results".

**Writing `error`.** Say what broke and what it means for the answer: "The
search service stopped answering, so 8 pages weren’t read. Copper won’t draft
the menu from 6."

**Open and closed.** Closed by default, in every state: the line says
enough to wait on. Opening it shows the searches and the sources, and they
keep filling in while open. Uncontrolled by default; pass `expanded` and
`onExpandedChange` to control it, or `defaultExpanded` to start open.

## Props

| Prop | Type | Default | |
|---|---|---|---|
| `status` | `"searching" \| "reading" \| "done" \| "failed" \| "stopped"` | | Where the research is. |
| `queries` | `ResearchQuery[]` | | `{ text, status?: "running" \| "done", results? }`, in the order run. |
| `pages` | `ResearchPage[]` | | `{ url, title?, brand?, favicon?, status, reason? }`, in the order found. `url` is the key. |
| `page.brand` | `BrandName` | | The site's mark from `brand-marks`. Wins over `favicon`. |
| `page.favicon` | `string \| ReactNode` | | A favicon URL you already have, or your own mark. Falls back to the domain's first letter. |
| `startedAt`, `finishedAt` | `number` | | `Date.now()` values, for the elapsed time and "in 48s". |
| `error` | `string` | | `failed`: what happened. |
| `agent` | `string` | `"The agent"` | Used in what screen readers hear. |
| `label` | `string` | `"Research"` | Names the group for screen readers. |
| `expanded`, `defaultExpanded`, `onExpandedChange` | | `false` | The searches and sources behind the line. |
| `onStop` | `() => void` | | A Stop button while searching or reading. |
| `onRetry` | `() => void` | | Try again when failed, Search again when stopped. |
| `now` | `number` | | A shared clock. The component then runs no timer of its own. |
| `className` | `string` | | |

`domainOf(url)` is exported too: "https://www.seasonaltable.example/menus"
gives "seasonaltable.example".

## Time

The elapsed time counts whole seconds while searching or reading and ticks
twice a second, in tabular figures. It shows only after the component mounts,
so the server and the browser render the same HTML. Once the research ends,
the time goes into the summary ("in 48s") from `finishedAt - startedAt`.

## Motion

Calm by rule: one thing moves at a time, on what's in progress only.

| What | Duration | Easing |
|---|---|---|
| Light band across "Searching…" / "Reading 6 of 14 sources" and the running query | `--ui-dur-sweep` per pass | `linear` |
| The spinner on the source being read, in the accent | three `--ui-dur-panel` per turn | `linear` |
| The count in the line changes, in tabular figures | `--ui-dur-move` (380ms) | `--ui-ease-move`, via text morph |
| A new search or source row arrives: fade only, no movement | `--ui-dur-fast` / `--ui-dur-base` | `--ui-ease-enter` |
| A new mark joins the stack | `--ui-dur-fast` fade | `--ui-ease-enter` |
| A row changes state (its mark from grey to color, its title) | `--ui-dur-instant` | `--ui-ease-color` |
| The line settles to its summary | `--ui-dur-fast` fade | `--ui-ease-enter` |
| Details open | `--ui-dur-panel` (280ms) height, `--ui-dur-fast` fade 60ms later | `--ui-ease-expand`, `--ui-ease-enter` |
| They close | `--ui-dur-base` (200ms) height, `--ui-dur-instant` fade | `--ui-ease-collapse`, `--ui-ease-exit` |
| The list grows while open | `--ui-dur-panel` | animated size |
| Chevron turns a quarter turn, right to down | `--ui-dur-base` (200ms) | `--ui-ease-glide` |

Rows only ever arrive at the end of their list and never take focus. What's
already there when it mounts doesn't animate: a finished research in an old
thread shows as it is. Under `prefers-reduced-motion: reduce`, the light bands
stop, the spinner holds still and breathes slowly instead, and heights change
at once with only a fade.

## Accessibility

- The component is a group named by `label`. The line is a button with
  `aria-expanded` that covers the whole line. It's described by what it's on
  now ("Reading Quince, en.wikipedia.org"), the missed sources ("3 sources
  couldn’t be read, so the answer leaves them out."), or the error.
- A polite `role="status"` region speaks milestones only, never each page:
  "Copper is searching the web", "Copper found 14 sources to read", then the
  summary when it ends, with the missed sources, the error, or that it
  stopped. A research that mounts already over says nothing.
- The stack of marks is decoration (`aria-hidden`). The sources are an `<ol>`
  of links that open in a new tab, each with its site and its status in
  words; the searches are an `<ol>` with their result counts.
- Status is always in words; the check, the spinner and the red only repeat
  it. The red reason is `--ui-danger-text`, at 4.5:1.
- When Stop or Try again disappears with the status change it caused, focus
  moves to the line. It never moves when focus was somewhere else.
- Closed details are `inert`. Focus shows as a ring on `:focus-visible` only.
- Nothing is cut: the settled summary, queries, titles, sites and reasons
  wrap. Under 400px wide, while it works, the marks wait for the end and Stop
  becomes its square glyph (still named "Stop"), so the line stays one line.

## Before / after

Before: a spinner and "Researching…" for a minute, then an answer with no
idea what was read or what was missed.

```tsx
{researching ? (
  <p>
    <Spinner /> Researching…
  </p>
) : (
  <Answer text={answer} />
)}
```

After: one calm line says where it is and can stop it; opening it shows the
searches, every source and which ones couldn't be read. The answer that follows cites what
it used.

```tsx
<ResearchProgress
  agent="Copper"
  label="Copper’s research"
  status={r.phase} // map your agent's phases onto the five statuses
  queries={r.searches.map((s) => ({ text: s.query, status: s.pending ? "running" : "done", results: s.hits?.length }))}
  pages={r.documents.map((d) => ({
    url: d.url,
    title: d.title,
    brand: brandFor(d.url), // your map of domains to brand-marks names, or undefined
    favicon: d.favicon,
    status: d.state, // "queued" | "reading" | "read" | "skipped" | "failed"
    reason: d.error ?? d.skipReason,
  }))}
  startedAt={r.startedAt}
  finishedAt={r.finishedAt}
  error={r.error?.message}
  onStop={() => agent.stop(r.id)}
  onRetry={() => agent.retry(r.id)}
/>
{r.status === "done" && (
  <Sources sources={answer.citations}>
    <Answer text={answer.text} />
    <SourceList />
  </Sources>
)}
```
