# Hover card

A preview of where a link goes, shown when the link is hovered or reached
with the keyboard: the person behind an @mention, the file behind a title,
the source behind a citation. The first one waits half a second; once one
has shown, a neighbour's opens at once. It stays while the pointer travels
into it, never takes focus, and doesn't exist on a touch screen, where the
link just works.

The behavior (hover and focus timing, the pointer's path into the card,
dismissal and positioning) is built on Base UI's `PreviewCard`. The look is
the popover's panel, class for class: its glass, its one edge and its open
and close.

## When to use it

- An @mention in a note or a comment: the face, the name, one line on who
  they are.
- A link to a file or a page: its title and two lines of what's inside.
- A citation or a source: where it comes from and when.

Everything in the card is also on the page the link opens. The card saves
the trip; it never replaces it.

## When not to

- Anything the user must act on: a button, a form, a setting, a choice.
  That's a popover, opened by a press, which takes focus and works on touch.
- The only place something lives. Touch screens never show the card and a
  screen reader isn't told about it, so what matters goes on the page or
  behind the link.
- A hint on a control, or the name of an icon button: use a tooltip.
- A trigger that isn't a link. If pressing it goes nowhere, there is
  nothing to preview.
- Paragraphs, tables, a whole profile. If it scrolls or takes more than a
  glance, link to it.

## Parts

| Prop | Type | Default | Notes |
|---|---|---|---|
| `content` | `ReactNode` | | The preview. Text, an avatar, an icon; lay it out yourself |
| `children` | one element | | The link. It must take a ref and pointer and focus handlers; an `<a>` or your router's `Link` |
| `side` | `"top" \| "bottom" \| "left" \| "right"` | `"bottom"` | Flips when there's no room |
| `align` | `"start" \| "center" \| "end"` | `"start"` | The card starts at the link's first letter |
| `delay` | `number` | `500` | ms the pointer or focus rests on the link before the first card opens |
| `closeDelay` | `number` | `200` | ms it stays after the pointer leaves both the link and the card |
| `onOpenChange` | `(open: boolean) => void` | | The moment to load what the card shows |
| `className` | `string` | | On the card |

## Loading what it shows

Ask for the content in `onOpenChange` and keep it once it has arrived. Until
then show bones of the same size as the lines they stand for (`Skeleton`),
so the card doesn't change size, or jump when it sits above the link, as the
content lands. The 500ms the pointer has already waited is usually enough to
start the request on `pointerenter` and have it ready.

```tsx
<HoverCard
  onOpenChange={(open) => open && load()}
  content={file ? <FileCard file={file} /> : <FileCardBones />}
>
  <a href={href}>Budget, autumn supper</a>
</HoverCard>
```

## States

| State | What you see | How |
|---|---|---|
| Closed | The link alone | |
| Waiting | Nothing yet; the pointer or focus rests on the link for 500ms. Passing over it on the way elsewhere opens nothing | `delay` |
| Open | The popover's panel 8px under the link, starting at its first letter, at most 320px wide | hover, or keyboard focus (`:focus-visible`) |
| Pointer in the card | Stays open: the pointer can cross the gap, and its text can be read and selected | Base UI's safe area between link and card |
| Leaving | Stays 200ms after the pointer leaves both, then closes | `closeDelay` |
| Warm | A neighbour's card opens with no wait, and the one it replaces goes in the same frame: two cards are never on screen together | within 300ms of the last one closing, or while one is open |
| Link's card open | Whatever you style on `[data-popup-open]`; hold the link's hover look, so the card's subject is never in doubt | `data-popup-open` on the link |
| A link that wraps | The card opens clear of the whole link, never over its other line | |
| Flipped / shifted | Opens on the other side, or slides along the edge, 8px inside the viewport | Base UI `Positioner` |
| Touch | No card. A tap follows the link | |

It closes on Escape (focus stays on the link), on blur, when the pointer
has left for 200ms, and on a press outside.

The card's edge and glass are the popover's (`--ui-shadow-floating`,
`--ui-surface-glass` over `--ui-glass-blur`). Don't add a ring of your own.

## Motion

| What | Duration | Easing |
|---|---|---|
| Open: fade, unblur 2px and scale 0.97 → 1 from the link's side | `--ui-dur-fast` (160ms) | `--ui-ease-enter` |
| Close: fade and scale back | `--ui-dur-instant` (120ms) | `--ui-ease-exit` |
| Replaced by a neighbour's card | 0ms; the new one opens as above | n/a |

The scale grows out of Base UI's `--transform-origin`, the edge of the card
that faces the link. Coming back to the link while its card is fading out
turns the fade around from where it is. Under
`prefers-reduced-motion: reduce` the card only fades, on the same durations.

## Accessibility

- The card is an extra for people who can see it and point at it or Tab to
  it. It has no role and isn't linked to the link with ARIA, so a screen
  reader reads the link and nothing else; that is why the card can only
  repeat what the link's destination says.
- **The keyboard reaches the card only through its link.** Focusing the
  link (`:focus-visible`) opens the card after the same 500ms; Escape closes
  it and leaves focus where it is; Tab moves on and closes it. The card
  never takes focus and never traps it. So the trigger must be focusable: a
  real link, not a `span`.
- Nothing inside the card is a tab stop the user needs. A link inside it
  can be clicked with the pointer, but it must also be reachable from the
  page the trigger opens.
- The pointer can move onto the card without it closing, and it stays until
  the pointer leaves, focus moves or Escape is pressed (WCAG 1.4.13).
- Touch has no hover, so there is no card: a tap follows the link, and a
  long press gets the browser's own link menu.
- The card is portalled into the nearest `[data-theme]` ancestor of the
  link, so it picks up that section's tokens, or into an open `<dialog>`;
  otherwise into `body`.

## Before / after

Before: a tooltip stretched into a card. It closes the moment the pointer
leaves the link, so its text can't be selected; it opens on every pass of
the pointer through the paragraph; and its "Message" button can't be reached
by keyboard or by touch at all.

```tsx
<Tooltip content={<div><img src={priya.photo} /> Priya Natarajan <button>Message</button></div>}>
  <a href="/guests/priya">@Priya Natarajan</a>
</Tooltip>
```

After: the card previews the person; messaging her is on her page.

```tsx
<HoverCard
  content={
    <span className={styles.person}>
      <Avatar name="Priya Natarajan" src={priya.photo} size={40} decorative />
      <span>
        <strong>Priya Natarajan</strong>
        <span>Guest of Dana Whitfield</span>
        <span>Vegetarian · Replied yes on Oct 18</span>
      </span>
    </span>
  }
>
  <a href="/guests/priya">@Priya Natarajan</a>
</HoverCard>
```

A file shows its title and two lines of what's inside:

```tsx
<HoverCard content={<FileCard title={file.title} excerpt={file.excerpt} meta={file.edited} />}>
  <a href={file.href}>{file.title}</a>
</HoverCard>
```
