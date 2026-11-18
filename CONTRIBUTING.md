# Contributing

Issues and pull requests are welcome. Bug reports with the component, the
browser and the steps to reproduce help most.

[AGENTS.md](AGENTS.md) has the conventions, for people and coding agents
alike. In short, for a component change:

- CSS modules read `--ui-*` tokens only: no literal colors, durations or
  easings. A missing value belongs in `foundation/tokens.css`.
- Behavior (focus, keyboard, positioning, dismissal) comes from Base UI
  (`@base-ui/react`); the look and motion are ours.
- Keep the props API stable. Update the component's `guide.md` in the same
  change and bump `version` in its `meta.json`.
- Follow the rules in `foundation/` for anything you build, the site
  included.

`skills/ui-polish/` is generated from `foundation/`: edit `foundation/`,
then run `npm run skill`.

Before opening a pull request:

```bash
npm install
```

```bash
npm run typecheck && npm run lint
```

```bash
npm run build && npm test
```
