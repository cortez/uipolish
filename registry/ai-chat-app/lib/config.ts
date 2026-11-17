import type { ModelOption } from "@/components/ui/model-picker/model-picker";
import type { StarterPrompt } from "@/components/ui/chat-app/chat-app";

/* The product's words in one place. Safe to import from client and server. */

export const PRODUCT_NAME = "Acme";
export const ASSISTANT_NAME = "Acme Assistant";

/** The models people can pick with Claude (and the mock). The first is the default unless AI_MODEL names
 *  another. With OpenAI or an OpenAI-compatible API, the picker offers AI_MODEL instead (lib/ai/provider.ts). */
export const MODELS: ModelOption[] = [
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", description: "Fast and capable, for most work" },
  { id: "claude-opus-5-5", name: "Opus 5.5", description: "Thinks longer on hard problems" },
  { id: "claude-haiku-5-5", name: "Haiku 5.5", description: "Quickest, for short questions" },
];

/** Messages one person can send in a UTC day. Set DAILY_MESSAGE_LIMIT to change it; 0 turns it off. */
export const DEFAULT_DAILY_LIMIT = 100;

export const GREETING = "What are we working on?";

/** Shown on a new chat. Choosing one fills the composer; it never sends. */
export const STARTERS: StarterPrompt[] = [
  {
    title: "Plan a product launch",
    detail: "A checklist for the two weeks before",
    prompt: "Plan the launch of our new reporting feature. Give me a checklist for the two weeks before it ships.",
  },
  {
    title: "Write a customer reply",
    detail: "Firm, friendly, under 120 words",
    prompt: "Write a reply to a customer asking for a refund after their annual renewal. We can offer a prorated refund.",
  },
  {
    title: "Explain a SQL query",
    detail: "Line by line, in plain words",
    prompt:
      "Explain what this query does: SELECT plan, count(*) FROM accounts WHERE churned_at > now() - interval '30 days' GROUP BY plan;",
  },
];

/** What the model is told about the product and the Markdown the thread renders. */
export const SYSTEM_PROMPT = `You are ${ASSISTANT_NAME}, the assistant inside ${PRODUCT_NAME}. Be direct and specific.
Format answers as Markdown using only paragraphs, bulleted or numbered lists, **bold** and \`inline code\`. Don't use headings, tables or code blocks.`;
