# Chat app

A whole assistant screen. On the left, the conversation list: New chat,
search, chats grouped into Today, Previous 7 days and Older, each with a
"…" menu to rename or delete. On the right, the conversation: a header
with its title and the model picker, the thread, and the composer. An
assistant reply is built from what its message carries: a reasoning block
while it thinks, the tool steps it runs, the answer streaming in word by
word, numbered citations with a source list, and the copy, rate and retry
row. Below 720px of its own width the list moves into a drawer.

It's controlled. You own the conversations, the messages and the status;
the block owns only layout state (the list folded or open, the search
text, which row is being renamed).

```tsx
<ChatApp
  conversations={chats}
  activeId={activeId}
  messages={messages}
  status={status} // "ready" | "loading" | "load-error" | "streaming" | "error" | "offline" | "rate-limited"
  onSend={(text, files) => agent.send(activeId, text, files)}
  onStop={() => agent.abort()}
  onRetry={(messageId) => agent.regenerate(messageId)}
  onSelect={(id) => router.push(`/chat/${id}`)}
  onNew={() => router.push("/chat")}
  onRename={(id, title) => api.renameChat(id, title)} // a promise: the field shows saving, a rejection shows its message
  onDelete={(id) => api.deleteChat(id)} // a promise: the confirm dialog stays busy until it settles
  models={models}
  model={model}
  onModelChange={setModel}
  onRate={(messageId, rating) => api.rate(messageId, rating)}
  onUpgrade={() => router.push("/plans")}
  limitResetsAt={limits.resetsAt}
  assistantName="Copper"
  starters={[
    { title: "Plan Saturday’s supper", detail: "A menu for everyone on the guest list" },
    { title: "Write the reminder email", detail: "For guests who haven’t paid yet" },
    { title: "Build a cooking timeline", detail: "Working back from a 7:30 pm dinner" },
  ]}
/>
```

Give it a container with a height: it fills it (`height: 100%`). A full
page is `height: 100dvh`; in a settings pane, the pane.

An assistant message, mid-answer:

```ts
{
  id: "m42",
  role: "assistant",
  status: "streaming",
  reasoning: { text: "Saturday has 14 confirmed…", duration: 4 },
  steps: [
    { id: "guests", title: "Read the guest list", status: "done", detail: "14 going · 2 vegetarian", startedAt, finishedAt },
    { id: "season", title: "Checking what’s in season", status: "running", startedAt },
  ],
  sources: [{ title: "What’s in season: November", url: "https://…", excerpt: "Winter squash…" }],
  text: "Squash and pears are at their best this week[1], so…",
}
```

`[1]` after a word becomes a citation marker for `sources[0]`. While the
reply streams the markers are held back and the words fade in; when it
finishes, the markers and the "2 sources" list appear.

## When to use it

- The main screen of an assistant product, or an assistant section of a
  larger app, where people come back to earlier conversations.
- As a starting point you trim: drop `starters`, the sidebar footer or the
  model list, and the rest still holds together.

## When not to

- An assistant in a side panel next to the user's work: there's no room for
  a conversation list. Compose `message-thread` and `prompt-input` directly.
- One question and one answer (a "summarize this" button): show the answer
  in place.
- Human-to-human chat with presence, typing indicators and read receipts:
  the reply anatomy here (reasoning, tools, sources) is for a model.

## States

