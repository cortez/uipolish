# Team members

The Members section of a workspace's settings page. Each person gets one row
with their avatar, name, email, when they were last active, their role and a
way to remove them. Above the list are the seat count and **Invite people**,
which opens a dialog where you can paste a whole list of addresses. Pending
invites sit under the list, where they can be resent or revoked. Role changes
show at once and roll back with an inline error if the server says no. The
section won't remove or demote the last owner. People who can't manage the
team see the same list without the controls, along with a line saying why.

It's a block: a whole section built from Avatar, Badge, Button, Select,
SearchField, ChipGroup, Dialog, ConfirmDialog, Alert, EmptyState and Tooltip.
It takes data and promise-returning callbacks and never fetches anything itself.

```tsx
import { TeamMembers } from "@/components/ui/team-members/team-members";

<TeamMembers
  workspaceName={workspace.name}
  members={members}
  invites={invites}
  currentUserId={session.userId}
  seats={{ used: members.length + invites.length, total: plan.seats }}
  canManage={me.role === "owner" || me.role === "admin"}
  loading={status === "loading"}
  error={status === "error" ? "We couldn’t reach the server. Your team is fine." : null}
  onRetry={refetch}
  onInvite={async (emails, role) => {
    const created = await api.invites.create({ emails, role });
    setInvites((list) => [...created, ...list]);
  }}
  onChangeRole={async (id, role) => {
    const updated = await api.members.update(id, { role });
    setMembers((list) => list.map((m) => (m.id === id ? updated : m)));
  }}
  onRemove={async (id) => {
    await api.members.remove(id);
    if (id === session.userId) return router.push("/workspaces");
    setMembers((list) => list.filter((m) => m.id !== id));
  }}
  onResend={async (id) => {
    const invite = await api.invites.resend(id);
    setInvites((list) => list.map((i) => (i.id === id ? invite : i)));
  }}
  onRevoke={async (id) => {
    await api.invites.revoke(id);
    setInvites((list) => list.filter((i) => i.id !== id));
  }}
  onUpgrade={() => router.push("/settings/billing")}
/>
```

Callbacks that reject with an `Error` show its `message` where the action
happened. A message that says what to do next is better than a code:
"Acme couldn’t remove them just now. They still have access; try again."

## When to use it

- The people page of a workspace, team, organization or project: anywhere
  there are roles, invites and a seat count.
- A shared account where some people can manage the team and others can only
  look.

## When not to

- Sharing a single document or page with people. Use a share dialog with an
  access list; this section manages the whole workspace.
- Directories with hundreds of people, SCIM or groups. Use a Data Table with
  server-side search and pagination. This section shows every member in one
  list and only filters on the client.
- Sign-up or accepting an invite. That's the invitee's screen, not this one.

## States

| State | What shows |
|---|---|
| Loading (`loading`) | The header, then a card that holds the list's space, with one shimmering line: "Loading members…" |
| Error (`error`) | The same card with "Couldn’t load members", your message, and **Try again** when `onRetry` is set |
| Just you (one member) | Your row, then "It’s just you so far" with Invite people. You can't leave a workspace you're alone in. |
| Many members (over `searchThreshold`, 8) | Search by name or email, a role filter with counts, and "3 of 14" |
| No matches | "No one matches “zz”" with **Show everyone** |
| Read-only (`canManage={false}`) | An info alert: "You can see who’s here, but not change it", naming the owners to ask. Roles show as text, there's no Invite or Remove, and invites have no actions. The person can still leave. |
| Role saving | The new role shows straight away. After 300ms, "Saving…" shimmers where "last active" was. |
| Role failed | The old role comes back, and the row opens a line: "Couldn’t make Theo a member. Theo is still an admin." with **Try again** and dismiss |
| Removing | A confirm names the person and what happens. The button shows busy until the promise settles, and a rejection shows its message in the dialog. Afterwards the row fades and closes, and focus moves to the next person. |
| Last owner | The owner role's other options are disabled with "Make someone else an owner first". If you're that owner, **Leave** is disabled and a note under the list says why. |
| Above your role | An admin sees owners' roles as text, without Remove, and can't give the owner role ("Only owners can give this role"). |
| Sensitive role change | Making someone an owner, or lowering your own role, asks first. |
| Seats | "17 of 20 seats used · 3 left". With none left, the count turns warning-colored and **Get more seats** calls `onUpgrade`. |
| Invite pending | "Member · Sent 2 days ago by Ines Duarte", with **Resend** and revoke (×) |
| Invite expired | An **Expired** badge, "Expired 2 days ago", and **Renew** |
| Just resent | **Sent** for `resendCooldown` seconds (60), then Resend again. New invites start cooled down too. |

