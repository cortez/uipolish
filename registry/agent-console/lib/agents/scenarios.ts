import type { ToolEffect } from "@/components/ui/agent-settings/agent-settings";
import type { ApprovalPriority, ApprovalRecipient } from "@/components/ui/approvals-inbox/approvals-inbox";
import type { RunOutput } from "@/components/ui/run-history/run-history";
import type { StoredField, StoredPreview } from "@/lib/db/database";

/* What the mock agents do, as scripts: model calls, tool calls (some that
   stop to ask, some that fail and retry), then an output. The mock runner
   plays a script in real time; the sample data replays it instantly. Delete
   this file with mock.ts once a real runner is in. */

export type Ask = {
  /** What the person approves, as a phrase: "Send the reply to Lena Fischer". */
  title: string;
  note?: string;
  priority?: ApprovalPriority;
  preview?: StoredPreview;
  /** Everyone it reaches: a message's recipients. */
  recipients?: ApprovalRecipient[];
  fields?: StoredField[];
};

export type Beat =
  | { kind: "llm"; name: string; ms: number; input: string; output: string; tokens: { input: number; output: number; cached?: number } }
  | {
      kind: "tool";
      server: string;
      name: string;
      effect: ToolEffect;
      ms: number;
      args: Record<string, unknown>;
      result?: string;
      /** Fails with this, and the run fails. */
      error?: string;
      /** Fails `times` times with `error` first, then succeeds. */
      flaky?: { times: number; error: string };
      /** What the approval shows, when the agent's policy asks. Leave out for a generic one. */
      ask?: Ask;
    }
  | {
      kind: "output";
      output: RunOutput;
      /** An approved field whose edited value replaces the output's text. */
      fromField?: string;
    };

type Rand = () => number;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pick = <T>(rand: Rand, list: T[]) => list[Math.floor(rand() * list.length)];
const between = (rand: Rand, min: number, max: number) => Math.round(min + rand() * (max - min));

/** Tasks people give each sample agent, and what starts the ones nobody typed. */
export const TASKS: Record<string, { tasks: string[]; schedule: string; webhook: string }> = {
  agt_support: {
    tasks: [
      "Reply to Northwind Traders about a double charge",
      "Answer Globex: when is SSO coming?",
      "Reply to Lena Fischer about exporting reports to CSV",
      "Answer Initech: can we change the billing email?",
      "Reply to Umbrella about the dashboard timing out",
      "Answer Hooli: how do I add a teammate?",
    ],
    schedule: "Every 15 minutes",
    webhook: "Zendesk · ticket.created",
  },
  agt_billing: {
    tasks: [
      "Refund the duplicate October charge for Northwind Traders",
      "Refund Globex for the unused seats in October",
      "Send the overdue invoice reminder to Initech",
      "Refund Umbrella's annual renewal, cancelled in the grace period",
    ],
    schedule: "Weekdays at 09:00",
    webhook: "Stripe · charge.dispute.created",
  },
  agt_research: {
    tasks: [
      "Weekly competitor digest",
      "Summarize this week's churn interviews",
      "Find pricing changes from the top five competitors",
      "Draft the monthly market notes for the board",
    ],
    schedule: "Mondays at 07:00",
    webhook: "Notion · page.updated",
  },
};

const CUSTOMERS: Record<string, { name: string; contact: string; email: string }> = {
  Northwind: { name: "Northwind Traders", contact: "Lena Fischer", email: "lena@northwind.example.com" },
  Globex: { name: "Globex", contact: "Hank Scorpio", email: "hank@globex.example.com" },
  Initech: { name: "Initech", contact: "Bill Lumbergh", email: "bill@initech.example.com" },
  Umbrella: { name: "Umbrella", contact: "Alice Marcus", email: "alice@umbrella.example.com" },
  Hooli: { name: "Hooli", contact: "Gavin Belson", email: "gavin@hooli.example.com" },
  Lena: { name: "Northwind Traders", contact: "Lena Fischer", email: "lena@northwind.example.com" },
};

function customerIn(task: string) {
  const key = Object.keys(CUSTOMERS).find((k) => task.includes(k));
  return key ? CUSTOMERS[key] : CUSTOMERS.Northwind;
}

/** What the run may come up against. `fail` makes this one end in a failed tool call. */
export type Variation = { fail?: boolean; flaky?: boolean };

/** The script for one run. Unknown agents get the research script, which only reads and writes notes. */
export function scriptFor(agentId: string, task: string, rand: Rand, variation: Variation = {}): Beat[] {
  if (agentId === "agt_support") return support(task, rand, variation);
  if (agentId === "agt_billing") return billing(task, rand, variation);
  return research(task, rand, variation);
}

