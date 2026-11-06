---
name: ui-polish
description: "Builds UI to the UI Polish standard: concrete rules for motion, states, typography, spacing, surfaces and focus, plus ready React components (dialogs, menus, selects, an agent kit for AI products) installed over MCP or the shadcn CLI. Use when writing, changing or reviewing any user interface."
---

# UI Polish

UI Polish is a set of design rules and React components where every state,
transition and edge case is worked out. Use the components instead of writing
your own, and follow the rules for everything else you build.

## Get a component

Prefer an existing component over writing one. Pick whichever the project
already has:

- **MCP** (if the `uipolish` server is connected): `list_components`, then
  `get_component(name)`. Pass `tailwind: true` in a Tailwind CSS v4 project.
- **shadcn CLI**: `npx shadcn@latest add https://uipolish.com/r/<name>.json`
- **HTTP**: `GET https://uipolish.com/api/components/<name>` returns the files,
  the guide and the npm packages to install.

Write every file at the path given, install the packages listed (usually
`@base-ui/react`), and add `references/tokens.css` to the global stylesheet
once. If the project already has design tokens, map the `--ui-*` roles onto
them instead of adding a second palette. Read the component's guide before
you use it: it says when not to.

The full list is at https://uipolish.com/docs. Components for AI products
(the agent kit) include message-thread, markdown, model-picker, authorize
and usage-meter, free; and reasoning, tool-steps, tool-approval,
plan-approval, sources, research-progress, pipeline, batch-progress,
background-run and voice-input, which are UI Polish Pro and need a license
key (list_components marks them "pro").

## The rules

- **Leave fast, arrive slower.** Things leave in 120ms and arrive in 160 to 200ms, on an ease-out curve. Nothing eases on linear, and no transition takes longer than 380ms.
- **Springs only where something moves.** A pill sliding between tabs or a panel changing size overshoots a little, then settles. Opacity and color never bounce.
- **Busy waits 300ms before it shows.** A fast answer never flashes a spinner. Once a spinner appears, it stays at least 400ms so it can be read.
- **Every async action has four states.** Idle, busy, done and failed, each designed, with the failure saying what to do next.
- **Edges come from the text color.** Borders are the text color at 4 to 13% opacity, so they sit right on any background, in light and dark.
- **Focus is for keyboards.** A thin ring inside the control's edge on `:focus-visible`, never a halo on click.
- **Nothing shifts.** Labels that change hold their width, numbers use tabular figures, and content that loads in has its space reserved.
- **One shape per job.** Controls are 32, 40 or 48px tall, whatever they are, corners are 10, 14 or 22px, and an icon-only button is a capsule 1.375 times as wide as it is tall.
- **Native and accessible first.** Every control works from the keyboard, announces what changed, and has a 24px target for a mouse and 40px for a finger.
- **Reduced motion keeps the meaning.** Movement becomes a fade; nothing that carries meaning disappears.

Before you write or change UI, read the reference for what you're touching:

| Working on | Read |
|---|---|
| Tokens, focus, global CSS | [references/foundations.md](references/foundations.md) |
| Text, sizes, numbers | [references/typography.md](references/typography.md) |
| Layout and gaps | [references/spacing.md](references/spacing.md) |
| Cards, borders, shadows, radius | [references/surfaces.md](references/surfaces.md) |
| Loading, empty, error, disabled | [references/states.md](references/states.md) |
| Anything that moves | [references/motion.md](references/motion.md) |
| Review before you ship | [references/antipatterns.md](references/antipatterns.md) |

The token roles every rule names are in
[references/tokens.css](references/tokens.css).

## Before calling UI done

Go through [references/checklist.md](references/checklist.md). Every item is
a yes or no.