**The invite dialog.**

| Input | What happens |
|---|---|
| Typing, then a comma, space or Enter | The address becomes a chip |
| Pasting a list | Split on commas, semicolons, spaces and new lines. "Maya Lind &lt;maya@x.com&gt;" becomes the address alone. |
| Duplicate in the list | Dropped, with "Skipped 1 address already in the list." |
| Not an address, already a member, already invited | A red chip with a warning mark, and the reasons under the field: "chef@acme isn’t a full address." |
| Backspace in an empty field | Pulls the last chip back into the field to edit |
| More addresses than seats left | A warning alert, "5 invites, 3 seats left", with **Upgrade plan**. Sending is blocked with a message saying how many to remove. |
| Sending | "Send 3 invites" becomes "Sending…" and the dialog can't be dismissed. A rejection keeps every address and shows the message. |
| Closing with addresses in it | Asks whether to discard them |

## Props

| Prop | Type | Default | |
|---|---|---|---|
| `members` | `TeamMember[]` | | `{ id, name, email, role, avatarUrl?, lastActiveAt? }`. A `lastActiveAt` of `null` reads "Hasn’t signed in". Rows show in the order you pass them. |
| `invites` | `TeamInvite[]` | `[]` | `{ id, email, role, sentAt, expiresAt?, invitedBy? }` |
| `currentUserId` | `string` | | Marks "You" and turns Remove into Leave |
| `roles` | `TeamRole[]` | Owner, Admin, Member, Viewer | `{ value, label, description? }`, most powerful first |
| `ownerRole` | `string` | first role | The role that must always have one person |
| `defaultInviteRole` | `string` | `"member"` | |
| `seats` | `{ used, total }` | | Leave out for unlimited plans. `used` should count pending invites. |
| `canManage` | `boolean` | | |
| `workspaceName` | `string` | | Used in sentences |
| `title`, `description` | | "Members", "People who can plan suppers in …" | Change the description for your product |
| `loading`, `error`, `onRetry` | | | First-load states |
| `onInvite` | `(emails, role) => Promise` | | Leave out to hide Invite |
| `onChangeRole` | `(id, role) => Promise` | | Leave out for read-only roles |
| `onRemove` | `(id) => Promise` | | Also used when the current user leaves |
| `onResend`, `onRevoke` | `(id) => Promise` | | |
| `onUpgrade` | `() => void` | | Shown when seats run out |
| `upgradeLabel` | `string` | "Upgrade plan" | |
| `searchThreshold` | `number` | `8` | |
| `resendCooldown` | `number` | `60` | Seconds |

The section never changes your data. It shows optimistic roles while a
change is saving, but `members` and `invites` must be updated by you.

## Customizing

- **Roles.** Pass your own `roles`, most powerful first. Someone can change
  rows and hand out roles at their own rank or lower, which is how an admin
  can't touch owners. If your rules are different, such as admins promoting
  to owner, merge those roles or check on the server and reject with a
  message.
- **Copy.** The description defaults to supper-planning words from the demo,
  so pass `description` with a line about your product. The confirm text
  says what removal does in Acme; check that it's true for yours ("Suppers
  and notes they made stay").
