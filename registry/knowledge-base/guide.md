# Knowledge base

The screen where a team gives its AI agent something to answer from: the
documents, sites and app folders behind retrieval (RAG). There are three ways
in: upload files by drop or browse, add a page or sitemap, or connect Google
Drive, Notion or Dropbox. Each source then moves through **reading →
chunking → indexing → ready**, or **failed** with a reason and Retry. A list
of 40 files shows on one batch sheet, and a test panel shows which passages
a question retrieves.

Over six sources, the filters (a segmented control) and the search share a
row at the field's height, 40px (`--ui-control-md`): controls in one row
share one height.

A source in progress is the accent, ready is green and failed red, and that
color runs through the row: the pill, the turning glyph, and a line along
the row's foot that travels as the source moves forward. Pages, chunks and tokens tick up in boxes that
hold their width, so nothing beside them moves.

```tsx
<KnowledgeBase
  agentName="Copper"
  sources={sources}            // [{ id, name, kind, status, progress?, error?, pages?, chunks?, tokens?, syncedAt? }]
  usage={{ used: 370, limit: 500, unit: "pages" }}
  batch={batch}                // { sourceIds, startedAt, finishedAt? } while a set of files is read
  connected={{ googledrive: "mara@saturdaysupper.co" }}
  onAddFiles={(files) => api.upload(files).then(refresh)}
  onReplaceFile={(id, file) => api.replace(id, file).then(refresh)}
  onAddWebsite={(url, { crawl }) => api.post("/sources/web", { url, crawl }).then(refresh)}
  onConnect={(service) => oauth.open(service).then(picker.choose).then(refresh)}
  onResync={(id) => api.post(`/sources/${id}/sync`).then(refresh)}
  onRetry={(ids) => api.post("/sources/retry", { ids }).then(refresh)}
  onRemove={(id) => api.delete(`/sources/${id}`).then(refresh)}
  onTest={(question) => api.post("/retrieve", { question, k: 4 })}
  testSuggestions={["Is the tasting menu nut-free?", "Where can guests park?"]}
  onUpgrade={() => router.push("/settings/billing")}
/>
```

## When to use it

- An agent or assistant that answers only from material the customer
  gives it, and the people who set it up need to see what it knows.
- Ingest that takes seconds to minutes per source, where people watch it
  happen and need to know what failed and why.
- A plan limit on pages, chunks or tokens.

## When not to

- Files attached to one message or task. That's `prompt-input` with
  attachments, or `file-upload` in a form.
- Managing the agent's tools and servers: `connections`.
- Search analytics, evaluation runs or chunking settings. Link to them; this
  screen answers "what does it know, and does it find the right thing".

## States

| State | What shows |
|---|---|
| First run (`sources` is `[]`) | "Give Copper something to answer from", one line, and the three ways in as cards: a drop zone, a website form, and the apps. No list, no test panel |
| Ready | Sources with their counts and "Synced 2 hours ago", the plan meter, the test panel. Over 6 sources: filters (All, In progress, Failed) and a search |
| A source `queued` | Grey pill "Queued", "Waiting its turn" |
| `reading` / `chunking` / `indexing` | The pill in the accent, naming the stage, with a turning arc; the line along the row's foot travels through the three stages (`progress` moves it within one); counts tick up in held boxes |
| `ready` | Green pill with a check that lands with a small snap; the line fills and fades |
| `failed` | Red pill, and under the name, the `error` in a tinted box with **Retry** |
| Many files at once (`batch`) | `BatchProgress` above the list: "Reading 40 files", 14 of 40, time left, current file, Stop (`onStopBatch`) |
| Some failed (2 of 40) | The sheet reads "Added 38 of 40 files", lists the two with their reasons and **Retry 2**; the rows say the same, and the Failed filter shows 2 |
| Unsupported type | Warning above the list: "Seating plan.pages wasn't added. .pages files can't be read. Save it as PDF, DOCX, Markdown, or CSV and add it again." |
| Duplicate file | Same notice: "Already here, synced 2 hours ago. Replace it if this copy is newer." with **Replace** (`onReplaceFile`) |
| Too large / empty | "Too large at 64 MB. Up to 50 MB: split it, or export just the pages that matter." / "This file is empty." |
| Near the limit (80%) | Amber meter, "62 pages left. A long PDF may not fit." |
| Over the limit | A warning banner "Copper's knowledge base is full" with **Upgrade plan**; the meter is red; the add panel says what to remove; drops are refused. Sources already here keep working |
| Viewer (`readOnly`) | Info banner with your reason; no Add, Retry, Re-sync or Remove. Testing still works |
| Upload pending / failed | The drop zone shimmers "Uploading 3 files…" after 300ms; a failure shows an error notice with **Try again** for the same files |
| Test: idle / searching / results / nothing / failed | A line on what it shows / "Searching 10 sources…" in the reserved space / the answer and the passages / "Nothing matched … Copper would say it doesn't know" / the error with **Try again** |
| Test, nothing ready yet | "Testing opens once a source is ready." |
| Loading / didn't load | "Loading sources…" in a card the list's height / an empty state with **Try again** (`onReload`) |
| Long names | Wrap; nothing is cut. Passages show in full |

## Props

