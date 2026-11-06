# Finished?

Run these against a screen or a component before calling it done. Every answer
should be yes. Each check names the rule file that explains it.

## Interaction

1. Does every element that acts have a hover, a press, and a visible
   `:focus-visible` state, and does nothing that doesn't act have any of them?
   (antipatterns)
2. Are transitions declared on the base state, so leaving a state eases as
   well as entering it? (antipatterns)
3. Is `:active` instant (`transition-duration: 0s`) with the release easing
   back? (motion)
4. Are hover styles behind `@media (hover: hover)`, and is hover never the only
   way to reach an action? (antipatterns)
5. Are touch targets at least 40×40px? (foundations)

## State

6. Does every async action have a pending state, a failure branch the user can
   see, and a way to retry? (states)
7. Does a button keep its label and width while busy (a shimmer on the
   label, not a spinner) and when its label changes? (states)
8. Is nothing shown for loads under ~300ms, and does a longer load shimmer the
   label that names the work inside space the result already holds? (states)
9. Do lists and tables have an empty state with a next step, not a bare "No
   data"? (states)
10. Do field errors appear on blur or submit (not while typing), say how to
    fix the problem, clear as soon as it's fixed, and not shift the layout?
    (states)
11. Is disabled the last resort, and when used, is the reason visible without
    hovering? (antipatterns)

## Motion

12. Does every state change carry the user from one state to the next, with
    the least motion that does it: only the properties that differ, the
    shortest travel and duration that still reads, the existing element
    moving into place rather than a fade out and in, and nothing that both
    states share moving at all? (motion)
13. Is everything that moves animating `transform`, `opacity`, `filter` or
    color only (or one of the named exceptions)? (motion)
14. Does each animation use the curve made for its job (enter, exit, move,
    snap, expand, color, draw, pulse) with that curve's duration, and do
    exits run shorter than entrances? (motion)
15. Under `prefers-reduced-motion: reduce`, does every animation jump to its
    end state instead of disappearing? (motion)
16. Can you name why each thing moves? Nothing loops or replays on its own.
    (antipatterns)

## Type, space and surface

17. Do headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`, and
    changing numbers `tabular-nums`? (typography)
18. Is every size, line-height and weight a step from the type scale, text
    untracked (all-caps labels aside), and cut text faded only when it's
    actually cut? (typography)
19. Does text a person needs to read wrap instead of being cut, and does
    nothing below move while content streams in? (typography, motion)
20. Does every control in a row take its height from 32 / 40 / 48, composite
    controls measured whole? (spacing)
21. Is every spacing value on the scale, taken from the role for its
    relationship (`--ui-pad-*`, `--ui-gap-*`), with gaps inside a group at
    most half the gap between groups? (spacing)
22. Do nested radii follow inner = outer − gap, and is every radius on the
    scale? (surfaces)
23. Does it hold up in every theme the project ships, with no hardcoded white,
    black or light-only shadow? (surfaces)
24. Are mobile basics covered: `100dvh` not `100vh`, safe-area insets on fixed
    chrome, inputs at 16px or larger? (antipatterns, typography)

## Accessibility

25. Do icon-only controls have an accessible name, and do visual-only state
    changes (Copied, Saved) also reach a live region? (antipatterns)
26. Does text contrast stay at WCAG AA or better, and is the focus line
    clearly visible on every surface it lands on? (foundations)
