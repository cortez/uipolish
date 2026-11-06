# Toast

Short messages in a bottom corner. Call `toast("Invitations sent")` from
anywhere; render one `<Toaster />` near the root. New toasts land in front and
older ones tuck behind in a small stack that fans out when you hover or focus
it. They dismiss themselves after a few seconds, wait while you're reading,
and swipe away with a flick. Built on Base UI's `Toast`, which runs the
timers, the swipe, F6 and the announcements; the stack's look is this
component's own.

## When to use it

- Confirming something that happened out of view: "Invitations sent",
  "Draft saved" after a background save.
- Offering a short way back: "Guest removed" with Undo.
- Reporting a failure the user can retry: "Invitations not sent" with Retry.
- Following one slow action from start to finish with `toast.promise`.

## When not to

- The change is already visible where the user is looking (a row
  disappeared, a toggle flipped). Highlight it in place instead.
- Errors on a form field: show them next to the field.
- Anything the user must answer before continuing: use a dialog.
- Long text or several actions. A toast has one line of title, an optional
  line of detail, and at most one action.

## API

```tsx
toast("Guest removed", { description: "Tom Becker", action: { label: "Undo", onClick: restore } });
toast.success("Draft saved");
toast.error("Couldn’t update the menu", { action: { label: "Retry", onClick: sync } });
toast.loading("Uploading photos…");
toast.dismiss(id);       // or toast.dismiss() for all

toast.promise(sendInvitations(), {
  loading: "Sending invitations…",
  success: "Invitations sent",
  error: (e) => "Invitations not sent",
  errorOptions: { action: { label: "Retry", onClick: send } },
});

<Toaster position="bottom-right" max={3} />
```

Every call returns an id. Passing the same `id` again updates that toast in
place instead of adding another.

## States

| State | What you see | How |
|---|---|---|
| Enter | Fades in and rises 4px into the front slot; the rest step back | CSS animation on mount |
| Collapsed stack | Front toast in full; up to two behind it, each 3% smaller and 12px higher, content hidden, clipped to the front toast's height | per-toast `translate`, `scale`, `clip-path` from measured heights |
| Expanded | Hover or focus the region: toasts spread into a column with 8px gaps | same properties, new values |
| Waiting | More than `max` toasts: the extra ones are invisible and inert | Base UI's `limit`, `[data-limited]` |
| Paused | Timers stop while the region is hovered or focused, or the window loses focus | Base UI's Toast viewport |
| Loading | A dot breathing inside a ring (no spinner), no timer | `toast.loading` or `toast.promise` |
| Settled | Title morphs letter by letter ("Sending invitations…" → "Invitations sent"), icon changes, timer starts | `TextMorph` |
| Dragging | Card follows the pointer sideways | `[data-swiping]`, `--toast-swipe-movement-x` on `translate` |
| Swiped | Flies off in the direction of travel and fades | `[data-swipe-direction]` with `[data-ending-style]` |
| Spring back | Not far or fast enough: returns to place | `--ui-ease-snap` |
| Exit | Fades and drops 4px, then unmounts; the rest move up while it fades | `[data-ending-style]` |

**How long.** 5 seconds by default, 6 for errors, 8 when there's an action
(the user needs time to decide to press it), and no limit while loading. Pass
`duration` to override, or `Infinity` to keep a toast until it's dismissed.

**Swipe.** Left or right. Base UI decides from distance and velocity whether
a release dismisses, so a quick flick works as well as a long drag. Drags
that start on a button or link don't swipe; mark anything else with
`data-base-ui-swipe-ignore`.

## Motion

| What | Duration | Easing |
|---|---|---|
| Enter: fade, 4px rise | `--ui-dur-base` (200ms) | `--ui-ease-enter` |
| Stack moves (collapse, expand, reflow) | `--ui-dur-move` (380ms) | `--ui-ease-move` |
| Content fade on the cards behind | `--ui-dur-fast` (160ms) | `--ui-ease-color` |
| Exit: fade, 4px drop | `--ui-dur-fast` (160ms) | `--ui-ease-exit` |
| Swipe away | `--ui-dur-fast` | `linear` |
| Spring back | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Title change | `--ui-dur-move` (380ms) | `--ui-ease-move` (TextMorph) |
| Success check draws on, 120ms after the toast or its icon appears | `--ui-dur-base` (200ms) | `--ui-ease-draw` |
| Loading dot grows and shrinks | `--ui-dur-pulse` (700ms) each way | `--ui-ease-pulse` |

Under `prefers-reduced-motion: reduce` toasts fade in and out, the stack
changes without moving, swipes don't spring back, the success check is
already drawn, and the loading dot holds its size and fades slowly instead.

## Layout

The region is `position: fixed` in the chosen bottom corner, 16px from the
edges or further when `env(safe-area-inset-*)` is larger, so it clears the
home indicator and rounded corners. It's 360px wide, or the screen width
minus 32px on phones. The page needs `viewport-fit=cover` in its viewport meta
for the safe-area insets to be non-zero on iOS.

It sits at `z-index: 50`, portaled to `<body>` (or into the nearest
`[data-theme]` element around the `<Toaster />`). Dialogs and drawers also
sit at 50 and portal later, so toasts fired while a modal is open appear
behind its backdrop. Fire them after the dialog closes ("Dinner
cancelled"), which is also when the user can see them.

## Accessibility

- Base UI announces each toast's title and description when it appears or
  changes: politely for normal toasts, urgently (high priority) for
  errors. `toast.promise` is heard twice: "Sending invitations…", then
  "Invitations sent".
- The stack is a labelled region, "Notifications (F6)". F6 moves focus into
  it; Tab moves between toasts.
- Each toast is focusable. Escape dismisses the focused one and moves focus
  to the next.
- Focus inside the region expands the stack and pauses every timer, so
  keyboard users get as long as they need.
- The dismiss button is 24px with a 40px hit area and an accessible name
  that includes the toast's title.
- Hover only expands the stack. Every action is also reachable by keyboard
  and by touch.

## Before / after

Before: a toast that vanishes after 3 seconds whether you're reading it or
not, can't be reached by keyboard, isn't announced, and stacks by pushing
the page's content around.

```tsx
{message && <div className="toast">{message}</div>}
useEffect(() => { const t = setTimeout(() => setMessage(null), 3000); return () => clearTimeout(t); }, [message]);
```

After: announced, pausable, swipeable, with an Undo that has time to be
pressed.

```tsx
function removeGuest(guest: Guest) {
  deleteGuest(guest.id);
  toast("Guest removed", {
    description: guest.name,
    action: { label: "Undo", onClick: () => restoreGuest(guest) },
  });
}

// once, near the root
<Toaster />
```

Before: a spinner toast, then a second toast for the result.

```tsx
toast("Sending…");
await send();
toast("Sent!");
```

After: one toast whose label morphs from the pending state to the result.

```tsx
toast.promise(send(), {
  loading: "Sending invitations…",
  success: "Invitations sent",
  error: "Invitations not sent",
});
```
