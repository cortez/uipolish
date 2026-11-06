# UI Polish

Polished UI for AI products: React components where every state, transition
and edge case is already worked out, and the design rules behind them, written
so coding agents can follow them. Docs and live demos at
[uipolish.com](https://uipolish.com?ref=github).

This repository is the free tier, under the MIT license: 45 components, 10
agent-kit pieces and blocks, the tokens and theme generator, the design rules
and the agent skill.

## The opinions

Every component makes the same calls, and the rules ask the same of the UI your
agent writes around them. Three of them:

- **Busy waits 300ms before it shows.** A fast answer never flashes a spinner.
  Once a spinner appears, it stays at least 400ms so it can be read.
- **Every async action has four states.** Idle, busy, done and failed, each
  designed, with the failure saying what to do next.
- **Nothing shifts.** Labels that change hold their width, numbers use tabular
  figures, and content that loads in has its space reserved.

All ten are in [foundation/opinions.md](foundation/opinions.md).

## Three ways in

**1. The MCP server.** Connect it once, then ask your agent for a component by
name ("add a date picker"). It writes the files into your project and follows
the rules for the UI it writes itself.

```bash
claude mcp add --transport http uipolish https://uipolish.com/mcp
```

Setup for Cursor, VS Code, Codex and other clients is at
[uipolish.com/docs](https://uipolish.com/docs?ref=github).

**2. The shadcn CLI.** Every item has a registry file in [`r/`](r). Point the
CLI at one, from uipolish.com or from this repository's raw files:

```bash
npx shadcn@latest add https://uipolish.com/r/date-picker.json
```

```bash
npx shadcn@latest add https://raw.githubusercontent.com/cortez/uipolish/main/r/date-picker.json
```

Any item works the same way: `https://uipolish.com/r/<name>.json` or
`https://raw.githubusercontent.com/cortez/uipolish/main/r/<name>.json`.

A component brings the components it uses and installs the tokens once.
`r/theme.json` maps the tokens onto an existing shadcn/ui theme instead.

**3. The rules file.** [`skills/ui-polish/`](skills/ui-polish) is the design
rules as an agent skill: copy the folder into your agent's skills directory
(`.claude/skills/` for Claude Code), or point your agent at
[SKILL.md](skills/ui-polish/SKILL.md) from `AGENTS.md`. The same rules, one
file per topic, are in [`foundation/rules/`](foundation/rules).

You can also copy a folder from `registry/` by hand, with
`foundation/tokens.css` once. The interactive components need
`@base-ui/react`.

## What's here

- `registry/<name>/`: one component: the React component, its CSS module
  (it reads `--ui-*` tokens only), `guide.md` for agents and `meta.json`.
  `animated-size`, `field`, `icons`, `listbox`, `text` and `text-morph` are
  building blocks the others import.
- `foundation/`: the opinions, the rules, `tokens.css`, the Tailwind v4 bridge,
  the shadcn mapping and the checklist.
- `theme/theme.ts`: one hue in, a whole light and dark `--ui-*` palette out,
  with every text color solved for contrast. Paste its CSS after `tokens.css`.
- `skills/ui-polish/`: the agent skill, built from `foundation/`.
- `r/`: the shadcn registry, built from `registry/` and `foundation/`.

UI Polish Pro adds whole product screens, templates and more agent-kit pieces:
[uipolish.com/pricing](https://uipolish.com/pricing?ref=github).

## Components

- [Accordion](https://uipolish.com/docs/accordion?ref=github): Disclosure sections that open on a grid-row transition, one or several at a time. An item named in the URL hash is already open on first paint.
- [Alert](https://uipolish.com/docs/alert?ref=github): Inline banner for info, success, warning and error. It reserves its space up front or opens on a press, so a late status never pushes the page.
- [Avatar](https://uipolish.com/docs/avatar?ref=github): Photo with initials on an opaque quiet fill behind it, or a head and shoulders with no name. A quick photo never flashes initials, a broken one never shows its broken mark, and groups overlap with a +N that says how many.
- [Badge](https://uipolish.com/docs/badge?ref=github): A static label for a status or a count, exactly as tall as the line it sits in. Counts are round for one digit and set in equal-width figures.
- [Breadcrumbs](https://uipolish.com/docs/breadcrumbs?ref=github): Trail of links to the current page. A long middle folds into a … that opens in place, long labels fade instead of wrapping, and any router’s link fits.
- [Button](https://uipolish.com/docs/button?ref=github): Pill button that presses instantly and springs back. The busy state keeps its width, and the label morphs when its text changes.
- [Checkbox](https://uipolish.com/docs/checkbox?ref=github): Base UI checkbox whose tick draws on and off. The mixed-state dash morphs into the tick, and the box aligns to the first line of its label.
- [Chip](https://uipolish.com/docs/chip?ref=github): Filter chips that stay pressed, and removable chips with their own named remove button. A plus swings into a check without changing the width, and removed chips fade before the rest slide into place.
- [Code input](https://uipolish.com/docs/code-input?ref=github): One-time code boxes that fill from a paste or platform autofill and step back on Backspace. The active box shows a dark edge and a caret, invalid shows in the edges; an optional status folds the boxes into a centered, edgeless Verifying pill that turns to Verified, or opens back up on a wrong code.
- [Combobox](https://uipolish.com/docs/combobox?ref=github): Type-to-filter autocomplete for local or async results. Each match marks the typed text, and stale results stay in place while new ones load.
- [Command palette](https://uipolish.com/docs/command-palette?ref=github): ⌘K palette with fuzzy matching, recents and grouped results. Async sources never flash a loading state, and the height follows the results.
- [Copy field](https://uipolish.com/docs/copy-field?ref=github): Read-only value with a Copy button whose icon turns into a check and says “Copied” to screen readers. A secret masks as a fixed row of dots that gives away nothing about its length.
- [Data table](https://uipolish.com/docs/data-table?ref=github): Keyboard-first grid for real data: one tab stop, arrow keys between cells, a stable sort whose arrow flips its head, columns resized by pointer or keys, range selection, and thousands of rows virtualized without a dependency.
- [Date picker](https://uipolish.com/docs/date-picker?ref=github): Date field that opens a calendar dialog with full grid keyboard support. Months slide a short way in the direction you moved, crossfading inside a soft-edged panel, and ranges are optional.
- [Dialog](https://uipolish.com/docs/dialog?ref=github): Modal that grows out of its trigger and eases to fit its content as steps change. It locks scroll without a shift and asks before discarding edits.
- [Drawer](https://uipolish.com/docs/drawer?ref=github): Modal panel that slides in from the end edge, and on phones rises as a sheet you drag down to dismiss, at the speed of your flick. The body scrolls between a header and footer that stay put.
- [Dropdown menu](https://uipolish.com/docs/dropdown-menu?ref=github): Menu button with checkbox, radio and submenu items. Submenus forgive a diagonal pointer path, and pointer and keyboard share one highlight.
- [Empty state](https://uipolish.com/docs/empty-state?ref=github): The message for an empty list or view: a clean isometric line drawing with crisp corners (a stack, a box, a folder, a tray, a magnifier, a calendar or an unplugged cord), drawn once as it comes into view, with a title, one sentence and one action.
- [File upload](https://uipolish.com/docs/file-upload?ref=github): Drop zone with a fixed-height file list. Each row fills with its upload progress, and the list scrolls inside its height, so the page never moves.
- [Inline edit](https://uipolish.com/docs/inline-edit?ref=github): Text that becomes an input where it stands, in the same font and the same place, so not a letter moves. Enter saves, Escape restores, and an error keeps you editing.
- [Kbd](https://uipolish.com/docs/kbd?ref=github): A key or a shortcut as the reader’s keyboard labels it: ⌘K on Apple, Ctrl K elsewhere. Decided before the first paint, so the server and the browser agree and nothing moves.
- [List](https://uipolish.com/docs/list?ref=github): Rows of peers, static, links or buttons, each row one tab stop with nothing nested inside it. Secondary actions show on hover or focus without moving anything, and every row keeps its height in every state.
- [Nav rail](https://uipolish.com/docs/nav-rail?ref=github): A compact app rail of icon items. One tooltip glides from item to item, easing to each label’s width with the shortcut beside it, and a raised capsule glides to the current page.
- [Number input](https://uipolish.com/docs/number-input?ref=github): Spinbutton whose − and + buttons speed up while held. A typed value outside min or max is pulled into range, with a note that says so.
- [Pagination](https://uipolish.com/docs/pagination?ref=github): Page numbers in a fixed number of slots, so the control never changes width as you page. Numbers slide under one moving pill, and Next stays focusable at the end.
- [Phone input](https://uipolish.com/docs/phone-input?ref=github): Phone field with a country picker. The number groups as you type without moving the caret, a pasted +44 number picks its country, and the form gets E.164.
- [Popover](https://uipolish.com/docs/popover?ref=github): Click-triggered panel anchored to its trigger. It moves focus into forms, leaves it on the trigger for explanations, and returns it on close.
- [Progress](https://uipolish.com/docs/progress?ref=github): Linear progress whose fill moves on a spring. The indeterminate state sweeps a band of light through the track, and a segmented variant shows named steps.
- [Prompt input](https://uipolish.com/docs/prompt-input?ref=github): Chat composer that grows with its text and sends on Enter, never mid-IME. Send turns into Stop while a reply streams, and dropped files become chips.
- [Radio group](https://uipolish.com/docs/radio-group?ref=github): Base UI radios in a fieldset, as a list or as cards. The mark opens from its center, arrow keys choose, and the whole group takes one tab stop.
- [Response actions](https://uipolish.com/docs/response-actions?ref=github): The row under an assistant reply: copy, thumbs up and down, and retry. A thumbs down can open a “What went wrong?” field in place.
- [Scroll area](https://uipolish.com/docs/scroll-area?ref=github): Scroll container whose edges fade with a mask only where more content remains. It works on any background and scrolls by keyboard.
- [Search field](https://uipolish.com/docs/search-field?ref=github): Search input whose clear button fades in over room it already holds, so the text never moves. Escape clears, then leaves, and the magnifier breathes while results load.
- [Segmented control](https://uipolish.com/docs/segmented-control?ref=github): Base UI radio group with the Tabs' look: a clear hairline track and one flat pill that glides to the checked option. Arrow keys and form values come with the group.
- [Select](https://uipolish.com/docs/select?ref=github): Select-only combobox whose trigger fits the chosen label and morphs to the next one. Touch screens get the native picker instead.
- [Sidebar](https://uipolish.com/docs/sidebar?ref=github): The app sidebar for an AI product: a workspace switcher, items with counts and shortcuts, folding sections, a recent chats list with rename, pin and delete, and an account menu. Collapses to an icon rail with one gliding tooltip, and becomes a drawer on phones.
- [Skeleton](https://uipolish.com/docs/skeleton?ref=github): Placeholders shaped like the content on its way, with text lines exactly as tall as the text, so the swap moves nothing. One element per bone; one soft diagonal sheen crosses every skeleton on the page together, and nothing shows for loads under 300ms.
- [Slider](https://uipolish.com/docs/slider?ref=github): A label row with a steady-width value over a sunken track, an accent range and a raised capsule thumb that glides to place. Base UI's slider underneath handles pointer, keyboard and touch.
- [Stat](https://uipolish.com/docs/stat?ref=github): A figure with its label and a change stated by both an arrow and words. The hint always takes two lines, so tiles in a row stay level.
- [Switch](https://uipolish.com/docs/switch?ref=github): Base UI switch with role="switch": the segmented control in miniature, a sunken track with a raised pill that glides across. Two sizes on the control scale and a busy state for saves.
- [Tabs](https://uipolish.com/docs/tabs?ref=github): Tabs built on Base UI, with a pill that stretches from one tab to the next. Optional URL sync supports back and forward, and panels crossfade in place.
- [Text field](https://uipolish.com/docs/text-field?ref=github): Labeled input that validates when you leave it and clears the error as soon as the value is fixed. The error takes the hint’s line, so nothing shifts.
- [Theme toggle](https://uipolish.com/docs/theme-toggle?ref=github): Icon capsule that switches light and dark: one drawing where the sun's disc grows into a crescent as a second circle slides over it. Stores the choice, follows the system until there is one, and paints the right theme before the first frame.
- [Toast](https://uipolish.com/docs/toast?ref=github): Imperative toasts in a collapsed stack that fans out on hover. Timers pause while you read, and a flick swipes a toast away.
- [Tooltip](https://uipolish.com/docs/tooltip?ref=github): Short hint that opens after a pause, then instantly as you move between triggers. Keyboard focus opens it at once.

## Agent kit and blocks

- [Agent settings](https://uipolish.com/docs/agent-settings?ref=github): A whole settings screen for an AI agent, built from the kit: model, MCP connections, what it may do without asking, a daily spending limit and memory. Every change saves in its row, and a sticky section nav follows you down the page.
- [Authorize](https://uipolish.com/docs/authorize?ref=github): The consent screen an MCP server shows when an agent asks to connect: who's asking, what it will be able to do, and where you go back to. Risky permissions start off.
- [Code block](https://uipolish.com/docs/code-block?ref=github): Code block for AI apps that streams in without flashing or jumping. Copy, line wrap and calm token-colored highlighting are built in, with no highlighter library.
- [Connections](https://uipolish.com/docs/connections?ref=github): The agent app's list of MCP servers: one quiet row each, a switch, and a status line that says what's wrong and the one thing that fixes it. Adds a server by URL and hands sign-in to the browser.
- [Diff view](https://uipolish.com/docs/diff-view?ref=github): Unified diff with the changed part of each line marked and unchanged stretches folded. In streaming mode, new lines fade in as they arrive.
- [Markdown](https://uipolish.com/docs/markdown?ref=github): Renders a model's markdown reply while it streams: no flash of raw asterisks, backticks or half-typed tables, code fences open as live code blocks, and HTML in the reply shows as text.
- [Message thread](https://uipolish.com/docs/message-thread?ref=github): Chat transcript that fades in only the newly streamed words. It stays pinned to the bottom until you scroll up and announces each reply once it ends.
- [Model picker](https://uipolish.com/docs/model-picker?ref=github): Compact trigger that resizes to fit the current model’s name. It opens a list of models with one-line descriptions and a drawn check on the selection.
- [Sign in](https://uipolish.com/docs/sign-in?ref=github): A passwordless sign-in and sign-up screen: work email, then a one-time code with a resend countdown, plus optional OAuth providers and SSO by work domain. Wrong, expired and rate-limited codes, blocked domains and failed providers each say what to do next.
- [Usage meter](https://uipolish.com/docs/usage-meter?ref=github): How much of an agent’s context window or spending budget is used, as a ring and a percentage in the composer toolbar. Opens to a breakdown, warns before the limit and offers to compact.

## License

MIT. See [LICENSE](LICENSE).
