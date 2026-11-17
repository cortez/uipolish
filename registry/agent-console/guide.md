# Agent console

A working console for running AI agents, for the Next.js App Router,
assembled from the kit: people sign in with an emailed code, land on a live
list of runs, open any run to see every model and tool call it made, decide
what agents ask permission for in an approvals inbox (a run waits until
they do), give the agents documents to answer from, set each agent's model,
tools, permissions and daily limit, watch spend against a monthly limit,
and manage the workspace. It runs the moment it's installed: a mock runner
plays realistic runs (some retry, some fail, some stop to ask), and
everything is kept in memory. Set a model (Anthropic, OpenAI or any
OpenAI-compatible API) and new runs call it instead.

It's a starting point you own. Every screen is a kit block or component,
and the three parts every product replaces (the agent runner, sign-in and
storage) each sit behind one small file.

## What's included

| Area | What you get | Built from |
|---|---|---|
| Sign in | Email, then a six-digit code, with resend, wrong and expired codes, and rate limits. A signed session cookie | Sign in |
| App shell | Workspace switcher, Runs, Approvals (with a count of what's waiting), Knowledge, Agents, Usage, Settings, the account menu. Folds to a rail with ⌘B; a drawer on phones | Sidebar |
| Runs | Every run, filtered and paged, live ones counting up in place; new ones held behind "Show n new runs". A run's trace, retries and the failing step, tokens and cost, the output. New run, Re-run, Cancel run, Share link | Run history, Dialog, Select, Text field |
| Approvals | What runs stopped to ask: the email, refund or change drawn as it will happen, editable values, the raw tool call. Approve resumes the run with any edits; Decline stops it with the note | Approvals inbox |
| Knowledge | Files, sites and apps moving through reading, chunking and indexing; failures with the fix; a test panel showing what a question retrieves. The support agent's search reads it | Knowledge base |
| Agents | Each agent's instructions, model, MCP connections, what it may do without asking, and its daily limit, saved row by row | Agent settings, Connections, Tabs |
| Usage | This month's spend against the workspace limit, split by agent; runs, tokens, success rate; a table per agent | Usage meter, Stat, Data table |
| Settings | Workspace name, URL and time zone; API keys shown once; models and the monthly spend limit; notification switches with a test send | Settings |
| States | Loading a screen, a screen that failed, a run not in this workspace, a tool that fails and retries, a run that fails, a declined or expired approval, a server signed out, an agent over its daily limit | Empty state, Alert, Toast |

## Run it

1. Install it into a Next.js App Router project (below). It brings its own
   `app/layout.tsx` and `app/page.tsx`, so start from a fresh
   `npx create-next-app@latest`, or merge those two by hand.
2. Make sure `app/globals.css` imports the tokens. The shadcn CLI adds
   `@import "../components/ui/uipolish/tokens.css";` for you; by hand, add
   `foundation/tokens.css` there and import it.
3. `npm run dev`, open `/`, sign in with any email. The code is printed in
   the terminal running the app.

Then, in `.env.local`:

| Variable | What it does |
|---|---|
| `SESSION_SECRET` | Signs the session cookie. Required in production |
| `ALLOW_DEV_SIGN_IN` | `1` lets the development sign-in run in a production build, for a staging demo |

To run agents on a real model, connect one (below).

Your first sign-in creates two sample workspaces: Acme, with three agents
(support, billing, research), a week of their runs, five knowledge sources
and two API keys; and Acme Sandbox, nearly empty. While the mock runner is
in, each workspace starts two runs as it opens (one stops to send a reply,
one to refund a charge) and another every 15 to 40 seconds while fewer than
three are running.

## Connect a model

Set these in `.env.local` and restart the server. `lib/agents/connection.ts`
reads them once.

| Variable | What it does |
|---|---|
| `AI_PROVIDER` | `anthropic`, `openai`, `openai-compatible` or `mock`. Unset, it's picked from what else is set (below) |
| `AI_MODEL` | The model every agent runs on. Unset, each agent runs on its own (Agents → Model), which are Claude ids; OpenAI defaults to `gpt-5`, and OpenAI-compatible APIs need it |
| `AI_API_KEY` | The key. `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` work too |
| `AI_BASE_URL` | The API's address, up to `/v1`, for `openai-compatible`. With `anthropic` or `openai`, a gateway in front of them |

With no `AI_PROVIDER`: `AI_BASE_URL` means `openai-compatible`,
`ANTHROPIC_API_KEY` means `anthropic`, `OPENAI_API_KEY` means `openai`, and
`AI_API_KEY` alone means `anthropic` for an `sk-ant-` key and `openai`
otherwise. Nothing set, or a setting that can't work (logged at start),
keeps the mock.

```sh
# Anthropic: each agent on the Claude model it's set to
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-...

# OpenAI
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-5

# OpenRouter: any model it lists
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-...
AI_MODEL=openai/gpt-5

# Ollama, on this machine: no key
AI_PROVIDER=openai-compatible
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.3
```

Groq, Together, Fireworks, DeepSeek, LM Studio, vLLM and gateways such as
Vercel AI Gateway work the same way as OpenRouter.

With a model set, `lib/agents/model-runner.ts` runs each new run as one
model call: the agent's instructions as the system prompt and the task as
the message. An agent allowed `search_knowledge` (the support agent) first
searches Knowledge, as a tool step, and gets what it found with the task.
The answer streams into the trace's model step and becomes the run's
output, with the tokens the API reports (estimated at four characters a
token when it doesn't) priced at `SAMPLE_PRICES`. It doesn't call the
agents' MCP tools yet, and the sample traffic stops: only runs people start
run. Runs from the seed stay as they were.

## How a run travels

1. Something starts it: **New run** in Runs or Agents (the `startRun`
   server action), **Re-run**, or a schedule or webhook. In the sample,
   `engine.keepBusy()` stands in for those.
2. `lib/agents/engine.ts` saves the run as running and hands it to the
   runner. Each step the runner yields (a model call or a tool call,
   started, then finished, failed or retried) is saved as it comes, with
   the run's tokens and cost added up.
3. Before each tool call the runner asks `authorize`. The engine checks the
   agent's policy (`lib/agents/policy.ts`): a tool set to Always allow goes
   ahead; otherwise reads and changes follow Agents → Permissions, and
   sends, deletes and spends always ask. A server that's off or signed out
   fails the call with the fix.
4. When it must ask, the engine adds a "Wait for approval" step, files an
   Approval with what the tool will do, and holds the run. Approve, and the
   run goes on with any edited values (an amount, a reply's text); Decline,
   and it stops as cancelled with the note. An approval nobody decides
   expires after an hour (`APPROVAL_TTL_MS`).
5. The runner returns (succeeded), throws (failed, with the message), or is
   aborted by **Cancel run** (cancelled, "Cancelled by Ana Ruiz.").
6. The screens poll: Runs every 2 seconds and an open running trace every
   1.2, Approvals every 3, Knowledge every second while a source moves, the
   sidebar's count every 4. All reads go through `app/api/*`; every change
   through `app/(console)/actions.ts`.

## Swap in your own

**The runner.** `lib/agents/runner.ts` defines `AgentRunner`: take a task
and the agent, yield `step` and `output` events, and call
`context.authorize(request)` before any tool. `mock.ts` plays scripts from
`scenarios.ts`; `model-runner.ts` makes one model call through
`model-call.ts` (the Anthropic SDK, or Chat Completions with `fetch`). A
full agent is a tool loop on top of it (or the Claude Agent SDK, or your own
worker): send the agent's tools with each call, yield an `llm` step around
each model call with its `tokens` and `cost`, and a `tool` step around each
tool call after `authorize` allows it. Return it from `getRunner()`; the
engine, approvals and every screen stay as they are. Each tool request carries
what the approval shows: a `title`, a `note`, a `preview` (`email`,
`payment`, `details`, `diff`, `code`…) and the `fields` a person may edit.

**Where runs execute.** The engine runs agents in the server's process,
which suits a long-lived Node server. On serverless, start runs in a
durable worker (a queue, Inngest, Trigger.dev, Vercel Workflow) and replace
the in-memory `waiters` with a row the worker polls or a resume webhook;
`engine.decide()` is where a decision lands.

**Sign-in.** `lib/session.ts` sends codes, checks them and keeps a signed
cookie. Replace `sendEmail()` with your email provider and it's ready. For
an auth library (Auth.js, Clerk, WorkOS, Supabase Auth), make `getUser()`
return its user; every page, action and route goes through
`consoleFor()` or `apiOrNull()` in `lib/server.ts`, which call it.

**Storage.** `lib/db/database.ts` is the interface: workspaces, settings,
API keys, notifications, agents, runs, approvals and knowledge sources, one
method per query. `in-memory.ts` implements it; `seed.ts` fills a new
workspace. For Postgres with Drizzle, define tables with the same fields
(`runs` with `workspace_id`, `agent_id`, `status`, `started_at`, `tokens`,
`cost`, and `steps` and `output` as `jsonb`; `approvals` with `run_id`,
`status`, `expires_at`, and `preview`, `tool`, `fields`, `outcome` as
`jsonb`), implement `Database`, and export it as `db`.

**Knowledge.** `lib/knowledge/ingest.ts` walks each source through the
stages on timers and scores passages by shared words. Replace `walk` with
your pipeline (parse, chunk, embed, upsert) writing progress to the store,
and `search` with a query to your vector index; the support agent's
`search_knowledge` and the test panel both call it.

**Usage and billing.** Usage adds up what runs cost, at the sample prices in
`lib/product.ts` (`SAMPLE_PRICES`; a model not listed there is priced as
the first in `MODELS`). Use your provider's prices, or read
metered usage from your billing provider, in `usage()` in `lib/service.ts`.

## Customizing

- **Product name, models and choices**: `PRODUCT_NAME`, `MODELS`, `PLAN`,
  `SCOPES`, `FEATURES` and `NOTIFICATION_EVENTS` in `lib/product.ts`.
- **The mark**: `ProductMark` in `components/app/marks.tsx`, on the
  switcher's ink tile and the sign-in page. The nav's glyphs are beside it.
- **Agents**: `seed.ts` creates the sample three. Their scripts are in
  `scenarios.ts`; delete both once your runner and data are real.
- **Screens**: each is one file in `components/app/` that reads the console
  context (`useConsole()`), never the router or the server, and one page in
  `app/(console)/` that loads its first data. Add a screen to `SCREENS` in
  `console-sidebar.tsx` with a glyph, and a page beside the others.
- **Permissions**: what asks is `needsApproval()` in `lib/agents/policy.ts`.
  Change it there (by tool, by amount, by customer) and the engine follows.

## States

| State | What you see | Where |
|---|---|---|
| Signed out | Any app URL goes to `/sign-in` | `consoleFor()` in the console layout |
| First run | Sample workspaces, agents, runs and sources | `seed.ts` |
| Loading a screen | The bar, then the block's own loading state after 300ms | `loading` on each block |
| Screen failed | "This screen didn't load" with Try again; the sidebar keeps working | `(console)/error.tsx` |
| Live run | The row counts up and finishes in place; the open trace grows; Cancel run in the bar | `runs-screen.tsx` |
| New runs | "Show 2 new runs" over the table; runs you start show at once | `runs-screen.tsx` |
| Run waiting | A running "Wait for approval" step; the request in Approvals; the sidebar's count | `engine.ts` |
| Approved, edited | The run goes on with the edited value; "Approved by …" on the step | `engine.decide()` |
| Declined | The run cancelled with "Declined by …: “note”" | `engine.decide()` |
| Expired | After an hour, the approval moves to Expired and its run stops | `APPROVAL_TTL_MS` |
| Edit out of range | The field says so as you type; the server refuses it too, and the inbox puts the request back with the reason | `approvals-screen.tsx`, `engine.decide()` |
| Tool flaky, tool failed | An amber retried step then attempt 2; or the failed step open with its error | `mock.ts`, Run history |
| Server off or signed out | The tool call fails with the fix ("Sign in again in Agents → Connections") | `policy.ts` |
| Over the daily limit | New runs refuse with the limit and where to raise it | `engine.start()` |
| Run not here | "There's no run with that id in this workspace." | `run()` in `service.ts` |
| Knowledge failed | The file's failure and its fix, with Retry | `ingest.ts` |

## Installing as a template

A template is a registry item with `"type": "template"`. Its own files are
listed in `meta.json` `files` by the path they install at, from the project
root, or under `src/` when the project has one. `get_component` returns them
headed by that path; the shadcn item (`/r/agent-console.json`) is a
`registry:block` whose files carry it as `target`. The components and blocks
it uses come in the same answer at `components/ui/<name>/`, which is where
its imports (`@/components/ui/run-history/run-history`) point. Its one npm
package is `@anthropic-ai/sdk`, loaded only on a run when Claude is the
provider; the components need `@base-ui/react`.

## Accessibility

- Every screen has one `h1`: the block's title (on Agents, the open
  agent's name), or Usage's own. The sidebar is a `nav` named for the
  workspace.
- Runs, Approvals and Knowledge announce what changes through their blocks'
  polite regions; Instructions says "Saved" or why not in a status line.
- Focus: opening a run moves focus to its title and Runs returns it to the
  row; deciding a request moves to the next; dialogs return focus to the
  button that opened them.
- Keyboard: ⌘B folds the sidebar; in Approvals, J and K move, A approves,
  D declines, E edits; `/` searches Runs.
