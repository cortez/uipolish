# Kbd

A key or a shortcut, the way the reader's keyboard labels it.
`<Kbd keys={["mod", "K"]} />` shows ⌘ K on a Mac, iPhone or iPad and
Ctrl K everywhere else. The caps are the command palette's caps: one
letter makes a short pill, a word a longer one, and their color comes from the text
around them. The platform is decided before the first paint, so the
server-rendered page and the browser agree and nothing moves.

```tsx
<p>
  Press <Kbd keys={["mod", "K"]} /> to find a guest.
</p>
```

## When to use it

- A shortcut beside the command it runs: a menu row, a tooltip, a
  shortcuts list.
- A key named in instructions: "Press ↵ to open the RSVP."

## When not to

- Binding the shortcut: `Kbd` only shows it. Bind `metaKey` on Apple and
  `ctrlKey` elsewhere yourself (the command palette does both).
- Keys on a touch-only screen, where there's no keyboard to press them.
- Code: use `<code>`.

## Props

Every `<kbd>` prop passes through.

| Prop | What it does |
|---|---|
| `keys` | The keys pressed together, in order: `["mod", "shift", "N"]`, `["esc"]`. Single letters are shown in capitals |
| `variant` | `caps` (default) draws each key as a small cap. `plain` is text in the surrounding size and color: "⌘⇧P" on Apple, "Ctrl+Shift+P" elsewhere |
| `size` | `md` (default) for 15px text, `sm` for 13px text |
| `platform` | `apple` or `other`: show one spelling whatever the reader uses |

Key names: `mod` (⌘ / Ctrl), `cmd`, `ctrl` (⌃ / Ctrl), `alt` or
`option` (⌥ / Alt), `shift` (⇧ / Shift), `enter` or `return` (↵),
`backspace` (⌫), `delete` (⌦ / Del), `tab`, `esc`, `space`, `up`, `down`,
`left`, `right`. Anything else is shown as given.

## States

A Kbd doesn't act, so it has no hover, press or focus. It has one thing
to get right: which spelling shows.

| Situation | What happens |
|---|---|
| Server-rendered page | Both spellings are in the HTML. A one-line script sent with them adds a small stylesheet to `<head>` while the page is still parsing, before any Kbd paints. The other spelling is `display: none`, so the right one is the only one laid out, from the first frame |
| Mounted later (a tooltip, a menu, client navigation) | The stylesheet is already there; no script is rendered |
| Inline scripts blocked by a content security policy, or scripts off | The non-Apple spelling shows, and the Apple one holds its width unseen in the same grid cell. When the bundle loads it shows the right one in that cell: what's visible changes, the width never does. Set `--kbd-align: end` where the shortcut ends a row, so the reserved room sits before it |
| Same everywhere (`esc`, an arrow) | One spelling, nothing to decide |

The stylesheet goes in `<head>` rather than as an attribute on `<html>`:
React skips extra nodes in `<head>` when it hydrates, but reports an
attribute it didn't render.

## Layout

- **Caps fill the line.** The box is exactly the line's height (22px at
  `md`, 18px at `sm`) and set `vertical-align: top`, so it fills the line
  box and the caps sit centered in it; a shortcut in a sentence never
  makes the line taller. The caps are a pixel shorter at each end: 20px,
  the command palette's caps, and 16px.
- Each cap is at least as wide as tall, 13px / 500 text, 5px sides (4px at
  `sm`), 2px between caps, as in the palette.
- **Color comes from the context.** The cap's fill is the text color at
  7%, so caps read the same in a muted hint, body text, or an ink
  tooltip; its edge is the control edge, `--ui-border-strong`. Set `color` on the Kbd or its parent.
- `plain` takes the surrounding font, size and color, with no separators
  on Apple (⌘⇧P) and `+` elsewhere (Ctrl+Shift+P): each platform's own
  convention.

## Motion

None. The right spelling is there on the first paint.

## Accessibility

- The outer element is a `<kbd>`, and in caps each key is a nested
  `<kbd>`, which is how HTML marks a key combination.
- Symbols like ⌘ and ⇧ are read inconsistently ("place of interest
  sign"), so what's drawn is `aria-hidden` and each Kbd carries visually
  hidden key names instead: "Command Shift N", "Control Shift N".
- The spelling not in use is `display: none` (or `visibility: hidden` in
  the fallback), so it's never read.
- In forced-colors mode caps draw a real border.

## Before / after

Before: the shortcut is hard-coded for a Mac, so Windows and Linux users
are told to press a key they don't have, and the symbol is read as "place
of interest sign".

```tsx
<span className="shortcut">⌘K</span>
```

Before: the platform is checked in an effect. The server sends "Ctrl K",
and on a Mac it turns into "⌘K" after hydration, narrower, and the
sentence around it closes up.

```tsx
const [mac, setMac] = useState(false);
useEffect(() => setMac(navigator.platform.includes("Mac")), []);
<kbd>{mac ? "⌘K" : "Ctrl K"}</kbd>
```

After:

```tsx
<Kbd keys={["mod", "K"]} />
```
