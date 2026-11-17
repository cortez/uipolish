import type { ModelOption } from "@/components/ui/model-picker/model-picker";
import type { Effort } from "./session";

/* The product's words in one place. Safe to import from client and server. */

export const PRODUCT_NAME = "Acme";
/** What the agent calls itself in answers and the composer's hint. */
export const AGENT_NAME = "Acme Agent";
/** Where Help → Documentation goes. */
export const HELP_URL = "https://example.com/docs";

/** The models people can pick with Claude (and the mock). The first is the default unless AI_MODEL names
 *  another. With OpenAI or an OpenAI-compatible API, the picker offers AI_MODEL instead (lib/coding/agents.ts). */
export const MODELS: ModelOption[] = [
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", description: "Fast and capable, for most changes" },
  { id: "claude-opus-5-5", name: "Opus 5.5", description: "Thinks longer on large refactors" },
  { id: "claude-haiku-5-5", name: "Haiku 5.5", description: "Quickest, for small fixes" },
];

/** How hard the agent thinks before it acts. Claude takes it as the thinking budget. */
export const EFFORTS: { id: Effort; name: string; description: string }[] = [
  { id: "low", name: "Low effort", description: "Answers quickly, plans little" },
  { id: "medium", name: "Medium effort", description: "Plans, then works" },
  { id: "high", name: "High effort", description: "Reads more and checks its work" },
];

export const GREETING = "What should we work on?";

/** On the home screen. Choosing one fills the composer; it never sends. */
export const STARTERS = [
  { title: "Fix the flaky checkout test", prompt: "The checkout E2E test fails about one run in five. Find out why and fix it." },
  { title: "Add rate limits to the export API", prompt: "Add a per-workspace rate limit to POST /api/export: 10 a minute, with a clear 429." },
  { title: "Dark mode for invoice PDFs", prompt: "Invoice PDFs ignore the theme. Render them with the dark palette when the workspace uses dark mode." },
];

/** What the model is told about itself and the Markdown the thread renders. */
export const SYSTEM_PROMPT = `You are ${AGENT_NAME}, a coding agent working on a team's repository in a session they share.
Answer as the engineer who did the work: what you found, what you changed and why, and anything the reviewer should check.
Format answers as Markdown: short paragraphs, bulleted lists, **bold** and \`inline code\` for files, functions and commit hashes. No headings.`;
