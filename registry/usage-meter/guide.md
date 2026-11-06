# Usage meter

How much of an agent's context window, or of a spending budget, a
conversation has used, and what to do before it runs out. `UsageMeter` is a
16px ring and a percentage that sits in the composer toolbar. Pressing it
opens the breakdown: the figure against the limit, a segmented bar, a legend,
one line on what happens at the limit and, from the warning tone up, a button
to compact. `UsageBreakdown` is the same breakdown without the popover, for a
settings page.

```tsx
<PromptInput
  onSubmit={send}
  footer={
    <UsageMeter
      used={124_200}
      limit={200_000}
      agent="Copper"
      segments={[
        { id: "system", label: "System & tools", value: 12_400 },
        { id: "files", label: "Files", value: 18_200 },
        { id: "conversation", label: "Conversation", value: 93_600 },
      ]}
      onCompact={compact}
      compaction={compaction}
    />
  }
/>
```

## When to use it

- A chat with an agent whose context window fills up: the person sees it
  coming and can compact before the agent starts forgetting.
- A daily or monthly spending limit on an agent: "$3.40 of $10.00 today".
- A settings or billing page that shows the same breakdown in full
  (`UsageBreakdown`).

## When not to

- Work that finishes: an upload, an import. Use a progress bar.
- A count with no limit (messages sent, files read). Use a stat.
- Rate limits that reset in seconds. Say so in the error when a request is
  refused; a meter that refills on its own is noise.

## Props

Both components take the same usage props. Everything is controlled: you pass
the numbers on every update.

| Prop | What it does |
|---|---|
| `used`, `limit` | In tokens or in currency units. `used` above `limit` is allowed; the bar stops at the end |
| `kind` | `"tokens"` (default) or `"money"` |
| `segments` | `{ id, label, value }[]`: what the usage is made of, in order. Anything `used` has beyond their sum shows as "Other". Without segments the bar is one fill and the legend is left out |
| `thresholds` | `{ warning, danger }` as fractions of `limit`. Default `{ warning: 0.75, danger: 0.95 }` |
| `label` | Names the meter and the popover. Default "Context window", or "Budget" for money |
| `agent` | Who uses it, for the default messages: "Copper". Default "The agent" |
| `period` | Said after a money limit: "today", "this month" |
| `currency`, `locale` | For `Intl.NumberFormat`. Default `"USD"` and `"en-US"`, fixed so the server and browser agree |
| `format` | Your own number to text, replacing both of the above |
| `messages` | `{ calm?, warning?, danger? }`: the line under the legend, one per tone |
| `onCompact`, `compactLabel` | Shows "Compact conversation" from the warning tone up |
| `compaction` | `{ status: "running" }`, `{ status: "done", before, after }` or `{ status: "failed", error? }`. Leave it undefined until someone compacts |

`UsageMeter` also takes `indicator` (`"ring"` or `"bar"`), `side` and `align`
for the popover (default above the trigger, start-aligned, for a composer at
the bottom of the screen), and `open`, `defaultOpen`, `onOpenChange`.

## Tones

| Tone | When | Trigger | Line under the legend |
|---|---|---|---|
| Calm | under `warning` | Ring and text in the muted color | "Copper can see the whole conversation." |
| Warning | from `warning` | Ring in `--ui-warning`, text in `--ui-warning-text` | "Copper will start forgetting the oldest messages at 200k." |
| Danger | from `danger` | Ring in `--ui-danger`, text in `--ui-danger-text` | "Nearly full. Copper will …", then "Full. Copper is forgetting the oldest messages." at 100% |

Money says what’s left instead: "$6.60 left today.", then "$1.60 left. Copper
pauses when it reaches $10.00.", then "Budget reached. Copper is paused until
it resets or you raise it." If your agent does something else at the limit,
say that in `messages`.

A tone never repaints the segments. It tints what's left: the free part of
the bar and its legend dot take a pale `--ui-warning` or `--ui-danger`, and
from the danger tone the bar gets a hairline edge in the same color, 2px off
it, so it still reads "nearly out" once the segments fill the track. The
percentage, the ring, the icon and the line take the tone's text color.
Color is never the only signal: the line says it in words, the icon changes
from info to a warning triangle to an alert, and the legend names every
segment with its amount.

## Colors

The segments carry identity, so each gets its own hue, in a fixed order by
position. The legend dot beside each label is the same color.

| Segment | Color | Made from |
|---|---|---|
| 1st | Orchid | `--ui-accent` 45% with `--ui-danger`, 10% toward `--ui-surface` |
| 2nd | Teal | `--ui-accent` 20% with `--ui-success`, 10% toward `--ui-surface` |
| 3rd | Blue | `--ui-accent` |
| No `segments` | Blue | The one "Used" fill |
| 4th on, "Other" | Gray | `--ui-foreground` 42% toward `--ui-surface` |
| Free / Left | The track | `--ui-fill-strong`, tinted by the tone |

They are mixed from the theme's own tokens, so each theme gets its own tuned
steps and a project that changes its accent moves the set with it. As a set
they were checked in both themes: every pair stays apart under red-green
color blindness (protanopia and deuteranopia) and with full color vision,
and each holds 3:1 on the surface. None of them is the amber or red the
tones use. Put the largest, steadiest part last (the conversation, in a
context window), so the biggest area is the calm blue.

