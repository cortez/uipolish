# Sign in

The screen a SaaS or AI product puts in front of everyone who isn't signed
in yet. Work email first, then a one-time code (with a resend countdown
and "Use a different email"), plus any OAuth providers and a "Continue
with SSO" path that asks for the work domain. `mode="sign-up"` changes the
wording; the flow stays the same, because with codes there's no difference
between the two until your server says so.

The block holds the flow. Your server holds the decisions: each callback
returns a promise of a result, and every failure has its own screen.

```tsx
<SignIn
  productName="Acme"
  brand={<AcmeLogo />}
  legal={<>By continuing, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</>}
  mode={mode}
  onModeChange={(next) => router.push(next === "sign-up" ? "/signup" : "/login")}
  onSendCode={async (email) => {
    const res = await fetch("/api/auth/code", { method: "POST", body: JSON.stringify({ email }) });
    if (res.status === 403) return { ok: false, reason: "not-allowed", message: (await res.json()).message };
    if (res.status === 429) return { ok: false, reason: "rate-limited", retryIn: Number(res.headers.get("Retry-After")) };
    if (!res.ok) return { ok: false, reason: "error" };
    return { ok: true, expiresIn: 600, resendIn: 30 };
  }}
  onVerify={async (email, code) => {
    const res = await fetch("/api/auth/verify", { method: "POST", body: JSON.stringify({ email, code }) });
    if (res.ok) return { ok: true };
    const body = await res.json(); // { reason: "wrong-code", attemptsLeft: 3 } and so on
    return { ok: false, ...body };
  }}
  providers={[{ id: "google", name: "Google" }, { id: "github", name: "GitHub" }]}
  onProvider={async (id) => {
    window.location.assign(`/api/auth/oauth/${id}`);
    return new Promise(() => {}); // a redirect never comes back: the button stays busy
  }}
  onSso={async (domain) => {
    const res = await fetch(`/api/auth/sso?domain=${encodeURIComponent(domain)}`);
    if (res.status === 404) return { ok: false, reason: "not-found" };
    if (!res.ok) return { ok: false, reason: "error" };
    window.location.assign((await res.json()).url);
    return new Promise(() => {});
  }}
  onSuccess={() => router.replace(next ?? "/")}
  fullPage
  autoFocus
/>
```

## When to use it

- A product that signs people in with an emailed code, alone or alongside
  OAuth and SAML/OIDC SSO.
- Both the sign-in and sign-up pages, from one component.

## When not to

- Password sign-in. Use text fields in a form. The code step here is the
  whole point.
- A second factor after a password. Use [code input](../code-input/guide.md)
  on its own, in your existing flow.
- Re-confirming a signed-in person before a risky action. That's a dialog.

## Results, not exceptions

Each callback resolves with `{ ok: true, … }` or `{ ok: false, reason, … }`.
A thrown error or rejected promise counts as `reason: "error"`, so a dropped
connection still gets a message and a way to retry. Answers that arrive after
the person has moved on (pressed "Use a different email", say) are dropped.

| Callback | `reason` | What the person sees |
|---|---|---|
| `onSendCode` | `not-allowed` | Warning under the button: the address can't sign in or up here. Pass `message` to say why ("Personal addresses can't join. Use your work email.") |
| | `rate-limited` + `retryIn` | Warning with a live countdown; the button is disabled until it ends, then the warning goes |
| | `error` | Error under the button; the email is kept, press again to retry |
| `onVerify` | `wrong-code` + `attemptsLeft` | The boxes clear and take focus; "That code didn't match. 2 tries left." `attemptsLeft: 0` asks for a new code |
| | `expired` | "This code has expired." The main button becomes "Send a new code" |
| | `rate-limited` + `retryIn` | Boxes disabled; the main button counts down to "Send a new code" |
| | `error` | The message, or a default; the code is cleared to type again |
| `onProvider` | `cancelled` | Nothing: the person closed the popup themselves |
| | `not-allowed`, `error` | A message under the provider buttons, next to the one pressed |
| `onSso` | `not-found` | Field error: the domain hasn't set up SSO, with a way back |
| | `error` | Field error with the message |

A code also expires on its own clock: once `expiresIn` passes, the code step
switches to "Send a new code" without asking the server.

## States

| State | What you see | How |
|---|---|---|
| Idle | Heading, work email field, "Continue with email", then "or" and the providers | |
| Invalid email | Field error on submit, not while typing: "Enter a full email, like name@company.com." | Checked locally |
| Sending code | Button keeps its width; after 300ms its label shimmers to "Sending code…" | `onSendCode` pending |
| Code sent | "Check your email", the address, six boxes with focus in the first, "Resend in 0:24" counting down | `ok: true` |
| Verifying | Fires on the last digit (or the button); "Checking code…"; further typing is ignored | `onVerify` pending |
| Wrong code | Danger edges, attempts left, boxes cleared, focus back in the first | `wrong-code` |
| Code expired | Error line; main button "Send a new code" | `expired`, or the clock |
| Too many tries | Boxes disabled; "Send a new code in 4:47" | `rate-limited` from `onVerify` |
| Too many codes | Warning with a countdown; send disabled until it ends | `rate-limited` from `onSendCode` |
| Not allowed | Warning naming the address and what to do | `not-allowed` |
| Provider busy / failed | "Opening GitHub…" on that button; a failure shows under the providers | `onProvider` |
| SSO | Asks for "Work email or domain", prefilled from the email if one was typed; accepts `mara@acme.com`, `acme.com` or a URL | `onSso` |
| Success | Check, "You're signed in" (or "Your account is ready"), the address, a shimmering "Opening Acme…". `onSuccess` fires once, after it paints | `ok: true` anywhere |

