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

/** Screens being built, shown on /screens until each one ships (then it
 *  comes from the screens themselves and drops off this list by name). */
export const PLANNED: { name: string; title: string; summary: string }[] = [
  { name: "support-widget", title: "Support widget", summary: "The assistant in the corner of your site: a launcher, help search, an AI chat that cites its sources, and a hand-off to a person." },
  { name: "agent-builder", title: "Agent builder", summary: "Configure an agent (model, instructions, tools, knowledge, guardrails), compare versions, and test the draft in a live chat before you publish." },
  { name: "traces", title: "Agent runs", summary: "Every run an agent made, and each one as a timeline of steps: model calls, tool calls, tokens, latency, cost and errors, with a replay." },
  { name: "approvals", title: "Approvals", summary: "A review queue for actions agents want to take: see what, why and what changes, then approve, edit or reject, one at a time or in bulk." },
  { name: "evals", title: "Evals and playground", summary: "Run a prompt across models side by side, score answers against a test set, and compare eval runs before a change ships." },
  { name: "knowledge", title: "Knowledge base", summary: "The documents an assistant answers from: upload, indexing status, chunks and sources, and a test search that shows what it retrieves." },
  { name: "inbox", title: "Support inbox", summary: "A support queue where AI triages every conversation and drafts each reply with its sources, and people review, edit and send." },
  { name: "analytics", title: "Usage and cost", summary: "Requests, tokens, spend and latency by model and feature, a budget with alerts, and the most expensive calls behind each number." },
  { name: "settings", title: "Settings and billing", summary: "Team and roles, usage-based billing with spend limits, API keys with scopes, and which models the workspace may use." },
];
