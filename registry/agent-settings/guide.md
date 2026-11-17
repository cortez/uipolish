# Agent settings

A whole settings screen for an AI agent inside a product, built from the kit:
which model it uses, the MCP servers it's connected to, what it may do
without asking, how much it may spend in a day and what it remembers. Each
section is a heading and a few rows, split by hairlines: a label and one line
on the left, the control on the right, stacked on a phone. On a wide screen a
column of section links stays in view and marks where you are.

Every change saves on its own, and the row it was made in says "Saved" for a
moment. There's no Save button and no bar at the bottom. Revoking a tool
leaves "Revoked · Undo" in its place for a few seconds; clearing memory asks
first, in place.

```tsx
<AgentSettings
  agent="Copper"
  settings={settings} // { model, policy, dailyLimit, remember }
  onChange={(patch) => saveSettings(patch)}
  models={models}
  connections={{ servers, onToggle, onReconnect, onRetry, onDisconnect }}
  allowed={alwaysAllowed}
  onRevoke={(tool) => revokeTool(tool.id)}
  onRestore={(tool) => allowTool(tool.id)}
  spending={{ used: 3.4, segments }}
  memories={notes}
  onClearMemory={() => clearMemory()}
/>
```

## When to use it

- The settings page of a product with an agent in it: a chat app, an
  assistant inside a booking or billing tool, an agent that acts for a team.
- As a starting point you cut down. Drop the sections your agent doesn't have
  and keep the rest as they are.

## When not to

- Settings for one conversation (its model, its tools this time). Those
  belong in the composer, as a model picker or a menu.
- A first-run setup that walks someone through connecting servers and
  setting a budget in order. Use steps, with a Continue button.
- Settings that only apply together, like a billing address. Use a form with
  one Save button.

## Sections

| Section | Rows | Built from |
|---|---|---|
| Model | "Model": for new conversations; ones already started keep theirs | Model picker |
| Connections | The MCP servers, as they are | Connections |
| Permissions | "Always allowed": the tools the person chose Always allow for, grouped by server, each with Revoke. "Everything else": Reads, Changes, Sends, Deletes and Spends money, each "Ask every time" or "Allow" | Badge, button, segmented control |
| Usage & budget | What was spent today against the limit, then "Daily limit" with what happens at it: "Copper stops and asks when it reaches $10.00 today." | Usage meter's `UsageBreakdown`, number input |
| Memory | "Remember between conversations", then the notes and Clear memory | Switch, button |

**Sends, deletes and spends always ask.** Their "Allow" can't be picked, and
the line under each says why in words: "Money moves the moment a payment or
refund runs, so Copper always asks." A message can't be unsent, a deleted
menu doesn't come back and a refund can't be reversed, so a standing yes for
any of them is one bad call away from harm. The type says the same:
`policy` only has `read` and `change`. This matches tool approval, which only
offers "this conversation" for those effects.

**The daily limit** is a currency field without steppers, from 1 to
`maxDailyLimit` (default 500). Its line always says what the limit does:
"Copper stops and asks when it reaches $10.00 today.", and once it's reached,
"Copper reached $10.00 today and is waiting for you. Raise the limit to let
it carry on." The breakdown above it takes the new limit at once.

**Memory** lists the notes as they are, newest first. Clear memory turns into
"Clear everything Copper remembers? Copper forgets these 5 notes for good.
Your conversations stay." with Cancel and a danger Clear memory. With
remembering off, the notes are kept and the line says so.

## Props

Everything is controlled. `settings` holds the values the person sets;
lists the person acts on (tools, notes) come in their own props with their
own callbacks.