function support(task: string, rand: Rand, { fail, flaky }: Variation): Beat[] {
  const c = customerIn(task);
  const ticket = `#${between(rand, 48100, 48990)}`;
  const first = c.contact.split(" ")[0];
  const reply = `Hi ${first},\n\nThanks for flagging this. I checked your account and ${
    task.includes("charge")
      ? "you were charged twice for October. I've asked our billing team to refund the second charge; you'll see it on your statement in 5 to 10 business days."
      : task.includes("SSO")
        ? "SSO with Okta and Azure AD is in beta now. I can turn it on for your workspace this week; reply here and I'll set it up."
        : task.includes("CSV")
          ? "you can export any report from its ⋯ menu: Export, then CSV. Filters you've set are kept in the file."
          : "here's what to do: open Settings, then Members, and use Invite. Each person gets an email to join."
  }\n\nBest,\nAcme Support`;
  return [
    {
      kind: "tool",
      server: "Zendesk",
      name: "get_ticket",
      effect: "read",
      ms: between(rand, 500, 900),
      args: { ticket },
      result: JSON.stringify({ ticket, requester: c.email, subject: task.replace(/^(Reply to|Answer) /, ""), priority: "normal" }, null, 2),
      ...(flaky && { flaky: { times: 1, error: "503 Service Unavailable: Zendesk is busy. Retrying in 2s." } }),
      ...(fail && { error: "404 Not Found: ticket " + ticket + " was merged into another ticket." }),
    },
    {
      kind: "llm",
      name: "Read the ticket",
      ms: between(rand, 1200, 2200),
      input: `Ticket ${ticket} from ${c.contact} (${c.name}):\n${task}`,
      output: `${c.contact} at ${c.name} needs an answer about: ${task.toLowerCase()}. Look for the policy in the help center before replying.`,
      tokens: { input: between(rand, 3200, 4800), output: between(rand, 180, 320), cached: 2400 },
    },
    {
      kind: "tool",
      server: "Knowledge",
      name: "search_knowledge",
      effect: "read",
      ms: between(rand, 400, 800),
      args: { query: task, top_k: 4 },
      result: "4 passages from the help center and the refund policy.",
    },
    {
      kind: "llm",
      name: "Draft the reply",
      ms: between(rand, 2200, 3600),
      input: `Write a short, friendly reply to ${c.contact}. Use only what the passages say.`,
      output: reply,
      tokens: { input: between(rand, 9000, 14000), output: between(rand, 420, 700), cached: 6000 },
    },
    {
      kind: "tool",
      server: "Zendesk",
      name: "reply_to_ticket",
      effect: "send",
      ms: between(rand, 500, 900),
      args: { ticket, body: reply },
      result: JSON.stringify({ ticket, status: "pending", public: true }, null, 2),
      ask: {
        title: `Send the reply to ${c.contact}`,
        note: `${c.name} asked about this in ticket ${ticket}. The reply quotes the help center.`,
        recipients: [{ name: c.contact, detail: c.email }],
        preview: { kind: "email", from: "Acme Support <support@acme.example.com>", subject: `Re: ${task.replace(/^(Reply to|Answer) /, "")}`, body: reply },
        fields: [{ key: "body", label: "Reply", value: reply, multiline: true }],
      },
    },
    { kind: "output", output: { text: reply }, fromField: "body" },
  ];
}

