# Markdown

Renders a model's reply. Pass the markdown so far on every chunk and it
reads as a finished answer the whole way through: an unclosed `**` is
already bold, an unclosed backtick is already code, a code fence opens as
a live code block the moment its first line ends, and a table appears
once its divider row arrives, adding a row each time one is complete. A
quiet caret follows the last word until the reply ends. The parser is
small and built in; there's no markdown package to install.

```tsx
<Markdown source={reply} streaming={!done} />
```

It renders paragraphs, `#` to `####` headings, bold, italic,
strikethrough, inline code, links and bare URLs, bulleted, numbered and
nested lists, task lists, quotes, tables and horizontal rules. Fenced code
is the kit's code block, with its language label, copy and wrap.

In a message thread, put it in an assistant message; the message keeps
its row of actions and its status:

```tsx
<Message from="assistant" status={status} copyText={reply}>
  <Markdown source={reply} streaming={status === "streaming"} />
</Message>
```

## When to use it

- The answer of a chat or agent: anything a model writes for a person to
  read, streamed or loaded from history.
- Text from a model anywhere else in the product (a summary on a card, an
  explanation in a panel), so it reads the same as in the chat.

## When not to

- Your own docs or marketing pages: they want a site's typography, anchors
  and a full CommonMark parser, not chat scale.
- The model's reasoning: use reasoning, which is secondary text in a
  window that folds away.
- A reply that is only code: use the code block on its own.
- Rich text people edit. This renders; it doesn't edit.

## States

| State | What you see | How |
|---|---|---|
| Waiting for the first word | A caret on its own line | `streaming`, empty `source` |
| Streaming | Text as it arrives, a caret after the last word | `streaming` |
| Half-typed marker at the end | Nothing: a lone `#`, `-`, `1.`, `>`, `- [`, `---` or the start of a fence waits for the rest of its line | `streaming` |
| Unclosed bold, italic, strike or code | Already styled, to the end of the text so far | `streaming` |
| Link still being typed | Its words, underlined, not yet clickable | `streaming` |
| Code fence still open | A code block filling in whole words, `aria-busy`, no caret | `streaming` |
| Table header without its divider | Nothing yet; the table appears with the divider | `streaming` |
| Table row still being typed | The rows so far; the new one appears whole | `streaming` |
| Done | The reply as written; an unclosed marker now shows as typed | `streaming={false}` |
| Table wider than the reply | Scrolls sideways inside its box; the edge with more fades | content |
| Link hover | Underline goes from the subtle gray to the text color | `@media (hover: hover)` |

A block that's finished doesn't render again while text arrives below it,
and nothing above the last block moves: a held-back marker is a line that
hasn't appeared yet, not one that appears and changes.

**Typography.** Chat scale: 15px text on a 1.6 line, blocks 12px apart.
`#` is the 22px heading step, `##` and `###` the text size at semibold
with more room above, `####` a muted label. The first and last blocks have
no outer margin, so it sits flush in a bubble or card.

**Heading tags.** A reply sits under the page's own headings, so `#`
renders as an `h3` by default and the rest follow down to `h6`. Set
`headingLevel` where the reply's place in the outline is different.

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `source` | `string` | | The markdown so far. Pass the whole text each time, not the new chunk. |
| `streaming` | `boolean` | `false` | Text is still arriving: holds back half-typed markers, closes open spans early and shows the caret. |
| `headingLevel` | `1`–`6` | `3` | The tag a `#` heading renders as. |
| `className` | `string` | | On the root `<div>`. Other `<div>` props pass through. |

`parse(source, streaming)` and `inline(text, open)` are exported too, for
rendering the same markdown somewhere else.

## Safety

- HTML in the source shows as text. Nothing is set with
  `dangerouslySetInnerHTML`.
- Links follow only `http(s)`, `mailto`, `tel` and relative URLs; a
  `javascript:` or `data:` link keeps its words and drops the link.
  External links open in a new tab with `rel="noopener noreferrer"`, and
  show their host on hover.
- An image (`![alt](url)`) renders as a link to it, never an `<img>`: a
  reply can't make the page load a URL, which is how a prompt injection
  would send data out.

## Motion

| What | Duration | Easing |
|---|---|---|
| Caret breathes, full to a quarter opacity and back | `--ui-dur-pulse` (700ms) each way, repeating | `--ui-ease-pulse` |
| Link underline darkens on hover | `--ui-dur-instant` (120ms) | `--ui-ease-color` |

Text appears as it arrives, with no fade per word: a long answer that
animates every token reads as busy. Under `prefers-reduced-motion: reduce`
the caret holds still.

## Accessibility

- The root has `aria-busy` while streaming; the caret is `aria-hidden`.
- Task items are read-only checkboxes ("Done", "Not done"), out of the Tab
  order: a reply's checklist isn't a control.
- A table that scrolls is a focusable `region`, so the keyboard can scroll
  it; one that fits isn't a tab stop.
- Headings are real heading elements, so screen reader users can jump
  through a long answer.
- Quotes and struck text use `--ui-muted`, which holds 4.5:1 in both
  themes.

## Before / after

Before: the raw reply, re-rendered by a full markdown library on every
token, flashing `**` and backticks until each closes and a table as rows
of pipes until its divider arrives.

```tsx
<ReactMarkdown>{reply}</ReactMarkdown>
```

After: the same text, styled from the first character.

```tsx
<Markdown source={reply} streaming={!done} />
```