| Prop | What it does |
|---|---|
| `agent` | The agent's name, used in sentences: "Copper asks every time" |
| `settings` | `{ model?, policy?, dailyLimit?, remember? }`. `policy` is `{ read, change }`, each `"ask"` or `"allow"` |
| `onChange` | Called with the one value that changed: `{ model: "deep" }`, `{ policy: { read: "allow", change: "ask" } }` (the whole policy), `{ dailyLimit: 25 }`, `{ remember: false }`. Merge it into `settings` |
| `models` | `ModelOption[]`, as the model picker takes them |
| `connections` | The Connections props, passed on as they are: `servers`, `add`, `onAdd`, `onToggle`, `onReconnect`, `onRetry`, `onDisconnect`. `agent` comes from here |
| `allowed` | `{ id, server, tool, effect, description? }[]`: the tools set to Always allow. `server` is the name the rows are grouped under |
| `onRevoke`, `onRestore` | Revoke: take the tool out of `allowed`. Restore is Undo: put it back where it was. Leave `onRestore` out to offer no Undo |
| `effectNotes` | Your own line under Reads, Changes, Sends, Deletes and Spends money |
| `spending` | `{ used, segments? }` for today, in currency units. Segments as in the usage meter |
| `maxDailyLimit`, `currency`, `locale` | Default 500, `"USD"`, `"en-US"` |
| `memories`, `onClearMemory` | `{ id, text }[]`, newest first. Clear memory clears them all; then pass `[]`. Leave `onClearMemory` out to hide the button |
| `sections` | Which sections, in what order. Default all five |
| `title`, `description` | Default "Copper settings", from `agent`; a line under it |
| `headingLevel` | The title's level, default 1. Sections take the next level, the Permissions parts the one after |
| `idPrefix` | Starts each section's id: `#agent-settings-permissions`. Default `"agent-settings"` |

**Saving.** Each callback can return a promise. While it's pending past
300ms the row says "Saving…" with a light band crossing it; when it
resolves, "Saved" with a check, for 2.4 seconds; when it rejects, the
rejection's message in the danger color, until the row changes again. Put the
old value back in `settings` yourself when a save fails: the row shows what
`settings` says.

```tsx
async function onChange(patch: Partial<AgentSettingsValue>) {
  const before = settings;
  setSettings((s) => ({ ...s, ...patch })); // the control moves at once
  try {
    await api.patch("/agent/settings", patch);
  } catch (error) {
    setSettings(before);
    throw error; // its message shows in the row: "Ledger caps Copper at $200.00 a day."
  }
}
```

A save that rejects says the same in a polite announcement. Only the latest
change to a row speaks for it, so a slow first save can't mark a later one
as failed.

**Revoking.** Revoke calls `onRevoke(tool)` and the row turns to "Revoked ·
Undo" at once, with the tool name and badge dimmed and "Copper asks before
using it again." under it. Remove the tool from `allowed` then; the row stays
on screen by itself. Six seconds after the pointer and focus have left it,
the row fades and closes, and a server's group closes with its last tool.
Undo calls `onRestore(tool)`. If `onRevoke` rejects, the row comes back with
the message under it.

**Dropping sections.** A section shows when its values are there, so leaving
props out drops it:

| Section | Shows with |
|---|---|
| Model | `settings.model` and `models` |
| Connections | `connections` |
| Permissions | `settings.policy` or `allowed`; each part shows on its own |
| Usage & budget | `settings.dailyLimit` or `spending`; the breakdown needs both |
| Memory | `settings.remember` or `memories`; each row shows on its own |

Or name them: `sections={["model", "permissions", "usage"]}` shows those
three in that order. With one section left, the nav goes too.

## Layout

| Width of the screen | Nav | Rows |
|---|---|---|
| 640px and up | A 144px column beside the sections, sticky 32px from the top, marking the last section whose top is within 96px of where the nav sticks (the last one at the end of the page) | Label and line on the left, control on the right, 24px apart |
| Under 640px | Plain links in a wrapping row above the sections; none is marked | As above while the sections' column is over 440px |
| Sections' column 440px and under | | The control drops under its text, 12px below |

The breakpoints are container queries on the screen, not the window, so it
lays out the same in a page, a panel or a dialog. Set
`--agent-settings-top` on the screen to your sticky header's height plus 24px:
the nav sticks there and a jumped-to section lands there.

Title (display size), 32px to the sections; 64px between sections; heading
and its line 4px apart, 24px above the first row; 16px above and below each
hairline. The Connections list keeps its own card, the one surface on the
screen.

## Motion