function billing(task: string, rand: Rand, { fail, flaky }: Variation): Beat[] {
  const c = customerIn(task);
  const charge = `ch_${Math.floor(rand() * 36 ** 6).toString(36).padStart(6, "0")}`;
  const amount = pick(rand, [240, 480, 96, 1200]);
  if (task.includes("reminder")) {
    const body = `Hi ${c.contact.split(" ")[0]},\n\nInvoice INV-2291 for ${usd(amount)} was due on October 31. You can pay it from the link below, or reply if something's holding it up.\n\nThanks,\nAcme Billing`;
    return [
      { kind: "tool", server: "Stripe", name: "list_invoices", effect: "read", ms: between(rand, 500, 900), args: { customer: c.name, status: "open" }, result: JSON.stringify([{ id: "in_2291", amount_due: amount * 100, due_date: "2026-10-31" }], null, 2) },
      { kind: "llm", name: "Write the reminder", ms: between(rand, 1500, 2600), input: `A polite reminder for an overdue invoice of $${amount}.`, output: body, tokens: { input: between(rand, 2800, 3600), output: between(rand, 160, 260) } },
      {
        kind: "tool",
        server: "Gmail",
        name: "send_email",
        effect: "send",
        ms: between(rand, 400, 700),
        args: { to: c.email, subject: "Invoice INV-2291 is overdue", body },
        result: '{ "id": "msg_18c2", "status": "sent" }',
        ask: {
          title: `Email ${c.contact} about an overdue invoice`,
          note: `Invoice INV-2291 for ${usd(amount)} is four days overdue.`,
          recipients: [{ name: c.contact, detail: c.email }],
          preview: { kind: "email", from: "Acme Billing <billing@acme.example.com>", subject: "Invoice INV-2291 is overdue", body },
          fields: [{ key: "body", label: "Message", value: body, multiline: true }],
        },
      },
      { kind: "output", output: { text: body }, fromField: "body" },
    ];
  }
  return [
    {
      kind: "tool",
      server: "Stripe",
      name: "list_charges",
      effect: "read",
      ms: between(rand, 500, 900),
      args: { customer: c.name, limit: 5 },
      result: JSON.stringify([{ id: charge, amount: amount * 100, created: "2026-10-01" }, { id: `${charge}b`, amount: amount * 100, created: "2026-10-01" }], null, 2),
      ...(flaky && { flaky: { times: 1, error: "429 Too Many Requests: rate limited by Stripe." } }),
      ...(fail && { error: "401 Unauthorized: the Stripe key was rolled. Reconnect Stripe in Agents." }),
    },
    {
      kind: "llm",
      name: "Check the refund policy",
      ms: between(rand, 1600, 2800),
      input: `Two charges of ${usd(amount)} on the same day for ${c.name}. Does the policy allow a refund?`,
      output: `Yes. The second charge is a duplicate, and duplicates are refunded in full without a manager's sign-off. Refund ${usd(amount)} to the card on file.`,
      tokens: { input: between(rand, 5200, 7600), output: between(rand, 200, 340), cached: 3000 },
    },
    {
      kind: "tool",
      server: "Stripe",
      name: "create_refund",
      effect: "spend",
      ms: between(rand, 600, 1000),
      args: { charge: `${charge}b`, amount: amount * 100, reason: "duplicate" },
      result: JSON.stringify({ id: "re_3Qp", status: "succeeded" }, null, 2),
      ask: {
        title: `Refund ${usd(amount)} to ${c.name}`,
        note: `The card was charged twice on October 1. This refunds the second charge.`,
        priority: amount >= 1000 ? "high" : "medium",
        preview: { kind: "payment", direction: "refund", amount, currency: "USD", counterparty: c.name, method: "Visa ending 4242", memo: "Duplicate charge, October" },
        fields: [{ key: "amount", label: "Amount to refund", value: amount.toFixed(2), inputMode: "decimal", max: amount, hint: `Up to ${usd(amount)}, the amount charged.` }],
      },
    },
    { kind: "output", output: { format: "json", text: JSON.stringify({ refunded: `${usd(amount)}`, charge: `${charge}b`, customer: c.name }, null, 2) } },
  ];
}

function research(task: string, rand: Rand, { fail, flaky }: Variation): Beat[] {
  const notes = `**${task}**\n\n- Two competitors moved SSO into their mid tier this month.\n- One raised its per-seat price by 12% and added a usage cap.\n- Churn interviews keep naming onboarding, not price.\n\nSources: 9 pages, read ${new Date().toISOString().slice(0, 10)}.`;
  return [
    {
      kind: "tool",
      server: "Web search",
      name: "search",
      effect: "read",
      ms: between(rand, 700, 1300),
      args: { query: `${task} 2026`, results: 8 },
      result: "8 results from news, changelogs and pricing pages.",
      ...(flaky && { flaky: { times: 1, error: "Timed out after 10s." } }),
      ...(fail && { error: "Timed out after 10s, three times. The search server may be down." }),
    },
    { kind: "tool", server: "Web search", name: "fetch_page", effect: "read", ms: between(rand, 600, 1100), args: { urls: 5 }, result: "5 pages, 41,200 characters." },
    {
      kind: "llm",
      name: "Summarize what changed",
      ms: between(rand, 2800, 4200),
      input: `Summarize for a busy team: ${task}. Bullets, with what it means for us.`,
      output: notes,
      tokens: { input: between(rand, 26000, 38000), output: between(rand, 900, 1500), cached: 12000 },
    },
    {
      kind: "tool",
      server: "Notion",
      name: "create_page",
      effect: "change",
      ms: between(rand, 500, 900),
      args: { parent: "Research › Digests", title: task },
      result: '{ "url": "https://notion.so/acme/digest" }',
      ask: {
        title: `Add “${task}” to Notion`,
        note: "A new page under Research › Digests. Nothing else changes.",
        preview: { kind: "details", rows: [{ label: "Page", value: task }, { label: "Under", value: "Research › Digests" }] },
      },
    },
    { kind: "output", output: { text: notes } },
  ];
}
