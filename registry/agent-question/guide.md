# Agent question

The card an agent puts in the conversation when it needs the person to decide
something before it can go on. A short question, then two to four choices as
cards, each a title and one line on what it means. The agent can mark the one
it would pick, with its reason in a few words ("Recommended: keeps the guest
list private"). One choice or several, and optionally "Something else…" for
an answer in the person's own words. Send answers; once it's answered the card
settles into one quiet line ("Answer sent: Private RSVP link") that opens again
to show what was asked.

```tsx
<AgentQuestion
  agent="Copper"
  question="How should guests RSVP?"
  choices={[
    { value: "link", title: "Private RSVP link", description: "Guests reply on a page only they can open." },
    { value: "list", title: "Shared guest list", description: "Everyone sees who else is coming." },
    { value: "email", title: "Reply by email", description: "I collect the answers from your inbox." },
  ]}
  recommended={{ value: "link", reason: "keeps the guest list private" }}
  allowOther
  status={status} // "waiting" | "answered"
  answer={answer}
  onAnswer={(answer) => respond(call.id, answer)}
/>
```

It goes in the thread where the agent stopped, between the reply before it and
whatever the agent does next. Pair it with `message-thread`, `tool-approval`
and `tool-steps`.

## When to use it

- The agent has reached a fork it can't settle alone and the answers are
  known: how guests RSVP, which menus to plan, one table or two.
- The agent has a view and should say so. Mark its pick with `recommended`;
  the person still decides.
- Several answers can be true at once ("Which menus?"): `multiple`.

## When not to

- Asking to run a tool (send, pay, delete). That's a yes or no on one action:
  use `tool-approval`.
- Open questions with no likely answers ("What should the invite say?"). Ask
  in a message and let the person answer in the prompt.
- More than four choices, or choices that need a paragraph each. Narrow the
  question, or ask in two steps.
- A setting the person will come back to. That belongs in settings, not the
  thread.

## Props

| Prop | What it does |
|---|---|
| `question` | The question, as the agent asks it: one sentence, ending in a question mark. Names the group for screen readers |
| `choices` | Two to four `{ value, title, description?, disabled? }`. `title` is a few words; `description` one line |
| `agent` | The agent's name, as the person knows it: "Copper asks" |
| `multiple` | Checkboxes instead of radios; the answer can hold several values |
| `recommended` | `{ value, reason }`. Adds "Recommended: <reason>" to that choice's card. Nothing is chosen for the person |
| `allowOther` | Adds "Something else…" as the last card; choosing it opens a short field (200 characters) |
| `otherPlaceholder` | The field's placeholder. Write a likely answer, not "Type here" |
| `status` | `waiting` (default) or `answered`. Controlled |
| `answer` | With `answered`: what the line shows. Defaults to what was just sent |
| `onAnswer` | Gets `{ values, other? }`. Return a promise to show busy and any error |
| `entrance` | Default `true`: a card that mounts waiting opens its space, fades in and is announced. `false` for a question already on the page when it loads (a saved conversation, a static page): it renders in place, holds still and takes no focus. A server-rendered card never enters |
| `autoFocus` | Default: an entering card focuses the question only when nothing else has focus. `true` always focuses it; `false` never does |

Write the reason as the end of "Recommended: …", lower case, with no full
stop: "keeps the guest list private", not "I recommend this because…".

## States

`status` is controlled. Your agent owns the question and decides when it has
its answer.

| Status | What you see |
|---|---|
| `waiting` | "Copper asks", the question, the choice cards with the pick's reason on its card, then Send |
| `waiting`, Send with nothing chosen | "Choose one first." (or "Choose at least one first.") beside Send |
| `waiting`, "Something else…" chosen | The field opens under the cards; Send with it empty says what to do under the field |
| `waiting`, `onAnswer` returned a promise | Send shimmers its label; presses and changes are ignored until it settles |
| `waiting`, that promise rejected | "Copper didn’t get your answer. Try again." in red beside Send; Send works again |
| `answered` | A check and "Answer sent: Private RSVP link". Several choices are listed in order; a typed answer is in quotes |

The settled line is a button. It opens what was asked below it: "Copper asked:
“How should guests RSVP?”", and the agent's pick and reason if it made one.
A long answer wraps under itself; the check and the chevron stay on its first
line.

**Answering.** `onAnswer` gets `{ values, other }`. `values` are the chosen
choices' values in the order they're listed; `other` is set only when
"Something else…" was chosen, and is the trimmed text. Set `status` (and
`answer`) from it right away: the agent is waiting on the answer, not on your
server. If sending can fail, return the promise and the card shows busy and
the error for you.

**The pick.** The recommended card looks like the others until it's chosen:
the words carry it. Don't choose it for the person; an answer they didn't
make isn't one.

**History.** A question that's already answered when it mounts shows as its
line with no motion. Pass `answer` so it can say what was chosen. A question
still waiting when the page loads takes `entrance={false}`, so it doesn't
replay its arrival or pull focus.

## Layout

The card has the large corner (`--ui-radius-lg`). The choices sit 8px in
from its edge, so their corner is concentric with it (16 − 8 = 8px); the
question and the footer keep a 16px inset.

## Motion

| What | Duration | Easing |
|---|---|---|
| Card arrives: its space opens, then it fades in and rises 4px, 60ms later | `--ui-dur-panel` (280ms) height, `--ui-dur-base` (200ms) fade | `--ui-ease-expand`, `--ui-ease-enter` |
| Card settles: the line fades in and rises 4px as the height eases to one line | `--ui-dur-base` (200ms) closing, line 60ms later | `--ui-ease-collapse`, `--ui-ease-enter`, via animated size |
| A card is chosen: edge and fill | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Radio dot opens from its center; a tick draws | `--ui-dur-snap` (240ms); `--ui-dur-base` | `--ui-ease-snap`; `--ui-ease-draw` |
| "Something else…" field and a reopened line open | `--ui-dur-panel` height, `--ui-dur-fast` fade 60ms later | `--ui-ease-expand`, `--ui-ease-enter` |
| They close | `--ui-dur-base` height, `--ui-dur-instant` fade | `--ui-ease-collapse`, `--ui-ease-exit` |
| Busy Send label | shimmer, `--ui-dur-sweep` per pass | `linear`, from the button |
| Message beside Send: fade and 4px rise | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |

Every height change eases, so the thread under the card moves with it and
never jumps.

Under `prefers-reduced-motion: reduce` the card, the line and the message fade
in without rising or growing, the field opens and closes as a fade, the
height of the card changes in one step, and the dot and tick appear at once.

## Accessibility

- The card is a `group` named by "Copper asks" and the question. The choices
  are Base UI's radio group (`role="radiogroup"`) or checkbox group, each
  named by the question, so a screen reader hears it on entering them.
- Each choice's control is named by its title and described by its line and
  the pick's reason: "Private RSVP link, radio button, 1 of 4. Guests reply
  on a page only they can open. Recommended: keeps the guest list private."
- **Keyboard.** One choice: Tab enters the group on the chosen radio (or the
  first), arrows move and choose. Several: each box is a tab stop, arrows
  also move between them, Space ticks. Enter sends from any choice or the
  field. Disabled choices are skipped.
- **Focus.** By default a card that has just arrived takes focus only when
  nothing else has it (one already on the page at load never does):
  it lands on the question, not on a choice. When the person is typing in
  the prompt, focus stays there. Choosing "Something else…" with a click
  moves focus into the field; arrowing past it doesn't.
- When the card settles and focus was in it (or nowhere), focus moves to the
  settled line, since the choices it was on are gone.
- A polite `role="status"` region says "Copper asks: How should guests
  RSVP?" when the card appears and "Answer sent: Private RSVP link." when
  it's answered. The message beside Send is a polite live region too.
- Busy is not disabled: Send keeps focus while the answer is on its way.
- The whole card of a choice is its hit area, at least 46px tall.
- The settled line is a button with `aria-expanded` and `aria-controls`.
  Closed panels are `inert`.

## Before / after

Before: the question as a paragraph and three bold options, with the person
left to type "the first one" into the prompt, and no record of what was
decided.

```tsx
<Markdown>{`How should guests RSVP?\n\n1. **Private link**\n2. **Shared list**\n3. **Email**`}</Markdown>
```

After: the choices as cards, the agent's pick and why, the keyboard, a typed
answer when none fit, and a line in the thread that says what was answered.

```tsx
<AgentQuestion
  agent="Copper"
  question="Which menus should I plan for?"
  choices={menus}
  multiple
  allowOther
  otherPlaceholder="Ask Tom first"
  status={status}
  answer={answer}
  onAnswer={async (answer) => {
    await agent.respond(call.id, answer); // shows busy; a rejection shows the error
    setAnswer(answer);
    setStatus("answered");
  }}
/>
```
