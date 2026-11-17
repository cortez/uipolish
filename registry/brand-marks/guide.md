# Brand marks

Marks for the services an app connects to, cites or signs in with, as inline
SVGs: no network request, no layout shift, crisp at any size. Each draws in its
brand's color, except marks that are black or white, which take the text
color so they read in light and dark.

```tsx
import { BrandMark } from "../brand-marks/brand-marks";

<BrandMark name="github" />
<BrandMark name="wikipedia" size={20} />
<BrandMark name="stripe" mono /> // in the text color
```

Sources, research progress, connections and authorize use them for real
services. Coding tools are in the set too (Claude, OpenAI, Codex,
Antigravity, Cursor, Visual Studio Code, Google Gemini, shadcn/ui, Model Context
Protocol), for setup pickers and install steps.

## Rules

- Name the service in text next to the mark; the mark is decorative
  (`aria-hidden`).
- Don't recolor, stretch or crop a mark, and don't use one to suggest a
  brand endorses your product. The paths come from Simple Icons (CC0); the
  marks are trademarks of their owners.
- For a service that isn't in the set, show its favicon in the same tile,
  or the first letter of its name.
