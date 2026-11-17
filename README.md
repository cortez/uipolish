# UI Polish

**Polished UI for AI products.** React components for chat, agents and
everything around them, where every state, transition and edge case is
worked out, and the design rules behind them, made for coding agents. All
of it is free and MIT-licensed: the primitives, the components, and the AI
components that show a model thinking, acting and asking.

[Docs](https://uipolish.com/docs) · [Components](https://uipolish.com/docs/button) · [Design rules](https://uipolish.com/docs/rules) · [Theme builder](https://uipolish.com/docs/theme)

## Start

Pick one. None needs an account or a key.

**Let your agent do it.** Connect the MCP server, then ask for components by
name ("add a date picker"):

```sh
claude mcp add --transport http uipolish https://uipolish.com/mcp
```

Cursor, Codex, VS Code, Gemini CLI and others:
[uipolish.com/docs](https://uipolish.com/docs#installation).

**Use the shadcn CLI.** Any component by name, with what it depends on:

```sh
npx shadcn@latest add https://uipolish.com/r/dialog.json
```

**Just the rules.** The design rules as a skill your agent follows for the UI
it writes itself ([skills/ui-polish](skills/ui-polish/SKILL.md)):

```sh
mkdir -p .claude/skills/ui-polish && curl -fsSL https://uipolish.com/skill.md -o .claude/skills/ui-polish/SKILL.md
```

## Opinions

Ten decisions every component shares. Each is a token or a rule, so changing
one value changes every component that uses it.

1. Leave fast, arrive slower.
2. Springs only where something moves.
3. Busy waits 300ms before it shows.
4. Every async action has four states.
5. Edges come from the text color.
6. Focus is for keyboards.
7. Nothing shifts.
8. One shape per job.
9. Native and accessible first.
10. Reduced motion keeps the meaning.

The values behind each: [foundation/opinions.md](foundation/opinions.md).

## What's in it

**Foundation**

- `foundation/rules/`: concrete rules for motion, states, typography,
  spacing, surfaces, focus and the anti-patterns that pass code review.
  Each gives concrete values: durations, easings, shadow recipes, tracking.
- `foundation/tokens.css`: the `--ui-*` roles every component reads (space,
  radius, control heights, durations, easings including a critically damped
  spring, color, focus ring, three elevations). Map them onto the variables
  your project already has; UI Polish doesn't bring a theme.
- `foundation/checklist.md`: yes/no checks to run before calling UI done.

**Components**

One folder per component in `registry/`: the React component, its CSS module
(tokens only), and a guide covering when to use it, when not to, every state,
motion specs, accessibility and before/after code.

**Components (45):** Accordion, Alert, Avatar, Badge, Breadcrumbs, Button, Checkbox,
Chip, Code input, Combobox, Command palette, Copy field, Data table, Date
picker, Dialog, Drawer, Dropdown menu, Empty state, File upload, Inline edit,
Kbd, List, Nav rail, Number input, Pagination, Phone input, Popover, Progress, Prompt
input, Radio group, Response actions, Scroll area, Search field, Segmented
control, Select, Sidebar, Skeleton, Slider, Stat, Switch, Tabs, Text field, Theme toggle, Toast and
Tooltip.

**Agent kit:** components for AI products, grouped in the docs by
`"kit": "agent"` in `meta.json`: Agent settings, Authorize, Background run,
Batch progress, Code block, Connections, Diff stat, Diff view, File changes,
Markdown, Merge status, Message thread, Model picker, Pipeline, Plan
approval, Reasoning, Research progress, Sources, Tool approval, Tool steps,
Turn summary, Usage meter and Voice input.

The interactive components run on [Base UI](https://base-ui.com)
(`@base-ui/react`) for focus, keyboard, ARIA, positioning and dismissal; the
look, motion and states are UI Polish's own CSS modules. A component lists the
packages it imports in `meta.json` (`packages`), and `get_component`, the REST
API and the shadcn registry item all tell the project to install them.

**Primitives**, the parts the other components are built from, each usable
on its own: Animated size, Brand marks, Field, Icons, Listbox, Text, Text morph.

`list_components` (or `GET /api/components`) is the live list.

## MCP tools

| Tool | What it does |
|---|---|
| `get_rules(topic?)` | One rules file, or the tokens, checklist and topic list |
| `list_components()` | Names, summaries, versions, and which are in the agent kit |
| `get_component(name, stack, tailwind)` | Code and guide, including the components it depends on and the packages to install |
| `get_theme(hue, tint, brand)` | A one-color theme: accent, text on it, tinted grays, light and dark, contrast-checked (also `GET /api/theme`, and `/docs/theme` by hand) |

## Tailwind CSS

In a Tailwind CSS v4 project, agents pass `tailwind: true` to
`get_component`: the CSS modules come inside Tailwind's `components` layer,
so utility classes override them. `foundation/tailwind.css` names the
`--ui-*` roles as theme values (`bg-ui-surface`, `text-ui-muted`), and
`foundation/tailwind.md` is the setup guide, served as `get_rules("tailwind")`
and at `/docs/tailwind`.

## shadcn CLI

Every component is also a shadcn registry item: `npx shadcn add
https://uipolish.com/r/dialog.json`, or add the `@uipolish` registry to
`components.json` and run `npx shadcn add @uipolish/authorize`. `/r/registry.json` lists every item;
`/r/theme.json` maps the roles onto a shadcn theme (`foundation/shadcn.css`).
Setup: `foundation/shadcn.md`, served at `/docs/shadcn`.

## For agents without MCP

- `GET /api/components`, `/api/components/{name}`, `/api/rules`,
  `/api/rules/{topic}`: the same content as JSON, with no key. Described by `/openapi.json`; errors are JSON with a code, a message
  and a hint.
- Every page as Markdown: send `Accept: text/markdown`, add `.md` to the
  path, or read `/md/<path>`. Docs pages also have a Copy page button.
- `/llms.txt` and `/llms-full.txt`: what UI Polish is, when to use it, and
  every guide in one file.

## Develop

```sh
npm install
npm run dev            # site, previews at /preview/<name>, MCP at /mcp
npm run build
npm test               # needs the build: starts it, or set BASE_URL
                       # the layout check runs when Playwright is installed
```

Try the MCP endpoint:

```sh
curl -s localhost:3000/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_components","arguments":{}}}'
```

## Repo layout

```
foundation/   opinions, rules, tokens, checklist, the skill template
registry/     one folder per component: .tsx, .module.css, guide.md, meta.json
skills/       the rules as an agent skill, built from foundation/ (npm run skill)
src/app/      site, previews, MCP route, REST API, Markdown twins
src/lib/      content loader, MCP tools, API, SEO and llms.txt
src/proxy.ts  serves Markdown to requests that ask for it
tests/        node:test suites against a production build
```

## Contributing

Issues and pull requests are welcome. A change to a component touches its
`.tsx`, `.module.css`, `guide.md` and a version bump in `meta.json`; the
guide is part of the component, since it's what agents read. After changing
anything in `foundation/`, run `npm run skill`. Run `npm run typecheck`,
`npm run lint` and `npm test` before opening a PR. [AGENTS.md](AGENTS.md) has
the conventions, for people and coding agents alike.

## Donate

UI Polish is free and open source. If it saves you time, you can
[donate](https://buy.polar.sh/polar_cl_Ne3B69dlezuutkrSoXOkzyIERxDUwm34SFCyX02eXVx).

## License

MIT. See [LICENSE](LICENSE). The site's fonts (DM Sans and DM Mono) are under
the SIL Open Font License.
