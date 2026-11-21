/** UI Polish Pro: whether it's on sale, the price, and what's coming;
 *  shared by /screens and every screen preview's bar. */

/** Pro opens for sale once there's a catalog worth the price. Until then
 *  nothing on the site sells it, whatever PRO_CHECKOUT_URL holds. */
export const PRO_OPEN = false;

export const PRO_PRICE = "$299";

/** The Polar checkout, from PRO_CHECKOUT_URL, once Pro is open. */
export const proCheckout = () => (PRO_OPEN ? process.env.PRO_CHECKOUT_URL?.trim() || null : null);

/** Where each screen's live preview opens. Copper predates /screens/<name>. */
export const previewHref = (name: string) => (name === "copper" ? "/example" : `/screens/${name}`);

/** The catalog in the order /screens shows it, with a one-line pitch each.
 *  A screen not built yet shows as "In the works"; a built screen missing
 *  here goes at the end with its own summary. */
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
