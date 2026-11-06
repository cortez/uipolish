# Response actions

The row under an assistant reply: Copy, thumbs up, thumbs down and Retry.
Copy turns into a check. The thumbs fill when pressed and only one can be.
A thumbs down can ask "What went wrong?" in a small field that opens in
place under the row.

```tsx
<ResponseActions
  text={reply.markdown}
  rating={reply.rating}
  onRate={(rating) => saveRating(reply.id, rating)}
  onComment={(comment) => saveComment(reply.id, comment)}
  onRetry={() => regenerate(reply.id)}
/>
```

## When to use it

- Under each finished assistant reply in a chat or an assistant panel.

## When not to

- Under a reply that is still streaming: render the row hidden (keep its
  space with `visibility: hidden`) and show it when the reply ends, so the
  text doesn't jump.
- For a long feedback form or categories to pick: open a dialog instead.

## States

| State | What you see | How |
|---|---|---|
| Rest | Four muted 16px icons on 32px round buttons | |
| Hover | Icon darkens, a 6% fill appears | `@media (hover: hover)` |
| Press | The fill darkens and shrinks to `--ui-scale-press` (0.985) at once; the icon never moves | `:active` on `::before` |
| Copied | The front sheet's outline runs into a check; back to the sheets after 2s | `Icon name="check"` |
| Copy failed | "Couldn’t copy. Select the text instead." in red at the end of the row | clipboard rejected or missing |
| Rated | The thumb fills in. Pressing the other thumb moves the rating; pressing the same one clears it | `aria-pressed` |
| Thanked | "Thanks for the feedback" fades in at the end of the row for 3s | |
| Asking | After a thumbs down, a field opens under the row with Send inside it and a close button beside it | `onComment`, `aria-expanded` |
| Send waiting | Send is a quiet gray pill until there's text | `aria-disabled` |

The rating is recorded the moment a thumb is pressed. The comment is extra:
closing the field keeps the thumbs down.

## Keyboard

| Key | Where | Does |
|---|---|---|
| Enter, Space | Any button | Press it |
| Enter | Field | Send the comment, close the field, focus back on thumbs down |
| Escape | Field | Close the field without sending, focus back on thumbs down |

A thumbs down moves focus into the field it opened, so typing goes where
the user expects.

## Motion

| What | Duration | Easing |
|---|---|---|
| Copy ↔ check | `--ui-dur-move` | `--ui-ease-move` (from the icon set) |
| Thumb fills or empties | `--ui-dur-instant` | `--ui-ease-color` |
| Press in / release | 0ms / `--ui-dur-snap` | `--ui-ease-snap` |
| Field opens (rows 0fr → 1fr) | `--ui-dur-base` | `--ui-ease-enter` |
| Field closes | `--ui-dur-fast` | `--ui-ease-collapse` |
| Field content fades in with the box | `--ui-dur-fast` | `--ui-ease-enter` |
| Note fades in / out | `--ui-dur-fast` / `--ui-dur-instant` | `--ui-ease-enter` / `--ui-ease-exit` |

Place the row 16px under the reply (`--ui-space-4`), as Message thread and
Chat app do. Only the field's height animates, and only what follows the reply moves.
The row itself never shifts. Under `prefers-reduced-motion: reduce` the
field opens at once, presses don't scale, and the copy icon swaps.

## Accessibility

- Every icon button has a name: "Copy response", "Good response", "Bad
  response", "Retry". Tooltips repeat the name for pointer users and don't
  describe the button a second time.
- "Copied", "Thanks for the feedback" and a copy failure go to a
  `role="status"` region; the visible note itself is `aria-hidden` so it
  isn't read twice.
- The thumbs are toggle buttons (`aria-pressed`). Thumbs down also has
  `aria-expanded` and `aria-controls` when it opens the field.
- The closed field is `inert`, so it's out of the tab order.
- 40px hit areas and 8px gaps on coarse pointers; the field is 16px there so
  iOS doesn't zoom into it.

## Before / after

Before: the copy icon swaps instantly with no announcement, both thumbs can
look pressed, and thumbs down opens a modal for an optional comment.

```tsx
<button onClick={copy}>{copied ? <Check /> : <Copy />}</button>
<button onClick={() => setUp(!up)}><ThumbUp /></button>
<button onClick={() => { setDown(!down); openFeedbackModal(); }}><ThumbDown /></button>
```

After:

```tsx
<ResponseActions text={reply} onRate={rate} onComment={comment} onRetry={retry} />
```
