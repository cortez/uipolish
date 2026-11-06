# shadcn/ui

Install UI Polish components with the shadcn CLI you already use. Each
command brings the component, everything it depends on and the tokens, and
adds the stylesheet imports for you, along with `@base-ui/react`.

## Add a component

```sh
npx shadcn@latest add https://uipolish.com/r/dialog.json
```

The CLI also installs `@base-ui/react`, which the interactive components use
for focus, keyboard and positioning. The files land in `components/ui/dialog/`, next to the building blocks it
uses (`components/ui/button/`, `components/ui/icons/`), so the relative
imports between them hold. Your own shadcn `components/ui/button.tsx` is left
alone. The tokens go to `components/ui/uipolish/`, and your global
stylesheet gets their imports right after Tailwind's.

## Follow your shadcn theme

Install the theme item once, before or after any component:

```sh
npx shadcn@latest add https://uipolish.com/r/theme.json
```

It adds `shadcn.css`, which points UI Polish's color and radius roles at your
variables: `--ui-canvas` reads `--background`, `--ui-muted` reads
`--muted-foreground`, `--ui-ink` reads `--primary`, the radii follow
`--radius`, and so on. Change your theme and the components change with it,
in light and in dark (`.dark` also sets `color-scheme`, which the roles
shadcn has no name for, like success and warning, follow). Skip it to keep
UI Polish's own neutral palette.

## Add the registry, to install by name

Add `@uipolish` to the `registries` in `components.json`:

```json
{
  "registries": {
    "@uipolish": "https://uipolish.com/r/{name}.json"
  }
}
```

Then add components by name:

```sh
npx shadcn@latest add @uipolish/authorize @uipolish/tool-steps
```

## Every item

`https://uipolish.com/r/registry.json` lists them all: `tokens`, `theme`, and
one item per component, named as in these docs (`date-picker`,
`command-palette`).

## Updating

Run the same command with `--overwrite` to replace a component's files with
the newest version. Edits you made to those files are replaced too, so
commit first and look at the diff.