| State | What you see | How |
|---|---|---|
| New chat | The greeting and three or four starter cards; choosing one fills the composer and puts the caret at the end, it never sends | `activeId={null}`, no messages |
| Thinking | "Thinking" with a light band and a live timer, the reasoning streaming in a six-line window | message `reasoning.streaming` |
| Running tools | "Running 2 of 2…" over the steps; each has its own timer, and the list folds to "Ran 2 steps in 3s" | message `steps` |
| Streaming | New words fade in; Send becomes Stop (Escape stops too); the model can't be changed mid-reply | `status="streaming"`, message `status="streaming"` |
| Answered | Citation markers fade in, "2 sources" below, then copy, thumbs and retry | message `status="complete"`, `sources` |
| Stopped | The partial reply, "You stopped this reply.", actions with Retry | message `status="stopped"` |
| Failed partway | The partial reply stays; the reason in red with Retry | `status="error"`, or message `status="error"` and `error` |
| Loading a chat | "Loading conversation…" with a light band, where the messages will be | `status="loading"` |
| Couldn't load | What happened and Try again | `status="load-error"`, `onReload` |
| Offline | A warning above the composer; drafting works, Send keeps the draft | `status="offline"` |
| Rate-limited | "You’ve reached your limit. It resets at 3:00 PM." with Upgrade; the composer is disabled | `status="rate-limited"`, `limitResetsAt`, `onUpgrade` |
| Long conversation | The thread follows new text until the reader scrolls up, then a "Jump to latest" pill | message-thread's scroll |
| Scrolled | The thread's top and bottom edges fade out over 32px, only on an edge with more past it: at the top once the first message has scrolled under the header, at the bottom once the reader has scrolled up. Following a streaming reply, the bottom stays crisp | the scroll area's mask, on the thread's scroller |
| List loading | "Loading chats…" with a light band | `conversationsLoading` |
| No chats | "No chats yet" and a line on what will be there; search is disabled | empty `conversations` |
| No matches | "No chats match “wine”" and Clear search | search text |
| Renaming | The row becomes a field; Enter or leaving saves, Escape cancels; saving shows a light band; a failure keeps the field open with the reason | `onRename` returns a promise |
| Deleting | A confirm naming the chat; "Delete chat" stays busy until `onDelete` settles; a failure shows in the dialog | `onDelete` returns a promise |
| List folded | The sidebar slides shut; New chat moves into the header | the header's sidebar button |
| Narrow | The list is a drawer (a sheet on phones), opened from the header | under 720px of the block's own width |

**Why the composer isn't disabled offline.** People keep typing while the
connection comes back. Send does nothing and keeps the draft; the warning
above says why. At the rate limit there's nothing to wait for in the next
minute, so the composer is disabled and the notice offers the way out.

**Titles.** A new chat has no id until the first send. When `activeId`
goes from `null` to the id your backend gave it, the thread stays mounted,
so the reply that's streaming isn't reset. Name the chat on the server and
update `title` when it's ready.

## Props

| Prop | Type | What it does |
|---|---|---|
| `conversations` | `{ id, title, updatedAt }[]` | The list. `updatedAt` (ms or Date) groups and orders it |
| `conversationsLoading` | `boolean` | The list itself is loading |
| `activeId` | `string \| null` | The open chat; `null` for a new one |
| `messages` | `ChatMessage[]` | `{ id, role, text, status?, error?, attachments?, reasoning?, steps?, sources?, rating? }` |
| `status` | `ChatStatus` | See States |
| `onSend` | `(text, files) => void` | Add the message and the empty reply, and set `status="streaming"` |
| `onStop` | `() => void` | Stop the reply; set its message to `"stopped"` |
| `onRetry` | `(messageId) => void` | Regenerate that reply |
| `onSelect`, `onNew` | | Open a chat; start a new one (the composer is focused) |
| `onRename` | `(id, title) => void \| Promise` | Reject with an `Error` to show its message |
| `onDelete` | `(id) => void \| Promise` | Reject with an `Error` to show its message |
| `models`, `model`, `onModelChange` | | The model picker in the header |
| `onRate`, `onComment` | `(messageId, …)` | Thumbs; `onComment` adds "What went wrong?" after a thumbs down |
| `onRetryStep` | `(messageId, stepId)` | Retry one failed tool step |
| `onReload` | `() => void` | Try again after `status="load-error"` |
| `onUpgrade`, `limitResetsAt` | `() => void`, `Date \| string` | The rate-limit notice. A Date shows as a local time |
| `assistantName` | `string` | Labels, the placeholder and notices. Default "Assistant" |
| `starters`, `greeting` | `{ title, detail?, prompt? }[]`, `string` | The new-chat screen |
| `composerHint` | `ReactNode` | A line under the composer |
| `accept` | `string \| false` | File types to attach; `false` turns attaching off |
| `sidebarFooter` | `ReactNode` | Under the list: account, plan, usage |
| `now` | `number` | "Now" for grouping, for tests and server rendering |
| `defaultSidebarOpen` | `boolean` | Whether the list starts open on wide screens |

