# Text

Cuts text that doesn't fit by fading its last 24px instead of swapping the
end for an ellipsis, and only when the text is cut: a label that
fits is left alone. The fade follows the writing direction. CSS only, no
script and no wrapper element.

Code block, command palette, prompt input, message thread and sources use it.

## Use it

Compose it into the class that holds the text:

```css
.fileName {
  composes: truncate from "../text/text.module.css";
  font-weight: var(--ui-weight-medium);
}

.excerpt {
  composes: truncateLines from "../text/text.module.css";
  --truncate-lines: 3;
}
```

- `line`: one line. In a flex row it already sets `min-width: 0`.
- `lines`: several lines, 2 unless `--truncate-lines` says otherwise. The
  element has to be block-level (or a grid or flex item).

## When to use it

- Names that come from data and can run long: file names, page titles,
  domains, breadcrumbs.

## When not to

- Labels you wrote. Shorten the copy instead.
- The only label on a control. If cutting it hides what the control does,
  give it room or wrap it.
- Text that is the point of the row, such as an error message. Let it wrap.

## Keep the full text reachable

The whole string stays in the DOM, so screen readers read all of it. Where
the cut part carries meaning (a file name's extension, a page title), also
put the full text in `title`, or in a tooltip if the row has one.

## How it works

1. `overflow: hidden` makes the element a scroll container. It only has a
   scroll range while its content overflows.
2. An animation on `scroll(self inline)` (or `block` for several lines)
   sets `--truncate-fade` to 24px. With no scroll range the timeline is
   inactive, the animation applies nothing, and the fade stays 0px.
3. The mask is `linear-gradient(to right, #000 calc(100% - fade),
   transparent)`, turned to `to left` inside `[dir="rtl"]` (an attribute, not
   `:dir()`, which some builds rewrite into a language list). For several lines,
   one layer keeps every line but the last solid and a second fades the
   last one.

Browsers without scroll timelines fall back to `text-overflow: ellipsis`
and `-webkit-line-clamp`, rather than fading every line or cutting through
a letter.

## Don't

- Put another `animation` or `mask-image` on the same element: they
  replace this one. Put a shimmer or sweep on a span inside instead; masks on
  nested elements multiply.
- Use `overflow: clip`. It isn't a scroll container, so nothing detects
  the overflow.
