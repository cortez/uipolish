/** UI Polish Pro: whether it's on sale, the price, and what's coming;
 *  shared by /pro and every screen preview's bar. */

import { SCREEN_INFO } from "@pro/index";

/** Pro is on sale whenever the build has a catalog worth the price: six
 *  screens or more. With fewer (a build without the private screens) the
 *  site shows what there is and sells nothing. */
export const PRO_OPEN = SCREEN_INFO.length >= 6;

export const PRO_PRICE = "$299";
export const SCREEN_COUNT = SCREEN_INFO.length;

/** The Polar checkout, from PRO_CHECKOUT_URL, once Pro is open. */
export const proCheckout = () => (PRO_OPEN ? process.env.PRO_CHECKOUT_URL?.trim() || null : null);

/** Where each screen's live preview opens. Copper predates /pro/<name>. */
export const previewHref = (name: string) => (name === "copper" ? "/example" : `/pro/${name}`);

/** The catalog in the order /pro shows it, with a one-line pitch each.
 *  Only screens in the build show; one missing here goes at the end with
 *  its own summary. */
export const CATALOG: { name: string; title: string; tagline: string }[] = [
  { name: "copper", title: "Agent workspace", tagline: "A full AI assistant app: streaming chat with reasoning and tool steps, records in a drawer, a command palette." },
  { name: "agent-builder", title: "Agent builder", tagline: "Configure an agent's model, instructions, tools and knowledge, compare versions, and test the draft live." },
  { name: "traces", title: "Agent runs", tagline: "Every run as a timeline of model and tool calls, with tokens, cost, errors, replay and retry." },
  { name: "approvals", title: "Approvals", tagline: "Review what agents want to do: the reasoning, the exact change, policy checks; approve, edit or reject." },
  { name: "evals", title: "Evals and playground", tagline: "Run a prompt across models side by side, diff against a baseline, and compare graded eval runs." },
  { name: "knowledge", title: "Knowledge base", tagline: "The documents an assistant answers from: indexing, chunks, sources, and a test search with citations." },
  { name: "inbox", title: "Support inbox", tagline: "AI triages every conversation and drafts each reply with its sources; people review and send." },
  { name: "support-widget", title: "Support widget", tagline: "The assistant in the corner of your site: help search, an AI chat that cites sources, hand-off to a person." },
  { name: "analytics", title: "Usage and cost", tagline: "Spend, tokens and latency by model and feature, a budget with alerts, and the costliest calls behind them." },
  { name: "settings", title: "Settings and billing", tagline: "Team and roles, usage-based billing with spend limits, API keys with scopes, and allowed models." },
];

/** Polar's customer portal, where a buyer connects GitHub for repo access. */
export const PRO_PORTAL = "https://polar.sh/ui-polish/portal";

/** The /pro page's own words, also used for its Markdown twin. */
export const PRO_HEADLINE = "App screens for AI products, built with UI Polish.";
export const PRO_LEDE =
  "Chat, agent runs, approvals, evals, billing and more. Each screen handles its loading, empty and error states, and it’s plain React on the free components, so you can change anything.";

export const PRO_INCLUDED = [
  `All ${SCREEN_INFO.length} screens, plus every screen and update added later`,
  "No seat limits: use it across your company and on client projects",
  "Source, sample data and a written guide for each screen, in a private GitHub repo",
  "Made only from the free UI Polish components, so there’s nothing new to learn",
];

export const PRO_STEPS = [
  {
    title: "Buy",
    body: `Pay ${PRO_PRICE} through Polar. Your receipt and license key arrive by email.`,
  },
  {
    title: "Get the repo",
    body: "Sign in to Polar’s customer portal with the same email and connect GitHub. You’ll get an invite to the private repo.",
  },
  {
    title: "Copy a screen",
    body: "Copy a screen into your app, replace the sample data with yours, and edit whatever you like.",
  },
] as const;

export const PRO_FAQ: { q: string; a: string }[] = [
  {
    q: "Are the components free?",
    a: "Yes. Every UI Polish component is free and MIT licensed, and stays that way. Pro is the finished screens built from them.",
  },
  {
    q: "How many people can use it?",
    a: "Anyone at your company, on any number of projects, client work included. What you can’t do is resell or share the screens themselves as a kit or template.",
  },
  {
    q: "What do I need to use a screen?",
    a: "A React app with the UI Polish components installed. Each screen lists the components it imports, and its guide says how to wire in your own data.",
  },
  {
    q: "How do I get the screens after I buy?",
    a: "Your license key arrives by email. Sign in to Polar’s customer portal (polar.sh/ui-polish/portal) with the email you paid with and connect GitHub, and you’ll get an invite to the private repo. The same key works in your AI tool over MCP.",
  },
  {
    q: "Do I get new screens?",
    a: "Yes, at no extra cost, along with updates to the ones you have.",
  },
];
