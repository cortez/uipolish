# Settings

The settings screen of a workspace in an AI product, in four sections:
General (name, URL, logo, time zone, language, deleting the workspace), API
keys, Models and limits (default model, a model per feature, a monthly spend
limit with an alert, rate limits and what's been spent), and Notifications
(a switch per event and channel, and a test send). A column of sections sits
beside the panel; on a phone it's a row of tabs above it.

Fields in General and Models and limits are a draft. Changing one raises a
save bar at the bottom of the screen with Discard and Save, marks the
section's tab with a dot, and guards leaving. Logo, keys and notification
switches act at once, each in its own place. It takes data and
promise-returning callbacks, and fetches nothing.

```tsx
<Settings
  settings={settings}               // the saved values
  onSave={(patch) => api.patch("/workspace", patch)}
  timezones={timezones}
  locales={locales}
  urlPrefix="app.acme.ai/"
  apiKeys={keys}
  scopes={scopes}
  onCreateKey={(input) => api.post("/keys", input)} // resolves { key, secret }
  onRevokeKey={(id) => api.delete(`/keys/${id}`)}
  models={models}
  features={features}
  usage={{ spent: 1184.6, segments }}
  plan={{ maxRequestsPerMinute: 1000 }}
  notifications={{ events, channels, value, onChange, onTest }}
  canEdit={role !== "viewer"}
/>
```

## When to use it

- The workspace or team settings of a SaaS product with AI in it: an
  assistant, an agent platform, an API product with a dashboard.
- As a starting point you cut down: `sections={["general", "api-keys"]}`
  keeps two.

## When not to

- Settings for one agent (its tools, its memory, what it may do without
  asking). Use Agent settings, where every change saves in its row.
- Personal preferences (theme, your own email). They belong in an account
  menu or a profile page.
- Billing and members. Use Billing and Team members beside it.

## Sections

| Section | What's in it | Saves |
|---|---|---|
| General | Logo (upload, replace, remove), workspace name, URL with its full address under it, time zone and language selects, Delete workspace | Logo at once; the rest with the save bar |
| API keys | Each key: name, masked secret (`sk-…4f2a`), who made it and when, last used, expiry, scopes as badges, Revoke. Create key. Keys expired or unused for `staleDays` (90) carry a badge and their date in the warning color, and a line above the list counts them | At once |
| Models and limits | Default model and one model picker per feature ("Default" follows the default). Monthly limit, an "Email admins at" slider from 50% to 100% in steps of 5, then the month's spend against the limit (the usage meter's breakdown, which follows the draft limit and threshold as you change them). Requests and tokens per minute, with the busiest minute and the plan's ceiling under each | With the save bar |
| Notifications | Each channel with where it goes and Send test; then a table of events × channels, a switch in each cell | Each switch at once |

**Creating a key** opens a dialog: a name (required, unique), scopes as
checkboxes (at least one) and when it expires (30 days, 90 days, a year,
never), with the date it lands on under the select. Create key calls
`onCreateKey({ name, scopes, expiresInDays })`; while it runs the button
shimmers "Creating…". When it resolves with `{ key, secret }` the dialog
turns to the secret: a warning "You won't see this key again", the full
secret in a copy field and Done. Closing before copying asks "Close without
copying the key?" with Go back and Close anyway. Add the key to `apiKeys`
before you resolve; it lands at the top of the list behind the dialog.

