# Date picker

A date field that opens a calendar. Pick a day, or a range with
`mode="range"`. Days are ISO strings (`"2026-11-14"`) worked on as UTC
midnights, so no time zone or daylight saving change can move a day.

The calendar opens in Base UI's `Popover`, which places it, dismisses it
and returns focus; the grid and its keys are this component's own.

```tsx
<DatePicker label="Dinner date" name="date" min="2026-10-01" max="2027-03-31" isDateDisabled={closedMondays} />
<DatePicker label="Guests stay" mode="range" name={{ start: "arrive", end: "leave" }} weekStartsOn={1} />
```

## When not to

- Dates far from today, like a birth date: three fields or a text field
  with a format hint are quicker than paging through years.

## Props

| Prop | What it does |
|---|---|
| `mode` | `single` (default) or `range` |
| `value`, `defaultValue`, `onValueChange` | `"YYYY-MM-DD"`, or `{ start, end }` in range mode |
| `min`, `max`, `isDateDisabled` | Days outside or disabled are struck through and can't be chosen; a range can't span one |
| `weekStartsOn`, `locale` | First weekday (0 Sunday); month, weekday and date names come from `Intl` |
| `name` | A string, or `{ start, end }` in range mode, for hidden inputs |
| `hint`, `validate`, `error`, `required`, `disabled`, `placeholder` | As on the select |

## Keyboard

The calendar follows the WAI-ARIA date picker dialog.

| Key | Does |
|---|---|
| Enter, Space, ArrowDown on the field | Open on the chosen day, or today |
| Arrows | Day before or after, week before or after (left and right swap in RTL) |
| Home / End | First / last day of the week |
| PageUp / PageDown | Same day last / next month (Shift: year) |
| Enter, Space | Choose. In range mode the first press sets the start; the band follows the focus or the pointer until the second |
| Tab | Moves between the month buttons and the grid, staying inside |
| Escape | Close and return focus to the field |

## Layout

- The field fits the date and morphs to the next one (`TextMorph`).
- The panel's radius is the large one; everything in its corners sits
  12px in with the radius less 12px, so the month buttons and days have
  10px corners.
- Always six weeks, so the panel's height never changes between months.
- Days are 36px, 40px on touch screens. Today has a short line under the
  number.
- A range is a band behind the days that rounds off at each week's edge.

## Motion

| What | How |
|---|---|
| Month changes: weeks | The new month slides 20px in from the side you moved toward (next from the right, previous from the left; mirrored in RTL) and the old one 20px out the other way, both on `--ui-ease-glide` over `--ui-dur-glide`, so neither swings past its place. The old one fades on `--ui-dur-instant` / `--ui-ease-color`; the new one fades in on `--ui-dur-fast` / `--ui-ease-enter` half a beat later, so the two months never read on top of each other |
| Month changes: edges | The sliding weeks are clipped at the panel's edge and fade through its 12px padding (a mask), never a hard cut. At rest no day is in the fade |
| Month changes: title | Morphs with `TextMorph`: "November" → "December" keeps "ember 2026" and swaps the rest |
| Paging fast | A month interrupted mid-slide leaves from where it is, not from rest, so repeated PageDown never jumps |
| Weekday row, panel size | Hold still. Always six weeks, so the panel's height never changes |
| Panel opens | Fade on `--ui-dur-fast`, 0.97 scale and a 2px blur clearing on `--ui-dur-base`, all `--ui-ease-enter`, from the field (`--transform-origin`), flipping above when there's no room below |
| Panel closes | All on `--ui-dur-instant`, `--ui-ease-exit` |
| Press on a day or month button | Only the fill shrinks |

Under `prefers-reduced-motion` months crossfade in place (no slide), the
panel only fades, and the title swaps at once.

## Accessibility

A `role="dialog"` with a `role="grid"`; each day is a button named in full
("Saturday, November 14, 2026") with `aria-current="date"` for today and
`aria-selected` on chosen cells. The month title is a live region. Today
is worked out when the calendar opens, so server and browser render the
same page.
