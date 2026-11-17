# Approvals inbox

A review queue for anything in your product that needs someone's sign-off:
an expense report, a time-off request, a discount on a deal, access to a
workspace, a refund, a vendor payment, a post before it goes out, a config
change. Requests come from people on the team or from agents and
integrations acting for them; the inbox treats them the same way.

On the left is the list of requests ("Reimburse $1,284.50 in travel
expenses", "Time off, Nov 24 to Nov 28", "Refund $240.00 to Northwind
Traders"). You filter it by Pending, Approved, Declined or Expired and can
search it. It isn't grouped by default; it can be grouped by requester or
by due date. Every row has the same height: the requester's avatar, the
title and the requester with the context on one line each, cut at the edge.
On the right is the selected request in full: who asked and when, the
requester's note, what's being approved, drawn the way a person checks it
(see [Previews](#previews)), and who it reaches. At the bottom are
**Decline** (with an optional note back), **Edit** (change the values, then
approve) and **Approve**.

Triage works from the keyboard: J and K move, A approves, D declines, E
edits, / searches. A decided request fades and its row closes; the next one
opens. Nothing is sent straight away: a toast offers **Undo** for six
seconds, and only then is `onDecide` called. If that fails, the request
comes back to Pending with the reason and **Approve again**.

It's a block, built from Tabs, SearchField, Select, Avatar, Badge, Button,
Kbd, Alert, EmptyState, Dialog, Checkbox, TextField, CodeBlock, DiffView,
AnimatedSize and Toast. It takes data and promise-returning callbacks and
never fetches anything itself. It shows its toasts through `toast()`, so
render one `<Toaster />` somewhere in your app.

```tsx
import { ApprovalsInbox } from "@/components/ui/approvals-inbox/approvals-inbox";
import { Toaster } from "@/components/ui/toast/toast";

<ApprovalsInbox
  requests={requests}
  canDecide={me.role === "owner" || me.role === "admin"}
  permissionNote="Only owners and admins can approve. Ask Ines Duarte."
  loading={status === "loading"}
  error={status === "error" ? "Acme didn’t answer. Nothing was approved or declined." : null}
  onRetry={refetch}
  onDecide={async ({ id, decision, note, edits }) => {
    const updated = await api.approvals.decide(id, { decision, note, edits });
    // updated.status is "approved" or "declined", with updated.outcome
    setRequests((list) => list.map((r) => (r.id === id ? updated : r)));
  }}
  onRequeue={async (id) => {
    const reopened = await api.approvals.reopen(id);
    setRequests((list) => list.map((r) => (r.id === id ? reopened : r)));
  }}
/>
<Toaster />
```

Each request describes itself:

```tsx
const request: ApprovalRequest = {
  id: "apr_2291",
  requester: { id: "u_maya", name: "Maya Lindqvist", detail: "Sales" },
  title: "Reimburse $1,284.50 in travel expenses",
  context: "Expense report EXP-2291 · Northwind renewal",
  status: "pending",
  requestedAt: "2026-11-03T14:06:00Z",
  expiresAt: "2026-11-07T17:00:00Z",
  note: "Three days onsite with Northwind for the renewal. Receipts are on the report.",
  preview: {
    kind: "details",
    rows: [
      { label: "Flights", value: "$642.00" },
      { label: "Hotel, 3 nights", value: "$486.00" },
      { label: "Total", value: "$1,284.50" },
    ],
  },
  fields: [{ key: "amount", label: "Amount to reimburse", value: "1284.50", inputMode: "decimal" }],
};
```

A request an agent drafted is the same shape, with `kind: "agent"` on the
requester (a small **Agent** badge shows beside its name) and, if you want
it checkable, the raw call in `tool`:

```tsx
{
  id: "apr_8812",
  requester: { id: "support-agent", name: "Support agent", detail: "Drafts refunds and replies", kind: "agent" },
  title: "Refund $240.00 to Northwind Traders",
  priority: "medium",
  note: "The card was charged twice for October. This refunds the second charge.",
  preview: { kind: "payment", direction: "refund", amount: 240, currency: "USD", counterparty: "Northwind Traders" },
  tool: { server: "payments", name: "refunds.create", arguments: { charge: "ch_3QpL2e", amount: 24000 } },
  // …status, requestedAt
}
```

## Previews

`preview` shows what's being approved the way a person would check it. Pick
the kind that matches; leave it out and the request shows its title, note
and recipients only. Its section takes a heading from the kind: Message,
Payment, Post, Changes, What gets deleted, Details, What runs.

| Kind | Draws | For |
|---|---|---|
| `details` | `{ rows: { label, value, from?, mono? }[] }`, one labelled line each; a row with `from` reads "before → after" in the diff's colors | Expenses, time off, discounts, access and roles, bookings, settings: most requests |
| `payment` | `{ direction, amount, currency, counterparty, method?, memo? }`, the amount large | Refunds, vendor payments, reimbursements, charges |
| `email` | `{ from, subject, body }` as a message, with the count of `recipients` | Replies, announcements, notices to customers |
| `post` | `{ channel, mark?, account, text, limit? }` with a character count | Social posts, community and chat messages |
| `diff` | `{ name, before, after }` in DiffView | Config files, documents, templates, policies |
| `delete` | `{ what, items }` in the danger tone: "Deletes … for good" and what goes with it | Closing accounts, removing records or files |
| `code` | `{ code, language?, label? }` in CodeBlock, with Copy | Queries, commands, payloads |
| `custom` | `{ render }`, your own node, as is | Anything else: draw it with the kit's tokens and an edge in `--ui-border-strong` |

Write `details` rows as a person would read them: "Balance: 16 days → 11
days", "Role: Member → Admin", "Ends: in 30 days". Use `mono` for IDs,
hostnames and paths only.

## When to use it

- A product where some actions wait for a sign-off: spend, time off,
  discounts, access, publishing, refunds, changes to production. More than
  one request at a time, from more than one person or agent.
- A team view: several people share the queue, and some can only watch.
- Requests with due dates, after which they can't be approved.

## When not to

- One request inside a chat, answered in the flow of the conversation: use
  `tool-approval`.
- Approving a whole multi-step plan before it starts: use `plan-approval`.
- Granting an app access to an account: use `authorize`.
- A log of what already happened: that's a table, not an inbox.

## States

| State | What happens |
|---|---|
| Loading | After 300ms, one shimmering line ("Loading requests…") in the panes' full height, so nothing moves when they land |
| Couldn't load | The panes' space holds what broke, the `error` text and **Try again** |
| All caught up | No pending requests: a tray, "All caught up", and what will show up here |
| Nothing in a tab | "Nothing declined yet" with what fills it |
| Search, no match | "No pending requests match “foo”" with **Clear search** |
| Pending | Rows show when they were asked for ("12 min ago"), or a quiet due label when there's an `expiresAt` ("Due 4:00 PM", "Due tomorrow", "Due Fri"). Only in the last hour does the row's label count down, every digit in a box one `ch` wide so it never jiggles; it turns amber under ten minutes. The open request shows "Due in 3h 05m" beside its priority |
| Expired while reading | The open request stays where it is instead of vanishing. A warning says when it was due and that nothing happened; the buttons become **Reopen** (`onRequeue`) |
| Deciding | Approve or Decline: the row fades, then its space closes, and the next request opens. A toast names what you decided with **Undo** for `undoWindow` ms ("Maya Lindqvist hears back in 6 seconds"). Undo puts it back, selected |
| Decision failed | After the window, `onDecide` rejects: the request returns to Pending, its row says "Didn’t go through", the request shows your error message with **Approve again** (sent at once, busy on the button), and an error toast offers **Show** |
| Declining | A note field opens above the buttons, focused ("Tell Maya why"). Enter declines, Shift+Enter adds a line, Escape closes it |
| Editing | The preview becomes the request's `fields`. Changed values count up ("2 changes"); **Approve with edits** validates first and sends only the changed keys |
| Bulk approve | **Bulk approve** (two or more pending) opens a dialog listing them, none ticked, with **Select all**. **Approve 3 selected** approves those together, with one Undo |
| Technical details | With a `tool`, a quiet **Technical details** disclosure at the end of the request opens `server · name` and its arguments as JSON |
| Viewer | `canDecide={false}`: an info banner under the toolbar, no buttons, and `permissionNote` where they would be. A/D/E announce the note instead |
| Approved / declined | Read-only, with who decided, when, any edits and the note they gave |
| Long recipient lists | Five shown; **Show all 212** opens the rest in a 320px scrolling box with a filter field (over 20 people) |
| Narrow (under 640px) | The list and the request take turns: a row opens the request with **All requests** to go back, the decision bar sticks to the bottom of the screen, and a decision returns to the list so you see the row leave |

## Props

| Prop | What it does |
|---|---|
| `requests` | Every request, any status. Pending sorts by soonest due date, then priority, then newest; the rest by most recent decision |
| `onDecide` | `({ id, decision, note?, edits? }) => Promise`. Called once the undo window has passed. Resolve after recording it and update the request's `status` and `outcome`; reject with an `Error` whose message says what happened |
| `onRequeue` | `(id) => void \| Promise`. Shows **Reopen** on expired requests |
| `canDecide` | Default `true`. False shows everything read-only |
| `permissionNote` | Who can approve, shown when `canDecide` is false |
| `loading`, `error`, `onRetry` | First load and its failure |
| `undoWindow` | Milliseconds before a decision is sent. Default 6000; `0` sends at once, busy on the button |
| `defaultFilter` | `pending` (default), `approved`, `declined` or `expired` |
| `defaultGrouping` | `none` (default), `requester` or `due` (due today, tomorrow, later, no due date). The old `agent` and `urgency` still work and mean `requester` and `due` |
| `bulk` | Default `true`: **Bulk approve** once two or more are pending. `false` hides it |
| `bulkRisk` | Deprecated. `false` is `bulk={false}`; `"low"` offers only low-priority requests, ticked to start with |
| `title`, `description` | The heading and the line under it. Default "Approvals" and "Requests waiting on a decision from you or your team." |

`ApprovalRequest`:

| Field | What it is |
|---|---|
| `requester` | `{ id, name, detail?, avatarUrl?, kind? }`. `detail` is their team or role ("Sales", "Support agent"); `kind: "agent"` adds an **Agent** badge. Default kind `person` |
| `title` | What's being approved, short: "Admin access to the Billing workspace" |
| `context?` | Where it belongs: "Access request · for 30 days" |
| `priority?` | `low`, `medium` or `high`. High shows an amber **High** in the row; every level shows in the request. Leave it out and no badge shows |
| `status`, `requestedAt`, `expiresAt?`, `outcome?` | Where it stands. `expiresAt` is the due date: after it the request can't be approved and moves to Expired. `outcome` is `{ by, at, note?, edited? }` |
| `note?` | The requester's message, in their words: shown as "Note from Maya Lindqvist" |
| `preview?` | `details`, `payment`, `email`, `post`, `diff`, `delete`, `code` or `custom`: see [Previews](#previews) |
| `recipients?` | `{ name, detail? }[]`, any length: who it reaches |
| `fields?` | `{ key, label, value, multiline?, hint?, inputMode?, validate? }[]`: what Edit lets a person change, for any preview kind |
| `tool?` | `{ server, name, arguments? }`: the raw call behind it, folded under **Technical details**. Leave it out when there isn't one |

### Older names

Earlier versions were built for agents only. These still work, so existing
data needs no change:

| Old | Now | How it's read |
|---|---|---|
| `agent: { id, name, role?, avatarUrl? }` | `requester` | Used when `requester` is missing, as `{ ..., detail: role, kind: "agent" }` |
| `reasoning` | `note` | Used when `note` is missing |
| `risk` | `priority` | Used when `priority` is missing |
| `ApprovalAgent`, `ApprovalRisk` types | `ApprovalRequester`, `ApprovalPriority` | Still exported |

## Customizing

- **Height.** The panes are 680px tall on a wide screen; set
  `--inbox-height` on the block (for example `calc(100dvh - 200px)`) to fill
  your layout. `--inbox-list` sets the list's width (320px).
- **Priority.** Set it on the server, from what matters to your team: a
  deal closing today is high, a routine reimbursement can have none. Use it
  sparingly; when everything is high, nothing is.
- **Due dates.** Give `expiresAt` to what can't wait forever (a discount
  before the quarter closes, a refund before payouts). Leave it out for
  requests that can wait.
- **Undo.** Six seconds suits most teams. The block sends what's still held
  if the page unmounts, so a decision is never lost by navigating away.
- **Search.** It matches the title, the requester's name and detail, the
  context, the note, the preview's main text (subject, counterparty,
  account, file name, row values) and the recipients' names.
- **Edges.** One resting surface holds both panes, with a hairline between
  the list and the request and between rows. Previews and fields take the
  same edge, `--ui-border-strong`. Keep to it if you restyle.
- **Copy.** `permissionNote` should name who can approve. Error messages
  from `onDecide` should say whether anything changed.

## Layout

The panes are padded `--ui-pad-card` (16 narrow, 24 from 560px) and sit
`--ui-gap-group` under the toolbar.

The list is its own container too. Narrower than 400px (a phone, or a tight
pane beside the request), each row's time and priority move from the end of
the title's line to the end of the second line, so the title gets the row's
whole width. Grouped by requester, rows leave out the name the heading
already gives.

## Accessibility

- The list is a list of buttons; the open one has `aria-current`. Only it is
  in the tab order, so Tab moves from the list to the request. Arrow keys
  and J/K move between rows; group names are headings.
- A, D and E act on the open request, and the buttons carry
  `aria-keyshortcuts`. Shortcuts never fire while typing, in a menu or in a
  dialog. The hints are hidden on touch screens and narrow layouts.
- Each decision, undo and failure is announced in a polite live region. A
  countdown's ticking digits are hidden from screen readers, which hear
  "Due at 2:50 PM" instead.
- After a decision, focus moves to the next row, so triage can continue from
  the keyboard. On a phone, opening a request focuses its title, and **All
  requests** (or Escape) returns focus to the row.
- The decline note and edit fields have visible labels; a field that fails
  validation has `aria-invalid` and its message linked. **Technical details**
  is a button with `aria-expanded`.

## Before / after

Before: a table of pending requests with two buttons per row. A misclick
approves the wrong expense, nobody can see what the discount does to the
contract value, a request past its date is still approvable, and a failed
approval looks like success.

```tsx
{pending.map((a) => (
  <tr key={a.id}>
    <td>{a.description}</td>
    <td>
      <button onClick={() => api.approve(a.id)}>Approve</button>
      <button onClick={() => api.reject(a.id)}>Reject</button>
    </td>
  </tr>
))}
```

After: the request shows exactly what's being approved and why, can be
edited before approving, waits six seconds for Undo, comes back with the
reason if it fails, and stops being approvable once it's past due.

```tsx
<ApprovalsInbox requests={requests} onDecide={decide} onRequeue={requeue} canDecide={isAdmin} />
```
