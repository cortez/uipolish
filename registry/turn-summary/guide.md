# Turn summary

The work behind an agent's answer, folded to one quiet line,
“› 17 tool calls, 3 messages”, with the kinds of tool it used as small
glyphs. It opens to the notes the agent wrote as it worked and the runs of
tool calls between them, each a Tool steps list. `TurnFooter` is the line
under the answer: the files it changed as chips with their diff stats, how
long it took, Copy and More.

```tsx
<TurnSummary items={turn.items} working={turn.status === "working"} />
<Markdown source={turn.reply} streaming={turn.status === "working"} />
<TurnFooter
  startedAt={turn.startedAt}
  finishedAt={turn.finishedAt}
  working={turn.status === "working"}
  copyText={turn.reply}
  files={turn.files}
  onOpenFile={openDiff}
  menu={<MenuItem onSelect={copyPrompt}>Copy prompt</MenuItem>}
/>
```

## When to use it

- A coding agent's turn: dozens of reads, searches and edits that most
  people skim past to the answer, but must be able to check.
- Any agent whose answer is what people read and whose steps are what they
  audit.

## When not to

- A handful of steps that are the answer (a run's trace): show Tool steps
  open.
- The model's reasoning: use Reasoning.
- A reply with no tools: leave the summary out and keep the footer.

## Parts

| Part | What it is |
|---|---|
| `TurnSummary` | The folded line and what it opens to |
| `TurnFooter` | Files changed, time, Copy and More, under the answer |
| `describeTurn` | `items` → “17 tool calls, 3 messages” |
| `TurnItem` | `{ kind: "message", id, text }` (Markdown) or `{ kind: "steps", id, steps, label? }` |
| `TurnStep` | A Tool steps `ToolStep` with an `icon` (an icon set name) for the line's glyphs |

## Props

`TurnSummary`:

| Prop | What it does |
|---|---|
| `items` | Notes and runs of steps, in order |
| `working` | The line shimmers and its count morphs as calls arrive; “Getting started” before the first |
| `open`, `defaultOpen`, `onOpenChange` | Folded by default |
| `onRetry` | A failed step's Retry |
| `label` | Names the opened group for screen readers |

`TurnFooter`:

| Prop | What it does |
|---|---|
| `startedAt`, `finishedAt` | “Took 1m 12s”; while `working`, “Working · 14s” counting up |
| `copyText` | What Copy puts on the clipboard. Left out, no Copy |
| `files` | `FileChange[]`, as chips |
| `onOpenFile` | A chip was pressed. Without it chips are text |
| `menu` | Dropdown menu items for More. Left out, no More |

## States

| State | What you see | How |
|---|---|---|
| Folded | Chevron pointing right, the count, up to four glyphs | |
| Open | The chevron turns a quarter; notes and step runs open below a hairline from the chevron | `aria-expanded` |
| Working | The line shimmers; the count morphs as calls arrive | `working` |
| A step failed | “A step failed” in danger beside the count | a `failed` step |
| Footer while working | “Working · 14s”, no Copy or More | `working` |
| Copied | Copy turns into a check for 2s; “Copied” announced | |
| Copy failed | “Couldn't copy. Select the text instead.” in danger | clipboard refused |

## Motion

| What | Duration | Easing |
|---|---|---|
| Chevron's quarter turn | `--ui-dur-base` | `--ui-ease-glide` |
| Opening | `--ui-dur-panel`; content fades in half a beat after | `--ui-ease-expand` |
| Closing | `--ui-dur-base`; content fades out first | `--ui-ease-collapse` |
| Count changing | Text morph | |
| Shimmer | `--ui-dur-sweep`, linear | |

Reduced motion: the fold switches at once and the shimmer stops.

## Accessibility

- The line is a button with `aria-expanded` and `aria-controls`; the folded
  content is `inert`, so it's out of the tab order.
- The glyphs are decoration; the count says it in words.
- Copy and More are named (“Copy answer”, “More for this answer”); chips read
  their file name, path and change.

## Before / after

Before: every tool call printed in full above the answer, so the answer is a
scroll away and the steps are noise.

```tsx
{turn.steps.map((s) => <div key={s.id}>{s.title}</div>)}
<p>{turn.reply}</p>
```

After:

```tsx
<TurnSummary items={turn.items} />
<Markdown source={turn.reply} />
<TurnFooter files={turn.files} copyText={turn.reply} finishedAt={turn.finishedAt} startedAt={turn.startedAt} />
```