- **Seats.** If pending invites don't use a seat in your billing, don't count
  them in `used`. Then change the "Pending invites count as seats" line in
  `invite-dialog.tsx`.
- **Invite expiry.** The dialog says invites last 7 days. Edit that sentence,
  and set `expiresAt` to match.
- **Columns.** The row puts everything on one line once the section is 600px
  wide, measured on the section with a container query. Below that, the role
  and last active move under the name. Your own row's **Leave** is a word,
  not an icon, so on a phone it takes its own line under your role and last
  active, and your name and "You" keep the whole top line. `--team-role` and `--team-active` set
  the column widths.
- **Edges.** The toolbar's search field and role filter are full-size
  fields, and the list's card takes the same outline (`--ui-edge`, the
  field edge color), so the controls and the box under them read as one
  set. Rows are split by the lighter divider (`--ui-border`); the role
  selects inside rows are quiet `sm` pills with no edge. Keep that if you
  restyle: one outline color for the boxes, one lighter color for the lines
  inside them.
- **Sorting.** Rows show in the order you pass. Owners first, then by name,
  reads best.

## Layout

The title sits `--ui-gap-block` above the list and the invites a full
`--ui-gap-section` below it; rows are padded `--ui-pad-card` at the sides
(16 narrow, 24 from 560px), so every edge moves together.

An email address too long for a phone row breaks after its @, so the name
and the domain each stay whole where they fit.

## Accessibility

- The section is a `<section>` named by its heading. Each list is named by its
  heading.
- Avatars are decorative, because the name is written beside them. "You" is
  real text in the row.
- Each role select is named "Role for Maya Lindqvist". Disabled options keep
  their reason as their description, so it's read with them.
- Icon buttons are named "Remove Theo Marchetti" and "Revoke invite to
  felix@…". A tooltip shows the same words on hover.
- **Leave**, when blocked, uses `aria-disabled` and stays focusable. It's
  described by the note under the list that explains why.
- A role-change, resend or revoke failure uses `role="alert"` in its row, with
  Try again next to it. Successes are announced once through a polite status
  region: "Maya Lindqvist is now an admin.", "Olu Bankole removed.", "2
  invites sent as members."
- Confirm dialogs start on Cancel. After a removal, focus moves to the next
  person's role or button, not the page.
- The invite field is a real labelled input, described by the line under it,
  which lists the problems. Each red chip's accessible name includes its
  problem ("chef@acme, isn’t a full address"). Chip removal is announced and
  focus moves to a neighbour.
- Search and the role filter update the "3 of 14" count, which is a polite
  live region.
- Rows open and close by height. Under reduced motion they only fade.

## Before / after

Before: a table with a role dropdown that saves silently, a delete button that
just deletes, and an invite field that takes one address at a time.

```tsx
{members.map((m) => (
  <tr key={m.id}>
    <td>{m.name}</td>
    <td>
      <select value={m.role} onChange={(e) => api.setRole(m.id, e.target.value)}>
        <option>owner</option><option>admin</option><option>member</option>
      </select>
    </td>
    <td><button onClick={() => api.remove(m.id)}>Delete</button></td>
  </tr>
))}
<input placeholder="Email" /><button>Invite</button>
```

After: you can't remove the last owner, a failed change says so and puts the
old role back, removal asks first and names the person, a pasted list of 20
addresses is checked before sending, and seats are counted before the server
has to refuse.

```tsx
<TeamMembers
  workspaceName="Hearth & Hare"
  members={members}
  invites={invites}
  currentUserId={me.id}
  seats={{ used: members.length + invites.length, total: 20 }}
  canManage={me.role !== "viewer" && me.role !== "member"}
  onInvite={invite}
  onChangeRole={changeRole}
  onRemove={remove}
  onResend={resend}
  onRevoke={revoke}
  onUpgrade={openBilling}
/>
```
