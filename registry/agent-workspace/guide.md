# Agent workspace

A working Next.js App Router app for coding with agents, assembled from the
kit, in three calm panes. On the left, a sidebar: the workspace switcher,
Home, New session and Search, pinned and recent sessions (shared ones with
their teammates' faces, the rest with how long ago they moved), the team
with their presence, and a bottom bar with the plan, Help and Settings. In
the middle, the open sessions as tabs over the conversation: each prompt, the
agent's tool calls folded to one line, its answer with file names and commit
hashes as code, and a footer with the files that turn changed and their diff
stats; a rail of ticks marks every prompt. On the right, the pull request's
merge status and its one move, then All files, Changes, Checks and Review,
and a Run panel underneath.

It runs the moment it's installed: a scripted agent reads, edits, runs the
tests, commits, opens the pull request and waits for its checks, and
everything is kept in memory. Set a model (Anthropic, OpenAI or any
OpenAI-compatible API) and it answers instead; plug in a real coding agent
and the panes follow. The agent, sign-in and storage each sit behind one
small file.

## What's included

| Area | What you get | Built from |
|---|---|---|
| Sign in | Email, then a six-digit code, with resend, wrong and expired codes, and rate limits. A signed session cookie | Sign in |
| Sidebar | Workspace switcher with the repository; Home, New session, Search (⌘K); pinned and recent sessions with rename, pin and delete, relative times, faces for shared sessions and a dot while the agent works; Team with presence (a teammate's row starts a session mentioning them); the plan, Help (shortcuts, docs) and Settings (theme, sign out). Folds to a rail with ⌘B; a drawer on phones | Sidebar, Avatar, Badge, Command palette, Dialog |
| Tabs | Open sessions as tabs: titles cut with a fade, Rename and Close on hover and on the current tab (double-click renames too), New session at the end, a dot on a tab whose agent works. History (jump to any prompt), Copy link, Share (with teammates) and the changes panel's toggle (⌘.) | Dropdown menu, Tooltip, Toast |
| Conversation | Prompts as bubbles, a teammate's under their name, with the files they name as chips; the agent's work as “› 17 tool calls, 3 messages” that opens to its notes and Tool steps; the answer in Markdown; a footer with file chips and diff stats, the time it took, Copy and More. Follows the newest line until you scroll up, then offers one way back. A tick rail on its edge marks each prompt | Turn summary, File changes, Markdown, Tool steps |
| Composer | Prompt input with attach, a mention menu and mention chips, the model and the effort, Send that becomes Stop while the agent works | Prompt input, Model picker, Chip |
| Changes | Merge status (draft, checks running, a check failed, ready, merged) with Merge in the success color; All files with the changed ones marked; Changes with folders muted and cut from the start, names whole, +N −M and the kind of change; Checks; Review with the diff of the file you pick | Merge status, File changes, Diff stat, Tabs, Tool steps, Diff view, Empty state |
| Run | Start dev (⌘R) with the dev server's output, Stop and Restart; Terminal with the commands the agent ran | Tabs, Button, Kbd |
| Layout | The changes panel resizes (drag or arrow keys, double-click to reset) and folds; the width and fold are kept. A screen too narrow for both panes (a phone, a small window) shows one at a time, picked from a bar along the bottom | Nav rail |
| States | Loading a session, a session that isn't there, a screen that failed, a stream that dropped and reconnects, a turn that's stopped or failed, a check that fails, a merge that's refused, a merged session that's closed | Empty state, Toast |

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

Your first sign-in creates two sample workspaces: Acme (`acme/web`), with a
team of four and seven sessions (one ready to merge and shared with Maya,
one whose E2E check failed, one merged), and Acme Labs, with one.

## Connect a model

Set these in `.env.local` and restart the server. `lib/coding/connection.ts`
reads them once.

| Variable | What it does |
|---|---|
| `AI_PROVIDER` | `anthropic`, `openai`, `openai-compatible` or `mock`. Unset, it's picked from what else is set (below) |
| `AI_MODEL` | The model to run. Unset, the one picked in the composer (Claude ids); OpenAI defaults to `gpt-5`, and OpenAI-compatible APIs need it |
| `AI_API_KEY` | The key. `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` work too |
| `AI_BASE_URL` | The API's address, up to `/v1`, for `openai-compatible`. With `anthropic` or `openai`, a gateway in front of them |

With no `AI_PROVIDER`: `AI_BASE_URL` means `openai-compatible`,
`ANTHROPIC_API_KEY` means `anthropic`, `OPENAI_API_KEY` means `openai`, and
`AI_API_KEY` alone means `anthropic` for an `sk-ant-` key and `openai`
otherwise. Nothing set, or a setting that can't work (logged at start, and
said under the composer), keeps the mock.

```sh
# Anthropic: the Claude model picked in the composer
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-...

# OpenAI
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-5

# OpenRouter, or any OpenAI-compatible API
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-...
AI_MODEL=openai/gpt-5

# Ollama, on this machine: no key
AI_PROVIDER=openai-compatible
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.3
```

With a model set, `lib/coding/model-agent.ts` answers each prompt with one
streamed model call, shown as a tool step: the session so far, the
repository and branch, and the effort as a line of instructions. It has no
sandbox, so it reads and changes no files; it answers from the
conversation. That's the seam for a real coding agent (below).

## How a turn travels

1. Someone sends a prompt: the composer calls `createSession` or
   `sendPrompt` in `app/(workspace)/actions.ts`. The service
   (`lib/coding/service.ts`) checks who may, picks the model and starts a
   turn.
2. `lib/coding/engine.ts` runs the agent and folds every event it yields
   (`note`, `step`, `file`, `pr`, `checks`, `text`) into the session with
   `applyEvent` (`lib/coding/session.ts`), saves it and sends it to every
   watcher, one event at a time per session.
3. Every open tab of the session reads `GET /api/sessions/:id/events`: the
   session as it is, then each event as one line of JSON. The browser folds
   them with the same `applyEvent`, so what streams is what's stored. A
   dropped stream reconnects and starts again from a fresh snapshot.
4. The turn ends `done`, `stopped` (Stop, or Escape in the composer) or
   `error` with the message. A server that restarts mid-turn settles it
   as stopped the next time the session is opened.
5. Merge (`mergeSession`) is refused unless every check passed and the agent
   isn't working; then it's your Git host's merge call.
6. The sidebar's sessions refresh every 5 seconds and after anything that
   moves them.

## Swap in your own

**The agent.** `lib/coding/agent.ts` defines `CodingAgent`: take the session
and the prompt, yield events as you work, return when done, throw to fail,
stop when the signal aborts. `getAgent()` in `lib/coding/agents.ts` picks
one. For a real coding agent (the Claude Agent SDK in a sandbox, your own
worker), run its tool loop and yield a `step` around each tool call (with
`icon`, `input` and `output`), a `file` for each file it changes with its
counts and, for Review, `before` and `after`; `pr` when it opens the pull
request; `checks` as your CI reports; `text` for the answer. The engine and
every pane stay as they are. `mock-agent.ts` is a full example, timed like
the real thing.

**Where turns run.** The engine runs agents in the server's process, which
suits a long-lived Node server. On serverless, run turns in a durable worker
(a queue, Inngest, Trigger.dev, Vercel Workflow) that writes events to a
table, and have the events route read from it.

**The pull request and checks.** `merge()` in `lib/coding/service.ts` is
where your Git host's merge goes; `repoFiles()` in the store is its tree.
Check runs arrive as `checks` events, from your agent or a webhook calling
`engine.apply()`.

**Run.** `startDevServer()` in `components/app/run-panel.tsx` plays a sample
log. Point it at your sandbox's process API and stream its lines.

**Sign-in.** `lib/coding/auth.ts` sends codes, checks them and keeps a signed
cookie. Replace `sendEmail()` with your email provider and it's ready. For
an auth library (Auth.js, Clerk, WorkOS, Supabase Auth), make `getUser()`
return its user; every page, action and route goes through `workspaceFor()`
or `apiOrNull()` in `lib/coding/server.ts`.

**Storage.** `lib/coding/store.ts` is the interface (`WorkspaceStore`) and
an in-memory implementation; `seed.ts` fills a first visit. A session is one
document (turns, files, checks and pull request together), so a `jsonb`
column suits it, with `workspace_id`, `owner_id`, `shared_with` and
`updated_at` beside it for the sidebar's query. Implement the interface and
export it as `store`.

## Customizing

- **Words and models**: `PRODUCT_NAME`, `AGENT_NAME`, `HELP_URL`, `MODELS`,
  `EFFORTS`, `GREETING`, `STARTERS` and `SYSTEM_PROMPT` in
  `lib/coding/config.ts`.
- **The mark**: `WorkspaceMark` in `components/app/workspace-marks.tsx`, on
  the switcher's ink tile and the sign-in page.
- **Panes**: each is one file in `components/app/` that reads the workspace
  context (`useWorkspace()`), never the router or the server:
  `workspace-sidebar.tsx`, `session-tabs.tsx`, `session-thread.tsx`,
  `session-composer.tsx`, `changes-panel.tsx`, `run-panel.tsx`.
- **The panel's size**: `PANEL` in `components/app/session-screen.tsx`
  (min, max, starting width); `CENTER_MIN` is the conversation's least
  width, under which the panes take turns.

## Keyboard

| Keys | Does |
|---|---|
| ⌘K | Search sessions |
| ⌘B | Fold or open the sidebar |
| ⌘. | Show or hide the changes panel |
| ⌘R | Start the dev server (in place of reloading the page) |
| Enter, Shift+Enter | Send; a new line |
| Escape | Stop the agent while it works |
| ↑ ↓ in a file list | Move the selection; Review follows |
| ← → on the panel's edge | Resize it |

## States

| State | What you see | Where |
|---|---|---|
| Signed out | Any app URL goes to `/sign-in` | `workspaceFor()` |
| First run | Sample workspaces, team and sessions | `seed.ts` |
| New session | A greeting, the composer, three starters that fill it, and what's working now | `new-session.tsx` |
| Loading a session | “Loading session…” under a light band, where the thread goes | `session-screen.tsx` |
| Not here | “This session isn't here” with Start a session | `session-missing.tsx` |
| Screen failed | “This session didn't load” with Try again; the sidebar keeps working | `(workspace)/error.tsx` |
| Working | A dot on its tab and sidebar row; the work line shimmers and counts; the footer counts up; Send is Stop | `use-session.ts` |
| Reading back | Scrolled up while it works: the thread holds still, “Follow the agent” brings you back | `session-thread.tsx` |
| Reconnecting | A small note over the thread; the stream starts again from a snapshot | `http-workspace.ts` |
| Stopped, failed | “Stopped. Send another prompt to go on.”, or the error in danger | `session-thread.tsx` |
| Checks | Running with a count, a failed one in danger with its message in Checks | `changes-panel.tsx` |
| Merge refused, failed | The reason in the merge line, Merge enabled again | Merge status |
| Merged | “Merged into main”; the composer says the session is closed | `session-composer.tsx` |
| Narrow | One pane at a time with a bar along the bottom; the composer drops the effort picker | `session-screen.tsx` |

## Installing as a template

A template is a registry item with `"type": "template"`. Its own files are
listed in `meta.json` `files` by the path they install at, from the project
root, or under `src/` when the project has one. `get_component` returns them
headed by that path; the shadcn item (`/r/agent-workspace.json`) is a
`registry:block` whose files carry it as `target`. The components it uses
come in the same answer at `components/ui/<name>/`, which is where its
imports (`@/components/ui/file-changes/file-changes`) point. Its one npm
package is `@anthropic-ai/sdk`, loaded only when Claude is the provider; the
components need `@base-ui/react`.

## Accessibility

- Every view has one `h1`: the session's title, Home's greeting, or the
  missing session's. The sidebar is a `nav` named for the workspace; the
  tabs are a `nav` of open sessions with `aria-current`.
- The thread is a `log`; “working” and “finished” are announced once, not
  every word. The merge line is a status region.
- File lists are listboxes with one tab stop; the panel's edge is a
  `separator` you resize with the arrow keys.
- Everything shown on hover (Rename, Close, a tick's prompt) is also a
  focusable control or in a menu, and the current tab keeps its actions on
  touch.
