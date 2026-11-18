# Message thread

A chat transcript. User messages are soft bubbles on the right; assistant
replies are plain full-width text. While a reply streams, only the words that
just arrived fade in, and the thread follows the bottom until the user scrolls
up to read. Each finished reply gets Copy, Retry and a thumbs up or down, and
screen readers hear it once, when it's done.

```tsx
<MessageThread label="Dinner planning conversation" empty={<EmptyState />}>
  {messages.map((m) => (
    <Message
      key={m.id}
      from={m.role}
      text={m.text}
      status={m.status} // "streaming" | "complete" | "stopped" | "error"
      onRetry={() => regenerate(m.id)}
      feedback={m.feedback}
      onFeedback={(value) => rate(m.id, value)}
    />
  ))}
</MessageThread>
```

Files: `message-thread.tsx` (thread, message, actions), `streaming-text.tsx`
(the word fade), `use-stick-to-bottom.ts` (scroll), `markdown.tsx` (the tiny
parser). Pair it with `prompt-input` below it.

Pass `actions={false}` to leave the row out, or a node to replace it, for
example `actions={<ResponseActions text={reply} onRetry={retry} />}` when a
reply needs a comment field or more than the default three.

## When to use it

- Any conversation with a model or an agent where replies stream in: a
  planning assistant, support chat, "ask about this document".
- Human-to-human chat works too; leave `status` at "complete".

## When not to

- Rich replies with tables, headings, links or code blocks: the built-in
  parser only knows paragraphs, lists, `**bold**` and `` `code` ``. Render
  them with markdown and pass it as `children`:
  `<Message from="assistant" status={status} copyText={reply}><Markdown source={reply} streaming={status === "streaming"} /></Message>`.
  Any other renderer works the same way. You keep the layout, actions, states and scroll; you lose
  the per-word fade, since the component can't see words inside your tree.
- A feed or comment list that isn't a conversation. `role="log"` tells screen
  readers to read additions aloud, which is noise anywhere else.

## States

| State | What you see | How |
|---|---|---|
| Empty | Your `empty` content, centered | no children |
| Thinking | "Thinking" in the muted color with a light band passing across, on the line the reply starts on | `status="streaming"`, `text=""` |
| Streaming | Words fade in as they arrive; no caret, the fading words mark the end | `status="streaming"` |
| Complete | The last words finish fading; actions appear under the reply | `status="complete"` |
| Stopped | The partial reply, then "You stopped this reply." in subtle text; actions stay, Retry included | `status="stopped"` |
| Error | The partial reply, a hairline, the error in red with a Retry button | `status="error"`, `error`, `onRetry` |
| Scrolled up | "Jump to latest" pill floats above the composer, with the field edge color (`--ui-border-strong`) like a button | user scrolled away from the bottom |
| Copied | The copy icon turns into a check and "Copied" grows out of it for 2s | Copy action |
| Rated | The thumb fills in; pressing it again clears it | `aria-pressed` |

**What an error says.** What happened, in a sentence: "The connection dropped
before this reply finished." Not "Error 502", not "Oops". The partial text
stays on screen so nothing the user already read disappears.

**Where actions show.** With a mouse, on hover or when a button inside has
focus. Always on the last reply, on touch, and while a rating or "Copied" is
showing. Their row is reserved during streaming, so finishing a reply doesn't
push anything down.

## How streaming text works

1. **One update per frame.** Tokens can land many times between two frames.
   The text on screen is copied from the latest prop at most once per
   `requestAnimationFrame`, and the parse is memoized on that string.
