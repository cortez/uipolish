# Sidebar

The app sidebar an AI product needs: a workspace switcher at the top, the
main items with counts and shortcuts, headed sections that fold, a recent
list (chat history) with rename, pin and delete, and an account menu at the
bottom. ⌘B (Ctrl+B) folds it to an icon rail, where one tooltip glides
between the icons as on Nav rail. Below 768px it leaves the layout and
opens as a drawer from a button in the page's header.

The current item is marked with Tabs' flat pill, and when it changes the
pill flies from the old row to the new one. Behavior comes from Base UI
through the kit: the menus are Dropdown menu, the phone drawer is Drawer,
and the rail's tooltip is Nav rail's `NavRailTooltipGroup`.

```tsx
<SidebarProvider collapsed={collapsed} onCollapsedChange={setCollapsed}>
  <div className="app">
    <Sidebar
      aria-label="Acme"
      value={page}
      onValueChange={setPage}
      header={
        <SidebarSwitcher mark={<AcmeMark />} name="Acme">
          <MenuRadioGroup label="Workspaces" value={workspace} onValueChange={setWorkspace}>
            <MenuRadioItem value="acme">Acme</MenuRadioItem>
            <MenuRadioItem value="labs">Acme Labs</MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuItem>Workspace settings</MenuItem>
        </SidebarSwitcher>
      }
      items={[
        { id: "new", label: "New chat", icon: <ComposeIcon /> },
        { id: "search", label: "Search", icon: <Icon name="search" />, shortcut: "K" },
        { id: "automations", label: "Automations", icon: <BoltIcon />, badge: 3 },
      ]}
      sections={[
        {
          id: "projects",
          label: "Projects",
          collapsible: true,
          items: [
            { id: "launch", label: "Website relaunch", icon: <FolderIcon />, items: [
              { id: "checklist", label: "Launch checklist" },
            ] },
          ],
        },
      ]}
      recent={{
        items: chats,
        loading: chatsLoading,
        loadingLabel: "Loading chats…",
        empty: <><p>No chats yet</p><p>Chats you start show up here.</p></>,
        onRename: (id, title) => api.rename(id, title),
        onPinnedChange: (id, pinned) => api.pin(id, pinned),
        onDelete: (id) => api.remove(id),
        showAll: { label: "All chats", href: "/chats" },
      }}
      footer={
        <SidebarAccount avatar={<Avatar name="Ana Ruiz" size={24} decorative />} name="Ana Ruiz" detail="Pro plan">
          <MenuItem>Settings</MenuItem>
          <MenuSeparator />
          <MenuItem>Log out</MenuItem>
        </SidebarAccount>
      }
    />
    <main>
      <header>
        <SidebarToggle />
      </header>
      …
    </main>
  </div>
</SidebarProvider>
```

Lay the sidebar and the page out in a row (`display: flex`, or a grid with
an `auto` column); the sidebar sets its own width and the page takes the
rest. It fills its container's height.

## When to use it

- The frame of an app with more than a handful of places: the main areas,
  projects or folders, and a history people come back to.
- A chat product: new chat and search at the top, recent chats below,
  pinned ones above them.
- When the labels matter. Written labels are faster to scan than icons, and
  the rail is there for people who want the width.

## When not to

- Three to seven sections and nothing else: use Nav rail, which is all icons
  and takes less room.
- Navigation inside one page: tabs or a segmented control.
- A settings screen's list of categories: a plain list of links in the page.
- A second sidebar inside the first. Nest one level, in sections; deeper
  trees belong on a page of their own.

## Parts

| Part | What it is |
|---|---|
| `SidebarProvider` | Holds the state: `collapsed` / `defaultCollapsed` / `onCollapsedChange`, and `shortcut` (`"b"` by default; `false` turns ⌘B off). Wrap the sidebar and the page, so a `SidebarToggle` in the page's header reaches it. Optional: without one, `Sidebar` makes its own |
| `Sidebar` | The sidebar. Props below |
| `SidebarSwitcher` | The header's button: `mark` (on a round ink tile), `name`, `detail`; its children are the menu's items |
| `SidebarAccount` | The footer's button: `avatar` (a 24px `Avatar`), `name`, `detail` (a plan or an email); its children are the menu's items. The menu opens above it |
| `SidebarToggle` | A ghost icon button: collapses and expands, or opens the drawer on a phone. Its tooltip shows ⌘B |
| `useSidebar()` | `{ collapsed, setCollapsed, mobile, drawerOpen, setDrawerOpen, toggle }`, for your own controls |

## Props

