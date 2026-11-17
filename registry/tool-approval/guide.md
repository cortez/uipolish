# Tool approval

The card an agent puts in the conversation when it wants to run a tool that
needs the person's OK. Minimal on purpose: the action as a title, a short
summary in plain words, and, only for sends, deletes and spends, one line on
what can't be undone. The tool's name and the raw call sit behind
"Details". Then a "Don't ask again in this chat" box, and two equal buttons,
Deny and Allow. Once the person answers, the card settles into one quiet line
("Allowed once · send_message") that opens again to show what was approved.

```tsx
<ToolApproval
  agent="Copper"
  request={{
    id: call.id,
    title: "Send a message to 12 guests",
    server: "postbox",
    tool: "send_message",
    effect: "send",
    summary: "To everyone booked for Saturday supper: “We’re starting at 7:30 instead of 7.”",
    arguments: call.input,
  }}
  status={status} // "waiting" | "allowed" | "denied" | "expired"
  scope={scope}
  reason={reason}
  onDecide={({ decision, scope, reason }) => answer(call.id, decision, scope, reason)}
/>
```

It goes in the thread where the agent stopped, between the reply before it and
whatever the agent does next. Pair it with `message-thread` and `tool-steps`.

## When to use it

- An agent about to call an MCP tool, or any function, that the person has
  said should ask first: sending, paying, deleting, changing shared data.
- Anything that leaves the person's hands: a message to guests, a refund, a
  post. The person should read what goes out before it does.

## When not to

- Connecting the agent to a server in the first place. That's a standing
  grant of scopes: use `authorize`.
- Calls the person has already allowed. Don't ask twice; show them in
  `tool-steps` as they run.
- Questions the agent has for the person ("Which Saturday?"). Those are
  messages; let the person answer in the prompt.

## The request

| Field | What to put there |
|---|---|
| `title` | The action as a verb phrase, with the count or amount: "Refund Ben Ito $48.00", not "create_refund". |
| `server`, `tool` | As the agent knows them. Shown in mono under Details, so the person can match it to settings later. |
| `effect` | What the call does: `read`, `change`, `send`, `delete` or `spend`. Decides the note and what "Don't ask again" can remember. |
| `summary` | One or two sentences: who, what, how much. Quote what will be sent. |
| `consequence` | Optional. Replaces the effect's note when you know more: "Goes back to Ben’s card. A refund can’t be reversed." |
| `arguments` | The raw call. Objects are shown as indented JSON in a code block behind "Details". |

**Effects.** Reads and changes say nothing extra: the title is enough.
Sends, deletes and spends get one line with a warning mark saying what can't
be taken back, and a delete's Allow is the danger button. There are no
badges: the words carry it.

| `effect` | Note | "Don't ask again" remembers |
|---|---|---|
| `read` | none | This chat |
| `change` | none | This chat |
| `send` | "Once it’s sent, it can’t be taken back." | This chat |
| `delete` | "Deleted for good. It can’t be undone." Allow is the danger button | This chat |
| `spend` | "The money moves as soon as you allow it." | This chat |

## States

`status` is controlled. Your agent owns the call and decides when it stops
waiting.

| Status | What you see |
|---|---|
| `waiting` | The card: "Copper needs your OK", the title, the summary, the note for sends, deletes and spends, Details, then "Don't ask again in this chat" and Tell Copper why on one line, then Deny and Allow |
| `waiting`, `onDecide` returned a promise | The chosen button shimmers its label; other presses are ignored until it settles |
| `waiting`, that promise rejected | "Copper didn’t get your answer. Try again." in red above the buttons; the buttons work again |
| `allowed` | A check and "Allowed once · send_message", "Allowed for this conversation · …" or "Always allowed · …", from `scope` |
| `denied` | A cross and "Denied · send_message", or "Denied · you said: not yet" with a `reason` |
| `expired` | A dash and "Copper stopped waiting after 5 minutes · send_message", from `waited` |

The settled line is a button. It opens the request below it: title, tool,
summary, note, Details, and for a denial "You told Copper: “not yet”".

**Deciding.** `onDecide` gets `{ id, decision, scope, reason }`. `decision`
is `"allow"` or `"deny"`. `scope` is `"once"`, `"conversation"` or `"tool"`;
a denial is always `"once"`. `reason` is set only when the person typed one.
Set `status` (and `scope` or `reason`) from it right away: the agent is
waiting on the answer, not on your server. If sending the answer can fail,
return the promise and the card shows busy and the error for you.

