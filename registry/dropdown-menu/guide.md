# Dropdown menu

A button that opens a list of actions and options. It follows the WAI-ARIA
menu button pattern: real `menu`, `menuitem`, `menuitemcheckbox` and
`menuitemradio` roles, arrow keys that wrap, typeahead, and submenus. It
opens on press rather than release, the pointer and the keyboard share one
highlight that slides between items, and a submenu stays open while the
pointer cuts diagonally across other items to reach it.

The behavior (focus, keys, typeahead, submenus, positioning and dismissal) is
built on Base UI's `Menu`; this component adds the look, the sliding
highlight, the held width and the in-place confirmations.

## When to use it

- The "…" on a row: actions on one thing, like a dinner.
- A small set of view options: sort order, currency, which columns show.
- Grouping secondary actions so the primary one can stand alone.

## When not to

- Navigation between pages: use links. Menu items aren't links and don't open
  in a new tab.
- Picking a value for a form field: use a select or combobox, which submit
  with the form and show the current value.
- The only route to an important action. Put frequent actions on the page
  and keep the menu for the rest.
- Forms or anything with a text field: use a popover.

## Parts

| Part | Role | Notes |
|---|---|---|
| `DropdownMenu` | trigger + `menu` | `trigger` is a button; it gets `aria-haspopup="menu"` and `aria-expanded`, plus `aria-controls` while open |
| `MenuItem` | `menuitem` | `onSelect`, `icon`, `shortcut`, `description`, `variant="danger"`, `disabled`; `closeOnSelect={false}` and `busy` to confirm in place |
| `MenuCheckboxItem` | `menuitemcheckbox` | `checked`, `onCheckedChange`; keeps the menu open unless `closeOnSelect` |
| `MenuRadioGroup` / `MenuRadioItem` | `group` / `menuitemradio` | `value`, `onValueChange`, `label`; a radio closes the menu unless `closeOnSelect={false}` |
| `MenuGroup` | `group` | `label` is shown above the items and names the group |
| `MenuSeparator` | `separator` | |
| `MenuSub` | `menuitem` with `aria-haspopup="menu"` + `menu` | `label`, `icon`; children are the submenu's items |

## Confirming in place

Most actions close the menu: the result shows on the page. Some have no
result on the page (copying a link) or take a moment (building a PDF);
closing at once leaves the user unsure anything happened. Such an item can
keep the menu open and answer in its own row:

```tsx
<MenuItem
  icon={<Icon name={copied ? "check" : "link"} />}
  closeOnSelect={false}
  onSelect={copyLink}
>
  {copied ? "Copied" : "Copy link"}
</MenuItem>

<MenuItem
  icon={<Icon name={pdf === "done" ? "check" : "download"} />}
  closeOnSelect={false}
  busy={pdf === "busy"}
  onSelect={({ close }) => build().then(() => { setPdf("done"); setTimeout(close, 900); })}
>
  {pdf === "done" ? "PDF downloaded" : "Download PDF"}
</MenuItem>
```

- **Rows are rounded, not pills.** The panel is inset `--ui-inset-menu`
  (12px) around its rows and each row takes the concentric radius, the
  panel's 24 less that inset: 12. Row text sits `--ui-pad-row` (12px) in,
  clear of the row's curve, so it lands 24px from the panel's edge, the
  same as the command palette's.
- With `closeOnSelect={false}` the menu stays open and the highlight and
  focus stay on the item, so the arrow keys, Enter and typeahead go on
  working. A string label morphs when it changes (`TextMorph`): shared
  letters slide, the rest cross over, in the row's own width.
- **The menu never narrows while it's open.** Its width is held from the
  moment it opens, so "Copy link" → "Copied" doesn't pull the edge in
  under the pointer or, with `align="end"`, shift every row sideways.
  Keep the confirmed label no longer than the action's, and the menu
  doesn't grow either.
- `busy`: the label keeps its words, dims after 120ms and a light band
  passes across it, as on a busy button. A press while busy does nothing;
  the item isn't disabled, so it keeps focus and the highlight.
- `onSelect` receives `close`. Call it a beat after the confirmation shows
  (about 900ms), or leave the menu open and revert the label after about
  two seconds. Reset the label after the menu has faded out, not before.
- Give every async action a failure label too ("Couldn’t copy"): a row
  that says nothing on failure is worse than one that closes.
- The change is visible, not heard: put the result in a `role="status"`
  region as well ("Copied the link to Harvest dinner").

## Keyboard

| Key | On the trigger | In the menu |
|---|---|---|
| Enter, Space | Open, highlight the first item | Activate the highlighted item; on a submenu item, open it and move in |
| ArrowDown | Open, highlight the first item | Next item, wrapping from last to first |
| ArrowUp | Open, highlight the last item | Previous item, wrapping from first to last |
| Home / End | | First / last item |
| ArrowRight | | Open the highlighted submenu and highlight its first item |
| ArrowLeft | | In a submenu: close it, back to its item |
| Escape | | Close this level; from the top level, close and focus the trigger |
| Tab | | Close the menu; focus moves on from the trigger as if the menu weren't there |
| Letters | | Typeahead: jump to the next item starting with what you typed. A short pause resets it; repeating one letter cycles through matches |

Disabled items can be reached with the arrow keys, so screen reader users
learn they exist, but can't be activated.

## Pointer

- Pressing the trigger opens the menu on `pointerdown`. Pressing, dragging
  to an item and releasing selects it, the way native menus do.
- On touch the menu opens on tap, since a `pointerdown` might be the start of
  a scroll.
- Hovering highlights; moving off the items clears the highlight, except on
  the item whose submenu is open.
