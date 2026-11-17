# Working in this repo

UI Polish is a component library and a set of design rules, published three
ways from the same files: the site and MCP server (`src/`), the shadcn
registry (`/r/*.json`), and the agent skill (`skills/ui-polish`). Change the
source once and every surface follows.

To *use* UI Polish in another project, see
[skills/ui-polish/SKILL.md](skills/ui-polish/SKILL.md) instead.

## Where things live

- `foundation/opinions.md`: the ten calls every component makes. The home
  page, the skill and the README list them.
- `foundation/rules/*.md`, `tokens.css`, `checklist.md`: the design rules.
- `foundation/skill.md`: the skill template. `npm run skill` writes
  `skills/ui-polish/` from it and the rules; never edit `skills/` by hand.
- `registry/<name>/`: one component. `<name>.tsx`, `<name>.module.css`,
  `guide.md` (what agents read before using it) and `meta.json`.
- `src/previews/<name>.tsx`: the live demo on its docs page.

## Rules for a component change

- CSS modules read `--ui-*` tokens only. No literal colors, durations or
  easings; if a value is missing, it belongs in `foundation/tokens.css`.
- Behavior (focus, keyboard, positioning, dismissal) comes from Base UI
  (`@base-ui/react`). Look and motion are ours.
- Keep the props API stable; previews and other components depend on it.
- Update `guide.md` in the same change, and bump `version` in `meta.json`.
- An import from an npm package goes in `meta.json` `packages`
  (`tests/packages.test.mjs` checks it).
- Follow the rules in `foundation/` for anything you build here, the site
  included: the site is the first user of the components.

## Checks

```sh
npm run typecheck
npm run lint
npm run build && npm test   # or BASE_URL=http://localhost:3000 npm test
```

`npm test` fails if `skills/ui-polish` is out of date with `foundation/`.
