import type { Source, ToolStep } from "@/components/ui/chat-app/chat-app";
import { STARTERS } from "@/lib/config";
import type { ProviderEvent } from "./events";
import { ProviderError, type ChatProvider } from "./provider";

/* Replies without a model, used until the environment names one (see
   lib/ai/connection.ts), so the app runs the moment it's installed. The starter prompts get full replies
   (reasoning, tool steps, cited sources); anything else gets one reply that
   says where the real model plugs in. A message containing /error drops
   partway, so the failure state can be seen. Runs in the browser too: the
   docs preview streams from it directly. */

type Script = { reasoning?: string; steps?: (ToolStep & { ms: number; running: string })[]; sources?: Source[]; text: string };

const SCRIPTS: Script[] = [
  {
    reasoning:
      "A two-week launch plan needs to work back from the ship date. The parts that slip are usually docs, support readiness and the announcement, so those go first.\n\nI should check what shipped in reporting recently, so the announcement doesn’t repeat an old change.",
    steps: [
      { id: "search", running: "Searching for launch checklists", title: "Searched for launch checklists", status: "done", detail: "4 results", input: 'web.search("saas feature launch checklist")', ms: 1400 },
      { id: "changelog", running: "Reading the changelog", title: "Read the changelog", status: "done", detail: "3 reporting changes since September", input: 'changelog.list({ area: "reporting", since: "2026-09-01" })', ms: 1100 },
    ],
    sources: [
      { title: "Shipping a feature: the two-week checklist", url: "https://handbook.example.com/launch-checklist", excerpt: "Freeze scope at T-14, docs and support macros by T-7, the announcement drafted by T-5." },
      { title: "Changelog: Reporting", url: "https://acme.example.com/changelog/reporting", excerpt: "Scheduled exports and CSV filters shipped in September and October." },
    ],
    text: `Here’s a plan that works back from launch day, with the risky parts early.

**Two weeks out**
- Freeze the scope and write down what’s not in this release[1].
- Book a 30-minute review with support so they can try it on staging.
- Draft the docs page and the in-app empty state.

**One week out**
- Publish the docs behind a flag and send support their reply macros.
- Write the announcement. Lead with what people can do now, not with scheduled exports, which shipped in September[2].
- Pick five customers who asked for this and line up a personal note.

**Launch day**
- Turn the flag on for 10% of workspaces at 10:00, everyone by 14:00 if errors stay flat.
- Post the changelog entry and the email once it’s at 100%.

Want me to turn this into tasks with owners and dates?`,
  },
  {
    reasoning:
      "They renewed annually and want money back. We can offer a prorated refund, so the reply should say yes clearly, explain the amount, and not make them ask twice.",
    text: `Here’s a reply you can send:

Hi Dana, thanks for letting us know. We can refund the unused part of your annual plan. You renewed on October 2, so that’s **$412.50** back to the card ending 4242, usually within 5 business days.

Your workspace stays active until the refund goes through, so you can export anything you need first. If it’s the price that’s the problem, I can also move you to monthly billing instead.

Best,
Sam`,
  },
  {
    text: `It counts how many accounts on each plan churned in the last 30 days.

1. \`SELECT plan, count(*)\` returns one row per plan with the number of accounts in it.
2. \`FROM accounts\` reads the accounts table.
3. \`WHERE churned_at > now() - interval '30 days'\` keeps only accounts that churned in the last 30 days. Accounts that never churned have no \`churned_at\`, so they drop out too.
4. \`GROUP BY plan\` makes the count per plan rather than one total.

One thing to watch: a plan with no churn in that window won’t appear at all, rather than showing 0.`,
  },
];

const FALLBACK: Script = {
  text: `This reply comes from a mock model, so it’s the same whatever you ask. To use a real one, set \`AI_PROVIDER\` (\`anthropic\`, \`openai\` or \`openai-compatible\`), \`AI_API_KEY\` and \`AI_MODEL\` in \`.env.local\` and restart the server.

Everything around it is real: this chat was saved, it’s in the sidebar, and you can rename, pin or delete it. Start a new chat and pick a starter to see reasoning, tool steps and sources.`,
};

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)), { once: true });
  });

// One to three words at a time, with longer pauses after sentences, like a model.
function tokens(text: string) {
  const words = text.match(/\S+\s*|\s+/g) ?? [];
  const out: string[] = [];
  for (let i = 0; i < words.length; ) {
    const take = 1 + Math.floor(Math.random() * 3);
    out.push(words.slice(i, i + take).join(""));
    i += take;
  }
  return out;
}
const pause = (t: string) => (/[.:?!]\s*$/.test(t.trimEnd()) || t.includes("\n\n") ? 90 + Math.random() * 120 : 18 + Math.random() * 30);

export const mock: ChatProvider = {
  name: "mock",
  async *stream({ messages, signal }) {
    const last = messages.at(-1)?.content ?? "";
    const script = SCRIPTS[STARTERS.findIndex((s) => (s.prompt ?? s.title) === last.trim())] ?? FALLBACK;
    const fail = last.includes("/error");

    await wait(400, signal);
    if (script.reasoning) {
      for (const t of tokens(script.reasoning)) {
        await wait(pause(t) * 1.2, signal);
        yield { type: "reasoning", text: t } satisfies ProviderEvent;
      }
    }
    for (const { ms, running, ...done } of script.steps ?? []) {
      const startedAt = Date.now();
      yield { type: "step", step: { ...done, title: running, status: "running", detail: undefined, startedAt } };
      await wait(ms, signal);
      yield { type: "step", step: { ...done, startedAt, finishedAt: Date.now() } };
    }
    if (script.sources) yield { type: "sources", sources: script.sources };

    const all = tokens(script.text);
    for (let i = 0; i < all.length; i++) {
      if (fail && i === Math.floor(all.length / 2)) throw new ProviderError("failed", "The connection to the model dropped before this reply finished.");
      await wait(pause(all[i]), signal);
      yield { type: "text", text: all[i] };
    }
  },
};
