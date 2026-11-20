# Context menu

A menu that opens where the user asked for it: at the pointer on a right
click, under the finger after a long press, and on Shift+F10 or the menu key
from the keyboard. It is the dropdown menu without a button. The panel, the
rows, the sliding highlight, the shortcuts, the submenus and the motion are
the dropdown menu's own classes, and its items are the dropdown menu's own
components, so one list of items serves a row's "…" button and its right
click.

The behavior (opening, focus, keys, typeahead, submenus, positioning and
dismissal) is built on Base UI's `ContextMenu`; this component adds the area
that opens it and the dropdown menu's look.

## When to use it

- A second way to the actions on one thing in a list, a table or a board:
  the same items as its "…" button, for people who right-click.
- An area with no room for a button: a seating plan, a canvas, a calendar
  cell.

## When not to

- The only way to an action. A right click can't be discovered, and a long
  press even less: every item must also be reachable from something visible,
  like the row's "…" button.
- On text the user may want to copy, a link, or a text field. The browser's
  own menu (copy, open in a new tab, spelling) is the useful one there.
- A menu that should open from a button: use the dropdown menu.

## Parts

| Part | Role | Notes |
|---|---|---|
| `ContextMenu` | area + `menu` | `trigger` is the area: one element (a row, a card, a `div`) that takes a ref and event handlers. `children` are the items. `label` names the menu. `disabled` hands the right click back to the browser. `onOpenChange`, `className` (the panel) |
| Items | | Imported from the dropdown menu: `MenuItem`, `MenuCheckboxItem`, `MenuRadioGroup`, `MenuRadioItem`, `MenuGroup`, `MenuSeparator`, `MenuSub`. Same props, same behavior, `closeOnSelect={false}` and `busy` included |

## One list, two menus

Write the items once and give them to both menus. They can't drift apart,
and the right click never holds an action the button doesn't.

```tsx
const actions = (dish: Dish) => (
  <>
    <MenuItem icon={<Icon name="duplicate" />} onSelect={() => duplicate(dish)}>Duplicate</MenuItem>
    <MenuSeparator />
    <MenuItem variant="danger" icon={<Icon name="trash" />} onSelect={() => remove(dish)}>Remove dish</MenuItem>
  </>
);

<ContextMenu
  trigger={
    <li>
      {dish.name}
      <DropdownMenu align="end" trigger={<Button variant="ghost" aria-label={`Actions for ${dish.name}`}><Icon name="more" /></Button>}>
        {actions(dish)}
      </DropdownMenu>
    </li>
  }
>
  {actions(dish)}
</ContextMenu>
```

- The area gets `data-popup-open` while its menu is open. Give the row a
  quiet fill (`--ui-fill`) on it, so the menu's subject is never in doubt.
- Write `MenuItem` directly among the menu's children, or inside a
  fragment, a `MenuGroup`, a `MenuRadioGroup` or a `MenuSub`. A `MenuItem`
  rendered by a component of your own (`<DishActions />`) can't find its
  menu here and throws; return the items from a function instead, as above.
- The "…" button inside the area is an ordinary dropdown menu. A right
  click on it opens the context menu, like anywhere else in the row.

## Keyboard

| Key | In the area | In the menu |
|---|---|---|
| Shift+F10, the menu key | Open at the focused element. Focus must be in the area: on the area itself if it is focusable, or on a button inside it | |
| ArrowDown / ArrowUp | | Next / previous item, wrapping |
| Home / End | | First / last item |
| Enter, Space | | Activate the highlighted item; on a submenu item, open it and move in |
| ArrowRight / ArrowLeft | | Open the highlighted submenu / close it, back to its item |
| Escape | | Close this level; from the top level, close and return focus |
| Letters | | Typeahead, as in the dropdown menu |

Disabled items can be reached with the arrow keys, so screen reader users
learn they exist, but can't be activated.

## Pointer

- A right click opens the menu on press, its corner at the pointer. Holding
  the button, dragging to an item and releasing selects it, the way native
  menus do.
- A right click somewhere else in the area while the menu is open moves it
  there: it arrives again at the new point.
