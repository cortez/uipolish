// Docs pages that no longer exist. Kept as redirects so old links and
// search results land somewhere useful, and so /pro.md-style Markdown
// can explain the move instead of 404ing.

/** Whole screens, app templates, and paid Pro components from earlier
 *  Pro offerings. Those pages should reach today's Pro, not the free
 *  components homepage. */
export const RETIRED_PRO_DOCS = [
  "agent-task",
  "approvals-inbox",
  "billing",
  "chat-app",
  "knowledge-base",
  "onboarding",
  "pricing",
  "run-history",
  "settings",
  "team-members",
  "voice-session",
  "agent-console",
  "agent-workspace",
  "ai-chat-app",
  "agent-settings",
  "connections",
  "plan-approval",
  "tool-approval",
  "merge-status",
  "file-changes",
  "turn-summary",
  "batch-progress",
  "background-run",
  "research-progress",
  "pipeline",
] as const;

/** Retired pages that were not the paid product: a free block, and small
 *  primitives folded into other components. These still go home. */
export const RETIRED_DOCS = [
  "sign-in",
  "authorize",
  "brand-marks",
  "sources",
  "diff-stat",
  "stat",
  "voice-input",
  "phone-input",
] as const;

export type RetiredProDoc = (typeof RETIRED_PRO_DOCS)[number];
export type RetiredDoc = (typeof RETIRED_DOCS)[number];

export const isRetiredProDoc = (name: string): name is RetiredProDoc =>
  (RETIRED_PRO_DOCS as readonly string[]).includes(name);

export const isRetiredDoc = (name: string): name is RetiredDoc =>
  (RETIRED_DOCS as readonly string[]).includes(name);
