# Alert

An inline banner with a status: info, success, warning or error. A title,
a sentence of detail, optional actions and an optional dismiss button.

```tsx
<Alert tone="warning" title="Two guests haven’t replied" actions={<Button variant="secondary">Send a reminder</Button>}>
  Seating closes Thursday.
</Alert>
```

## The rule for alerts that arrive later

An alert in the page from the first paint is part of the layout. One that
arrives later (a save failing, a connection dropping) must not push the
page while someone is reading it. Pass `open` and pick how it makes room:

| `arrive` | Use it when | What happens |
|---|---|---|
| `reserve` (default) | The status can arrive without the user doing anything | Its space is held from the first paint by an invisible copy, and it fades in there. Nothing moves, ever |
| `expand` | It answers the user's own click or key press | It opens its height on `--ui-ease-expand`. The browser doesn't count movement within 500ms of input as layout shift |

If neither fits (there's no room to reserve and nothing the user did),
use a toast: it overlays instead of taking space. Dismissing always
collapses the alert: that answers a press, so it's allowed to move things.

## When not to

- Field errors: the field's own message line.
- Confirmation of something the user can already see changed.

## Props

| Prop | What it does |
|---|---|
| `tone` | `info` (default), `success`, `warning`, `error` |
| `title`, `children`, `actions` | One line, a sentence or two, buttons or links |
| `open`, `arrive` | See the rule above. Leave `open` out for a static alert |
| `onDismiss`, `dismissLabel` | Shows the dismiss button; called after it has closed |

## Look and motion

The status color tints the surface 6% with a hairline edge of it, and colors
the mark (`--ui-success`, `--ui-warning`, `--ui-danger`; info uses the text color); title and text stay in the text colors so contrast holds in
every tone. Info is neutral. The mark sits centered in a square the
height of the title's line; the dismiss button is centered on that line
too, inset the same from top and end, with the alert's radius less the
inset. Both marks end up the same distance from every edge they're near.
Nested in a rounded container, set `--alert-radius` to the container's
radius less its inset and `--alert-pad` to match its padding, so the
corners stay concentric and the text lines up.

Arriving: fade and a 2px drop, `--ui-dur-fast` on `--ui-ease-enter`.
Leaving: a step faster on the color curve. Under `prefers-reduced-motion`
it appears and collapses at once.

## Accessibility

An alert that can arrive later lives in a live region that's always in the
DOM: `role="alert"` for errors and warnings, `role="status"` otherwise, so
it's announced when it opens, and again each time it reopens. A static
alert isn't announced. Each opening remounts the content, so a repeated
failure is announced again.
