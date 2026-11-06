# Connections

The settings page in an agent app where a person sees the MCP servers their
agent is connected to. One quiet row per server: its mark, its name, one line
under it, and a switch. The line is the tool count, or what's wrong and the
one thing that fixes it: "Signed out · Sign in", "Can’t connect · Retry".
Opening a row shows its address, the full message, its tools, what it was
allowed at sign-in, and Disconnect, which asks first in place. "Add server"
at the bottom opens a field and hands sign-in to the browser.

It's the other half of [Authorize](/docs/authorize): that's the server's
consent page, this is where the agent keeps what was granted.

## When to use it

- Settings for an agent or chat app that connects to MCP servers, local or
  remote.
- Any list of connected services whose sign-in can expire and whose
  permissions the person should be able to read back.

## When not to

- The consent step itself: that's the server's page. Use Authorize.
- Choosing which tools to use in one conversation. That's a menu in the
  composer, not settings.
- Integrations with nothing to sign in to and no status. A plain list with
  switches says it with less.

## States

Everything is controlled: pass `servers` and update them from the callbacks.

| Status | Line under the name | Switch |
|---|---|---|
| `connected` | "12 tools" (or "Connected" before the tools are known) | On |
| `connecting` | "Connecting…", a light band crosses it | On |
| `needs-auth` | "Signed out · **Sign in**", in the warning color | On |
| `error` | "Can’t connect · **Retry**", in the danger color | On |
| `disabled` | "Off"; mark and name dimmed | Off |

There are no badges and no boxes: the color of one short line says it, and
the line's text morphs from one status to the next without the row moving.
The full reason (`message`) and the server's address are one click away, at
the top of the opened row.

**Messages.** Say what happened and who didn't do what: "mcp.postbox.example.net
didn’t answer within 10 seconds", not "Connection error". Without a
`message`, a needs-auth row says "Your sign-in expired. Copper can’t use
Ledger until you sign in again."

**The switch** turns a server off without signing out: `onToggle(id, false)`.
Set the row to `disabled` at once. Turning it back on is a handshake, so set
`connecting`, then `connected` or `error`.

**Expanded row.**

| Part | Shows |
|---|---|
| About | The host in mono, then `message` (or the default reason) for `needs-auth` and `error`, in their color. |
| Tools | Each tool's name in mono with its one-line description. Over 6, the first 5 and "Show 7 more". Without `tools`: "Tools show once Acme answers." An empty array: "Acme doesn’t offer any tools yet." Off or signed out: a line saying Copper can’t use them. |
| Allowed when you signed in | `granted`, as phrases with a check, and `account`. Write them like the consent screen did: "Change menus and shopping lists", not `menus:write`. |
| Disconnect | Turns into "Disconnect Acme? Copper loses its 12 tools. To add it back, you’ll sign in again." with Cancel and a danger Disconnect. |

**Disconnecting.** If `onDisconnect` returns a promise, Disconnect shows
"Disconnecting…" until it settles; a rejection shows its message in the
confirm and keeps the row. Remove the server from `servers` and its row fades
and closes in place.

**Adding a server.** Controlled by `add`:

| `add.status` | Shows |
|---|---|
| `idle` | One "Add server" row; pressing it opens the "Server address" field with Cancel and Add. With no servers yet, the field is open from the start. |
| `checking` | Field read-only, Add becomes "Checking…" and shimmers |
| `signing-in` | "Finish signing in in your browser", the server's name, "Waiting for mcp.market.example.com…", **Open sign-in page** (a link, new tab) and Cancel |
| `failed` | The field again with `error` under it, until the address is edited |

Before calling `onAdd`, the field checks the address on submit and says how
to fix it: empty, spaces, not a web address, `http://` anywhere but
localhost, a name and password in the URL, or a host that's already in the
list ("Acme is already at mcp.acme.example.com."). A bare host gets
`https://` in front, so `onAdd` always gets a full URL. When sign-in
finishes, set `add` back to `idle` and add the server in the same update: the
field empties and closes back to "Add server", and the new row opens into
the list.

Open the sign-in page yourself when `signing-in` starts. The link is there for
when the browser blocked it or the tab got closed.

## Motion