- A right click in another area closes this menu and opens that one.
- **Touch.** Pressing and holding for 500ms opens the menu under the
  finger; moving more than 10px first cancels it, so a scroll never opens a
  menu. On coarse pointers the area's text can't be selected and the
  browser's own long-press callout is off, or both would fight the menu.
- A press outside closes the menu. Unlike the dropdown menu, the first
  press outside only closes: it doesn't also activate what it landed on.
- Hover, the 100ms submenu delay and the safe triangle are the dropdown
  menu's.

## States

| State | What you see | How |
|---|---|---|
| Open | The dropdown menu's panel, its top corner at the pointer (the far corner in right-to-left) | right click, long press, Shift+F10 |
| Area with its menu open | Whatever you style on `[data-popup-open]`; nothing by default | `data-popup-open` on the `trigger` element |
| Moved | The open menu arrives again at a second right click | |
| Flipped / shifted | Slides back inside the viewport, 8px from its edges; submenus open on the other side near the edge | Base UI `ContextMenu.Positioner` |
| Disabled | The browser's own menu opens instead | `disabled` |
| Items | Highlighted, pressed, danger, disabled, checked, confirmed in place, busy, submenu open: all as in the dropdown menu | |

The panel's edge and glass are the dropdown menu's (`--ui-shadow-floating`,
`--ui-surface-glass` over `--ui-glass-blur`).

## Motion

| What | Duration | Easing |
|---|---|---|
| Open: fade, unblur 2px and scale 0.97 → 1 from the pointer | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Close | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Moved to a second right click: the open plays again at the new point | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Highlight, press, labels that change in place, busy | as in the dropdown menu | |

The scale's origin is the pointer (Base UI's `--transform-origin`), also
when the panel had to slide up or sideways to fit: it still grows out of the
point that was pressed. Under `prefers-reduced-motion: reduce` the menu only
fades, here and when it moves.

## Accessibility

- The menu is a real `menu` with `menuitem`, `menuitemcheckbox` and
  `menuitemradio` roles. It has no button to take its name from, so pass
  `label` and say what the actions act on: "Actions for Braised short rib".
- The area gets no role and no `aria-haspopup`: nothing announces that a
  context menu exists. That is why every item must also be reachable from a
  visible control.
- Focus moves into the menu on open. On close it returns to what had focus
  before: the area, or the button inside it. A right click on an area that
  held no focus leaves none behind. If the chosen action moved focus itself
  (to a rename field, to an Undo button), it stays there.
- For keyboard use the area needs focus inside it. A row with a "…" button
  has one; an area with no controls needs `tabIndex={0}`, a role and a name.
- The menu is portalled to `<body>`, or into the nearest `[data-theme]`
  element around the area so it keeps that theme's tokens.
- Rows are 48px tall on coarse pointers.
- If an action removes the area (Remove dish), move focus somewhere useful
  yourself, such as an Undo button, and announce the result in a
  `role="status"` region.

## Before / after

Before: an `onContextMenu` handler and an absolutely positioned `div`. No
roles, no keys, it opens off screen near the right edge, a long press does
nothing, and its items are a second copy of the "…" menu's that someone
forgot to update.

```tsx
<li onContextMenu={(e) => { e.preventDefault(); setAt({ x: e.clientX, y: e.clientY }); }}>
  {dish.name}
</li>
{at && (
  <div className="menu" style={{ left: at.x, top: at.y }}>
    <div onClick={duplicate}>Duplicate</div>
    <div className="danger" onClick={remove}>Remove</div>
  </div>
)}
```

After:

```tsx
<ContextMenu trigger={<li>{dish.name}{/* … and its "…" DropdownMenu */}</li>}>
  <MenuItem icon={<Icon name="duplicate" />} shortcut="⌘D" keyshortcuts="Meta+D" onSelect={duplicate}>
    Duplicate
  </MenuItem>
  <MenuSub label="Move to" icon={<Icon name="arrow-right" />}>
    <MenuRadioGroup value={dish.course} onValueChange={move}>
      <MenuRadioItem value="Starter">Starter</MenuRadioItem>
      <MenuRadioItem value="Main">Main</MenuRadioItem>
    </MenuRadioGroup>
  </MenuSub>
  <MenuSeparator />
  <MenuItem variant="danger" icon={<Icon name="trash" />} onSelect={remove}>Remove dish</MenuItem>
</ContextMenu>
```
