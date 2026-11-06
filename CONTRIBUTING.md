# Contributing

Issues and pull requests are welcome. Bug reports with the component, the
browser and the steps to reproduce help most.

For a component change:

- CSS modules read `--ui-*` tokens only: no literal colors, durations or
  easings. A missing value belongs in `foundation/tokens.css`.
- Behavior (focus, keyboard, positioning, dismissal) comes from Base UI
  (`@base-ui/react`); the look and motion are ours.
- Keep the props API stable. Update the component's `guide.md` in the same
  change and bump `version` in its `meta.json`.
- Follow the rules in `foundation/` for anything you build.

The skill in `skills/ui-polish/` and the registry in `r/` are generated; edit
`foundation/` and `registry/`, then rebuild:

```bash
npm install
```

```bash
npm run skill && npm run registry
```

```bash
npm run check
```

`npm run check` typechecks the components and fails if `skills/` or `r/` is
out of date.
