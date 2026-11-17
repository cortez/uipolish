---
title: What an MCP consent screen needs
description: When an agent connects to your MCP server, the consent screen is the only thing between a person and a client they've never heard of. Eight things it has to get right, with a working one to try.
date: 2026-11-03
component: authorize
---

# What an MCP consent screen needs

An MCP server that does anything useful needs to know whose bookings, inbox or
payments it's touching, so remote servers sign people in with OAuth. The
person clicks Connect in their agent, a browser tab opens on your server, and
your server asks: may this agent have access?

That page gets less attention than any other screen in the product. It's
usually the OAuth library's default: a logo, "Authorize application", the
scopes as the request spelled them, one button. For MCP that's not enough,
for one reason: **most MCP clients introduce themselves.** They register with
your server the first time they connect, so the name on the request is
whatever the client said it was. Your server has never seen most of them
before, and can't check the name. The consent screen is where a person
decides whether to trust it.

Here's a working one. Allow it, cancel it, or untick everything it could
change and watch the button.

{{demo authorize}}

## 1. Name both sides in the heading

"Copper wants to access Acme" says who's asking and for what in five words.
"Authorize application" says neither. Put the two logos above it with a few dots
between them: it's the one picture everyone already reads as "connect these
two".

## 2. Show who's signed in

People have work and personal accounts, and a shared laptop has someone
else's. Show the email of the account the agent will act as, with a way to switch
right there. Connecting the wrong account is the most common
mistake on this screen, and the hardest to notice later.

## 3. Say where they'll go back to

After Allow, your server sends the browser to the client's redirect address
with a code that becomes the agent's access. That address is the part of the
request an attacker controls. Show its host exactly as it is,
`localhost:33418` included, port and all:

> Afterwards you'll go back to `localhost:33418`.

A person who started from Copper on their own laptop expects `localhost`. A
person who clicked a link in an email doesn't, and this line is the only
place they'd find out.

## 4. Warn about clients you don't know

Unless your server has a reason to vouch for the client (it's your own app,
or one you've reviewed), say so, in one sentence, in the warning color:

> **Acme hasn't verified pantry-sync.** Only allow it if you just started
> this from pantry-sync yourself.

Not a wall of red, and not a scary checkbox. The instruction has to be
something a person can actually check: did I just do this?

## 5. Write permissions as things a person would say

The request says `bookings:read lists:write messages:write`. A person needs
to know what the agent can see and what it can change, and the verb says
both: "See your bookings", "Change shopping lists", "Message your guests".
One list, reads first, no headings and no scope names. Add a line of detail
only when the phrase isn't enough.

## 6. Make the risky ones optional, and off

Some permissions the agent needs to work at all; mark those required and
don't make people tick them. Everything else is a checkbox. Anything that
moves money, deletes things or speaks for the person in public starts
**unticked**: Refunds, in the example. The client can ask for it again later,
when it actually needs it.

When every change is unticked, the button says so: **Allow read-only**. The
label is the last thing anyone reads before they press it, so it's the right
place for the consequence.

## 7. Errors that say nothing happened

If issuing the grant fails, the important news is that nothing was shared.
Say that, say what failed, and offer the same button again:

> Acme didn't answer within 10 seconds. Nothing was shared; try again.

## 8. End with a result, not a redirect

After Allow, the browser leaves for the client. Before it does, or when the
client is a desktop app that doesn't take the tab back, the page should say
what just happened in one line: connected to Acme, and you can go back to
Copper. After Cancel: not connected, nothing shared.

Move focus to that heading. The buttons it came from are gone, and a screen
reader user otherwise lands nowhere.

## The short version

- Heading: "**Agent** wants to access **Server**".
- The signed-in account, with Switch.
- The return host, exactly.
- A one-line warning for clients you don't know.
- Permissions as verb phrases in one list.
- Risky permissions optional and unticked; "Allow read-only".
- Errors that say nothing was shared.
- A result that says what happened.

The [Authorize component](/docs/authorize) is all of the above in one small
card, with the motion and accessibility worked out, ready for your agent to drop into your
server's authorization page. Its counterpart on the agent's side is
[Connections](/docs/connections), the list where people see and manage the
servers they've connected.
