# Onboarding

The first run of an AI product, in four short steps: name the workspace and
say what it's for, connect the tools the agent may use, set what the agent
may do without asking, then watch it do its first real piece of work. A
done screen sums up what was set, and "Skip setup" is there from the
first screen.

The block holds the flow and every answer. Your server holds the
decisions: connecting a tool, saving a step and the agent's first task are
callbacks that return promises, and each has a designed failure. Every
change is handed to `onChange`, so a reload resumes where the person left
off.

```tsx
<Onboarding
  productName="Acme"
  agentName="Copper"
  brand={<AcmeLogo />}
  agentMark={<CopperMark />}
  useCases={[
    { value: "supper-club", label: "Supper club", description: "Regular dinners for a guest list" },
    { value: "pop-up", label: "Pop-ups", description: "One-off nights at a borrowed venue" },
  ]}
  tools={[
    {
      id: "calendar",
      name: "Google Calendar",
      brand: "googlecalendar",
      provider: "Google",
      description: "Checks your dates and holds the night",
      scopes: [
        { title: "See your events and free time", access: "read" },
        { title: "Add and move supper events", access: "write" },
      ],
    },
  ]}
  tones={[{ value: "warm", label: "Warm", sample: "Good question! There’s free parking on Alder Lane after 6." }]}
  permissions={[
    { id: "reminders", title: "Send reminders to confirmed guests", description: "The day before, with the address.", defaultOn: true },
    { id: "holds", title: "Hold dates on your calendar", description: "Adds a tentative event.", requires: "calendar" },
  ]}
  firstTask={{ title: "Invite for Saturday supper", detail: "Sat, Nov 15 · 7:30 pm · 12 seats" }}
  initialStep={saved?.step}
  initialValues={saved?.values}
  onChange={(values, step) => saveDraft({ values, step })}
  onSaveStep={async (step, values) => {
    const res = await fetch(`/api/onboarding/${step}`, { method: "PUT", body: JSON.stringify(values) });
    if (res.status === 409) return "That workspace name is taken. Try another.";
    if (!res.ok) return "Couldn’t save. Check your connection and press Continue again.";
  }}
  onConnect={async (toolId) => {
    const result = await openOAuthPopup(`/api/connect/${toolId}`); // resolves when the popup closes
    if (result.closed) return { ok: false, reason: "cancelled" };
    return result.ok ? { ok: true, account: result.email } : { ok: false, message: result.error };
  }}
  onDisconnect={(toolId) => fetch(`/api/connect/${toolId}`, { method: "DELETE" })}
  onFirstTask={async ({ values, write, signal }) => {
    const res = await fetch("/api/agent/first-invite", { method: "POST", body: JSON.stringify(values), signal });
    if (!res.ok) throw new Error("Copper couldn’t reach your workspace.");
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
    for (let r = await reader.read(); !r.done; r = await reader.read()) write(r.value);
  }}
  onComplete={(values, how) => router.replace(how === "skipped" ? "/" : "/drafts")}
  fullPage
/>
```

## When to use it

- The first screen after sign-up in a product with an agent: the person
  sets it up once, and should see it do something useful before they leave.
- Resuming a setup someone left halfway, from what `onChange` saved.

## When not to

- Settings people come back to. The agent's defaults live on a settings
  page afterwards; use [agent settings](../agent-settings/guide.md) there.
- A product tour or tooltips over the real UI. This is a setup flow, not a
  walkthrough.
- Managing connections later. Use [connections](../connections/guide.md).

## Steps

| Step | What the person does | Can be skipped |
|---|---|---|
| About you | Workspace name (required), team size (segmented control), what they use it for (cards, required) | No, but "Skip setup" leaves the whole flow |
| Tools | Connect each tool: Connect opens a consent showing the agent's mark, the service's mark and each scope (read only or can change), then "Continue to Google" | Yes, "Skip" until one is connected |
| The agent | Voice, with a sample reply that changes with it; switches for what it may do without asking. A switch that needs a tool stays off and says "Needs Stripe. Connect Stripe" | Continue with the defaults |
| First task | Nothing: the agent starts as the step opens and writes into the card. Then Copy, or "Write another" | Yes, "Skip" until the draft is ready |
| Done | Reads the summary; "Open Acme" calls `onComplete` | |

Steps behind the current one are buttons in the step track, so the person
can go back to any of them. Answers stay as they were.

## States

| State | What you see | How |
|---|---|---|
| Fresh start | Step 1, empty, with "Just me" and the first voice chosen | `initialStep` left out |
| Name or use case missing | Continue shows both errors under their fields at once and focuses the first | Checked locally |
| Saving a step | Continue keeps its width; after 300ms its label shimmers to "Saving…" | `onSaveStep` pending |
| Couldn't save | A danger line at the foot of the step, with your message; the step stays, answers kept | `onSaveStep` resolves a string, or throws |
| Consent open | The row opens into the consent; the row's button becomes "Cancel"; focus moves to "Continue to Google" | Connect |
| Connecting | Dots travel from the agent toward the service in the accent; the button shimmers "Waiting for Google…" | `onConnect` pending |
| Slow connect | After `slowAfter` (8s), the note turns warning: "Still waiting on Google. Finish signing in in the window it opened, or cancel and try again." | |
| Connect failed | The node turns to an x, the far side fades, the message in danger; the button becomes "Try again" | `{ ok: false }` or a rejection |
| Popup closed | Back to the consent, no message | `{ ok: false, reason: "cancelled" }` |
| Connected | The line draws in solid green, the node takes a check, "Connected as mara@…"; the consent folds a second later and focus goes to the row | `{ ok: true, account }` |
| Draft writing | "Writing" with a turning glyph, a band running under the card's head, the text arriving with a caret. "Reading your answers…" if the first words take over 300ms | `onFirstTask` pending |
| Draft failed | What's written stays; the reason in danger with "Try again" | `onFirstTask` rejects |
| Draft ready | "Draft ready" in success; "Saved to Drafts. Nothing has been sent." with Copy and "Write another" | `onFirstTask` resolves |
| Skip setup | "Setup skipped", a summary of the defaults, "Back to setup" (to the step it was pressed on) and "Open Acme" | "Skip setup" |
| Done | Every segment turns success one after another, a check draws in, the summary rows arrive in reading order | Finish |
| Resume | Opens on the step with the answers in place; a saved draft shows as ready, not rewritten | `initialStep` + `initialValues` |
| Phone (under 480px wide) | A full-screen sheet: no corners or edge, the footer held at the bottom with the main action across the rest of the width | Container query |

