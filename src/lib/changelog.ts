/** What changed, newest first. Each item links to the page it's about. */
/** `link` is the words that link to `href`, at the start of `text`. */
export type ChangeItem = { text: string; link?: string; href?: string };
export type ChangeEntry = { date: string; title: string; items: ChangeItem[] };

export const CHANGELOG: ChangeEntry[] = [
  {
    date: "2026-11-05",
    title: "Three templates, one edge, new empty states",
    items: [
      { text: "Agent workspace, a third template: a working Next.js app for coding with agents, in three calm panes. Sessions open as tabs over a conversation whose tool calls fold to one line, with the files each turn changed as chips; the pull request's merge status, files, checks and diff sit beside it, with a run panel and a team sidebar with presence. A scripted agent edits, tests and opens the pull request until a model or your own agent plugs in.", link: "Agent workspace", href: "/docs/agent-workspace" },
      { text: "File changes, Diff stat, Merge status and Turn summary, four agent-kit components: a changed-files list with folders cut from the start and names whole, “+12 −3” in the type around it, a pull request's one line with Merge in the success color once checks pass, and an agent's work folded to “17 tool calls, 3 messages” with the files it changed under the answer.", link: "File changes", href: "/docs/file-changes" },
      { text: "Sidebar: recent rows take a time or faces at their end, and items a status word (“Away”). Icons: app chrome (home, compose, settings, help, clock, share, folder, paperclip, at, list, terminal, branch, gauge, panel) and four change marks for files.", link: "Sidebar", href: "/docs/sidebar" },
      { text: "Chat app is a template only: the separate Chat app block is folded into it, so there is one chat app to pick, a whole working app.", link: "Chat app", href: "/docs/ai-chat-app" },
      { text: "Markdown, an agent-kit component: renders a model's reply as it streams, with headings, lists, task lists, tables, quotes and code blocks, and no flash of raw ** or backticks while a line is still arriving. HTML in a reply shows as text.", link: "Markdown", href: "/docs/markdown" },
      { text: "Chat app, the first template: a working Next.js AI chat app, with sign-in, a sidebar of chats and workspaces, replies streaming from Claude (or a mock until there's a key), and settings for the assistant, billing and members. One prompt or one shadcn command installs it.", link: "Chat app", href: "/docs/ai-chat-app" },
      { text: "Agent console, a second template: a working Next.js app for running AI agents, with live runs and their traces, an approvals inbox that holds a run until someone decides, a knowledge base the agents search, per-agent model, tools, permissions and limits, usage and workspace settings. A mock runner plays real-looking runs until yours plugs in.", link: "Agent console", href: "/docs/agent-console" },
      { text: "Pricing, a block: the public pricing page of an AI product, with a monthly/yearly switch whose prices roll in place, per-seat and per-credit notes, a featured plan, an Enterprise row, a comparison table with a sticky plan header (a plan picker on phones) and questions.", link: "Pricing", href: "/docs/pricing" },
      { text: "Settings, a block: workspace name, URL and logo, API keys whose secret shows once and that are flagged when stale, models and spend limits, and notification switches, with one save bar that rolls back if a save fails.", link: "Settings", href: "/docs/settings" },
      { text: "Approvals inbox is now a review queue for any sign-off, from people or agents: expenses, time off, discounts, access, refunds and posts, with requester notes, due dates, optional priority and grouping, and the raw call folded under Technical details. Old agent, reasoning and risk fields still work.", link: "Approvals inbox", href: "/docs/approvals-inbox" },
      { text: "Empty states: seven redrawn isometric drawings, including search, calendar and a didn't-load plug. No more icons on tiles.", link: "Empty states", href: "/docs/empty-state" },
      { text: "Pipeline: one stroke per stage, even gaps on every connector, and a clean vertical timeline on phones.", link: "Pipeline", href: "/docs/pipeline" },
      { text: "Every box at rest shares the controls' edge, and the lines inside it sit one step lighter. Menus and dialogs draw a single ring." },
      { text: "Disclosure chevrons morph between down and up everywhere, the way Accordion's do, instead of spinning.", link: "Disclosure chevrons", href: "/docs/accordion" },
      { text: "Nav rail's tooltip glides between items every time, at any pointer speed.", link: "Nav rail", href: "/docs/nav-rail" },
      { text: "Guide tables stack on narrow screens, avatars are always round, and single keys are short pills." },
    ],
  },
  {
    date: "2026-11-04",
    title: "Five blocks for AI products",
    items: [
      { text: "Approvals inbox: review what your agents want to do before they do it, with keyboard triage, undo and bulk approve.", link: "Approvals inbox", href: "/docs/approvals-inbox" },
      { text: "Run history: every agent run, with a trace of each step, its cost and what failed.", link: "Run history", href: "/docs/run-history" },
      { text: "Knowledge base: the documents an agent answers from, with live ingest, failures and a test panel.", link: "Knowledge base", href: "/docs/knowledge-base" },
      { text: "Onboarding: the first run of an AI product, from connecting tools to the agent doing its first real task.", link: "Onboarding", href: "/docs/onboarding" },
      { text: "Voice session: a live voice call with an agent, transcript, interruptions and a summary.", link: "Voice session", href: "/docs/voice-session" },
      { text: "Sidebar: a workspace switcher, items, folding sections, recent chats with rename, pin and delete, and an account menu. ⌘B folds it to an icon rail; on phones it's a drawer.", link: "Sidebar", href: "/docs/sidebar" },
      { text: "Every border, ring and divider now comes from one small set of edge colors, and shadows share their ink." },
    ],
  },
  {
    date: "2026-11-03",
    title: "The UI kit for AI products",
    items: [
      { text: "Agent task, a block: a coding agent's run with a color per phase, steps, tools, usage, pause and stop.", link: "Agent task", href: "/docs/agent-task" },
      { text: "Plan approval: review an agent's plan step by step, approve or skip each step, then run it.", link: "Plan approval", href: "/docs/plan-approval" },
      { text: "Pipeline: stages whose connectors fill as work moves, over the live log of the stage you're watching.", link: "Pipeline", href: "/docs/pipeline" },
      { text: "Nav rail: an icon rail or bottom bar with one tooltip that glides between items and shows each shortcut.", link: "Nav rail", href: "/docs/nav-rail" },
      { text: "Theme toggle: a sun that turns into a moon, a Light / Dark / System select, and a script that applies a stored theme before paint.", link: "Theme toggle", href: "/docs/theme-toggle" },
      { text: "Code input folds into a Verifying pill, then Verified, or opens back up with the error.", link: "Code input", href: "/docs/code-input" },
      { text: "Date picker months slide in the direction you're moving, at a constant height.", link: "Date picker", href: "/docs/date-picker" },
      { text: "Softer, larger isometric drawings in empty states.", link: "Softer, larger isometric drawings", href: "/docs/empty-state" },
      { text: "Install steps show each agent's mark; Select options take an icon.", link: "Install steps", href: "/docs" },
      { text: "Calmer page transitions, a numbered list of the rules on the home page, and many smaller fixes." },
    ],
  },
  {
    date: "2026-11-02",
    title: "Authorize",
    items: [{ text: "The consent screen for an agent connecting to an MCP server.", link: "The consent screen", href: "/docs/authorize" }],
  },
  {
    date: "2026-10-25",
    title: "Lighter code",
    items: [
      { text: "Shipped code carries fewer comments, so it costs your agent fewer tokens." },
      { text: "Shadows follow the theme; a dialog never opens over another." },
    ],
  },
  {
    date: "2026-10-24",
    title: "More components, Tailwind CSS and Markdown docs",
    items: [
      { text: "Data table: a keyboard-first virtualized grid.", link: "Data table", href: "/docs/data-table" },
      { text: "Drawer, skeleton, pagination, breadcrumbs, search field, copy field, inline edit, badge, chip, kbd, list and avatar." },
      { text: "Tailwind CSS v4: utility classes override the components, and a theme bridge maps the tokens.", link: "Tailwind CSS v4", href: "/docs/tailwind" },
      { text: "Every docs page copies itself as Markdown." },
    ],
  },
  {
    date: "2026-10-23",
    title: "UI Polish",
    items: [{ text: "The first components and design rules, delivered to coding agents over MCP.", link: "The first components and design rules", href: "/docs" }],
  },
];