| What | Duration | Easing |
|---|---|---|
| "Saved", "Saving…" and a failure fade in beside the label | `--ui-dur-fast` (160ms); "Saving…" waits 300ms first | `--ui-ease-enter` |
| They fade out | `--ui-dur-fast` | `--ui-ease-exit` |
| Light band across "Saving…" | `--ui-dur-sweep` per pass | `linear` |
| "Revoked · Undo" arrives; name and badge dim | `--ui-dur-fast`; `--ui-dur-instant` | `--ui-ease-enter`; `--ui-ease-color` |
| A revoked row, or a server's group, fades, then its space closes | `--ui-dur-instant` fade, then `--ui-dur-base` (200ms) height | `--ui-ease-exit`, `--ui-ease-collapse` |
| The clear-memory confirm arrives: fade and 4px rise; the box eases to its new height | `--ui-dur-fast`, animated size | `--ui-ease-enter` |
| Current section link tints | `--ui-dur-instant` | `--ui-ease-color` |
| Model picker, segmented control, switch, breakdown, Connections | as each component's guide says | |

Under `prefers-reduced-motion: reduce` the light band stops, a revoked row
only fades and is gone without closing, and the confirm fades in without
rising. The embedded components follow their own reduced-motion rules.

## Accessibility

- One heading at `headingLevel` (default `h1`), a heading one level down for
  each section and one more for "Always allowed" and "Everything else".
- Each section is a `<section>` named by its heading, so it's a region
  landmark. The nav is a `<nav>` named "Settings sections"; the marked link
  has `aria-current="true"`.
- The section links are plain anchors: they work without script, put the
  section's id in the address, and move the keyboard's starting point to the
  section.
- The switch and the segmented controls are named by their row's label and
  described by its line: the switch reads "Remember between conversations,
  on, Copper keeps short notes…". Each segmented control is a radio group
  named "Reads"; the "Allow" that can't be picked is a disabled radio, and
  the reason is in its description. The model picker is named "Model for
  new conversations" and the limit field "Daily limit": the field's own
  label is visually hidden, since the row already shows it.
- A polite `role="status"` region says each save once it lands ("Saved.
  Reads: allowed without asking."), each failure, each revoke ("Revoked
  list_bookings. Copper will ask before using it."), each Undo and a cleared
  memory. Connections and the breakdown announce their own changes.
- Revoke's place is taken by Undo, and focus moves to it; Undo hands focus
  back to Revoke. The row doesn't close while focus or the pointer is on it.
- In the clear-memory confirm, focus starts on Cancel; Escape cancels and
  focus goes back to Clear memory. Once memory is cleared, focus moves to
  the line that replaced the notes.
- Revoke, Undo and the confirm buttons are the standard 40px; the section
  links reach 40px tall under a finger.

## Before / after

Before: one long form with a Save button at the bottom, a permission list
that can only be edited as JSON, and nothing to say what a budget does.

```tsx
<form onSubmit={save}>
  <select name="model">{models.map((m) => <option key={m.id}>{m.name}</option>)}</select>
  <textarea name="allowedTools" defaultValue={JSON.stringify(allowed)} />
  <input name="budget" type="number" defaultValue={10} />
  <button>Save settings</button>
</form>
```

After: each change saves where it's made and says so, standing permissions
can be read and revoked one at a time, the riskiest ones can't be waved
through, and the budget says what happens at the limit.

```tsx
<AgentSettings
  agent="Copper"
  settings={settings}
  onChange={async (patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    await api.patch("/agent/settings", patch);
  }}
  models={models}
  connections={connections}
  allowed={allowed}
  onRevoke={(tool) => {
    setAllowed((all) => all.filter((t) => t.id !== tool.id));
    return api.delete(`/agent/allowed/${tool.id}`);
  }}
  onRestore={(tool) => {
    setAllowed(withToolBack(tool));
    return api.put(`/agent/allowed/${tool.id}`);
  }}
  spending={spending}
  memories={memories}
  onClearMemory={async () => {
    await api.delete("/agent/memory");
    setMemories([]);
  }}
/>
```
