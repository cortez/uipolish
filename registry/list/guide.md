# List

Rows of the same kind of thing: guests, settings, deliveries, files. Each
row has a leading avatar or icon, a title, one line under it, and a value
or control at the end. A row can be static, a link or a button; either way
the whole row is the target and one tab stop, and its secondary actions sit
beside it rather than inside it. Actions show while the row is pointed at
or holds focus, always on touch screens, and their room is kept, so nothing
moves. Every row is one height in every state.

```tsx
<List aria-label="Guests">
  {guests.map((g) => (
    <ListItem
      key={g.id}
      leading={<Avatar name={g.name} src={g.photo} size={40} decorative />}
      title={g.name}
      description={g.note}
      trailing={g.rsvp}
      current={selected === g.id}
      onClick={() => setSelected(g.id)}
      actions={<ListAction icon="copy" label={`Copy ${g.name}’s invitation link`} onClick={() => copy(g)} />}
    />
  ))}
</List>
```

## When to use it

- A set of peers someone scans and picks from: members, guests, files,
  orders, the sections of a settings page.
- Rows that open something (a link or a button per row), with an action or
  two that belong to one row: copy, remove, resend.

## When not to

- Data people compare across columns, sort or select in bulk: use a table.
- Picking one value for a form: use a radio group, select or listbox. A
  current row is where the person is, not a form value.
- A menu of commands: use a dropdown menu.
- A list that's empty: show an empty state in its place (what would be
  here, and the action that adds the first one), not an empty box.

## Props

`List` takes every `<ul>` prop; give it a name with `aria-label` or
`aria-labelledby`. `ListItem` takes `<li>` props besides these:

| Prop | What it does |
|---|---|
| `variant` (List) | `box` (default): rows in a rounded surface with an edge. `plain`: no box; the rows' fills reach past the text by the row padding, so text lines up with the content above |
| `leading` | An avatar, icon or thumbnail. Decorative: the title names the row |
| `title` | The row's name, cut with a fade if it runs long. On a link or button row it's the accessible name |
| `description` | One line under the title, cut with a fade. Read as the row's description. For a disabled row, say why here |
| `trailing` | A value, badge or control after the text. Plain text here is read after the description |
| `actions` | Secondary actions, usually `ListAction`s. Shown on hover and focus, always on touch |
| `chevron` | A chevron at the end, for rows that open something deeper. Nudges 2px on hover and focus |
| `href`, `target`, `rel`, `as` | Makes the row a link. `as` takes your router's link component |
| `onClick` | Makes the row a button (when there's no `href`). On a link row it's passed to the link |
| `current` | `aria-current` on the row's link or button: `page` for links, `true` otherwise, or the value you pass |
| `disabled` | The row can't be opened. The description stays at full contrast |

`ListAction` is a 34px round icon button: `icon`, `label` (its accessible
name, "Remove Maya Chen", not "Remove") and every `<button>` prop.

## States

| State | What you see | How |
|---|---|---|
| Rest | Rows on the surface, hairlines between them from the text to the end | |
| Hover | The row fills one step; the hairlines above and below it step aside; actions fade in; the chevron nudges 2px toward the end | `@media (hover: hover)`, link and button rows only |
| Press | The fill goes a step darker in 80ms and shrinks to 0.985, the text stays put; release eases back | `:active` on the row's link or button, not on its actions |
| Focus | A line just inside the row's edge, around the whole row; actions show | `:focus-visible` on the link or button |
| Current | A stronger fill, held; its hairlines step aside | `current` → `aria-current` |
| Disabled | Leading, title, trailing and chevron at 50%; the description stays readable; no hover, no press, out of the tab order | `disabled` |
| Static | No hover, no press, no pointer cursor: nothing to promise | no `href` or `onClick` |
| Long text | The title and description fade out over their last 24px, only when cut | the `text` primitive |

No state changes a row's height or moves its contents. Actions are laid
out at every moment and only their opacity changes; the separators are a
color that fades. A title with a description makes a 64px row, a title
alone 48px (52px on touch screens).

## Layout

The box sits its rows 4px in, each row's corners the box's radius less
4px. Rows are 12px in from their edges; the leading slot has 8px above and
below, so a 32px avatar fits a one-line row and a 40px one a two-line row.
The hairline between rows is drawn on the top of the text column, so it
starts where the text starts whatever the leading holds, and ends at the
row's padding. Titles are 15px / 500, descriptions 13px muted, trailing
values 15px muted with tabular figures, so values line up down the list.

When actions are last in a row, the last icon lines up with the end of
the text in the rows around it and its round fill reaches into the row's
padding.

## Motion

| What | Duration | Easing |
|---|---|---|
| Row fill on hover, current and release | `--ui-dur-instant` | `--ui-ease-color` |
| Press: fill and shrink | `--ui-dur-press` | |
| Press release (scale) | `--ui-dur-snap` | `--ui-ease-snap` |
| Separators stepping aside | `--ui-dur-instant` | `--ui-ease-color` |
| Actions fading in and out | `--ui-dur-instant` | `--ui-ease-color` |
| Chevron nudge | `--ui-dur-snap` | `--ui-ease-snap` |

Under `prefers-reduced-motion: reduce` the press doesn't shrink and the
chevron doesn't move; colors and fades stay, as they're feedback.

## Accessibility

- The list is a `<ul role="list">`: Safari drops list semantics from a list
  without bullets unless the role is stated. Screen readers announce how
  many rows there are.
- A link or button row is one element, the title, with a pseudo-element
  stretched over the row. One tab stop per row, its name is the title, and
  the description and any trailing text are linked with `aria-describedby`.
  Nothing interactive is ever nested inside it.
- Actions and controls in the trailing slot are siblings, lifted above the
  stretched link, so they take their own clicks and are their own tab
  stops, right after the row. Name each one with the row it acts on.
- Hover never gates an action: on touch screens they always show, and focus
  on the row or any action shows them.
- A disabled link loses its `href` (and with it the tab stop) but keeps
  `role="link"` and `aria-disabled`, so it's still announced as a link that
  can't be followed. Put the reason in `description`.
- The leading slot is decorative. Pass `decorative` to an `Avatar` there,
  so the name isn't read twice.

## Before / after

Before: a clickable `div` per row with a delete button inside it. The row
can't be reached with Tab, the button inside is a nested control, clicking
the button also opens the row, and the button only exists on hover, so a
phone can't delete anything.

```tsx
<div className="row" onClick={() => open(g)}>
  <img src={g.photo} />
  <div>{g.name}</div>
  {hovered && <button onClick={() => remove(g)}>×</button>}
</div>
```

After: one tab stop per row, a named action beside it, always reachable,
and nothing moves when it appears.

```tsx
<ListItem
  leading={<Avatar name={g.name} src={g.photo} decorative />}
  title={g.name}
  onClick={() => open(g)}
  actions={<ListAction icon="trash" label={`Remove ${g.name}`} onClick={() => remove(g)} />}
/>
```
