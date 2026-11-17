# Merge status

A pull request in one line: its number, which links out, where it stands
in its status color (draft, checks running, a check failed, conflicts,
ready, merged) and the one move it's waiting for. Once it's ready that's
Merge, in the success color, the only colored button on the screen; it
holds a busy state until the merge lands and says why if it doesn't.

```tsx
<MergeStatus
  number={8376}
  href="https://github.com/acme/web/pull/8376"
  state={state}
  checks={{ passed: 3, failed: 0, total: 5 }}
  base="main"
  onMerge={() => api.merge(session.id)}
/>
```

## When to use it

- The head of a review pane or a pull request's page: what's in the way of
  shipping, and the button that ships it.
- An agent's session that opened a pull request, so the person can merge
  without leaving it.

## When not to

- A list of many pull requests: show each one's state as a Badge in its row,
  and keep this for the one that's open.
- Checks in detail: put Tool steps (or your checks list) under it; this line
  only counts them.

## States

| State | Mark | Text | Button |
|---|---|---|---|
| `draft` | A dashed ring, text color | “Draft” | None, or your `action` (“Ready for review”) |
| `checks-running` | Tool steps' working mark: a dot breathing in a ring, accent | “Checks running · 3 of 5” (the count only with `checks`) | Merge, disabled |
| `checks-failed` | Alert, danger | “1 check failed” | Merge, disabled, or your `action` (“Fix checks”) |
| `conflicts` | Warning, amber | “Conflicts with main” | Merge, disabled |
| `ready` | Check, success | “Ready to merge” | Merge, in the success color |
| merging | as ready | as ready | Merge holds its label, then shimmers “Merging…” after 300ms; presses are ignored |
| merge failed | Alert, danger | The rejection's message | Merge, enabled again |
| `merged` | Check, text color | “Merged into main” | None |
| `closed` | Close, text color | “Closed” | None |

A new `state` clears an old failure. The text morphs between states and its
color eases, so a change reads as the same line moving on.

## Props

| Prop | What it does |
|---|---|
| `number`, `href` | The pull request's number and where it opens (a new tab) |
| `state` | One of the states above |
| `checks` | `{ passed, failed?, total }` for the running count and the failed count |
| `base` | The branch it merges into. “main” by default |
| `onMerge` | Merge. Return a promise for the busy state; a rejection's message shows in the bar |
| `mergeLabel` | “Merge” by default; “Squash and merge” for a squash-only repository |
| `action` | Takes the button's place in any state |

## Layout

One row, 40px: the button's height. The number is 13px mono, medium, on a
link pill whose padding hangs into the gap, so its text lines up with the
pane's. The state is 13px with a 14px mark. The button sits at the end.
Under 340px the separator goes and the state gives way to the button.

## Motion

| What | Duration | Easing |
|---|---|---|
| Text changing | Text morph | `--ui-ease-move` |
| Color changing | `--ui-dur-base` | `--ui-ease-color` |
| Working dot | `--ui-dur-pulse` each way, alternate | `--ui-ease-pulse` |
| Merge's busy label | after 300ms, at least 400ms | Button |

With reduced motion the dot fades instead of breathing, and colors switch at
once.

## Accessibility

- The state is a `role="status"` region, so “Ready to merge” and a failure
  are announced as they change.
- The number says it opens in a new tab.
- A disabled Merge sits beside the words that say why.
- Text on the success fill is `--ui-on-success`: white on the light theme's
  green, ink on the dark theme's lighter one.

## Before / after

Before: a green badge that says “Open” whatever the checks say, and a Merge
button that's always enabled and fails silently.

```tsx
<span className="badge green">Open</span> <button onClick={merge}>Merge</button>
```

After:

```tsx
<MergeStatus number={pr.number} href={pr.url} state={state} checks={counts} onMerge={merge} />
```