2. **Whole words only.** While streaming, the text is cut at its last
   whitespace, so "Shop" never appears and then grows into "Shopping".
   Unclosed `**` and `` ` `` style the rest of the line instead of showing as
   literal characters.
3. **Batches by offset.** Each frame's addition is recorded as a source range
   and a timestamp. A word whose end falls in a batch from the last second is
   rendered as a span with a one-shot `opacity` entrance; every
   other word is a plain text node. The decision comes from offsets, not from
   React mounts, so when a closing `**` moves words into a `<strong>`, they
   don't replay. Text that was already on screen is never animated again.
4. **Settle.** A second after streaming ends, the animated tree is replaced
   by a plain one. Long threads keep almost no extra spans.

## How the scroll works

- **Stuck is a ref.** It changes on every wheel tick and shouldn't render.
- **Following growth.** A `ResizeObserver` on the content pins `scrollTop`
  to the bottom. Its callback runs after layout and before paint, so no
  frame is drawn at the old position, and there's no smooth scroll chasing a
  moving target. That's why it doesn't jitter as lines arrive.
- **Letting go.** The intent is caught at the input, before the scroll
  happens: wheel up, a finger dragging down, ArrowUp / PageUp / Home /
  Shift+Space. Any other scroll that moves up (dragging the scrollbar,
  find-in-page) also releases. Distance from the bottom alone doesn't:
  content can grow and fire a scroll before the next pin, and that must not
  read as the reader leaving.
- **Sticking again.** Scrolling to within 8px of the bottom, pressing End,
  sending a message, or the pill. The pill smooth-scrolls, and on `scrollend`
  finishes any distance the reply grew during the scroll instantly.
- **`overflow-anchor` stays `auto`.** Scroll anchoring isn't used to follow
  the bottom (Safari doesn't support it, and it can't be told to let go). It
  stays on because it's what keeps the paragraph the user is reading still
  when something above it changes height after they've scrolled up.

## Motion

| What | Duration | Easing |
|---|---|---|
| New words: opacity | `--ui-dur-base` (200ms), up to 180ms stagger within one frame's words, in reading order | `--ui-ease-enter` |
| Thinking band | `--ui-dur-sweep` per pass | `linear` |
| Sent message in: fade and 4px rise | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Jump pill in: fade, 4px rise | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Jump pill out | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Jump arrow nudges 1px down on hover or focus (`Icon` arrow-right) | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Actions reveal on hover | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Copy outline runs into a check (`Icon` copy → check) | see the icon set's guide | |
| "Copied" label | `--ui-dur-move` (380ms) via TextMorph | `--ui-ease-move` |
| Press | 0ms to `--ui-scale-press` (0.985), snaps back over 250ms | `--ui-ease-snap` |

Messages that are already there when the thread mounts don't animate in:
reopening a conversation shouldn't replay it. Under `prefers-reduced-motion:
reduce` words appear without fading, the thinking band holds still, the pill doesn't
rise and "Jump to latest" scrolls instantly.

## Accessibility

- The scroll area is `role="log"` with `aria-live="polite"` and
  `aria-relevant="additions"`, named by `label`. It's focusable, so the
  keyboard can scroll it.
- **One announcement per reply.** While a reply streams, its animated text is
  `aria-hidden` and the log hears a single "Writing a reply…". When it
  settles, the finished text is inserted as one node and read once. A stopped
  or failed reply is read the same way, followed by "You stopped this reply."
  or the error. `aria-busy` is set on the message while it streams.
- Each message is an `<article>` labeled with its author ("You",
  "Assistant", or your `author`). Avatars are off by default and decorative.
- Actions are real buttons with names ("Copy", "Retry", "Good response",
  "Bad response"). Thumbs use `aria-pressed`. "Copied" or "Couldn't copy.
  Select the text instead." goes to a `role="status"` region.
- "Jump to latest" is removed from the tab order (`inert`) while hidden. After
  it's used, focus moves to the log so it doesn't fall to `<body>`.
- Action buttons are 40px on coarse pointers and always visible there.

## Before / after

Before: the reply is re-rendered on every token, so the whole message
flickers, the window jumps to the bottom even while you're reading, and a
screen reader reads every token as it lands.

```tsx
<div aria-live="polite">
  {messages.map((m) => <p key={m.id}>{m.text}</p>)}
</div>
useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);
```

After: only new words fade in, the thread follows the bottom until you scroll
up, and the reply is announced once.

```tsx
<MessageThread label="Dinner planning conversation">
  {messages.map((m) => (
    <Message key={m.id} from={m.role} text={m.text} status={m.status} onRetry={() => regenerate(m.id)} />
  ))}
</MessageThread>
```

Before: a failed reply disappears, or shows a red "Error" with nothing to do.

```tsx
{error && <p className="error">Error</p>}
```

After: the partial text stays, the reason is specific, and Retry is right
there.

```tsx
<Message
  from="assistant"
  text={partial}
  status="error"
  error="The connection dropped before this reply finished."
  onRetry={() => regenerate(id)}
/>
```