| Prop | What it does |
|---|---|
| `sources` | `{ id, name, kind, location?, href?, status, progress?, error?, pages?, chunks?, tokens?, syncedAt? }[]`. `kind` is `"file"`, `"website"`, `"googledrive"`, `"notion"` or `"dropbox"`. `status` is `"queued"`, `"reading"`, `"chunking"`, `"indexing"`, `"ready"` or `"failed"` |
| `usage` | `{ used, limit, unit? }`. Warns at 80%, blocks adding at 100% |
| `batch` | `{ sourceIds, startedAt?, finishedAt? }`: files added together, for the sheet. Clear it when you like; keep it while some failed |
| `services`, `connected` | Apps offered (default all three) and the ones already connected, with the account to show |
| `accept`, `acceptLabel`, `maxFileSize` | Default `".pdf,.docx,.md,.csv"`, "PDF, DOCX, Markdown or CSV", 50 MB |
| `onAddFiles(files)` | Only files that passed type, size and duplicate checks. Resolve once they're in `sources` |
| `onReplaceFile(sourceId, file)` | From a duplicate's **Replace**. Leave out and duplicates are only skipped |
| `onAddWebsite(url, { crawl })` | `url` normalized to https. A `sitemap*.xml` always crawls |
| `onConnect(service)` | Open sign-in and the folder picker. Also "Add a folder" once connected |
| `onResync(id)`, `onRetry(ids)`, `onRemove(id)` | Row actions. Remove asks first |
| `onStopBatch()` | Shows Stop on the sheet |
| `onTest(question)` | Resolve `{ answer?, chunks: [{ id, sourceId, location?, text, highlights?, score }] }`, best first. `highlights` are `[start, end)` ranges in `text` |
| `testSuggestions` | Questions to try, one tap each |
| `onUpgrade()` | Shows **Upgrade plan** when full |
| `readOnly` | A sentence: why, and who can change it |
| `loading`, `error`, `onReload` | Whole-screen loading and failure |
| `agentName` | For sentences. Default "Your agent" |
| `now`, `locale` | For "Synced 2 hours ago"; pass `now` from the server so both render alike |
| `pageSize` | Rows before "Show n more". Default 12 |
| `title`, `description`, `headingLevel` | Default "Knowledge base", none, 1 |

Every callback can return a promise: its control shows busy until it
settles, and a rejection's message shows where it was pressed. The block
never changes data itself; resolve once `sources` reflects the change.

## Customizing

- **Stages.** Use the four your pipeline has, mapped onto `reading`,
  `chunking` and `indexing`; send `progress` within a stage if you know it,
  so the line moves smoothly. The stage colors are `--kb-reading`,
  `--kb-chunking` and `--kb-indexing` on `.root`, all the accent by default.
- **Errors.** Write `error` as what happened and what fixes it: "Password
  protected. Upload a copy without the password.", not "Parse error".
- **The limit.** Set `usage.unit` to what you bill: pages, chunks or
  tokens.
- **File types.** Change `accept` and `acceptLabel` together; the rejection
  says to save as `acceptLabel`.
- **Test results.** `answer` is optional. Showing only the passages is often
  more honest while people tune their sources.
- **Widths.** The test panel sits beside the list once the block is 900px
  wide; website and apps sit side by side at 620px. Both are container
  queries, so the block lays out right in a narrow settings column.
- **Spacing.** The title sits `--ui-gap-block` above the content, and the
  sources and the test panel sit `--ui-gap-block` apart (16 narrow, 32 from
  760px).

## Layout

On a phone (the screen under 420px) a source's status pill wraps under its
name and lines up with it, and the filter's labels stay on one line,
scrolling inside the track if the screen is narrower still.

## Accessibility

- One heading at `headingLevel`; Sources and Test it one below, each add
  card one below that.
- **Add sources** is a disclosure button (`aria-expanded`) for the panel;
  the plus turns into a close as it opens. The closed panel is `inert`.
- The drop zone is a real button that opens the file picker; its prompt and
  constraints are its name and description. Dropping is never the only way.
- Each row's status is text ("Indexing"), not color alone; failed rows
  describe the pill with their error. Row menus are named "Actions for
  Autumn tasting menu.pdf".
- Remove is an alert dialog naming the source and what stops, with focus on
  Cancel; afterwards focus goes to the Sources heading.
- A polite status region announces what lands: "3 files added. Copper
  starts reading them now.", "2 files weren't added…", "4 passages from 3
  sources. Best match first." The batch sheet announces its own milestones,
  not every file.
- The usage bar is `role="meter"` with "370 of 500 pages used".
- Passages are an ordered list; matched words are `<mark>`.
- Reduced motion: the arc stops turning and breathes, the line jumps to its
  place, and rows fade instead of opening.
- Buttons are the standard 40px; only a source's “…” menu is small, and it
  reaches 40px under a finger.

## Before / after

Before: an upload input, a table of file names with a "processing" string,
and nothing when a file fails. People find out from a wrong answer.

```tsx
<input type="file" multiple onChange={upload} />
<table>{docs.map((d) => <tr key={d.id}><td>{d.name}</td><td>{d.status}</td></tr>)}</table>
```

After: three ways in, each source's stage in words and color, failures that
say what to do with Retry, a plan meter, and a test panel that shows what a
question retrieves.

```tsx
<KnowledgeBase
  agentName="Copper"
  sources={sources}
  usage={usage}
  batch={batch}
  onAddFiles={upload}
  onAddWebsite={addSite}
  onConnect={connect}
  onRetry={retry}
  onRemove={remove}
  onTest={retrieve}
/>
```
