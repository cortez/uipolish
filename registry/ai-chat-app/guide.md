# Chat app

A working AI chat app for the Next.js App Router, assembled from the kit: people sign in with an emailed code, land in a sidebar of their chats,
talk to a model (Claude, OpenAI, or any OpenAI-compatible API) with the
reasoning, tool steps and sources showing as they stream, and manage the
assistant, billing and members in settings. It runs the moment it's
installed: until a model is set, a mock answers, and everything is kept in
memory.

It's a starting point you own. Every screen is a kit block or component,
and the three parts every product replaces (the model, sign-in and storage)
each sit behind one small file.

## What's included

| Area | What you get | Built from |
|---|---|---|
| Sign in | Email, then a six-digit code, with resend, wrong and expired codes, and rate limits. A signed session cookie | Sign in |
| App shell | Workspace switcher, New chat, ⌘K search over chats, the chat list with rename, pin and delete (with Undo), the account menu. Folds to a rail with ⌘B; a drawer on phones | Sidebar, Command palette, Toast |
| Chat | A new-chat screen with starter prompts, then the thread: reasoning, tool steps, cited sources, copy and retry. Model picker, Stop, theme toggle | Message thread, Prompt input, Chat app's reply, Model picker, Theme toggle |
| Streaming | `POST /api/chat` streams one reply as NDJSON and saves it however it ends: complete, stopped or failed | Route Handler, Anthropic SDK or `fetch` |
| Settings | Assistant (default model, memory), Billing (plans, usage, invoices, cancel), Members (roles, invites) in tabs kept in the URL | Agent settings, Billing, Team members, Tabs |
| States | Loading a chat, a chat that isn't there, a page that failed, a reply that failed partway, offline, the daily limit, an empty history | Empty state, Alert |

## Run it

1. Install it into a Next.js App Router project (below). It brings its own
   `app/layout.tsx` and `app/page.tsx`, so start from a fresh
   `npx create-next-app@latest`, or merge those two by hand.
2. Make sure `app/globals.css` imports the tokens. The shadcn CLI adds
   `@import "../components/ui/uipolish/tokens.css";` for you; by hand, add
   `foundation/tokens.css` there and import it.
3. `npm run dev`, open `/`, sign in with any email. The code is printed in
   the terminal running the app.

Then connect a model (below), and in `.env.local`:

| Variable | What it does |
|---|---|
| `SESSION_SECRET` | Signs the session cookie. Required in production |
| `DAILY_MESSAGE_LIMIT` | Messages a person can send per UTC day. 100 by default; `0` turns it off |
| `ALLOW_DEV_SIGN_IN` | `1` lets the development sign-in run in a production build, for a staging demo |

With the mock, a starter prompt gets a full reply (reasoning, two tool
steps, sources); anything else gets one reply that says how to connect a
model. Put `/error` in a message to see a reply fail partway.

## Connect a model

Set these in `.env.local` and restart the server. `lib/ai/connection.ts`
reads them once.

| Variable | What it does |
|---|---|
| `AI_PROVIDER` | `anthropic`, `openai`, `openai-compatible` or `mock`. Unset, it's picked from what else is set (below) |
| `AI_MODEL` | The model id. With Claude, the default in the picker (`claude-sonnet-5-5` unless set); with OpenAI (`gpt-5` unless set) and OpenAI-compatible APIs (required), the one model offered |
| `AI_API_KEY` | The key. `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` work too |
| `AI_BASE_URL` | The API's address, up to `/v1`, for `openai-compatible`. With `anthropic` or `openai`, a gateway in front of them |

With no `AI_PROVIDER`: `AI_BASE_URL` means `openai-compatible`,
`ANTHROPIC_API_KEY` means `anthropic`, `OPENAI_API_KEY` means `openai`, and
`AI_API_KEY` alone means `anthropic` for an `sk-ant-` key and `openai`
otherwise. Nothing set means the mock. A setting that can't work (no key,
no base URL, an unknown provider) falls back to the mock and says why under
the composer and in the server log.

