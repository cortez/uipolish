# Calendar

An events calendar: a month of days with the events on them, or a week of
day columns on an hour grid. A header holds the title, Today, the arrows
and a Month / Week switch. Pages slide the way the date picker's months
do. Below 560px of its own width the month trades its chips for dots and a
list of the chosen day, and the week shows three days.

It's not a date picker: for choosing a date in a form, use the date
picker. The calendar shows what's planned and lets people open or start
an event from it.

```tsx
<Calendar
  aria-label="Kitchen calendar"
  events={bookings}
  onEventClick={(event) => openBooking(event.id)}
  onDateClick={(day) => startBooking({ day })}
  onSlotClick={(start) => startBooking({ start })}
/>
```

## When to use it

- Things that happen at a time and on a day, and people plan around when:
  bookings, tastings, deliveries, shifts, deadlines.
- A month to see what's coming and how busy each day is, and a week to
  see the hours, overlaps and gaps.

## When not to

- Choosing a date for a form: use the date picker.
- A list of what happened, newest first: use the timeline.
- Dates far apart with nothing to compare across days: a list grouped
  by date reads faster than mostly empty squares.

## Props

`Calendar` takes every `<div>` prop besides these. Name it with
`aria-label` (default "Calendar").

| Prop | What it does |
|---|---|
| `events` | `{ id, title, start, end, allDay?, tone? }[]`. `start` and `end` are local wall-clock text (`"2026-11-21T19:00"`), a `Date`, or text with a zone (read as that moment, shown in local time). A timed event's `end` is exclusive; an all-day one's `end` is its last day (`"2026-11-25"` to `"2026-11-27"` is three days) |
| `tone` | `neutral` (default), `accent`, `success`, `warning` or `danger`: the dot of a timed event, and the fill of an all-day one or a block in the week, from the status tints |
| `view`, `defaultView`, `onViewChange` | `month` (default) or `week`, controlled or not. The switch in the header changes it |
| `date`, `defaultDate`, `onDateChange` | The day in focus, `"YYYY-MM-DD"`: it decides which month or week shows. Defaults to today. Pass `defaultDate` when the page renders on a server in another time zone |
| `onEventClick` | Makes every event a button. Without it, events are text |
| `onDateClick` | A day pressed, or Enter on it: open the day, or start a new event on it. A narrow month only chooses the day for its list |
| `onSlotClick` | Makes the week's empty time a target: a press gets the half hour under it, `"2026-11-24T09:30"`. While the pointer is over one, the half hour shows its time |
| `weekStartsOn`, `locale` | First weekday (0 Sunday) and the names. The first day defaults to the locale's own (Monday in most of Europe), where the browser knows it; month, weekday, date and time names come from `Intl` |
| `startHour` | The hour the week scrolls to when it opens (8) |

Set `--calendar-height` on it for the box's height above 560px (640px);
below, the box is the weekday row and six rows of `--compact-row` (56px).

## States

| State | What you see | How |
|---|---|---|
| Today | Its number in a pill of `--ui-control-on`, the accent a ticked checkbox takes; in the week a line in the same accent marks the time, moved every 30 seconds | Read after mount, so server and browser render the same page |
| Day in focus | Its number in the strong fill | `date` |
| Days of the next or last month | Numbers in the subtle gray; their events show as usual | |
| Timed event in a month | A dot in its tone, the time in muted gray, the title | |
| All-day or multi-day event | A bar in its tint with a hairline in its hue, on every day it covers; in the week it rides in the all-day row | |
| Too many for a day | As many chips as fit, measured from the day's own room, then "+2 more", which opens a popover with the whole day | Base UI's `Popover`, through the popover component |
| Overlapping events in the week | Side by side. Each spreads over free columns to its right; one with a neighbour still to its right reaches 1.7 times its share under it, so a long event beside two short ones keeps room for its title. Later columns sit on top, cut out by a ring of the surface | |
| A narrow event | Its time goes and its title holds one line, faded at the end | A container query on the event |
| Short event (under 45 minutes) | Title and start time on one line | |
| Hover on a day, an event, an empty half hour | One fill step; the half hour shows its time | `@media (hover: hover)` |
| Press | The fill or chip shrinks to `--ui-scale-press` in 80ms and springs back | `:active` |
| Focus | A line just inside the day number, chip or event | `:focus-visible` |
| Narrow | Month: the number with up to three dots in the events' tones, and below the box the chosen day's events as a list; tapping a day chooses it. Week: three days from the one in focus, paged by three | Below 560px of its own width, a container query and the same width in JS |