| Prop | What it does |
|---|---|
| `aria-label` | Names the `nav` landmark; "Main" by default. The workspace's name works well |
| `header`, `footer` | The switcher and the account, usually. On a phone the header is the drawer's title |
| `items` | The primary items: `{ id, label, icon, href?, badge?, shortcut?, detail? }[]`. They stay in the collapsed rail, so each needs an icon. `detail` is a word or two at the row's end in the subtle color, read after the label: a teammate's status ("Away") in a Team section |
| `sections` | `{ id, label?, items, collapsible?, defaultOpen? }[]`. An item with `items` is a group that opens below its row, one level deep |
| `recent` | The recent list; see below |
| `value`, `onValueChange` | The id of the current item, section item or chat; called with an id when one is pressed |
| `shortcuts` | Handle ⌘ or Ctrl plus each item's `shortcut` anywhere on the page. Leave it off if the page already owns those keys |

`recent` takes `items` (`{ id, title, href?, pinned?, meta? }[]`), `loading`,
`loadingLabel`, `empty`, `label` ("Recent"), `pinnedLabel` ("Pinned"),
`onRename`, `onPinnedChange`, `onDelete` and `showAll` (`{ label, href }`
or `{ label, onClick }`). Each handler you pass adds its row to the "…"
menu. Pinned chats list under their own heading, above the rest. `meta`
is quiet detail at the row's end, a relative time or a small
`AvatarGroup`, in the subtle color; the "…" takes its place while it
shows, and on touch screens, where the "…" always shows, it's left out.

`onRename` can return a promise: the field holds and shimmers until it
settles, and a rejection's message shows under it, with the text kept.
`onDelete` deletes at once; confirm in a dialog or offer Undo in a toast if
it can't be undone.

An item with `href` renders a link (pressing it also calls
`onValueChange`); without one it's a button. A group row is a disclosure,
not a link. `badge` is an unread count: 0 hides it, over 99 it reads 99+.
Ids must be unique across items, sections and the recent list, since one
`value` marks the current one.

## Layout

| Part | Size |
|---|---|
| Sidebar | 264px (`--sidebar-width`); collapsed, the 44px capsule plus 8px each side: 60px |
| Rows | 32px, Tabs' height; 40px on touch screens. 2px apart |
| Primary and section items | 15px medium, icon 16px in `--ui-muted`. Nested rows indent to the label above |
| Recent titles | 13px regular, one line, faded at the end when cut, the full title in `title` |
| Section headings | 13px medium, muted, in a row of their own height so a heading that folds and one that doesn't line up |
| Switcher and account | 40px; the 24px mark or avatar centered on the icon column below |

Everything lines up on one column: each icon sits where it would be
centered in the collapsed capsule, so folding the sidebar never moves an
icon. Recent titles and headings start on the icons' left edge. The page
beside it should be one surface step up (`--ui-surface` on the
`--ui-canvas` sidebar), with no line between them: the change of surface is
the edge.

## States

| State | What you see | How |
|---|---|---|
| Rest | Labels in the text color, icons muted | |
| Hover | No fill: the row's label and icon come up from the muted color to the text color, as Nav rail's items do; a shortcut shows at the row's end | `@media (hover: hover)` |
| Current | Tabs' flat pill (`--ui-track-pill`), icon in the text color | `aria-current="page"` |
| Focus | A line inside the row's pill; the shortcut shows | `:focus-visible` |
| Badge | An accent count at the row's end; collapsed, at the icon's top right, cut out by a ring | `badge` |
| Group open / closed | The chevron points down, then up; the rows open below | `aria-expanded` |
| Collapsed | A 60px rail: mark, item icons, avatar. Sections and the recent list are hidden | `collapsed` |
| Collapsed, hovered | One tooltip beside the rail with the label and shortcut, gliding from icon to icon | `NavRailTooltipGroup` |
| Recent row hovered | A "…" capsule at the row's end; always there on the current row and on touch | |
| Recent row with meta | A time or faces at the row's end in the subtle color; the "…" fades in over it on hover, focus and the current row, and the title never moves | `meta` |
| Menu open | Its trigger holds the pressed fill | `data-popup-open` |
| Renaming | The row becomes a field of the same shape, text in place, selected | Rename |
| Saving a rename | The text dims under a moving light band | promise from `onRename` |
| Rename failed | The message under the field; the text stays | rejected promise |
| Empty title | "Enter a name" under the field | |
| Loading | After 300ms, five skeleton bars in rows of the real height; "Loading…" is announced | `recent.loading` |
| Empty | One or two quiet lines where the list would be, no drawing | `recent.empty` |
| Many | The sections and the recent list scroll under the pinned items; the edge with more past it fades | Scroll area |
| Long name | Cut with a fade, the whole name in the menu and in `title` | |
| Phone | Not in the layout; a drawer from the start edge (a sheet below 640px), rows 40px tall | `SIDEBAR_DRAWER_QUERY` |
| Right to left | Mirrored: icons on the right, menus and the tooltip open to the left. Titles and names take their own direction | `dir="rtl"` |

