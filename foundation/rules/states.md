# States

Goal: the interface has an answer for every moment — loading, empty, error,
disabled, success — not just the happy path with data. Users judge quality in
exactly these in-between moments.

Method: for every view, list its states (initial load, loaded, empty,
partial, error, slow, and for mutations: submitting, succeeded, failed).
Anything unhandled is a defect.

## 1. Loading

- **Under ~300ms, show nothing.** An indicator that flashes for 100ms reads
  as jank. Delay indicators: a 300ms delay on the indicator with opacity
  starting at 0, or equivalent logic in JS. Once it shows, keep it at least
  400ms, so it doesn't flicker off either. The work itself starts at once:
  only the showing waits. "Saving…" labels follow the same timing.
- **Avoid spinners.** Prefer a shimmer on the label that names the work (the
  text dims and a light band passes across it, a moving `mask-image`
  gradient). A spinner is a last resort for
  a tiny indeterminate wait with no label at all. A small icon that has to
  say "working" breathes in place. The one turning glyph allowed is a
  12–16px arc in the icon slot of a step that's running, in a list of steps
  whose words name the work; it holds still when paused and breathes with
  reduced motion.
- **Skeletons only for a known layout on page open.** Grey bars advertise
  slowness before anything is slow, so they wait behind the same 300ms delay
  as any busy state, and only where the loaded layout is known: one element
  per bone, sized to the line it stands for, and one viewport-fixed sheen
  shared by every bone, never a shimmer per element. Anywhere else, hold the
  space the result will take (a fixed slot or `min-height` matching the
  loaded layout) and put one shimmering line in it that names the work
  ("Loading messages…"), so nothing shifts when it lands and the wait reads
  as progress. Reduced motion: still.
- **Buttons that submit**: keep the label and its width; shimmer the label
  while pending instead of swapping it for a spinner. Ignore presses while
  pending (busy, not disabled, so focus stays). Re-enable on failure.
- Images: always reserve space (width/height or `aspect-ratio`) so nothing
  reflows on load. Optional nicety: fade the image in over `--ui-dur-fast` once loaded
  against the muted surface color.

## 2. Empty

An empty state is an onboarding surface, not an apology. Structure:

1. One-line statement of what would be here ("No projects yet").
2. One line of value or guidance ("Projects group your deployments and
   environments").
3. The primary action to fix it (a real button: "Create project") — when an
   action exists.

Keep it visually quiet: one illustration or none, centered in the space the
content would occupy, `text-balance` on the copy. Never an icon sitting in a
rounded square or circle; that reads as an app icon, not as empty space.
Illustrations are clean isometric line drawings on a 2:1 grid (slopes stay
crisp) that clearly show their subject, one stroke weight across the set
(the icon set's medium) with round caps and mitered joins. Corners are
crisp: at most about a pixel of easing, never rounded off; only what is
round in life is round (a lens, a cord, a binder ring, a slot). Parts that
touch in life touch exactly: a hinge is a shared edge, a handle starts on
its rim, a stacked card lies on the one below. Text on a drawn card is
filled bars, not lines. Faces are opaque, in two tones at most: the surface and
one soft fill of the text color mixed into it, all from tokens so they read
in light and dark. Few lines, and large enough to be the focal point: about
200px in a panel, 260px on a page. Never leave a
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
  `cursor: default` on the wrapper (disabled elements don't fire cursor),
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