Long titles: chips and short events fade at the end of their line (the
`text` primitive's `truncate`); a block in the week and a row in a list
wrap.

## Layout

- The header lines its four controls up at 40px. Narrow, it takes two
  rows: the title and the arrows, then Today and the switch.
- The box is a card: the surface inside the resting edge and shadow, the
  large radius. Its lines are the one hairline.
- A month is always six weeks, so the box never changes height between
  months. Days are 6px in; chips are 20px (24 on touch screens) with 2px
  between, so the number of chips a day shows follows its height.
- The week's hours are 48px (`--calendar-hour`), with a 56px gutter of
  times (48 narrow). Events sit 4px in from their day's edges.
- Times keep reading left to right on a right-to-left page.

## Motion

| What | How |
|---|---|
| Paging: the days | The new page slides 20px in from the side you moved toward (next from the end, previous from the start; mirrored in RTL) and the old one 20px out the other way, both on `--ui-ease-glide` over `--ui-dur-glide`. The old one fades on `--ui-dur-instant` / `--ui-ease-color`; the new one fades in on `--ui-dur-fast` / `--ui-ease-enter` half a beat later. The date picker's month motion, exactly |
| Paging: what holds still | The weekday row, the month's lines, the week's day and hour lines, the hour gutter and the box. The days slide under the box's edge and the gutter's line, both lines already, so the clip needs no fade; the week's head carries its fill and its lines a slide's length past each end, so no strip opens beside it |
| Paging: title | Morphs (`TextMorph`): "November 2026" → "December 2026" keeps "ber 2026" |
| Paging fast | A page interrupted mid-slide leaves from where it is, so five clicks in 300ms, or held PageDown, never jump; at most two pages are on their way out |
| Month ↔ week | An offset crossfade in place: the old view gone on `--ui-dur-instant`, the new one in on `--ui-dur-fast` half a beat later. The box keeps its height |
| The narrow day list | Crossfades the same way when the day changes; its height follows on `AnimatedSize`. It folds away (grid rows, `--ui-ease-collapse`) in the week and opens back in the month |
| "+2 more" | The popover's own: fade, 0.97 scale and blur from the button |
| Press | Down in `--ui-dur-press`, back on `--ui-ease-snap` |

Under `prefers-reduced-motion` pages crossfade in place without sliding,
presses don't shrink, the popover only fades, and on a phone the day's
list folds as a short fade (`--ui-dur-fast` in, `--ui-dur-instant` out)
with its height changing at once.

## Accessibility

- The month is a `role="grid"` named by its title, a row per week. Each
  day's number is a button named in full ("Saturday, November 21, 2026, 4
  events") with `aria-current="date"` on today. One day is a tab stop.
- Keys on a day:

| Key | Does |
|---|---|
| Arrows | Day before or after, week before or after (left and right swap in RTL). Past the page's edge, the page slides |
| Home / End | First / last day of the week (of the three days, narrow) |
| PageUp / PageDown | Last / next month, week, or three days (Shift: a year, in the month) |
| Enter, Space | `onDateClick` for that day (narrow month: choose it) |
| Tab | From the day to its events and its "+2 more", then out of the calendar |

- The week's day headers are the same: a one-row grid of day buttons, and
  Tab goes from the day in focus to its events in time order.
- An event button is named with its title, day and time ("Staff briefing,
  Saturday, November 21, 3:00 – 3:30 PM").
- The title is a polite live region, so paging is announced.
- The dots and the hour gutter are hidden from screen readers; the day's
  name says how many events it holds.
- Popover rows are buttons; choosing one closes the popover first, and
  Escape returns focus to "+2 more".

## Before / after

Before: a table of days with events stacked in each cell. A busy day
stretches its whole week taller, every event is a tab stop (forty on a
busy month), and paging swaps the month in a single frame.

```tsx
<table>{weeks.map((w) => <tr>{w.map((d) => <td>{d.events.map((e) => <a>{e.title}</a>)}</td>)}</tr>)}</table>
```

After: six weeks that never change height, a day's overflow in a
popover, one tab stop for the grid with Tab into the day in focus, and
pages that slide.

```tsx
<Calendar events={events} onEventClick={open} onDateClick={startBooking} />
```
