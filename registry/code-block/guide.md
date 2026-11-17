# Code block

Shows code in an AI app, including code that's still streaming in. Finished
lines never re-render or flash as new text arrives, and the block scrolls on
its own only when the reader is already at the bottom. The
header has the language (or a file name), a Wrap toggle and a Copy button
whose label morphs to "Copied". Highlighting is built in, with no library:
four quiet hues mixed from the theme's accent and status colors, the rest in the text grays, so it
follows any theme. Bring your own highlighter through `lineHtml` if you need
more.

```tsx
<CodeBlock code={text} language="ts" title="scale-recipe.ts" streaming={!done} lineNumbers />
```

## When to use it

- Code in a model's reply, streamed or finished.
- Commands the user will copy and paste: install steps, a `curl` call.
- Config and API payloads (JSON) the user needs to read or copy.

## When not to

- A word or two of code inside a sentence: use inline `<code>`.
- An editor. This is read-only; for editable code use a real editor
  component.
- Logs that grow without end. A block that holds thousands of lines needs
  virtualization; this renders every line.

## Props

| Prop | Default | What it does |
|---|---|---|
| `code` | | The text. While streaming, the text so far; only append to it |
| `language` | | `ts`, `tsx`, `js`, `py`, `sh`, `bash`, `json`, `css`… Sets the label and tokenizer |
| `title` | language name | Header label, for example a file name |
| `lineNumbers` | `false` | Numbers lines; they can't be selected or copied |
| `defaultWrap` | `false` | Start wrapped; the user can still toggle |
| `streaming` | `false` | Shows whole words only, fading each in as it lands, and sets `aria-busy` |
| `highlight` | `true` | Use the built-in tokenizer for supported languages |
| `lineHtml` | | One trusted HTML string per line from your own highlighter |
| `maxHeight` | none | Caps the height; the body scrolls and follows new lines at the bottom |

## States

| State | What you see | How |
|---|---|---|
| Rest | Panel one step off the page with the field edge color (`--ui-border-strong`) as its hairline, like any box, muted label, ghost buttons | `.block` |
| Streaming | Each word appears once it's whole and fades in once; earlier text never moves or animates | `streaming`, `aria-busy` |
| Overflowing | Fades on the edge(s) that have more code; scroller becomes a tab stop | `data-fade-start`, `data-fade-end`, `tabIndex={0}` |
| Scroller focused | 2px ring around the whole block, appears instantly | `:has(.scroller:focus-visible)` |
| Wrapped | Long lines wrap; Wrap button holds a fill | `aria-pressed="true"` |
| Copied | "Copy" morphs to "Copied" for 2s; "Copied to clipboard" is announced | `TextMorph`, `role="status"` |
| Copy failed | Label reads "Copy failed"; the announcement says to select and copy by hand | clipboard missing or blocked |

## Streaming without flashing

- The text is split into lines, and each line is a memoized row. Tokens are
  cached by the line's text and the state it starts in (inside a block
  comment, a template literal, a triple-quoted string), so a finished line
  gets the identical token array on every update and React skips it. Only the
  line being written re-renders.
- New text isn't animated. Fading each chunk in would make the whole block
  shimmer while it streams.
- No caret. The newest words fading in already show where text lands; a
  caret on every reply in a thread is motion with no cause.
- Scroll: horizontal position is never touched. The page uses the browser's
  scroll anchoring, so growth above the viewport doesn't move what you're
  reading. With `maxHeight`, the block follows new lines only while it's
  scrolled to the bottom; scroll up and it stays where you put it.

Pass the full text so far on each update (`code={received}`), not only the
new chunk.

## Highlighting

The built-in tokenizer (`tokenize.ts`) is a line scanner for
JavaScript/TypeScript (with JSX in `tsx`, `jsx` and `js`), Python, shell,
JSON and CSS. It tells apart:

