# States pass

Goal: the interface has an answer for every moment — loading, empty, error,
disabled, success — not just the happy path with data. Users judge quality in
exactly these in-between moments.

Audit method: for every view in scope, enumerate its states (initial load,
loaded, empty, partial, error, offline-ish/slow, and for mutations: submitting,
succeeded, failed). Anything unhandled is a punch-list item.

## 1. Loading

- **Under ~300ms, show nothing.** A spinner that flashes for 100ms reads as
  jank. Delay indicators: `animation-delay: 300ms` on the spinner with
  opacity starting at 0, or equivalent logic in JS.
- **Skeletons over spinners for content areas.** Skeletons must match the real
  layout's dimensions — same card height, same line widths (vary line widths
  60/90/75% so it reads as text, not bars). A skeleton that doesn't match the
  loaded layout causes the exact shift it exists to prevent.
- Skeleton styling: the muted surface color at low contrast, radius matching
  the real element, a slow pulse (`animation: pulse 2s ease-in-out infinite`)
  — never a fast blink. Honor reduced motion: static block is fine.
- **Buttons that submit**: keep width stable (don't let "Save" → spinner
  shrink the button — reserve space or swap label to spinner in place),
  disable while pending, keep the label visible when possible
  ("Saving…"). Re-enable on failure.
- Images: always reserve space (width/height or `aspect-ratio`) so nothing
  reflows on load. Optional nicety: fade the image in over ~300ms once loaded
  against the muted surface color.

## 2. Empty

An empty state is an onboarding surface, not an apology. Structure:

1. One-line statement of what would be here ("No projects yet").
2. One line of value or guidance ("Projects group your deployments and
   environments").
3. The primary action to fix it (a real button: "Create project") — when an
   action exists.

Keep it visually quiet: muted icon or small illustration at most, centered in
the space the content would occupy, `text-balance` on the copy. Never leave a
bare "No data" / "0 results" string, and never render an empty table header
row with nothing under it.

Search/filter empties are different from true empties: say what was searched
("No results for 'foo'") and offer a reset ("Clear filters").

## 3. Error

- Field-level validation errors: adjacent to the field (4–6px below), red
  text at readable size (not 10px), the field border shifts to the error
  color, and the message says how to fix it — "Password needs 8+ characters",
  not "Invalid input". Set `aria-invalid` and link the message with
  `aria-describedby`.
- Validate on blur or submit, not on every keystroke while the user is still
  typing their first attempt. Clear the error as soon as the fix is made.
- Mutation failures: keep the user's input, say what happened and what to do,
  offer retry. Never silently swallow a failed action — a button that does
  nothing on failure is the worst state in this file.
- Full-view errors get the empty-state structure: what broke, one line of
  context, a retry action.

## 4. Disabled

- Disabled is a last resort; prefer enabled-with-validation-message so the
  user learns *why*. When genuinely disabled: reduced opacity (~50%) +
  `cursor: not-allowed` on wrapper (disabled elements don't fire cursor),
  and never remove the element from tab order silently if a tooltip explains
  the why.
- Don't animate disabled elements' hover states — no hover response is part
  of the affordance.

## 5. Success & feedback

- Every action gets an acknowledgment within 100ms — even if it's just the
  pressed state. For mutations: optimistic UI where safe (toggle, like,
  rename), pending state where not (payment, delete).
- Toasts: enter with a small rise + fade (~200ms), auto-dismiss after
  4–6 seconds (longer if there's an action in the toast), dismissible, stack
  from one consistent corner. Success toasts are short ("Saved"); don't
  toast things the user can already see changed on screen.
- Inline confirmation beats a toast when the change is visible in place — a
  brief highlight (background tint fading out over ~1s) on the row that just
  changed is often better feedback than a corner notification.

## 6. Destructive actions

- Confirm before irreversible deletes — but make the dialog specific: name
  the thing being deleted, and make the confirming button say the verb
  ("Delete project", not "OK"). The destructive button gets the danger
  treatment; the safe action is the default focus.
- After delete, animate the removal (~200ms fade/collapse) so the list
  visibly changes rather than snapping.

## 7. Focus & keyboard (verify here even though foundations set it up)

- Every interactive element shows a visible `:focus-visible` state.
- Dialogs trap focus, return it to the trigger on close, close on Escape.
- No positive `tabindex` anywhere; tab order follows visual order.
