# Accordion

A stack of sections that open and close in place: questions about RSVPs, groups
of settings. Each title is a button inside a heading; its content opens by
animating its height to the measured content height, and the chevron flips. One or several
can be open at once. With `hash`, a link such as `#refunds` opens that
section, and it is already open on first paint. A row can carry a short
value at its end, such as "3 active" or "Not set", so a closed section
still says what's inside.

```tsx
<Accordion hash defaultValue="charged">
  <AccordionItem value="charged" title="When will I be charged?">
    <p>On the day you subscribe, then on the same date each month or year.</p>
  </AccordionItem>
  <AccordionItem value="refunds" title="How do refunds work?">
    <p>Yearly plans can be refunded in full within 14 days of a charge.</p>
  </AccordionItem>
</Accordion>
```

The behavior (open state, ARIA wiring, measuring the panel) is built on
Base UI's `Accordion`.

## When to use it

- Long pages of independent sections where most readers need only one:
  FAQs, help, advanced settings.
- Groups of settings that are useful to fold away. Give each row a `meta`
  value ("2 on", "Not set") so people can scan the state without opening
  every section.

## When not to

- Content everyone needs: show it. Hidden text is skipped.
- Switching between views of one thing: use tabs.
- A single "show more": a disclosure button on its own is enough.

## Props

| Prop | On | What it does |
|---|---|---|
| `type` | `Accordion` | `single` (default): one open at a time. `multiple`: any number |
| `value`, `onValueChange`, `defaultValue` | `Accordion` | A value or null for `single`, an array for `multiple` |
| `collapsible` | `Accordion` | `single` only. `false` keeps one item open at all times |
| `hash` | `Accordion` | Each item's value becomes its heading's id; the URL hash opens it |
| `headingLevel` | `Accordion` | `h2`–`h6` around each button (default `h3`); match the page outline |
| `value`, `title` | `AccordionItem` | `title` is the button's label |
| `meta` | `AccordionItem` | A short value at the end of the row, before the chevron: "3 active", "Not set". Part of the button's name. A string of up to 20 characters morphs when it changes; a longer one wraps |
| `disabled` | `AccordionItem` | |

```tsx
<Accordion type="multiple">
  <AccordionItem value="reminders" title="Reminders" meta={on ? `${on} on` : "Off"}>…</AccordionItem>
  <AccordionItem value="webhooks" title="Webhooks" meta="Not set">…</AccordionItem>
</Accordion>
```

Keep `meta` to a word or two, written as a state ("Not set", "2 on"),
not a call to action: the row itself is what you press.

## States

| State | What you see | How |
|---|---|---|
| Closed | Title, chevron pointing down | `aria-expanded="false"` |
| Open | Content below, chevron pointing up | `aria-expanded="true"` |
| Hover | Chevron in the text color; no fill | `@media (hover: hover) and (pointer: fine)` |
| Focus | A line just inside the row's edge, instantly | `:focus-visible` |
| Disabled | 50% opacity | `disabled` |

## Layout

Items are separated by hairlines. The title row is 46px; its focus line
reaches 12px past the text on every side, so titles and content stay
aligned with the rest of the page. Open content ends 12px above the next
hairline, the same as a title, so open and collapsed rows keep one rhythm. The chevron sits on the title's first
line when it wraps. Content is muted 15px text, at most 65 characters wide.

**Meta.** The value is 13px, muted, in tabular figures, on the title's
first baseline. It sits 8px from the chevron and at least 16px from the
title, so the two at the end read as one cluster. When the row runs short
of room, the value gives way first: the title keeps its one line and the
value fades out at its cut (only when it's actually cut, see `text`).
Only once the value is down to four letters' worth does the title start
to wrap. A row with a value is exactly as tall as one without, and the
title doesn't move.

In a row narrower than 480px (each heading is a size container), the value
moves under the title and the chevron stays beside the title, so neither is
squeezed into a column a word wide. The accordion is one column as wide as
its container: a long title wraps rather than widening it.

## Motion

| What | Duration | Easing |
|---|---|---|
| Opens | `--ui-dur-panel` × 1.25 (350ms) | `--ui-ease-expand` |
| Closes | `--ui-dur-base` × 1.25 (250ms) | `--ui-ease-collapse` |
| Closes because another opened (`single`): on the opening's timing, so the heights trade off exactly and nothing below moves | `--ui-dur-panel` × 1.25 (350ms) | `--ui-ease-expand` |
| Content fades in, a beat after the box starts opening | `--ui-dur-fast` × 1.25 (200ms), 60ms delay | `--ui-ease-enter` |
| Content fades out while the collapse is still easing in, so the text is gone before the edge reaches it | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Chevron flips: its tip moves, its ends stay | `Icon` | |
| A `meta` string changes ("2 on" → "3 on"): digits roll, the width follows | `--ui-dur-move` | `--ui-ease-move` (`TextMorph`) |

Sections hold reading, so the accordion moves half again as slow as the
panel tokens; `--accordion-pace` (1.25) on the root changes it in one place.
`height` is the one layout property that animates: Base UI measures the
content into `--accordion-panel-height`, and the panel goes from 0 to that
on `data-starting-style` and back on `data-ending-style`. The panel clips,
and the content's bottom padding is inside it, so it folds away too. Nothing
animates before the first paint. Under `prefers-reduced-motion: reduce`
sections open and close at once.

## URL hash

With `hash`, each heading gets the item's value as its id. Before any
JavaScript runs, CSS opens the item whose heading is the `:target`, so a
link to `#refunds` lands on that question already open, with nothing
moving. The component then takes over, follows `hashchange`, and opens the
target item when the hash changes. Headings have a `scroll-margin-top` of
`--header-height`, so a sticky header doesn't cover them. Values must be
unique on the page.

## Accessibility

- Follows the WAI-ARIA accordion pattern: a `button` with `aria-expanded`
  and `aria-controls` inside a heading, and a `region` labelled by that
  button.
- Closed content is `inert`, then `hidden` once the closing animation ends:
  it stays in the DOM but can't be focused or read.
- Tab moves through the titles; Enter or Space toggles.
- With `meta`, the button's name is the title, a pause, then the value:
  "Webhooks, Not set". The comma is in the markup at zero size, so it's
  heard, not seen. The panel's region takes the same name.

## Before / after

Before: content mounted on open, so it jumps in at full height, with a
chevron that swaps for another icon and no link to a question.

```tsx
<button onClick={() => setOpen(!open)}>
  How do refunds work? {open ? <UpIcon /> : <DownIcon />}
</button>
{open && <p>Yearly plans can be refunded…</p>}
```

After:

```tsx
<Accordion hash>
  <AccordionItem value="refunds" title="How do refunds work?">
    <p>Yearly plans can be refunded…</p>
  </AccordionItem>
</Accordion>
```
