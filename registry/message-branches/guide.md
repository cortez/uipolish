# Message branches

A message with more than one version: a reply that was regenerated, or a
prompt the person edited. The version on screen sits above a small
"‹ 2 / 3 ›" switcher with an optional note about it ("Regenerated · Deep").
Stepping slides the old version out and the new one in from the side you
moved toward, and the box eases to the new height.

```tsx
<MessageBranches
  versions={reply.versions.map((v) => ({
    id: v.id,
    content: <Markdown>{v.text}</Markdown>,
    note: v.note,
  }))}
  index={reply.shown}
  onIndexChange={(i) => showVersion(reply.id, i)}
/>
```

## When to use it

- Under an assistant reply that has been regenerated, so the earlier
  answers stay one press away.
- Under a user message that was edited and sent again (`align="end"`, so
  the switcher sits under the bubble's edge).

## When not to

- A message with one version: pass it anyway and the switcher stays out
  (nothing renders under it), or render the content on its own.
- Comparing versions side by side, or more than a handful of them: show a
  list or a diff instead; stepping one at a time hides what changed.
- A reply that is still streaming: render the new version only once it
  ends, or keep the switcher's space and step to it when it does.

## Props

| Prop | What it does |
|---|---|
| `versions` | `{ id, content, note? }[]`, oldest first. `content` is any node; `note` is one line, cut with an ellipsis if it doesn't fit. |
| `index` | Controlled: the version shown, from 0. Pass it when the rest of the thread depends on it (an edited prompt has its own replies below). |
| `defaultIndex` | Uncontrolled start. Defaults to the newest version. |
| `onIndexChange` | Called with the new index when the person steps. |
| `align` | `"start"` (default) under a reply; `"end"` under a user bubble, with the note on the far side of the switcher. |
| `className` | On the root. |

## States

| State | What you see | How |
|---|---|---|
| Rest | Muted 16px chevrons on 32px capsules around "2 / 3" in 12px text, its figures tabular; the note after it in the same muted 12px | |
| Hover | The chevron darkens, a 6% fill appears | `@media (hover: hover)` |
| Press | The fill darkens and shrinks to `--ui-scale-press`; the chevron never moves | Button `:active` |
| First / last | Previous or Next at 50% with no hover or press. It stays focusable, so focus doesn't drop to the page when you reach the end | `aria-disabled` |
| Stepping | The old version slides 16px away and fades on the instant step, the new one slides in from the other side and fades in half a beat later; the box eases to its height; the number morphs; the notes trade places in one cell | |
| One version | Content only, no switcher | `versions.length === 1` |

Each number holds the width of the total's digits in tabular figures, so
"9 / 12" → "10 / 12" never moves Next. The switcher keeps to its edge and
the note sits on the far side of it, so a longer note never moves the
buttons.

## Keyboard

| Key | Where | Does |
|---|---|---|
| Tab | Switcher | Previous, then Next |
| Enter, Space | Previous, Next | Step one version; at the ends, nothing |

Focus stays on the button you pressed while the content changes above it.

## Motion

| What | Duration | Easing |
|---|---|---|
| Version slides 16px (in and out) | `--ui-dur-glide` | `--ui-ease-glide` |
| Old version fades out | `--ui-dur-instant` | `--ui-ease-color` |
| New version fades in, after half the instant step | `--ui-dur-fast` | `--ui-ease-enter` |
| Height grows / shrinks (Animated size) | `--ui-dur-panel` / `--ui-dur-base` | `--ui-ease-expand` |
| Number changes (Text morph) | `--ui-dur-glide` | `--ui-ease-glide` |
| Note out / in | `--ui-dur-instant` / `--ui-dur-fast` | `--ui-ease-color` / `--ui-ease-enter` |
| Press in / release | 0ms / `--ui-dur-snap` | `--ui-ease-snap` |

The glide spring lands without passing its place, so a version never
swings past the edge. Stepped again mid-slide, the version leaves from
where it visibly is. The content is clipped sideways only while it slides,
so focus rings and shadows inside it aren't cut at rest and a scrolling
thread never shows a horizontal scrollbar for a frame. On the start side,
where every line begins, the clip edge stands one slide (16px) out, so a
version arriving from there is never cut through its first letters. A note
that arrives with a new version (a retry) fades in like the others.
Nothing animates on mount. Under `prefers-reduced-motion: reduce` the versions crossfade in
place, the height changes at once and the number swaps.

## Layout

The switcher row sits 16px under a reply (`--ui-space-4`), the same as
Response actions, and 8px under a user bubble, whose fill already makes an
edge. Only the 16px icons and the text take layout space; the 32px buttons
overflow it, so the row lines up with the content's edge. Set
`--branches-gap` on the root to change the space above the row.

Under a reply, put Response actions after Message branches and give it the
shown version's text, so Copy and the rating follow the version on screen:

```tsx
<MessageBranches versions={versions} index={shown} onIndexChange={setShown} />
<ResponseActions text={texts[shown]} onRetry={regenerate} />
```

## Accessibility

- Previous and Next are real buttons named "Previous version" and "Next
  version", with tooltips that repeat the name for pointer users.
- The switcher is a group named "Versions". Its counter reads "Version 2 of
  3"; the visible digits are `aria-hidden`.
- A step is announced politely ("Version 2 of 3") from a `role="status"`
  region; focus stays on the button.
- The leaving version is `aria-hidden` and `inert` while it fades, so it's
  never read or tabbed into.
- Notes for the versions not shown are `aria-hidden`; the current one is
  read as text.
- Small buttons take a 40px touch target on coarse pointers.

## Before / after

Before: the content snaps, the page below jumps to the new height, the
counter changes width and nothing is announced.

```tsx
<div>{versions[i].content}</div>
<button disabled={i === 0} onClick={() => setI(i - 1)}>‹</button>
{i + 1}/{versions.length}
<button disabled={i === versions.length - 1} onClick={() => setI(i + 1)}>›</button>
```

After:

```tsx
<MessageBranches versions={versions} />
```
