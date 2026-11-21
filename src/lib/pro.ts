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
  { name: "settings", title: "Settings and billing", summary: "Profile, team members and roles, plans, invoices and API keys." },
  { name: "inbox", title: "Inbox", summary: "Triage a queue of conversations: filters, assignment, snooze and bulk actions." },
  { name: "analytics", title: "Analytics", summary: "Charts over a date range, filters, and a breakdown table you can sort." },
  { name: "onboarding", title: "Onboarding", summary: "A multi-step setup with progress, validation and a finish worth reaching." },
  { name: "auth", title: "Sign in", summary: "Sign in, sign up, a magic link, a two-step code and a password reset." },
  { name: "records", title: "Records", summary: "A CRM-style table with saved views, a record drawer and inline edits." },
  { name: "projects", title: "Projects", summary: "A board of tasks with a task drawer, filters, assignees and due dates." },
];