Exported helpers: `groupConversations(conversations, now)` and
`withoutCitations(text)` (what Copy copies).

## Customizing

- **Your assistant.** `assistantName`, `greeting` and `starters` carry the
  voice. Write starters as things your users actually ask, with a detail
  line that says what they get, not "Ask me anything".
- **Breakpoint.** `NARROW` in `chat-app.tsx` (720px of the block's own
  width, not the window's, so it works in a pane).
- **Sidebar width.** `--sidebar-width` on `.root` (264px).
- **Groups.** `groupConversations` in `sidebar.tsx`. Add "Yesterday" or
  month groups there; the list renders whatever it returns.
- **More row actions.** Add `MenuItem`s in `ConversationRow`: pin, share,
  move to a project. Keep Delete last, after a separator.
- **Rich answers.** Replies use message-thread's markdown subset. If your
  model writes tables or code, swap `renderBlocks` in
  `assistant-message.tsx` for the markdown component
  (`<Markdown source={text} streaming={streaming} />`) or your own
  renderer, keeping `citing()` for the markers.
- **Notices.** Offline and rate-limit copy is in `chat-app.tsx`. A plan
  with a monthly cap might say "You’ve used this month’s 500 messages".

## Accessibility

- Landmarks: the list is an `aside` labelled "Chat history" with a `nav`
  labelled "Chats"; the conversation is a `section` named by its title.
  Groups are headed (`h3`) lists; the open chat has `aria-current="page"`.
- The sidebar button says what it does ("Hide chats", "Show chats",
  "Chats") with `aria-expanded`; a folded list is `inert`.
- Each row's "…" is named for its chat ("Actions for Wine pairings under
  $25 a bottle"); it shows on hover and focus with a mouse, always on
  touch, and is 40px to a finger.
- Rename moves focus into the field with the text selected; Enter, Escape
  or saving puts focus back on the row. A failure is `role="alert"` and
  linked with `aria-describedby`.
- After a delete, focus goes to New chat, not to `<body>`.
- The edge fades are a mask on the thread's scroller (`--ui-space-6`, the
  scroll area's technique), set from one scroll and resize listener with no
  re-renders, measured a frame after the thread pins itself so a following
  reply never flashes the bottom fade. They fade in and out over
  `--ui-dur-fast`. A classic scrollbar stays out of the mask, and the focus
  ring is drawn on the thread so the mask doesn't fade it.
- The thread is a `role="log"`; each reply is announced once when it
  finishes. Reasoning, tool steps and notices have their own polite
  status regions; offline and rate-limit notices are announced when they
  appear.
- Starter cards are buttons; they fill the composer and focus it.

## Before / after

Before: a chat page assembled by hand. The list scrolls with the page, the
reply re-renders on every token, a failure replaces the partial answer with
"Error", the delete button deletes, and the phone layout is the desktop one
squeezed.

```tsx
<div className="app">
  <ul>{chats.map((c) => <li onClick={() => open(c.id)}>{c.title} <button onClick={() => del(c.id)}>🗑</button></li>)}</ul>
  <div>{messages.map((m) => <p>{m.text}</p>)}{error && <p>Error</p>}</div>
  <textarea onKeyDown={sendOnEnter} />
</div>
```

After: every state is designed, every async action can fail visibly, and
the reply shows its reasoning, tools and sources.

```tsx
<ChatApp
  conversations={chats}
  activeId={activeId}
  messages={messages}
  status={status}
  onSend={send}
  onStop={stop}
  onRetry={regenerate}
  onSelect={open}
  onNew={startNew}
  onRename={rename}
  onDelete={remove}
  models={models}
  model={model}
  onModelChange={setModel}
/>
```