**Revoking** asks first ("Revoke Staging worker? Requests that use sk-…e3a9
start failing straight away…") with Cancel focused and a danger Revoke key.
The confirm stays open and busy until `onRevokeKey` resolves; a rejection
shows its message in the dialog. Remove the key from `apiKeys`; focus moves
to the next key's Revoke, the one before, or Create key.

**Deleting the workspace** opens a dialog that asks for the workspace's name
typed exactly. A mismatch says so under the field rather than disabling the
button. While `onDeleteWorkspace` runs the dialog is locked and the button
reads "Deleting…"; a rejection shows its message beside the buttons.

**The logo** checks the file before it calls `onLogoUpload(file)`: PNG,
JPG, SVG or WebP, under 1 MB, and says what's wrong in the line under
"Logo". Without a logo the tile shows the workspace's initials.

## The save bar

| State | Bar says | Buttons |
|---|---|---|
| Nothing changed | hidden (its space is kept, so nothing moves when it shows) | |
| Changed | "Unsaved change to the spend limit", or "3 unsaved changes", and the ⌘S / Ctrl+S keys (not on touch) | Discard, Save |
| Some field is invalid, after Save | "Fix the workspace name and URL before saving." in the danger color; focus moves to the first bad field, switching section if needed | Discard, Save |
| Saving | "Saving 2 changes…" | Discard disabled, Save shimmers "Saving…" |
| Failed | The rejection's message, in the danger color | Discard, Try again |
| Saved | A check and "Changes saved", for 2 seconds, then it leaves | |

**Optimistic.** Save treats the draft as saved at once: the tab dots clear
and anything that reads the saved values (the lede, sentences with the
workspace's name) moves to the new ones. If `onSave` rejects, the saved
values roll back, the draft stays exactly as typed, and the bar shows the
message. Reject with `SettingsError` to put messages under fields:

```tsx
import { SettingsError } from "./settings";

onSave={async (patch) => {
  const res = await fetch("/api/workspace", { method: "PATCH", body: JSON.stringify(patch) });
  if (res.status === 409) {
    throw new SettingsError("That URL is taken. Pick another one, then save.", {
      slug: "app.acme.ai/halden belongs to another workspace. Try halden-hq",
    });
  }
  if (!res.ok) throw new Error("Acme didn’t answer in time, so nothing was saved.");
}}
```

A field error from the server clears as soon as that field changes. The
screen switches to the section of the first field with an error and focuses
it.

`onSave` gets only what changed: `{ name: "Halden Robotics Ltd",
requestsPerMinute: 800 }`. `overrides` comes whole when any feature's model
changed. Update `settings` when it resolves, or don't: the screen keeps
what it saved. New `settings` from outside (another tab, a refetch) replace
every value the person hasn't changed and leave their edits alone.

## Validation

Fields check themselves on blur, and all of them on Save. An error clears on
the keystroke that fixes it.

| Field | Rule | Message |
|---|---|---|
| Workspace name | Required, 48 characters at most | "Give the workspace a name", "Keep it to 48 characters; this is 52" |
| URL | 3 to 32 lowercase letters, numbers and single hyphens, starting and ending with a letter or number. Spaces type as hyphens | "Use lowercase letters, numbers and hyphens, starting and ending with a letter or number" |
| Monthly limit | 1 to `plan.maxSpendLimit`; the number input pulls typing into range and says so. At or under what's spent, the line warns that runs pause as soon as it's saved | |
| Rate limits | 1 to the plan's ceiling, the same way | |

## Leaving with unsaved changes

- `beforeunload` asks before a reload or a closed tab while anything is
  unsaved.
- `onDirtyChange(dirty)` tells you when changes appear and go, for your
  router's own guard.
- `ref.current.confirmLeave()` resolves `true` at once when nothing is
  unsaved. Otherwise it asks "Leave without saving?", naming what changed,
  with Keep editing (focused) and Discard changes, and resolves with the
  answer. Call it before you navigate:

```tsx
const settings = useRef<SettingsHandle>(null);

async function back() {
  if (await settings.current?.confirmLeave()) router.push("/runs");
}
```

## Permission and loading

- `canEdit={false}`: an info alert above the panel, "You can see these
  settings, but not change them", with `permissionNote` under it (say who
  can). Text fields are read-only (their values can still be selected and
  copied), selects, pickers, numbers, the slider and switches are disabled,
  and Create key, Revoke, Delete workspace, the logo's buttons, Send test
  and the save bar aren't rendered.
- `loading`: after 300ms a skeleton of the panel stands in, one bone per
  line it will hold, inside a 480px space so the panel doesn't jump when it
  lands. The title and the section column stay usable.

## Props

| Prop | What it does |
|---|---|
| `settings` | `WorkspaceSettings`: `{ name, slug, timezone, locale, defaultModel, overrides, spendLimit, alertAt, requestsPerMinute, tokensPerMinute }` |
| `onSave` | `(patch) => Promise`. Leave it out and the save bar never shows |
| `canEdit`, `permissionNote` | Default `true` |
| `loading` | First load |
| `product` | Your product's name, used in sentences ("call the Acme API"). Default "Acme" |
| `title`, `description` | Default "Settings" and a line naming the workspace |
| `urlPrefix` | Shown before the slug: "app.acme.ai/" |
| `timezones`, `locales` | `SelectOption[]` |
| `logoUrl`, `onLogoUpload`, `onLogoRemove` | Leave the callbacks out to show the logo without buttons |
| `onDeleteWorkspace`, `deleteNote` | Shows Delete workspace; the note replaces the line about what goes with it |
| `apiKeys`, `scopes` | `ApiKey[]` (`{ id, name, last4, scopes, createdAt, createdBy, lastUsedAt, expiresAt? }`), `{ value, label, description? }[]` |
| `onCreateKey`, `onRevokeKey`, `staleDays` | See above. `staleDays` default 90 |
| `models`, `features` | `ModelOption[]` as the model picker takes them; `{ id, label, description? }[]` |
| `usage` | `{ spent, segments?, period?, peakRequestsPerMinute?, peakTokensPerMinute? }` |
| `plan` | `{ maxSpendLimit?, maxRequestsPerMinute?, maxTokensPerMinute? }` |
| `currency`, `numberLocale` | Default `"USD"`, `"en-US"` |
| `notifications` | `{ events, channels, value, onChange?, onTest? }`. `value` is `{ [event]: { [channel]: boolean } }`. Leave it out to drop the section |
| `sections` | Which sections, in order. Default all four |
| `section`, `defaultSection`, `onSectionChange` | Control the section, for example from your router |
| `onDirtyChange`, `ref` | See "Leaving" |
| `now` | The clock for "3 hours ago" and stale keys. Defaults to when the screen mounted |

**Notification switches** move the moment they're pressed and call
`onChange(event, channel, on)`. While it runs the switch is busy (presses
ignored, focus kept). If it rejects, the switch moves back and the message
appears under that event, across the table: "Couldn’t turn on Slack for “Key
expiring”. It’s still off; try again." or your own. **Send test** calls
`onTest(channel)` and shimmers "Sending…"; success is a toast ("Test sent
to #ops-alerts"), since what it confirms happens somewhere else; a failure
replaces the channel's address with the message. Render `<Toaster />` once
in your app.

## Layout

| Width of the screen | Sections | Rows |
|---|---|---|
| 480px and up | A column at least 160px wide, 32px from the panel, sticky at `--settings-top` (24px) | Label and line on the left, control on the right |
| Under 480px | A row of tabs above the panel; it scrolls sideways with a faded edge when it overflows | As above while the panel is over 460px |
| Panel 460px and under | | The control drops under its text; time zone and language stack; a key's Revoke goes under it |
| Screen 560px and under | | The save bar puts its words above the buttons, which share the row in halves |

Spacing reads the shared roles: `--ui-gap-block` under the title and between
a panel's heading and its groups (16 to 32 as the screen widens),
`--ui-gap-group` between fields and `--ui-gap-stack` inside a group.

All of these are container queries on the screen, so it lays out the same in
a page, a panel or a dialog.

Edges: the key list is the one box on a panel, a hairline ring
(`inset 0 0 0 var(--ui-hairline) var(--ui-border-strong)`), with rows split by
inset lines in `--ui-border`. Rows elsewhere and the notification table use
inset single-side lines in `--ui-border`. No borders anywhere. The save bar
floats on `--ui-shadow-floating`, which is the edge alone in dark mode. Its
corner is its 40px buttons' radius plus its 8px inset.

Rows hold one control height each: model pickers 32, numbers 40, the logo's
and keys' buttons 32, save bar buttons 40.

## Motion

| What | Duration | Easing |
|---|---|---|
| Save bar arrives: fade and a 4px rise | `--ui-dur-base` | `--ui-ease-enter` |
| Save bar leaves | `--ui-dur-fast` | `--ui-ease-exit` |
| A tab's unsaved dot appears: fade, scale from 0.5 | `--ui-dur-fast`, `--ui-dur-snap` | `--ui-ease-enter`, `--ui-ease-snap` |
| The dot goes | `--ui-dur-instant` | `--ui-ease-exit` |
| A line turning warning or danger | `--ui-dur-instant` | `--ui-ease-color` |
| A notification failure arrives: fade, 2px rise | `--ui-dur-fast` | `--ui-ease-enter` |
| Tabs, dialogs, switches, buttons, the usage breakdown | as each component's guide says | |

Under `prefers-reduced-motion: reduce` the bar and the failure only fade.

## Accessibility

- One `h1` (the title), an `h2` per section, an `h3` per group. Each panel is
  named by its heading. The section tabs are Base UI tabs: arrow keys move
  between them, and a tab with unsaved changes reads ", unsaved changes".
- Every control has a name: the model pickers read "Model for Chat: Default",
  the number fields carry their row's label, each switch reads "Slack: Key
  expiring", each Revoke "Revoke Staging worker".
- ⌘S or Ctrl+S saves from anywhere while something is unsaved.
- A polite status region says each save ("Saved 2 changes."), each failure,
  a discard, a created or revoked key, and each notification change.
- Dialogs trap focus and give it back: the safe button is focused in
  confirms, the name field in Create key; after a revoke focus goes to the
  next key.
- Field errors are linked with `aria-describedby` and set `aria-invalid`.

## Before / after

Before: one form per section with its own Save, keys shown in full in a
table, and a delete button with a `confirm()`.

```tsx
<form onSubmit={saveGeneral}>
  <input name="name" defaultValue={ws.name} />
  <button>Save</button>
</form>
<table>{keys.map((k) => <tr key={k.id}><td>{k.secret}</td><td><button onClick={() => revoke(k.id)}>×</button></td></tr>)}</table>
<button onClick={() => confirm("Are you sure?") && deleteWorkspace()}>Delete</button>
```

After: one draft across sections with one save bar that says what's
unsaved and survives failures; keys that are only ever shown masked, with
the secret once at creation; a typed confirmation for the one action that
can't be undone.

```tsx
<Settings
  settings={ws}
  onSave={(patch) => api.patch("/workspace", patch)}
  apiKeys={keys}
  scopes={scopes}
  onCreateKey={createKey}
  onRevokeKey={revokeKey}
  onDeleteWorkspace={deleteWorkspace}
  models={models}
  timezones={timezones}
  locales={locales}
/>
```
