---
title: Ask before the agent acts
description: How an agent should ask for permission before it sends, deletes or spends: which calls to ask about, what the question should say, and what "always allow" can safely mean.
date: 2026-11-03
component: tool-approval
---

# Ask before the agent acts

Every agent with tools hits the same moment: it's about to do something the
person might not want. Send twelve texts. Delete a menu. Refund $84. The
usual answer is a modal with the tool's name, a block of JSON and two buttons,
which people learn to click through by the third time.

The question can be much better than that, and it should be, because it's
the one place the person stays in charge. Here's a working one. Try the
arguments, deny with a reason, or allow it for the rest of the conversation.

{{demo tool-approval}}

## Ask about effects, not tools

Asking before every call trains people to say yes without reading. Asking
never is how an agent texts your guests the wrong time. Decide by what the
call does, not which tool it is:

| Effect | Example | Ask? |
|---|---|---|
| Reads | Look up Saturday's bookings | Not by default |
| Changes | Update the shopping list | Ask, and offer "don't ask again" |
| Sends | Text 12 guests | Ask, every time or for this conversation |
| Deletes | Delete a draft menu | Ask, every time or for this conversation |
| Spends | Refund $84 | Ask, every time or for this conversation |

The last three have one thing in common: they can't be taken back. That's
the line. Whatever can be undone can earn standing permission; whatever
can't shouldn't get "always" at all, only "for this conversation".

## Say it in words first

Lead with the action as a sentence a person would say, then the specifics,
then the consequence:

> **Text 12 guests about 7:30**
>
> “We're starting at 7:30 instead of 7. Same table, 14 Alder Lane.”
>
> Once it's sent, it can't be taken back.

The server, the tool's name (`postbox · send_message`) and the raw arguments
sit one click away under "Details", never up front: a person can't review
JSON, but they can review the message their guests are about to get.

Only the calls that can't be taken back get that last line. A read or an
edit says nothing extra; the title is enough. When the effect is a delete,
the Allow button turns red. That's the only place color should shout.

## Two answers, and a box

- **Deny.** With an optional "tell Copper why", because the reason is useful
  to the agent: "not yet, I'm still checking with Ben" changes what it does
  next. Send it back as the tool's result.
- **Allow.** The primary button, and it means once.
- **"Don't ask again in this chat"**, a checkbox above them. Standing
  permission is a choice about Allow, not a third answer, so it shouldn't be
  a third button competing with the other two. Keep it to the chat for
  sends, deletes and spends: one click should never turn into standing
  permission to move money.

Remember what was allowed somewhere the person can see and take back: a
permissions list in settings with a Revoke button next to each tool.

## Get out of the way afterwards

Once answered, the card has done its job. Fold it into one line in the
conversation, "Allowed once · send_message", that can be reopened to see
exactly what was approved. Three answered cards stacked in a thread are
noise; three lines are a record.

Two more details people notice:

- **Don't steal focus.** If the person is typing their next message, an
  approval appearing shouldn't yank the cursor away. Take focus only when
  nothing else has it, and announce the card politely instead.
- **Let it expire.** An agent can't wait forever. When it stops waiting, the
  card turns into a line that says so ("Copper stopped waiting after 5
  minutes"), so nobody approves something that's no longer going to happen.

## When several arrive at once

Agents batch. Show the first request as the card and the rest as a short
queue under it ("2 more waiting"), each with its own Deny and Allow.
Never one button that approves everything you haven't read.

The [Tool approval component](/docs/tool-approval) does all of this. It sits
in the same thread as [Tool steps](/docs/tool-steps), which shows what the
agent did after you said yes.
