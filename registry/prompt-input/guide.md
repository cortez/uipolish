# Prompt input

The composer at the bottom of a chat. A textarea that grows with its text and
then scrolls, a toolbar with an attach button, a slot for your own controls
and a send button that turns into Stop while a reply streams. Files can be
pasted, dropped or picked, and show as chips above the text.

```tsx
<PromptInput
  placeholder="Ask about the menu, the shopping, the timing…"
  suggestions={messages.length === 0 ? suggestions : undefined}
  streaming={status === "streaming"}
  onStop={stop}
  onSubmit={({ text, files }) => send(text, files)}
  accept="image/*,.pdf,.csv"
  footer={<ModelPicker />}
/>
```

## When to use it

- The input of any chat or assistant: a support thread, a planning assistant,
  a "ask about this document" panel.
- Anywhere a user writes a multi-line request and an answer streams back.

## When not to

- A one-line search or command box: use a text field or a command palette.
  Enter-to-send with Shift+Enter for new lines is a chat convention, and it
  surprises people in a form.
- Long-form writing (a post, an email): a full editor with visible formatting
  and an explicit Send button is the honest choice.
- Uploads that need progress, retries or server validation per file. This
  component holds `File` objects until send; upload them in `onSubmit` and
  show progress in the message.

## States

| State | What you see | How |
|---|---|---|
| Empty | Placeholder, send button as a quiet gray circle with a gray arrow | `data-state="empty"`, `aria-disabled` |
| Ready | Send fills with the text color the moment there's non-whitespace text or a file | `data-state="ready"` |
| Focused | The whole composer gets a darker hairline and a 4px soft halo, instantly | `:focus-within` |
| Growing | The textarea grows a row at a time up to `maxRows` (8), then scrolls | `field-sizing: content`, JS fallback |
| Streaming | Send becomes a "■ Stop" pill; Esc stops too. The textarea stays editable | `streaming` |
| Attachments | Image chips are fixed 56×56 thumbnails that fade in; files show name, type and size | paste, drop, or the + button |
| Dragging files | A dashed outline and "Drop files to attach" over the composer | `data-dragging` |
| Rejected file | The hint line turns red and says which file and why, for 5 seconds | `accept`, `maxFiles` |
| Suggestions | Prompt chips above the composer that fill the text, never send | `suggestions` |
| Disabled | 50% opacity, default cursor | `disabled` |

**Why the empty send button isn't faded.** A black button at 50% opacity looks
broken. A gray fill with a gray arrow reads as "waiting for text", and it fills
in on the first character. Pressing it does nothing and puts the focus back in
the textarea.

**Keys.** Enter sends. Shift+Enter inserts a newline. Enter that confirms an
IME candidate (Japanese, Chinese, Korean input) never sends: the component
checks `isComposing`, `keyCode === 229` (what Safari reports right after
`compositionend`) and its own composition flag. Escape stops a streaming
reply and doesn't bubble, so a surrounding dialog stays open. Enter while a
reply streams does nothing; the draft is kept for when it finishes.

**No jump on the first keystroke.** The textarea renders with `rows={1}` and a
one-row min height. With `field-sizing: content`, an empty field sizes to its
placeholder, so a placeholder that wrapped would make the empty field two rows
tall and snap to one when you start typing. The placeholder is kept on one
line with an ellipsis to prevent that. Where `field-sizing` isn't supported,
the height is set from `scrollHeight` in a layout effect, before paint.

## Motion

| What | Duration | Easing |
|---|---|---|
| Composer border on hover | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Focus edge | 0ms, never animated | n/a |
| Arrow retracts into its tip, stop block sweeps in (`Icon` send → stop) | see the icon set's guide | |
| "Stop" label and pill width | `--ui-dur-move` (380ms) via TextMorph | `--ui-ease-move` |
| Chip in | `--ui-dur-fast` (160ms), fade, scale from 0.97 | `--ui-ease-enter` |
| Chip out | `--ui-dur-instant` (120ms), fade, scale to 0.97 | `--ui-ease-exit` |
| Chips after a removed one slide over | `--ui-dur-move` (380ms), FLIP | `--ui-ease-move` |
| Thumbnail fade-in on load | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Suggestions in, as one group | `--ui-dur-fast` (160ms), 4px rise | `--ui-ease-enter` |
| Drop overlay | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Hint and notice trade places: text fades in, color eases | `--ui-dur-fast` (160ms) | `--ui-ease-enter`, `--ui-ease-color` |
| Press | 0ms to `--ui-scale-press` (0.985), snaps back over 250ms | `--ui-ease-snap` |

Under `prefers-reduced-motion: reduce` chips and suggestions appear without
moving, removals are instant, the icon swap is a crossfade and nothing scales
on press.

The textarea's height isn't animated. It changes as you type, and any easing
there would make typing feel late.

## Layout

- Composer padding is 8px, so the 34px round buttons sit concentric with the
  25px corner (17 + 8). Text starts 20px in. Chips are inset 12px and take a
  13px radius.
- The line under the composer is centered. It shows `hint` if you pass one;
  with attachments on it's kept, empty, so a rejection notice never moves
  the page.
- The root pads its bottom by `env(safe-area-inset-bottom)`, so a composer
  pinned to the bottom of a phone screen clears the home indicator. Add
  `viewport-fit=cover` to your viewport meta for the inset to be non-zero.
- Put it below the thread in a column (`grid-template-rows: minmax(0, 1fr)
  auto`) so the thread shrinks as the composer grows.

## Accessibility

- The textarea is named by `label` ("Message") and described by the hint or
  notice when there is one.
- The send button's name follows its state: "Send message" or "Stop
  generating". When there's nothing to send it's `aria-disabled`, not
  `disabled`, so it stays focusable and doesn't vanish from the tab order.
- Every icon button has a name: "Attach files", "Remove seating-chart.png".
- Adding, removing and rejecting files is announced in a `role="status"`
  region. Removing a chip moves focus to the next chip's remove button, then
  the previous one, then the textarea.
- Drag and drop always has a keyboard path: the attach button opens the
  file picker.
- The remove button is an X over the chip's icon tile (or the whole
  thumbnail), so it never sticks out past the chip. It shows on hover with a
  mouse and is always visible on touch and on focus. Every button has a 40px
  hit area on coarse pointers.
- The textarea is 16px on touch devices so iOS doesn't zoom into it.

## Before / after

Before: Enter sends in the middle of typing a Japanese word, the button is a
faded black circle that looks broken, and the textarea is fixed at three rows.

```tsx
<textarea rows={3} value={text} onChange={(e) => setText(e.target.value)}
  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
<button disabled={!text} onClick={send}>↑</button>
```

After: IME-safe Enter, a growing field, an honest empty state, and Stop while
the reply streams.

```tsx
<PromptInput
  streaming={streaming}
  onStop={stop}
  onSubmit={({ text, files }) => send(text, files)}
/>
```

Before: a suggestion chip sends immediately, so a misclick asks the assistant
something the user didn't mean.

```tsx
<button onClick={() => send("Plan a dinner for 14 guests")}>Plan a dinner for 14 guests</button>
```

After: it fills the composer and puts the caret at the end, so the user can
add "on Saturday, two are vegetarian" before sending.

```tsx
<PromptInput suggestions={["Plan a dinner for 14 guests", "Make the shopping list"]} onSubmit={send} />
```
