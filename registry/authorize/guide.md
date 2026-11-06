# Authorize

The page your MCP server shows when an agent asks to connect: the OAuth
consent step between "Connect" in the agent and a working connection. One
small centered card: the two apps' marks joined by a dotted line, a
heading that says who wants what, the account it will act as, the
permissions as a list between two hairlines, a full-width Allow with Cancel
under it, and where the browser goes back to. Nothing sits on the line
until there's a result: connecting draws it in solid with a small check on
it; a failure leaves it dotted with a small x.

The heading, account and buttons are centered; the list keeps a straight left
edge, because centered checkboxes don't line up.

## When to use it

- The authorization endpoint of an MCP server, or any OAuth provider that
  agents connect to.
- Any "App X wants access to your account" step where the person should
  read what they're granting before they agree.

## When not to

- Approving one action the agent is about to take ("Send this email?"). Use
  tool approval: that's one call, not a standing grant.
- Signing in. Show your sign-in first, then this, once you know who they are.
- Settings for apps already connected. List those with what they can do and a
  Disconnect button.

## States

`status` is controlled: your page owns the OAuth request.

| Status | Marks | Body | Buttons |
|---|---|---|---|
| `review` | A plain dotted line | Title, account, permissions, warning if unverified, return host | Allow, Cancel |
| `submitting` | A soft band passes along the dots toward the server | Same, permissions inert; once the button shows busy (300ms) they dim with it | Allow busy: "Connecting…" (a retry keeps "Try again" until then), Cancel disabled |
| `error` | The dots step back, a small danger disc with an x in the middle | Same, error under Cancel, so the buttons don't move | "Try again", Cancel |
| `connected` | The line draws in solid, a small ink disc with a check in the middle | "Connected to Acme", go back to the client | none |
| `denied` | The dots step back, nothing on the line | "Not connected", nothing was shared | none |

**Marks.** Each side is a 48px tile with a 14px corner, a hairline edge and
the raised shadow. Pass a logo as `mark` (an `<svg>` or `<img>`, drawn at
28px). Without one, the first letter of the name stands in on a soft tint:
the accent turned to a hue picked from the name, so the same app always gets
the same color, at the accent's own weight in light and dark.

**Permissions.** One list under "It will be able to". Write each as a verb
phrase a person would say: "See your bookings", "Change shopping lists",
"Issue refunds", not `bookings:read`. The verb does the grouping, so there
are no headings. Required scopes show the same box as the checkboxes, filled grey with a
check and no hover, so they read as on and fixed; optional ones are
checkboxes, ticked unless `defaultGranted: false`. Leave
anything that moves money or deletes things optional and off by default.
Add a `description` only when the phrase isn't enough.

**The button says what it does.** Untick every `access: "write"` scope and
Allow becomes "Allow read-only".

**Unverified clients.** MCP clients usually register themselves, so most
agents are ones your server has never seen. Unless you set `verified`, one
line in the warning color tells the person to allow it only if they started
this themselves. That and the return host (`returnTo`, the redirect URI's
host and port, shown exactly, `localhost` and port included) are what stop a
crafted link.

**Account.** Pass `account={{ email }}`. With `onSwitchAccount`, the
account is the compact select: the email, any `otherAccounts` signed in on
this browser, and "Use another account". Picking an email calls
`onSwitchAccount(email)`; "Use another account" calls it with nothing, so
you can send the person to sign in. Without the callback, the email is plain
text.

## Motion

One quiet change per state, on the glide and enter/exit curves; nothing
grows, bounces or swaps glyphs in place.

| What | Duration | Easing |
|---|---|---|
| Submitting: a soft band of the muted tone passes along the dots toward the server, the same window and pace as the button's busy sweep | `--ui-dur-sweep` (2400ms) a pass; the band fades in over `--ui-dur-base` | `linear`; fade `--ui-ease-color` |
| Connected: the solid line draws from the client to the server while the dots fade | `--ui-dur-glide` (320ms) | `--ui-ease-glide` |
| Connected: the check disc fades in once the line reaches the middle | `--ui-dur-base`, after `--ui-dur-glide` / 4 | `--ui-ease-enter` |
| Failed: the dots step back to half, the x disc fades in | dots `--ui-dur-instant`; disc `--ui-dur-fast` | `--ui-ease-color`; `--ui-ease-enter` |
| A result mark leaving (retry after a failure) | `--ui-dur-instant` | `--ui-ease-exit` |
| Error line: its room opens and the return line glides down with it; the text fades in | open `--ui-dur-glide`, close `--ui-dur-base`; text `--ui-dur-base` | `--ui-ease-glide`; `--ui-ease-enter` |
| Result replaces the form: it fades in at once while the card glides to its new height | `--ui-dur-base`; the card `--ui-dur-glide` | `--ui-ease-enter`; the card `--ui-ease-glide` |
| Allow label: "Allow" ↔ "Allow read-only", "Allow"/"Try again" → "Connecting…" | the button's text morph | |

Inside the form the card follows its content frame by frame (only the
error slot animates its own height), so nothing chases or clips.

Under `prefers-reduced-motion: reduce` there's no band (the dots simply take
the muted tone while submitting), the solid line fades in whole instead of
drawing, the check appears without a delay, and the result and error appear
without fading.

## Accessibility

- A `<section>` named by its heading. Use `headingLevel={1}` (the default)
  when it's the whole page, as it usually is.
- The marks are decorative; the heading names both sides.
- The permissions are a list named "It will be able to", so a screen reader
  hears "It will be able to, list, 5 items". The heading already says it, so
  the name isn't shown.
- "Connecting Copper to Acme" is announced while submitting, the error uses
  `role="alert"`, and on connected or cancelled focus moves to the result
  heading, since the buttons it came from are gone.
- The account select is named "Account"; on touch screens it opens the
  native picker.
- Required permissions say "(always included)" to screen readers.

## Before / after

Before: the scope names straight from the OAuth request, no idea who's asking
or where you'll be sent, and one button.

```tsx
<h1>Authorize application</h1>
<p>{clientId} is requesting: {scope.split(" ").join(", ")}</p>
<button onClick={approve}>Authorize</button>
```

After: who's asking, as whom, what it can do in plain words with the risky
ones off, and where the browser goes next.

```tsx
<Authorize
  client={{ name: registration.client_name, returnTo: new URL(redirectUri).host, verified: isFirstParty }}
  server={{ name: "Acme", mark: <AcmeLogo /> }}
  account={{ email: user.email }}
  onSwitchAccount={() => signOutAndReturn(request)}
  scopes={describeScopes(request.scope)}
  status={status}
  onAllow={async (granted) => {
    setStatus("submitting");
    try {
      redirectTo(await issueCode(request, granted));
      setStatus("connected");
    } catch {
      setStatus("error");
    }
  }}
  onDeny={() => {
    redirectTo(denied(request));
    setStatus("denied");
  }}
/>
```
