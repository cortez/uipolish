# Prompt suggestions

Suggested prompts for a chat, in two layouts. **Starter cards** fill an
empty thread: two to four cards, each a short title, an optional line of
detail and an optional icon. **Follow-up chips** sit under an answer: a
wrapping row of pills with the next thing the person might ask. Pressing
either calls `onSelect` with the suggestion. The set arrives as one group,
and when you pass an empty list it fades out, then closes its space.

```tsx
<PromptSuggestions
  suggestions={messages.length === 0 ? STARTERS : []}
  onSelect={(s) => send(s.prompt)}
/>

<PromptSuggestions
  layout="follow-up"
  suggestions={isLast && !streaming ? reply.followUps : []}
  onSelect={(s) => send(s.prompt)}
/>
```

```tsx
const STARTERS: PromptSuggestion[] = [
  { icon: "list", title: "Plan the menu", detail: "Three courses for 14, two of them vegetarian",
    prompt: "Plan a three-course menu for 14 guests. Two are vegetarian." },
  { icon: "check-circle", title: "Chase the RSVPs", detail: "Who hasn’t answered yet" },
];
```

## When to use it

- Starter cards: the empty state of a chat or assistant panel, to show what
  it's good at. Two to four; more reads as a menu, not a suggestion.
- Follow-up chips: under the latest finished answer, for the obvious next
  questions ("Remind Priya and Tom", "Make the shopping list for 11").
- Either can send at once or fill the composer: `onSelect` hands you the
  suggestion and you decide.

## When not to

- Chips that only fill the composer, sitting on top of it: use
  `PromptInput`'s `suggestions`. That's the same idea built into the
  composer, and it never sends.
- A choice the assistant is waiting on ("Which day?"): show real options in
  the answer (a radio group, buttons), not suggestions the person can ignore.
- Filters or tags that stay on: use chips. A follow-up is pressed once and
  goes away; it never stays pressed.
- Under an answer that's still streaming, or under every answer in the
  thread: only the latest finished one gets follow-ups.

**Send or fill?** A starter like "Plan a dinner" usually wants a detail
added ("for Saturday"), so filling the composer
(`promptRef.current?.setText(s.prompt)`) is often kinder. A follow-up is
specific enough to send as is. Either way, the press is the person's
choice, so never send a suggestion they didn't press.

## Props

Every other `<div>` prop passes through to the group.

| Prop | What it does |
|---|---|
| `suggestions` | Strings, or `{ title, detail?, icon?, prompt? }`. Pass `[]` to have them leave; keep the component mounted so it can |
| `onSelect` | Called with the suggestion, `prompt` always set (it defaults to `title`) |
| `layout` | `"start"` (cards, the default) or `"follow-up"` (chips) |
| `label` | The group's name. Defaults to "Suggested prompts" |
| `disabled` | Every button disabled, at 50% |

`icon` is a name from the icon set (`"calendar"`, `"list"`) or your own 16px
node. `detail` shows on cards only.

## States

| State | What you see | How |
|---|---|---|
| Rest | Surface fill, the one hairline edge. Card titles in the text color at 500, details muted at 400; icons muted | |
| Hover | One fill step (`--ui-fill-solid`); the icon takes the text color. The edge holds | `@media (hover: hover)` |
| Press | A second fill step and `--ui-scale-press`, at once | `:active` |
| Focus | A line just inside the edge, at once | `:focus-visible` |
| Disabled | 50%, no hover or press | `disabled` |
| Arriving | The set fades in and rises 4px, together | a new set of `suggestions` |
| Leaving | The set fades out, then the space it took closes. Nothing in it can be pressed or reached once it starts | `suggestions={[]}`, `data-leaving`, `inert` |

## Layout

- **Cards** sit two across with an 8px gap (`--ui-gap-inline`), one across
  when the group is under 400px wide (a container query, so it follows the
  chat column, not the window). Each is at least 48px tall
  (`--ui-control-lg`), padded 12 by 16, at the card radius
  (`--ui-radius-lg`). Cards in a row match heights, so a two-line title
  doesn't leave its neighbor short.
- The icon sits on the title's first line, 12px before the text. Titles and
  details wrap rather than cut: a suggestion is read in full.
- **Chips** are 32px pills (`--ui-control-sm`) with 14px labels, the
  same height and type as `Chip`, padded half their height so the label ends
  where the round end starts. A long one wraps into a rounded box instead of
  cutting. They wrap with 8px across and down.
- Leaving closes the group's own height. If the parent puts a gap around
  it, the gap stays until you drop the component; that's usually when the
  next message lands anyway.

## Motion

| What | Duration | Easing |
|---|---|---|
| Fill on hover | `--ui-dur-instant` | `--ui-ease-color` |
| Press darkens and shrinks / release | `--ui-dur-press` / `--ui-dur-snap` | `--ui-ease-snap` |
| Cards arrive: fade, 4px rise, as one | `--ui-dur-base` | `--ui-ease-enter` |
| Chips arrive: fade, 4px rise, as one | `--ui-dur-fast` | `--ui-ease-enter` |
| The set fades out | `--ui-dur-instant` | `--ui-ease-exit` |
| Then its space closes | `--ui-dur-base`, after `--ui-dur-instant` | `--ui-ease-collapse` |

**No stagger.** Stagger is for things read in order. Starter cards are four
doors side by side and follow-ups are a row of chips; neither has an order,
so each set arrives as one.

**Leaving follows the list-removal rule** in `foundation/rules/motion.md`:
the fade starts on the send and only then does the height close, so nothing
below jumps up under a card that's still visible. The component holds the
last set on screen while it leaves and renders nothing once it's gone. A
set that comes back mid-fade (`suggestions` non-empty again) fades straight
back in.

Under `prefers-reduced-motion: reduce` sets still fade in and out, without
rising, shrinking on press or closing their space as they go; the space is
freed in one step once the fade ends.

## Accessibility

- A `role="group"` named "Suggested prompts" (or your `label`) holding a
  list, so a screen reader hears how many there are.
- Every suggestion is a real `<button>` in reading order: Tab moves through
  them, Enter and Space press them.
- A card's name is its title; its detail is its description
  (`aria-describedby`), read after a pause rather than run into the title.
- Icons are decorative (`aria-hidden`).
- Leaving makes the group `inert` at once, so a second press can't send
  twice and Tab skips it while it fades. The pressed button goes with it,
  so move focus to the composer after a send
  (`promptRef.current?.focus()`), or the next Tab starts from the top of
  the page.
- Chips have a 40px hit area on touch screens; cards are 48px already.
- In forced-colors mode cards and chips draw a real border.

## Before / after

Before: suggestions that stay after the person has sent one, so the thread
keeps offering a question that was already asked, and a tap during the
reply sends a second message.

```tsx
<div className="suggestions">
  {followUps.map((f) => <span onClick={() => send(f)}>{f}</span>)}
</div>
```

After: real buttons in a named group, under the latest finished answer
only, that fade out and close their space the moment something is sent.

```tsx
<PromptSuggestions
  layout="follow-up"
  suggestions={isLast && !streaming ? reply.followUps : []}
  onSelect={(s) => send(s.prompt)}
/>
```
