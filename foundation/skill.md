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
include message-thread, markdown, code-block, diff-view, reasoning,
tool-steps, model-picker and usage-meter. All of it is free.

## The rules

{{OPINIONS}}

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