Three hues is the most the bar can hold and stay readable. Past three, the
extra segments are gray; fold small ones into "Other" (leave them out of
`segments`) rather than passing a fourth.

Between segments, and between the last one and the free track, a 2px gap
shows the surface, so neighboring colors never touch.

## Numbers

- Tokens read "940", "9.6k", "124k", "1.2M". Rounding picks the unit, so
  999,600 reads "1M", not "1,000k".
- Money is `Intl.NumberFormat` with `style: "currency"`: "$3.40".
- The percentage is floored, so it never says 100% before it's full, and
  any use at all shows at least 1%.
- Every changing figure is in tabular digits. Percentages sit in a box as
  wide as "100%", so the ring and the trigger never change width. The large
  figure isn't boxed (a box as wide as "200k" leaves a gap after "38k");
  when it gains or loses a digit, "of 200k tokens" slides on the text
  morph's width spring instead of jumping.

## Compacting

`onCompact` puts a button under the line once the tone reaches warning:
secondary at warning, primary at danger. You run the compaction and pass
`compaction` back:

| `compaction` | What you see |
|---|---|
| `{ status: "running" }` | The button stays, busy: "Compacting…" with the label shimmering |
| `{ status: "failed", error }` | Your error under the line, in the danger color, and "Try again" |
| `{ status: "done", before, after }` | Once usage is back under `warning`: "Compacted: 124k → 38k" with a check, in place of the line and the button. The second figure counts down from `before` to `after`. The bar's segments slide to their new sizes and the ring empties back |

If usage climbs past `warning` again, the button comes back. Clear
`compaction` whenever you like; nothing depends on it after "done".

## Live updates

Pass `used` and `segments` on every chunk while a reply streams. The ring and
bar retarget smoothly mid-move, the figures morph digit by digit and nothing
around them moves. Nothing is announced while it streams.

## Motion

| What | Duration | Easing |
|---|---|---|
| Ring arc, mini bar and bar segments move to new amounts | `--ui-dur-move` | `--ui-ease-move` |
| Figures and percentages: only the digits that differ change | text morph | `--ui-ease-move` |
| Tone colors: ring, percentage, icon, line, free track | `--ui-dur-instant` | `--ui-ease-color` |
| Line icon: info → warning → alert | icon morph | from the icon set |
| New line at a crossing, and the result, fade in | `--ui-dur-fast` | `--ui-ease-enter` |
| Area under the legend eases to its new height | animated size | `--ui-ease-expand` |
| Compacted figure counts down | `--ui-dur-move` | `--ui-ease-move`, sampled from the token |
| Popover opens and closes | see popover | |

The countdown is the one place a number passes through the values in
between. It happens once, because the person pressed a button, and the size
of the drop is the result they asked for. It lands with the bar, on the same
spring.

Under `prefers-reduced-motion: reduce` the ring, bar and segments jump to
their new amounts, the figures swap, nothing fades in and the countdown shows
the result at once. Color changes stay.

## Accessibility

- The trigger is a button named "Context window: 62% used", with ", running
  low", ", nearly full" or ", full" added from the warning tone up. It has
  `aria-haspopup="dialog"` and `aria-expanded`.
- The popover is a dialog named by the label and the figure: "Context window,
  124,200 of 200,000 tokens, 62%". Screen readers get the exact numbers, not
  "124k". Focus moves to the Compact button when there is one, otherwise to
  the dialog. Escape and a press outside close it and focus goes back to the
  trigger.
- The bar is `role="meter"` with `aria-valuenow`, `aria-valuemax` and the same
  `aria-valuetext`. The legend is a list named "What's using the context
  window".
- A polite status region speaks only when the tone goes up ("Context window
  75% used. Copper will start forgetting the oldest messages at 200k."), when
  a compaction finishes and when it fails. Streaming updates are silent. It
  lives outside the popover, so it's heard with the popover closed.
- When a compaction finishes, the button it came from is gone, so focus moves
  to the result line, unless focus had already moved somewhere else.
- The trigger has a 40px hit area on touch screens. In right-to-left text the
  ring fills counter-clockwise and the bars fill from the right.

## Before / after

Before: a raw count that jumps as it streams, red only when it's too late, and
nothing to do about it.

```tsx
<span style={{ color: used > limit * 0.9 ? "red" : "gray" }}>
  {used} / {limit} tokens
</span>
```

After: a warning while there's still room, what will happen in words, and the
fix one press away.

```tsx
<UsageMeter
  used={usage.total}
  limit={200_000}
  agent="Copper"
  segments={usage.segments}
  onCompact={async () => {
    const before = usage.total;
    setCompaction({ status: "running" });
    try {
      const after = await compactConversation(threadId);
      setCompaction({ status: "done", before, after });
    } catch {
      setCompaction({ status: "failed" });
    }
  }}
  compaction={compaction}
/>
```

A budget instead of a context window:

```tsx
<UsageMeter kind="money" label="Spending today" period="today" agent="Copper" used={3.4} limit={10} indicator="bar" />
```