```sh
# Anthropic: Claude, with summarized reasoning
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
Vercel AI Gateway or an Azure OpenAI-compatible endpoint work the same way
as OpenRouter: their base URL, key and model id. `ANTHROPIC_MODEL` from
earlier versions still sets Claude's default.

What streams depends on the API. Claude streams summarized reasoning, then
the answer. OpenAI-compatible APIs that stream reasoning
(`reasoning_content` or `reasoning` in the delta: DeepSeek, OpenRouter,
Groq, Ollama, LM Studio) show it the same way; the rest, OpenAI's own
models included, go straight to the answer. Rate limits, a rejected key, a
model that isn't there and a reply cut off at its length limit each show
their own message.

## How a message travels

1. `components/app/use-chat.ts` adds the message and an empty reply at once,
   then `POST`s `{ conversationId, text, model }` to `/api/chat`.
2. `app/api/chat/route.ts` checks the session and the daily limit (a `429`
   puts the text back in the composer and shows the limit notice), creates
   the chat if it's new, saves the message, and calls the provider.
3. The provider (`lib/ai/anthropic.ts`, `openai.ts` or `mock.ts`) yields `reasoning`,
   `text`, `step` and `sources` events. The route forwards each as one line
   of JSON and folds it into the reply with `applyEvent` (`lib/ai/events.ts`),
   the same function the browser uses, so what streams is what's saved.
4. The first line is `start`, with the chat's id and title: a new chat joins
   the sidebar and the URL becomes `/chat/<id>` in place, without
   interrupting the reply. The last line is `done` or `error`.
5. Stop aborts the request; the route sees the abort and saves the reply as
   stopped. A connection that drops shows the partial reply with Retry,
   which asks the route to write the last reply again (`retryOf`).

## Swap in your own

**The model.** `lib/ai/provider.ts` defines `ChatProvider`: take the
conversation as text turns, yield events. `anthropic.ts` streams from the
Messages API with adaptive thinking, its reasoning summarized so it can be
shown; `openai.ts` streams Chat Completions with `fetch` and reads the
server-sent events itself. To call tools, run them in the provider and
yield a `step` event per change (`status: "running"`, then `"done"` with a
`detail`), and `sources` for anything the answer cites as `[1]`. An API
that speaks neither is one more file that implements `ChatProvider`,
returned from `getProvider()`. The Claude models people can pick, the
system prompt and the starters are in `lib/config.ts`; `availableModels()`
in `provider.ts` decides what the picker offers for each provider.

**Sign-in.** `lib/auth.ts` sends codes, checks them and keeps a signed
cookie. Replace `sendEmail()` with your email provider and it's ready. For
an auth library (Auth.js, Clerk, WorkOS, Supabase Auth), make `getUser()`
return its user; every page, action and the route go through `getUser()`
or `requireUser()`, so nothing else changes.

**Storage.** `lib/db/store.ts` is the interface: conversations, messages,
workspaces and preferences, one method per query. `memory.ts` implements it
in memory. For Postgres with Drizzle, define tables with the same fields
(`conversations` with `user_id`, `workspace_id`, `title`, `pinned`, `model`,
`deleted_at`; `messages` with `conversation_id`, `role`, `text`, `status`,
and `reasoning`, `steps`, `sources` as `jsonb`), implement `Store` with one
query per method, and export it from `store.ts`.

**Billing and members.** `lib/sample-billing.ts` holds sample plans, a card,
invoices and teammates; `components/app/settings-view.tsx` changes them in
the page's state. Point the Billing callbacks at your processor (Stripe
Checkout to change plan, its customer portal for the card and cancelling)
and the Team members callbacks at your database. The usage meter is real:
it counts today's messages against the daily limit.

**The settings screen.** `app/(app)/settings/page.tsx` loads everything and
hands it to `SettingsView`, and nothing else imports `SettingsView`. A
different settings screen replaces it in that one file.

## Customizing

- **Product and assistant names**: `PRODUCT_NAME`, `ASSISTANT_NAME`,
  `GREETING` and `STARTERS` in `lib/config.ts`. Write starters as tasks your
  users really bring, with a detail line that says what they get.
- **The mark**: `ProductMark` in `components/app/glyphs.tsx`, shown on the
  switcher's ink tile and on the sign-in page.
- **Workspaces**: `listWorkspaces` in the store creates two for each person.
  Chats belong to one; the switcher sets a cookie and reloads the list.
- **Sidebar items**: `ITEMS` in `components/app/app-sidebar.tsx`. Each needs
  an icon, since it stays in the folded rail.
- **Page header**: `TopBar` in `components/app/top-bar.tsx` is one row of
  32px controls. The title stays on one line and fades out at the end when
  it doesn't fit (a long chat name on a phone); the sidebar shows it whole.
- **Rich answers**: replies render the thread's Markdown subset
  (paragraphs, lists, bold, inline code), and the system prompt asks for
  just that. For tables or code blocks, swap the renderer in the Chat app
  block's `assistant-message.tsx` and loosen the prompt.
- **Attachments**: `PromptInput` supports them; turn `attachments` on in
  `chat-view.tsx` and send the files to the route as `multipart/form-data`,
  then on to the model as image or document blocks.

## States

| State | What you see | Where |
|---|---|---|
| Signed out | Any app URL goes to `/sign-in` | `requireUser()` in the app layout |
| First run | "No chats yet" in the sidebar; the greeting and starters | Sidebar `recent.empty`, `chat-view.tsx` |
| Loading a chat | The chat's frame, "Loading conversation…" after 300ms | `chat/[id]/loading.tsx` |
| Chat not found | "This chat isn't here" with New chat | `chat/[id]/not-found.tsx` |
| Page failed | "This page didn't load" with Try again; the sidebar keeps working | `(app)/error.tsx` |
| Streaming | Reasoning, then steps, then words fading in; Send becomes Stop; the model is fixed until it's done | `use-chat.ts` |
| Stopped | The partial reply, "You stopped this reply.", Retry | Stop, or leaving the page |
| Failed partway | The partial reply, the reason in red, Retry | `error` event, or a dropped connection |
| Offline | A warning over the composer; drafting works, Send keeps the draft | `navigator.onLine` |
| Daily limit | "You've reached today's limit. It resets at 1:00 AM." with See plans; the composer is disabled until then | `429` from the route, or on load |
| Model rate limit or overload | The partial reply with the reason and Retry | `ProviderError` in `anthropic.ts` and `openai.ts` |
| Deleted chat | Gone from the list, "Chat deleted" toast with Undo | Soft delete in the store |
| Rename, pin failed | The rename field keeps the text and says why; a failed pin flips back with Retry | `actions.ts` results |

## Installing as a template

A template is a registry item with `"type": "template"`. Its own files are
listed in `meta.json` `files` by the path they install at, from the project
root, or under `src/` when the project has one. `get_component` returns them
headed by that path; the shadcn item (`/r/ai-chat-app.json`) is a
`registry:block` whose files carry it as `target`. The components and blocks
it uses come in the same answer at `components/ui/<name>/`, which is where
its imports (`@/components/ui/sidebar/sidebar`) point. Its one npm package is
`@anthropic-ai/sdk`, loaded only when Claude is the provider; the components
need `@base-ui/react`.

## Accessibility

- Every page has one `h1` in its header; the sidebar is a `nav` named for
  the workspace, the conversation a `section` named for the chat.
- The thread is a `role="log"`: each reply is announced once, when it
  finishes. Reasoning, steps, notices and toasts have their own polite
  regions.
- Focus: a deleted chat moves focus to the next one, a rename returns it to
  the row, and the search palette returns it to where it opened from.
- Keyboard: ⌘K (Ctrl+K) searches chats, ⌘B folds the sidebar, Enter sends,
  Escape stops a reply.