- Hovering a submenu item opens it after 100ms, so sweeping past doesn't
  flash it.
- **Safe triangle.** When the pointer leaves a submenu item while its
  submenu is open, the submenu stays open while the pointer travels across
  the area between that point and the submenu's near edge, so cutting
  diagonally over other items doesn't close it. Base UI's submenu handling
  does this.
- A press outside the menu closes everything. The menu isn't modal: the page
  doesn't lock scrolling, and the outside press still reaches what it hit.

## States

| State | What you see | How |
|---|---|---|
| Highlighted | One rounded fill under the item, 10% of the text color; it slides from the previous item | pointer or keyboard, same state, and focus moves with it |
| Pressed | Fill darkens to 16% in 80ms | `:active` |
| Danger | Red text and icon; the highlight turns red-tinted | `variant="danger"` |
| Disabled | 50% opacity, default cursor, optional reason on a second line | `disabled`, `description` → `data-disabled` |
| Checked | Check for a checkbox, dot for a radio, in the leading slot | `aria-checked`, `data-checked` |
| Confirmed in place | Menu stays open, label morphs ("Copied"), width held | `closeOnSelect={false}` |
| Busy | Label dims under a moving light band after 120ms; presses ignored, no press fill; focus stays | `busy` → `aria-busy` |
| Submenu open | Its item keeps the highlight; chevron at the end | `aria-expanded`, `data-popup-open` |
| Flipped / shifted | Opens upward near the bottom edge, submenus open left near the right edge, 8px from the viewport | Base UI `Menu.Positioner` |

When any item has an icon or indicator, every label in that menu starts on
the same line.

The menu's edge is the one in `--ui-shadow-floating`: the same outline color as fields and secondary buttons (`--ui-border-strong`), drawn once. Don't add a ring of your own on top; two rings read as a darker edge.

## Motion

| What | Duration | Easing |
|---|---|---|
| Open: fade, unblur 2px and scale 0.97 → 1 from the trigger side | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Close | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Highlight moving between items | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Highlight appearing or leaving | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Press | 0ms, release eases back | |
| A label that changes in place | `--ui-dur-move` (`TextMorph`) | `--ui-ease-move` |
| Busy label dims, after 120ms | `--ui-dur-base` | `--ui-ease-color` |
| Light band across a busy label | `--ui-dur-sweep` per pass | `linear` |

The highlight moves with `translate` only, so it never causes layout. It
jumps instead of sliding the first time it appears. The trigger skips the
button's press-scale (`[aria-haspopup]`), so the menu opens from where the
button really is. Under `prefers-reduced-motion: reduce` the menu appears at
once, the highlight jumps between items, labels swap without morphing,
and a busy label dims to 50% and holds still.

## Accessibility

- The menu is portalled to `<body>`, or into the nearest `[data-theme]`
  element around the trigger so it keeps that theme's tokens.
- The menu is named by its trigger (`aria-labelledby`). An icon-only trigger
  needs `aria-label` that says what the actions act on: "Actions for 14
  Alder Lane", not "More".
- Focus moves into the menu on open: to the first or last item from the
  keyboard, to the menu itself when opened with the pointer, so the arrow
  keys work straight away. On close it returns to the trigger.
- Shortcut hints are visual (`aria-hidden`); pass the real shortcut as
  `keyshortcuts` (for example `"Meta+D"`) so assistive tech can announce it.
- `description` is linked with `aria-describedby`, so a disabled item says
  why: "Publish menu, dimmed. Needs the host's approval first."
- Rows are 44px tall on coarse pointers.
- If an action removes the trigger (Delete), move focus somewhere useful
  yourself, such as an Undo button, and announce the result in a
  `role="status"` region.

## Before / after

Before: a `div` that appears on click. No roles, no arrow keys, the hover
highlight and the keyboard focus ring are two different things, and the
submenu closes the moment the pointer clips the next item on its way there.

```tsx
<button onClick={() => setOpen(!open)}>…</button>
{open && (
  <div className="menu">
    <div onClick={duplicate}>Duplicate</div>
    <div className="has-sub" onMouseEnter={() => setSub(true)} onMouseLeave={() => setSub(false)}>
      Share
      {sub && <div className="submenu">…</div>}
    </div>
    <div className="danger" onClick={remove}>Delete</div>
  </div>
)}
```

After:

```tsx
<DropdownMenu
  align="end"
  trigger={
    <Button variant="ghost" aria-label="Actions for 14 Alder Lane">
      <MoreIcon />
    </Button>
  }
>
  <MenuItem icon={<DuplicateIcon />} onSelect={duplicate}>Duplicate</MenuItem>
  <MenuItem icon={<DownloadIcon />} shortcut="⌘D" keyshortcuts="Meta+D" onSelect={download}>
    Download menu
  </MenuItem>
  <MenuSub label="Share" icon={<ShareIcon />}>
    <MenuItem onSelect={copyLink}>Copy link</MenuItem>
    <MenuItem onSelect={emailGuests}>Email to guests</MenuItem>
  </MenuSub>
  <MenuSeparator />
  <MenuCheckboxItem checked={showNotes} onCheckedChange={setShowNotes}>
    Show dietary notes
  </MenuCheckboxItem>
  <MenuSeparator />
  <MenuRadioGroup label="Currency" value={currency} onValueChange={setCurrency}>
    <MenuRadioItem value="USD">US dollar</MenuRadioItem>
    <MenuRadioItem value="CAD">Canadian dollar</MenuRadioItem>
  </MenuRadioGroup>
  <MenuSeparator />
  <MenuItem variant="danger" icon={<TrashIcon />} onSelect={remove}>Cancel dinner</MenuItem>
</DropdownMenu>
```
