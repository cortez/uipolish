# Tooltip

A short hint attached to a control. The first one waits half a second before
it opens; once one has shown, the next opens instantly as the pointer moves
along a toolbar. Keyboard focus opens it at once. It is portalled out of the
trigger's container, so an `overflow: hidden` ancestor can't clip it, and it
flips and shifts to stay on screen.

The behavior is built on Base UI's `<Tooltip>`: it handles hover and focus
timing, dismissal and positioning. The component needs no provider; the
shared delay lives inside it.

## When to use it

- Naming an icon-only button for sighted mouse users: "Copy link", with the
  shortcut beside it.
- One extra sentence about a control whose label is already clear: what
  "Send invitations" does, and to whom.
- Showing a keyboard shortcut next to the action it triggers (`kbd="⌘C"`).

## When not to

- Anything the user needs to finish the task. Tooltips repeat or explain;
  they never gate. Touch screens have no hover, so on a phone the tooltip
  doesn't exist. If the information matters, put it on the page.
- Explaining why a control is disabled. Put the reason next to it in text.
  A tooltip can repeat it, but it can't be the only place it lives.
- Anything interactive: links, buttons, a form. Use a popover; a tooltip
  closes the moment the pointer or focus leaves the trigger.
- Paragraphs. If it needs more than a sentence, it's a popover.
- A replacement for an accessible name. An icon-only button needs
  `aria-label`; the tooltip is a visual extra, not the label.

## States

| State | What you see | How |
|---|---|---|
| Closed | Nothing. With `describe`, the text stays in the DOM, hidden, so `aria-describedby` resolves | `keepMounted` |
| Waiting | Nothing yet. The pointer rests on the trigger for 500ms | `delay` |
| Open | Inverted pill above the trigger, optional arrow and shortcut | hover after the delay, or keyboard focus |
| Warm | The next tooltip opens with no delay and no animation | within 300ms of the last one closing, or while one is open |
| Pressed | Closes and stays closed until the pointer leaves or focus moves on | `pointerdown` or `click` on the trigger |
| Flipped / shifted | Moves to the other side or slides along the edge, 8px inside the viewport | Base UI `Positioner` |

It closes on Escape, on blur, when the pointer leaves the trigger (unless it
moves onto the tooltip itself), and when the trigger is pressed.

## Motion

| What | Duration | Easing |
|---|---|---|
| Open: fade, unblur and scale 0.97 → 1 from the side facing the trigger | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Close: fade and scale back | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Warm open and the outgoing one's close | 0ms | n/a |

The scale grows out of Base UI's `--transform-origin`, so the tooltip seems
to come from the trigger. The positioner is never scaled, only the surface
inside it, which animates between `[data-starting-style]` and
`[data-ending-style]`; Base UI keeps it mounted until the exit has played.
A warm tooltip slides in from where the previous one sat. Under
`prefers-reduced-motion: reduce` it appears and disappears without animating.

## Accessibility

- `role="tooltip"`, linked to the trigger with `aria-describedby`. The
  description is read after the name, also before the tooltip is visible,
  because with `describe` the text is kept in the DOM.
- When the tooltip only repeats the trigger's `aria-label` ("Copy link" on a
  button labelled "Copy link"), pass `describe={false}` so it isn't read
  twice, and put the shortcut in `aria-keyshortcuts`.
- Keyboard focus opens it immediately (`:focus-visible`). A mouse click,
  which also focuses, doesn't.
- Escape closes it without moving focus.
- The pointer can move from the trigger onto the tooltip without it closing,
  so its text can be read at high zoom and selected (WCAG 1.4.13).
- **Disabled controls.** A disabled `<button>` gets no pointer or focus
  events, so a tooltip on it never opens. Wrap it in a focusable element and
  attach the tooltip to the wrapper, and say why it's disabled in visible
  text as well:

  ```tsx
  <Tooltip content="Needs the host's approval first.">
    <span tabIndex={0} aria-describedby="menu-reason">
      <Button disabled>Publish menu</Button>
    </span>
  </Tooltip>
  <p id="menu-reason">Publishes once Maya approves the menu.</p>
  ```

## Usage notes

- `children` must be one element that accepts `ref`, pointer, focus and click
  handlers, like `Button` or a native `<button>`. Base UI renders it as the
  trigger through its `render` prop; its own handlers still run.
- The tooltip is portalled, so it adds nothing next to the trigger and
  `:last-child` selectors still match.
- It portals into the nearest `[data-theme]` ancestor of the trigger, so a
  tooltip inside a `[data-theme="dark"]` section is dark too.

## Before / after

Before: a `title` attribute. It shows after a long, fixed delay, never on
focus, never on touch, can't be styled, and on an icon-only button it's the
only name the button has.

```tsx
<button title="Copy link" onClick={copy}>
  <LinkIcon />
</button>
```

After: the button has a real name, the tooltip shows it with the shortcut,
opens instantly while moving along the toolbar and immediately on focus.

```tsx
<Tooltip content="Copy link" kbd="⌘C" describe={false}>
  <Button variant="ghost" aria-label="Copy link" aria-keyshortcuts="Meta+C" onClick={copy}>
    <LinkIcon />
  </Button>
</Tooltip>
```

Before: the only explanation of what a button does sits behind hover.

```tsx
<Tooltip content="You must add a guest email before sending.">
  <Button disabled>Send invitations</Button>
</Tooltip>
```

After: the reason is on the page; the tooltip on the enabled button adds a
detail the user doesn't need but may want.

```tsx
<Tooltip content="Emails the menu and an RSVP link to Priya and 7 other guests." side="bottom" arrow>
  <Button onClick={send}>Send invitations</Button>
</Tooltip>
```