| What | Duration | Easing |
|---|---|---|
| Row opens | `--ui-dur-panel` (280ms) height, `--ui-dur-fast` fade 60ms later | `--ui-ease-expand`, `--ui-ease-enter` |
| Row closes | `--ui-dur-base` (200ms) height, `--ui-dur-instant` fade | `--ui-ease-collapse`, `--ui-ease-exit` |
| Status line and Add, Disconnect labels change | `--ui-dur-move` (380ms) | `--ui-ease-move`, via text morph |
| Status line color changes | `--ui-dur-instant` | `--ui-ease-color` |
| Light band across "Connecting…" and "Waiting for…" | `--ui-dur-sweep` per pass | `linear` |
| Removed row fades, then its space closes | `--ui-dur-instant` fade, then `--ui-dur-base` height | `--ui-ease-exit`, `--ui-ease-collapse` |
| New row opens into the list | `--ui-dur-panel` height, `--ui-dur-fast` fade | `--ui-ease-expand`, `--ui-ease-enter` |
| Add field, confirm and sign-in step arrive: fade and 4px rise; the box eases to its new height | `--ui-dur-fast`, `--ui-dur-base` | `--ui-ease-enter`, animated size |
| Row head hover tint | `--ui-dur-instant` | `--ui-ease-color` |

Under `prefers-reduced-motion: reduce` heights change at once and only
opacity fades, labels swap without moving, the light bands
stop, and a removed row is gone without closing.

## Accessibility

- The rows are a `<ul>` named by `label` ("MCP servers").
- The name is a button with `aria-expanded`; its hit area covers the whole
  row head. It's described by the status line, so a screen reader hears
  "Acme, collapsed, button, 12 tools".
- Sign in and Retry are their own buttons, named "Sign in to Ledger again"
  and "Retry Postbox", above the row's button.
- Each switch is named "Use Acme".
- A polite `role="status"` region announces each change once: "Acme
  connected", "Ledger needs you to sign in again", "Postbox can’t connect:
  …", "Cellar turned off", "Market added", "Acme disconnected",
  "Checking https://mcp.market.example.com/".
- Sign in and Retry go away once the status changes, so focus moves to the
  row's name.
- In the confirm, focus starts on Cancel; Escape cancels and focus goes back
  to Disconnect. When a row is removed, focus moves to the next row's name,
  or the previous one, or the field.
- When sign-in starts, focus moves to "Finish signing in in your browser".
  When it ends, focus moves to the new row; when it fails or is cancelled,
  back to the field.
- Field errors use the text field's polite message line and `aria-invalid`.
- "Open sign-in page" says it opens in a new tab.
- Sign in and Retry reach 40px tall under a finger; the confirm buttons are
  the standard 40px, and the switch already is.

## Before / after

Before: a list of names with a delete button, no idea which ones work, and
an error toast when one doesn't.

```tsx
{servers.map((s) => (
  <li key={s.url}>
    {s.url} <button onClick={() => remove(s.url)}>×</button>
  </li>
))}
<input placeholder="Server URL" onKeyDown={(e) => e.key === "Enter" && connect(e.currentTarget.value)} />
```

After: each server says whether it works and what to do when it doesn't, what
it can do and what it was allowed, removal asks first, and adding one walks
through sign-in.

```tsx
<Connections
  agent="Copper"
  servers={servers.map((s) => ({
    id: s.id,
    name: s.serverInfo?.name ?? new URL(s.url).host,
    host: new URL(s.url).host,
    status: s.enabled ? s.state : "disabled",
    message: s.lastError,
    tools: s.tools?.map((t) => ({ name: t.name, description: t.description })),
    granted: describeScopes(s.scopes),
    account: s.account,
  }))}
  add={add}
  onAdd={async (url) => {
    setAdd({ status: "checking", url });
    try {
      const { authorizeUrl, name } = await mcp.beginAuth(url);
      window.open(authorizeUrl, "_blank", "noopener");
      setAdd({ status: "signing-in", url, name, signInUrl: authorizeUrl });
    } catch (error) {
      setAdd({ status: "failed", url, error: describe(error) });
    }
  }}
  onCancelAdd={() => {
    mcp.abortAuth();
    setAdd({ status: "idle" });
  }}
  onToggle={(id, on) => mcp.setEnabled(id, on)}
  onReconnect={(id) => mcp.reauthorize(id)}
  onRetry={(id) => mcp.reconnect(id)}
  onDisconnect={(id) => mcp.remove(id)}
/>
```