Leaving the first-task step, skipping or pressing "Write another" aborts
the run through `signal`; a half-written draft is dropped.

## Props

| Prop | What it does |
|---|---|
| `productName`, `agentName` | Required. Used in the copy: "Open Acme", "Copper will be able to" |
| `brand` | Logo or wordmark, top left |
| `agentMark` | The agent's mark on its accent tile (18px). Without one, its first letter |
| `teamSizes` | `{ value, label }[]` for the segmented control. Default Just me, 2–5, 6–20, 21+ |
| `useCases` | `{ value, label, description? }[]` as cards. One is required |
| `tools` | `{ id, name, brand?, mark?, description, provider?, scopes }[]`. `brand` is a [brand mark](../brand-marks/guide.md) name; `provider` is who they sign in with ("Google" for Gmail) |
| `tones` | `{ value, label, sample }[]`. The sample is the agent answering a guest in that voice |
| `permissions` | `{ id, title, description, defaultOn?, requires? }[]`. `requires` is a tool id |
| `firstTask` | `{ title, detail? }`: what the agent makes on the last step |
| `onConnect(toolId)` | Required. `Promise<OnboardingConnectResult>` |
| `onDisconnect(toolId)` | Called when the person disconnects a tool on the tools step |
| `onFirstTask({ values, write, signal })` | Required. Call `write(chunk)` as text arrives; reject to fail. Pass `signal` on to your fetch |
| `onSaveStep(step, values)` | Runs on Continue and Skip. Resolve a message to stay on the step and show it |
| `onChange(values, step)` | Every change. Save it to resume |
| `onComplete(values, how)` | The last button. `how` is `"finished"` or `"skipped"` |
| `initialStep` | `"about"`, `"tools"`, `"agent"`, `"first-task"` or `"done"` |
| `initialValues` | `Partial<OnboardingValues>`, usually your last `onChange` |
| `slowAfter` | Milliseconds before a connection says it's slow. Default 8000 |
| `fullPage` | Fills the viewport's height on the canvas color, with safe-area padding |
| `headingLevel` | 1 (default), 2 or 3 |

`OnboardingValues` is `{ name, teamSize, useCase, connected, tone,
permissions, draft }`; `connected` maps a tool id to the account it
connected as. All types are exported.

## Customizing

- **Steps.** The four steps are fixed in `onboarding.tsx` (`STEPS`) and
  drawn in `steps.tsx`. To drop one, take it out of `STEPS` and the step
  track follows; to add one, add a view in `steps.tsx` and a label.
- **Copy.** Headings and lines live in `steps.tsx`. Keep each failure
  saying what to do next.
- **The first task.** Make it the thing your agent is best at, using what
  the person just told you, and keep it safe: a draft, not a send.
- **Width.** `--onboarding-width` on the block (560px by default). The
  panel's corner follows `--corner`, so footer buttons stay concentric.
- **Sheet height.** `--onboarding-sheet-height` (default `100dvh`) when the
  block is narrow but not the whole screen.

## Layout

The panel's padding is `--ui-pad-section`: 24 to 40 as the onboarding
widens. On a phone (the onboarding under 480px) it drops to 16, so a 320px screen keeps its width for the step. The step labels wrap
between words, never inside one.

## Accessibility

- Each step's heading takes focus when the step changes, so a screen reader
  hears where it is; the step track is a list with `aria-current="step"`
  and "Step 2 of 4, done:" read before each label.
- Steps behind you are buttons; steps ahead aren't focusable.
- Errors are tied to their fields (`aria-invalid`, `aria-describedby`), and
  Continue focuses the first one.
- Connect and Cancel are named for the tool ("Connect Gmail") and point at
  the consent with `aria-expanded`/`aria-controls`. Connecting, connected
  and failed are announced in a polite live region. When a button goes
  away, focus moves to the next thing to do, never to the page.
- The draft card is `aria-busy` while it writes; "Copied" is announced.
- The leaving step is a copy, `inert` and `aria-hidden`, so nothing in it
  can be reached while it slides out.
- Reduced motion: steps fade instead of sliding, the dots and the band
  breathe instead of travelling, and the check is drawn at once.

## Before / after

Before: a wizard of five forms with a "Next" button, a row of OAuth
buttons that open popups with no word about what's being granted, a
spinner while the popup is open, and a final screen that says "You're all
set!" with nothing to show for it.

After: four steps whose height glides between them. Each tool says what
the agent will read and what it can change before the person leaves for
Google, and says so plainly when Google is slow or fails. The agent's
voice comes with a sample, its permissions say what they mean, and the
last step shows the agent writing a real invite from the person's own
answers, saved as a draft and never sent.
