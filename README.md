# uipolish

**Your UI works. Now make it feel finished.**

`uipolish` is an agent skill that runs a systematic polish pass over an existing
codebase: microinteractions, motion, spacing, typography, depth, and interaction
states. It audits first, then applies ordered passes using concrete,
production-derived values: durations, easing curves, tracking, shadow recipes.

It never redesigns and never changes behavior. It sharpens what's already there.

## Install

```sh
npx skills add cortez/uipolish
```

Works with Claude Code, Cursor, Codex, and other agents that support the
[Agent Skills](https://skills.sh) format.

## Use

In Claude Code:

```
/uipolish
```

or scope it:

```
/uipolish the dashboard
/uipolish src/components
```

The agent will also pick the skill up automatically when you say things like
"polish this UI", "it feels flat", or "add microinteractions".

## What it does

1. **Recon** detects your stack, design tokens, and conventions so every edit
   extends your system instead of fighting it.
2. **Audit** sweeps the code and builds a punch list: dead hover states,
   missing focus rings, arbitrary spacing, flat surfaces, layout shift,
   animations of the wrong properties.
3. **Apply** runs six ordered passes: foundations, typography, spacing,
   surfaces, motion, states. Each pass draws on a reference file of concrete
   recipes.
4. **Verify** re-reads the diff, checks reduced motion, walks the keyboard
   path, and runs your build and tests.

## What it will never do

- Change behavior or information architecture
- Remove focus styles or drop contrast below WCAG AA
- Add runtime dependencies
- Animate layout properties, or anything the user didn't ask for with motion
  disabled

## Repo layout

```
SKILL.md            # the workflow (what agents load)
references/         # per-pass recipes: concrete values, not vibes
web/                # uipolish.com landing page
```

## License

[MIT](LICENSE)