## Motion

| What | Duration | Easing |
|---|---|---|
| Width, collapsing | `--ui-dur-base` | `--ui-ease-collapse` |
| Width, expanding | `--ui-dur-panel` | `--ui-ease-expand` |
| Labels, headings, sections leaving | `--ui-dur-instant` | `--ui-ease-exit` |
| Labels arriving, 120ms after the width starts | `--ui-dur-fast` | `--ui-ease-enter` |
| Pill flying to the new current row: near edge leads | `--ui-dur-snap` | `--ui-ease-glide` |
| …far edge follows | `--ui-dur-glide` | `--ui-ease-glide` |
| Group opening | `--ui-dur-panel` | `--ui-ease-expand` |
| Group closing | `--ui-dur-base` | `--ui-ease-collapse` |
| Chevron | the icon's own morph | |
| Rail tooltip: opens, moves, resizes | as Nav rail | |
| Deleted chat: fades, then its space folds | `--ui-dur-instant`, then `--ui-dur-base` | `--ui-ease-exit`, then `--ui-ease-collapse` |
| Pinned chat arriving | `--ui-dur-panel` | `--ui-ease-expand` |
| Menus | as Dropdown menu | |
| Hover color | `--ui-dur-instant` | `--ui-ease-color` |

Nothing reflows while the sidebar folds: rows narrow with it, so the
current pill becomes the rail's capsule, while the sections and recent list
are held at the open width and fade before the edge reaches them. Labels
leave in the first 120ms and come back once the width is most of the way
open, so no word is read while it moves. The width eases like a height
(Chat app's sidebar does the same); the pill flies like Tabs', stretching
from one row to the next. It only flies between rows of the same width that
are both on screen; otherwise it moves at once.

Under `prefers-reduced-motion: reduce` the width, labels, groups and
removals change at once, the pill jumps, and the tooltip swaps in place.

## Accessibility

- A `nav` landmark named by `aria-label`, around a list of links or
  buttons; the current one has `aria-current="page"`. An item with a badge
  reads "Automations, 3 new".
- Tab visits every control in order, the "…" buttons included. Up and Down
  move between rows, Home and End to the first and last, skipping what's
  folded away.
- Folding headings and groups are buttons with `aria-expanded` and
  `aria-controls`; a folded list is `inert`, and so is the hidden part of the
  collapsed sidebar, so focus never lands on something you can't see.
- Collapsed, every icon keeps its accessible name (the label is still in the
  row, only transparent); the tooltip is a visual echo and `aria-hidden`.
- Shortcuts are in `aria-keyshortcuts` ("Meta+K Control+K"). The toggle says
  what it will do ("Collapse sidebar", "Expand sidebar", "Open sidebar"),
  with `aria-expanded` and `aria-controls`.
- The menus are Base UI menus: arrow keys, typeahead, Escape back to the
  trigger. Each "…" is named for its chat: "Actions for Board update
  outline".
- Rename: Enter saves, Escape cancels (and doesn't close a drawer around
  it), leaving the field saves. Focus returns to the row. After a delete,
  focus moves to the next chat.
- Titles and names carry `dir="auto"`, so a Hebrew chat title reads right in
  an English sidebar and an English one in a Hebrew sidebar.
- The phone drawer traps focus and returns it to the toggle on close.

## Before / after

Before: a column of links with an `active` class, a hand-rolled collapse
that animates `width` and rewraps every label on the way, `title`
attributes as tooltips, and a delete that removes the row in one frame.

```tsx
<aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
  {pages.map((p) => (
    <a key={p.id} href={p.href} title={collapsed ? p.label : undefined} className={p.id === page ? "active" : ""}>
      {p.icon} {!collapsed && p.label}
    </a>
  ))}
  <button onClick={() => setCollapsed(!collapsed)}>«</button>
</aside>
```

After:

```tsx
<SidebarProvider>
  <Sidebar aria-label="Acme" items={pages} value={page} onValueChange={setPage} recent={{ items: chats }} />
  <main>
    <SidebarToggle />
  </main>
</SidebarProvider>
```
