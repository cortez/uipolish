# Terminal output

Shows a command an agent ran, or is running, and what it printed. The header
has the command in mono, how it's going and two quiet text buttons, Copy and,
while it runs, Stop. Running reads "Running" with the elapsed time ticking in
equal-width figures; once it ends, the exit code and how long it took, the
code in the danger color when it isn't 0. Output arrives line by line, each
line fading in once, and the body follows new lines only when the reader is
already at the bottom. Lines never wrap: a long one scrolls sideways, so
columns and stack traces read as printed. stderr is the same surface in
danger-tinted text.

```tsx
<TerminalOutput command="npm test" output={lines} status="running" startedAt={startedAt} onStop={stop} />
```

## When to use it

- A shell command in an agent's run: tests, a build, a lint, an install.
- Anything with an exit code whose output the person may want to read or
  copy.
- A long log that only matters at the end: fold it with `collapseAfter`.

## When not to

- Code the model wrote: use Code block. This shows what a program printed,
  not source.
- Several steps of a run, each with a short result: use Tool steps.
- Logs that grow without end. Every line is rendered; thousands need
  virtualization.
- A command the person types. This is read-only.

## Props

| Prop | Default | What it does |
|---|---|---|
| `command` | | The command as run, shown after a muted `$` |
| `output` | | A string (stdout) or `{ text, stderr? }[]`. The output so far; only append |
| `status` | | `running`, `done`, `failed` or `stopped` |
| `exitCode` | `0` when `done` | Shown as "Exit 1" once it ends; danger text when `failed` |
| `startedAt`, `finishedAt` | | `Date.now()` values. Drive the elapsed time and the duration |
| `onStop` | | Shows Stop while running. Return a promise to show "Stopping…" and, if it rejects, "Stop failed" |
| `collapseAfter` | none | Shows only the last this-many lines, with "Show all 214 lines" above |
| `maxHeight` | about 16 lines | Caps the body; it scrolls and follows new lines at the bottom |

A string `output` is cleaned before it's shown: color and cursor escape
codes are dropped, a line rewritten with `\r` (a progress bar) keeps its last
pass, and a final newline doesn't add an empty line. Copy copies the cleaned
text. `formatElapsed` and `toLines` are exported if you need the same text
elsewhere.

## States

| State | What you see | How |
|---|---|---|
| Starting | Command alone, no status and no Stop yet; the body reads "Waiting for output…" in the subtle gray | `status="running"`, under 300ms |
| Running | Breathing dot, "Running" and the elapsed time; Stop beside Copy | after 300ms, held at least 400ms; `aria-busy` |
| Done | "Exit 0" and the duration, muted | `status="done"` |
| Failed | "Exit 1" in danger text, then the duration | `status="failed"` |
| Stopped | "Stopped" and the duration | `status="stopped"` |
| No output | "No output" in the subtle gray | ended with no lines |
| stderr line | Danger-tinted text on the same surface | `{ stderr: true }`, `data-stderr` |
| Folded | The last `collapseAfter` lines, "Show all 214 lines" above; it reads "Show last 12 lines" once open | `aria-expanded` |
| Overflowing | Fades on the edge(s) that have more output; scroller becomes a tab stop | `data-fade-start`, `data-fade-end`, `tabIndex={0}` |
| Scroller focused | 2px ring around the whole card, appears instantly | `:has(.scroller:focus-visible)` |
| Stopping | Stop reads "Stopping…" if the promise takes over 300ms | `Button busy` |
| Stop failed | Stop reads "Stop failed"; the announcement says to press it again | `onStop` rejected |
| Copied | "Copy" morphs to "Copied" for 2s; "Copied to clipboard" is announced | `TextMorph`, `role="status"` |
| Copy failed | Label reads "Copy failed"; the announcement says to select and copy by hand | clipboard missing or blocked |

A command that ends inside 300ms never shows "Running" or Stop: it goes
straight from the command alone to its exit code.

## Streaming without jumping

- Output is split into lines, and each line is a memoized row keyed by its
  place in the whole output, so lines that are done never re-render, and a
  line fades in once when it lands.
- The body follows new lines only while it's scrolled to the bottom; scroll
  up and it stays where you put it. It starts at the bottom: the end of a
  command's output is what's read first.
- Horizontal position is never touched.
- Opening or closing the fold keeps the reader at the end, where they were
  reading.
- The elapsed time and the line count use tabular figures, so ticking moves
  nothing beside them.

Pass the full output so far on each update (`output={received}`), not only
the new chunk.

## Motion

| What | Duration | Easing |
|---|---|---|
| A new line fades in | `--ui-dur-base` (200ms) | `--ui-ease-enter` |
| Running dot breathes | `--ui-dur-pulse` (700ms), alternating | `--ui-ease-pulse` |
| Copy → Copied, Stop → Stopping… label morph | `--ui-dur-move` (380ms), letters out in 150ms | `--ui-ease-move` |
| Copy and Stop hover color | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Edge fades | instant | n/a |

Under `prefers-reduced-motion: reduce` lines appear without fading, the
running dot fades slowly instead of shrinking, and labels swap without
morphing. "Running" and the ticking time stay, so the state still reads.

## Accessibility

- When the output overflows, the scroller gets `tabIndex={0}`,
  `role="region"` and an `aria-label` ("Output of npm test"), so keyboard
  users can focus it and scroll with the arrow keys.
- The ticking time is hidden from screen readers; "Running" is read once. When
  the command ends, a `role="status"` region says how ("npm test failed with
  exit code 1").
- `aria-busy` is set while running, so screen readers don't read every line
  as it lands.
- Copy is named "Copy output of npm test" and Stop "Stop npm test". When Stop
  goes away because the command ended, focus moves to Copy.
- stderr is told apart by color only; the exit code says in words whether
  the command failed.
- Output uses `--ui-font-mono` in a `<code>` element with ligatures off, so
  `=>` and `!=` read as the characters printed.
- On coarse pointers the header buttons grow to 40px.

## Before / after

Before: the log is a `<pre>` that grows the page, the status is a colored
dot, a 100ms command flashes a spinner, and the view jumps to the bottom
while the reader is scrolled up.

```tsx
<div>
  {running ? <Spinner /> : <span className={code === 0 ? "green" : "red"} />}
  <pre ref={(el) => el?.scrollTo(0, el.scrollHeight)}>{log}</pre>
</div>
```

After: the exit code reads in words, busy waits 300ms, the body has its own
scroll and follows only from the bottom.

```tsx
<TerminalOutput command="npm test" output={log} status={status} exitCode={code} startedAt={start} finishedAt={end} />
```