**Don't ask again.** A checkbox, not a third button, so the answer is always
Deny or Allow. Ticked, Allow decides with `scope: "conversation"` ("Don't ask
again in this chat"); unticked, with `scope: "once"`. If `remember` offers
only `"tool"`, the box reads "Don't ask again for send_message" and decides
with that. `remember={[]}` leaves the box out.

**Tell Copper why.** A quiet link on the box's line, at its end, opens a short
field (200 characters). Enter or Deny sends the denial with the text as
`reason`; Escape closes it. Denying never needs the field: Deny is one press.
Turn it off with `askReason={false}`.

**Several at once.** When the agent asks for more than one call, show the
first as the card and pass the rest as `queue`. "2 more waiting" opens them
as rows, each with Deny and Allow (sends, deletes and spends say so under
the title); deciding one calls `onDecide` with
that row's `id`. Render answered requests as their own settled
`ToolApproval`, in order, and the first one still waiting with the rest as
its queue:

```tsx
const waiting = approvals.filter((a) => a.status === "waiting");

{approvals.map((a) =>
  a.status !== "waiting" || a === waiting[0] ? (
    <ToolApproval
      key={a.request.id}
      agent="Copper"
      request={a.request}
      status={a.status}
      scope={a.scope}
      reason={a.reason}
      queue={a === waiting[0] ? waiting.slice(1).map((w) => w.request) : undefined}
      onDecide={answer}
    />
  ) : null,
)}
```

Keep `key` on the request's id, so a card that's answered becomes its own line
instead of being replaced.

**Expired.** When your agent gives up on an answer, set `status="expired"`
and `waited` to how long it waited, in words. The card settles like any
other answer. To try again, have the agent ask again: that's a new request.

## Motion

| What | Duration | Easing |
|---|---|---|
| Card arrives: its space opens, then it fades in and rises 4px, 60ms later | `--ui-dur-panel` (280ms) height, `--ui-dur-base` (200ms) fade | `--ui-ease-expand`, `--ui-ease-enter` |
| Card settles: the line fades in and rises 4px as the height eases to one line | `--ui-dur-base` (200ms) closing, line 60ms later | `--ui-ease-collapse`, `--ui-ease-enter`, via animated size |
| Details, reason, queue and a reopened line open | `--ui-dur-panel` height, `--ui-dur-fast` fade 60ms later | `--ui-ease-expand`, `--ui-ease-enter` |
| They close | `--ui-dur-base` height, `--ui-dur-instant` fade | `--ui-ease-collapse`, `--ui-ease-exit` |
| Chevron turns a quarter turn, right to down | `--ui-dur-base` (200ms) | `--ui-ease-glide` |
| A queued row leaves; the rest close the gap | instant; `--ui-dur-base` height | animated size |
| Busy button label | shimmer, `--ui-dur-sweep` per pass | `linear`, from the button |
| Error appears: fade and 4px rise | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |

Every height change eases, so the thread under the card moves with it and
never jumps. A card that's already settled when it mounts, from history, shows
as its line with no motion.

Under `prefers-reduced-motion: reduce` the card and the line appear without
rising or growing, panels open and close at once, and the height of the card
changes in one step.

## Accessibility

- The card is a `group` named by "Copper needs your OK" and its title.
- **Focus.** By default the card takes focus only when nothing else has it
  (focus is on the page body): it lands on the title, not on a button, so a
  stray Enter allows nothing. When the person is typing in the prompt, focus
  stays there. Pass `autoFocus` to always take it, or `autoFocus={false}` to
  never.
- When the card settles and focus was in it (or nowhere), focus moves to the
  settled line, since the buttons it was on are gone.
- A polite `role="status"` region says "Copper needs your OK: Send a message
  to 12 guests." when the card appears and "Allowed once: send_message." when
  it's answered. Inside `message-thread` the log also reads new content, so
  it may be heard twice; that's the safe side.
- What can't be undone is said in words; the warning color only repeats it.
- "Don't ask again" is a real checkbox, so its state is read with it.
- Details, Tell Copper why, the queue and the settled line are buttons with
  `aria-expanded` and `aria-controls`. Closed panels are `inert`.
- Each queued row's Deny and Allow are described by that row's title, so a
  screen reader hears "Allow, Refund Ben Ito $48.00".
- The arguments block is focusable when it scrolls.
- Buttons and the disclosures get a 40px tall hit area on touch screens.
- Deny and Allow stay side by side at every width, each half the card; the
  box and Tell Copper why wrap onto two lines when they don't fit. Tab order
  follows the reading order.

## Before / after

Before: a browser confirm with the tool's name and a JSON dump, no idea what
leaves the person's hands, and nothing left in the thread afterwards.

```tsx
if (window.confirm(`Allow ${call.name}?\n${JSON.stringify(call.input)}`)) run(call);
```

After: the action in words, what can't be undone, the JSON one click away, a
"don't ask again" box, a reason Copper can use, and a line in the thread that
says what was decided.

```tsx
<ToolApproval
  agent="Copper"
  request={{
    id: call.id,
    title: "Refund Ben Ito $48.00",
    server: "ledger",
    tool: "create_refund",
    effect: "spend",
    summary: "Ben cancelled 3 days ahead. The policy gives a full refund for his 2 seats.",
    consequence: "Goes back to Ben’s card. A refund can’t be reversed.",
    arguments: call.input,
  }}
  status={status}
  scope={scope}
  reason={reason}
  waited="5 minutes"
  onDecide={async (answer) => {
    await agent.respond(call.id, answer); // shows busy; a rejection shows the error
    setAnswer(answer);
  }}
/>
```
