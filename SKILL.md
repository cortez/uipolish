---
name: uipolish
description: "Systematic polish pass that brings an existing UI to life — microinteractions, motion, spacing, typography, depth, and interaction states. Use when a UI works but feels flat, static, bland, unfinished, or 'off', or when asked to polish, refine, add microinteractions, improve spacing or typography, or make an app feel premium, delightful, alive, or production-ready. Triggers on phrases like polish the UI, uipolish, make it feel better, feels flat, feels basic, add microinteractions, improve the design, bring it to life, finishing touches, design pass, make it pop."
---

# uipolish

A structured audit-then-apply workflow that takes a working UI and makes it feel
deliberate: motion where it earns its place, spacing that groups what belongs
together, typography with hierarchy, and every interactive element responding to
the user. It does not redesign. It does not change behavior. It sharpens what is
already there.

Run the phases in order. Do not skip Recon — polish applied against the grain of
an existing design system reads as inconsistency, not craft.

## Scope

If the user named a scope (a page, a component directory, "the dashboard"), stay
inside it. Otherwise treat the whole app as in scope but spend effort where users
spend time: entry pages, primary flows, shared components (buttons, inputs, cards,
nav, dialogs). A shared component polished once pays off everywhere — prefer
fixing the source component over patching call sites.

## Phase 0 — Recon (read, don't write)

Understand the project before touching it:

1. **Stack**: framework, styling system (Tailwind version, CSS modules,
   CSS-in-JS, vanilla), component library (shadcn/ui, Radix, MUI, homegrown),
   animation tooling already present (CSS only, Motion/Framer, GSAP). Check
   `package.json`, the Tailwind/global CSS entry point, and a few components.
2. **Existing design language**: design tokens, color variables, spacing scale,
   type scale, radius values, shadow definitions, any easing/duration variables.
   Note what exists so you extend it instead of duplicating it.
3. **Dark mode**: supported or not, and via what mechanism (class, media query,
   data attribute). Every change you make must hold up in every theme that exists.
4. **Conventions**: how components are written here (utility classes vs. styled
   components, `cn()` helpers, variant patterns). Your edits must be
   indistinguishable in style from the surrounding code.

Rules that follow from Recon:

- **Extend, never fork.** If a spacing scale exists, use its steps. If duration
  variables exist, use them. Only introduce new tokens when none exist, and then
  introduce them as tokens (CSS custom properties or theme config), not as
  magic numbers scattered through components.
- **No new runtime dependencies.** Everything in this skill is achievable with
  CSS and the tools already installed. If Motion/Framer is already a dependency,
  you may use it; never add it.

## Phase 1 — Audit (build the punch list)

Load [references/antipatterns.md](references/antipatterns.md) before sweeping —
it catalogs the non-obvious defects that pass code review because each looks
intentional in isolation: hover states on non-interactive elements, transitions
declared only on `:hover`, state changes that reflow siblings, `100vh` on
mobile, async actions with no failure branch. Findings from that file outrank
cosmetic ones: a styling promise the interface doesn't keep is worse than a
missing flourish.

Then sweep the in-scope UI and collect concrete findings. For each finding
record: file, what is wrong, which pass fixes it. Grep-able signals worth
hunting:

- Interactive elements with no `hover:`/`active:`/`focus-visible:` treatment,
  or `outline-none` with no replacement focus style.
- `transition-all`, missing `transition` on elements whose colors/transform
  change between states, durations ≥ 400ms on small elements, animation of
  `width`/`height`/`top`/`left` where `transform` would do.
- Spacing smells: sibling elements with arbitrary one-off margins, `space-y-*`
  values that don't group related content more tightly than unrelated content,
  section padding that doesn't breathe, misaligned edges.
- Typography smells: default tracking on large headings, line-height too tall on
  headings or too tight on body, more than ~2 font weights doing the work of a
  hierarchy, raw quotes/apostrophes in marketing copy, numbers in tables without
  `tabular-nums`, paragraphs without `text-wrap: pretty` or headings without
  `text-wrap: balance`.