| Token | Marks | Color |
|---|---|---|
| `keyword` | `const`, `import`, `export`, `type`, `typeof`; CSS pseudo-classes, `!important` | accent text |
| `control` | `if`, `return`, `await`, `for`; CSS at-rules; shell `if`, `do` | same as `keyword` |
| `string` | quotes, template text (`${…}` inside is tokenized as code) | success text |
| `number`, `literal`, `value` | numbers with units, hex colors; `true`, `null`, `this`; CSS value words | warning text |
| `function` | a name that's called or declared; shell commands; CSS `var()`, `calc()` | `--ui-foreground` |
| `type`, `tag`, `selector` | PascalCase names, primitive types after `:`; JSX tag names; CSS `.class`, `#id`, elements | danger and accent text, met at violet |
| `attr`, `variable` | JSX attributes, CSS `[attr]`; shell flags; shell `$VAR`, CSS custom properties | foreground with a little accent |
| `property`, `key` | a name after `.`, an object key; JSON keys, CSS property names | `--ui-foreground` |
| `punctuation` | brackets, operators, separators | `--ui-muted` |
| `comment` | | `--ui-subtle`, upright |
| `plain` | everything else: variables, JSX text, shell arguments | `--ui-foreground` |

Each hue is mixed 30–40% of the way toward `--ui-foreground` in `oklab`, so
none of them glare, and each holds 4.5:1 on `--ui-surface` in both themes
(lowest: comments at 4.7:1 light). Names (functions, properties) stay in the
text color, so a block reads as text with a few marks rather than a
rainbow. Override any of them on the block:
`--code-keyword`, `--code-control`, `--code-string`, `--code-number`,
`--code-function`, `--code-type`, `--code-attr`, `--code-property`,
`--code-punctuation`, `--code-comment`.

It's a line scanner, not a parser: no regex literals, and types are
recognized by shape and position, not resolved. JSX tags, children and
`{…}` expressions are tracked across lines, as are block comments, template
literals, Python triple quotes, shell `\` continuations and CSS values that
wrap. Unknown languages render as plain text. Turn it off with
`highlight={false}`.

For real highlighting, run any highlighter and pass one HTML string per line
as `lineHtml`. With Shiki:

```ts
import { codeToTokens } from "shiki";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const { tokens } = await codeToTokens(code, { lang: "ts", theme: "min-light" });
const lineHtml = tokens.map((line) =>
  line.map((t) => `<span style="color:${t.color}">${escape(t.content)}</span>`).join(""),
);

<CodeBlock code={code} language="ts" lineHtml={lineHtml} />
```

`lineHtml` is inserted as HTML: only pass output from your own highlighter,
never model output or user text directly. Keep `code` in sync; Copy uses it.
Map the highlighter's colors to the `--code-*` properties above, or to the
`--ui-*` text tokens, to match the rest of the interface.

## Motion

| What | Duration | Easing |
|---|---|---|
| Copy → Copied label morph | `--ui-dur-move` (380ms), letters out in 150ms | `--ui-ease-move` |
| Copy outline runs into a check (`<Icon name={copied ? "check" : "copy"} />`) | see the icon set's guide | |
| Button hover color | `--ui-dur-instant` (120ms) | `--ui-ease-color` |
| Button press release | `--ui-dur-snap` (240ms) | `--ui-ease-snap` |
| Edge fades | instant | n/a |

Wrapping doesn't animate; streamed words fade in once over `--ui-dur-base`. Under
`prefers-reduced-motion: reduce` words appear without fading, the label swaps without morphing and the
check appears without drawing.

## Accessibility

- When the code overflows, the scroller gets `tabIndex={0}`, `role="region"`
  and an `aria-label` ("Shell code"), so keyboard users can focus it and
  scroll with the arrow keys. When nothing overflows it isn't a tab stop.
- Wrap is a toggle button with `aria-pressed`.
- Copy keeps the accessible name "Copy Shell code"; the result goes to a
  `role="status"` region ("Copied to clipboard"), and a failure says what to
  do instead.
- Line numbers are CSS-generated content with `user-select: none`, so
  selections and copies contain only code.
- `aria-busy` is set while streaming, so screen readers don't read every
  partial update.
- Code uses `--ui-font-mono` with ligatures off (the tokens file sets
  `font-variant-ligatures: none` on code): `!=` and `=>` stay as the
  characters the user will type.
- On coarse pointers the header buttons grow to 40px.

## Before / after

Before: the whole block re-highlights on every chunk, so finished lines
flicker; the long command is cut off with no way to scroll by keyboard; Copy
gives no feedback.

```tsx
<pre dangerouslySetInnerHTML={{ __html: highlight(streamedText) }} />
<button onClick={() => navigator.clipboard.writeText(streamedText)}>Copy</button>
```

After: finished lines stay put, overflow fades and is focusable, Copy morphs
to "Copied" and announces it.

```tsx
<CodeBlock code={streamedText} language="sh" streaming={!done} />
```