Busy is not disabled: the pressed button keeps focus and ignores more
presses, and the rest of the form ignores them too while anything is in
flight.

## Props

| Prop | What it does |
|---|---|
| `productName` | Required. Used in the copy: "Sign in to Acme", "Opening Acme…" |
| `mode` | `"sign-in"` (default) or `"sign-up"`. Wording only |
| `onSendCode(email)` | Required. `Promise<SendCodeResult>`. `ok: true` takes `expiresIn` (default 600s) and `resendIn` (default 30s) |
| `onVerify(email, code)` | Required. `Promise<VerifyResult>`. Resolve `ok: true` once the session exists |
| `providers` | `{ id, name, mark? }[]`, shown as "Continue with {name}" in order. Without `mark`, a neutral letter tile. `provider-marks.tsx` has `GoogleMark`, `GitHubMark` and `MicrosoftMark` |
| `lastUsed` | `"email"`, `"sso"` or a provider id: a muted line under that option's group says "You last signed in with Google." (or "with email", "with SSO"), and the button points at it with `aria-describedby`. Every button keeps its size and label position. An id that isn't shown is ignored. Read it from your own cookie or local storage; the block never stores anything |
| `onProvider(id)` | `Promise<ProviderResult>`. Needed for providers to show. Leave it pending for a redirect; resolve for a popup |
| `onSso(domain)` | `Promise<SsoResult>`. Its presence shows "Continue with SSO". Gets a bare lower-case domain |
| `onSuccess(success)` | `{ method: "code", email }`, `{ method: "provider", provider, email? }` or `{ method: "sso", domain }`. Navigate here |
| `onModeChange(mode)` | Shows "New to Acme? Create an account" (or "Already have an account? Sign in") |
| `brand` | Logo or wordmark, centered at the top |
| `legal` | Terms and privacy line at the foot. Links inside are styled |
| `codeLength` | Digits in the code, default 6 |
| `initialState` | Open on a given step: `{ step: "code", email }` after a reload, or any failure for a story or test |
| `autoFocus` | Focus the first field on mount. Later steps always move focus |
| `fullPage` | Fills the viewport's height on the canvas color, with safe-area padding |
| `headingLevel` | 1 (default), 2 or 3 |

All result types (`SendCodeResult`, `VerifyResult`, `ProviderResult`,
`SsoResult`, `SignInSuccess`, `SignInProvider`, `SignInInitialState`) are
exported.

## Customizing

- **Copy.** The strings live in `sign-in.tsx`; change them in place. Keep
  each failure saying what to do next.
- **Real provider logos.** Pass `mark` (an `<svg>` or `<img>`, drawn at
  16px in a 20px tile) once you're allowed to use the brand's mark. The
  default letter tile needs no license.
- **Server messages.** `not-allowed` and `error` take a `message`; it
  replaces the default body, so your domain policy can speak for itself.
- **Width.** `--sign-in-width` on the block (400px by default).
- **Phone.** Below a 480px-wide container the card drops its surface and
  sits on the page, so the screen is the page.
- **Magic links.** If your email also carries a link, open the page on
  `initialState={{ step: "done", success }}` after the link's own check, or
  just navigate.

## Accessibility

- One `<section>` labelled by the step's heading. When the step changes,
  focus moves into its first field (or to the heading on success), so a
  screen reader lands where the work is.
- The email field is `type="email"`, `autocomplete="email"`; the code boxes
  carry `autocomplete="one-time-code"`, so phones offer the code from the
  message.
- Field and code errors are tied to their inputs with `aria-describedby`
  and read out politely. Alerts that arrive answer a press, so they open
  their height under the button rather than shifting anything above it.
- Countdowns tick for the eye only. Screen readers hear the wait once
  ("about 5 minutes"), not every second; numbers are tabular so nothing
  shifts.
- A status region says "We sent a 6-digit code to …" and "Signed in."
- Every action is a real button or form submit; Enter works on each step.

## Before / after

Before: an email field and a "Send magic link" button. A second press
sends three emails, a typo'd address waits forever, a blocked domain says
"Something went wrong", and a wrong code just shakes.

After:

```tsx
<SignIn productName="Acme" onSendCode={sendCode} onVerify={verify} onSuccess={go} />
```

Each of those cases has a screen that names what happened and the next
step, with the right countdown when the answer is "wait".