- Flat surfaces: cards/popovers with a single hard border and no depth, pure
  black shadows at high opacity, radius values fighting each other when nested.
- Missing states: buttons with no disabled/loading treatment, lists with no
  empty state, content that pops in with no settle, images with no dimensioned
  placeholder (layout shift).

Then order the punch list by leverage: shared components first, then the
highest-traffic screens, then everything else. Tell the user what you found and
what you're about to do in one compact summary before editing.

## Phase 2 — Apply (ordered passes)

Work in this order — later passes depend on earlier ones. Load the reference
file for a pass before making its edits; each contains the concrete values,
recipes, and code idioms to use.

| # | Pass | Reference |
|---|------|-----------|
| 1 | Foundations: tokens, easing/duration variables, focus ring, selection color | [references/foundations.md](references/foundations.md) |
| 2 | Typography: scale, tracking, line-height, wrapping, numerics | [references/typography.md](references/typography.md) |
| 3 | Spacing & layout: rhythm, grouping, alignment, breathing room | [references/spacing.md](references/spacing.md) |
| 4 | Surfaces & depth: shadows, borders, radius, dark-mode elevation | [references/surfaces.md](references/surfaces.md) |
| 5 | Motion & microinteractions: hover/press, enter/exit, reveals, stagger | [references/motion.md](references/motion.md) |
| 6 | States: loading, skeleton, empty, error, disabled, optimistic | [references/states.md](references/states.md) |

Cross-cutting: [references/antipatterns.md](references/antipatterns.md)
(loaded in Audit) applies to every pass — re-check its affordance and
state-honesty rules whenever a pass adds a hover, transition, or overlay.

Per-pass discipline:

- Make the punch-list edits for that pass across all in-scope files, then move
  on. Don't interleave passes; it produces churn and inconsistent values.
- Every value you write should trace to a token or to a recipe in the reference
  file. If you catch yourself inventing a fourth duration or a fifth gray,
  stop and reuse.
- Prefer deleting over adding: a redundant border, an extra font weight, a
  decorative animation that fights the content. Restraint is the most common
  difference between polished and overworked.

## Phase 3 — Verify

1. **Re-read the diff** file by file. Check: no behavior changes, no removed
   accessibility affordances, dark mode still coherent, nothing animates that
   the user didn't interact with or that plays more than once per session.
2. **Reduced motion**: every animation you introduced is either inside a
   `motion-safe:`/`@media (prefers-reduced-motion: no-preference)` guard or is a
   sub-200ms opacity/color transition (those may stay).
3. **Keyboard walk**: tab order still works; every interactive element has a
   visible `:focus-visible` state.
4. **Build/tests**: run the project's existing build or test command if one
   exists. Broken polish is worse than no polish.
5. If a dev server and browser tooling are available, view the highest-traffic
   changed screen and slow animations down (browser Animations panel) to check
   for jank, overlap, or double-triggering.

Close with a summary grouped by pass: what changed, what you deliberately left
alone, and the 2–3 highest-value follow-ups you did not do (with reasons).

## Guardrails

- **Never change behavior.** No new features, no reflowed information
  architecture, no copy rewrites beyond typographic punctuation.
- **Never break accessibility for aesthetics.** Focus styles may be restyled,
  never removed. Contrast may not drop below WCAG AA. Hit areas may only grow.
- **Motion is opt-in decoration.** Animate `transform` and `opacity` only.
  Nothing loops indefinitely except explicit loading indicators. When in doubt,
  shorter and subtler.
- **Respect the system you found.** Consistent-but-plain beats
  beautiful-but-inconsistent. If the project's design language conflicts with a
  recipe here, the project wins — note the conflict in your summary instead.
- **Small diffs, explained.** If a single pass balloons past ~15 files, pause
  and confirm scope with the user before continuing.
