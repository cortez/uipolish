import type { ModelOption } from "@/components/ui/model-picker/model-picker";
import type {
  ApiKeyScope,
  ModelFeature,
  NotificationChannel,
  NotificationEvent,
  SelectOption,
  SettingsPlanLimits,
} from "@/components/ui/settings/settings";

/* The product's words and choices in one place. Safe to import from client
   and server. */

export const PRODUCT_NAME = "Acme";

/** The models an agent can run on. The first is the default for new agents. */
export const MODELS: ModelOption[] = [
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", description: "Fast and capable, for most agents" },
  { id: "claude-opus-5-5", name: "Opus 5.5", description: "Thinks longer on hard, many-step work" },
  { id: "claude-haiku-5-5", name: "Haiku 5.5", description: "Quickest, for triage and short tasks" },
];

/** Sample prices in dollars per million tokens, for what the mock runner charges. Use your provider's real ones. */
export const SAMPLE_PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 3, output: 15 },
  "claude-opus-5-5": { input: 15, output: 75 },
  "claude-haiku-5-5": { input: 1, output: 5 },
};

export function costOf(model: string, tokens: { input: number; output: number; cached?: number }) {
  const price = SAMPLE_PRICES[model] ?? SAMPLE_PRICES[MODELS[0].id];
  const fresh = tokens.input - (tokens.cached ?? 0);
  const cached = (tokens.cached ?? 0) * 0.1;
  return ((fresh + cached) * price.input + tokens.output * price.output) / 1_000_000;
}

/** What a workspace's plan allows, for Settings and Knowledge. */
export const PLAN: SettingsPlanLimits & { knowledgePages: number } = {
  maxSpendLimit: 5000,
  maxRequestsPerMinute: 2000,
  maxTokensPerMinute: 800_000,
  knowledgePages: 500,
};

/** Approvals not decided in this long expire, and their run stops. */
export const APPROVAL_TTL_MS = 60 * 60 * 1000;

export const TIMEZONES: SelectOption[] = [
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "UTC", label: "UTC" },
];

export const LOCALES: SelectOption[] = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "de-DE", label: "Deutsch" },
  { value: "ja-JP", label: "日本語" },
];

export const SCOPES: ApiKeyScope[] = [
  { value: "runs:read", label: "Read runs", description: "List runs and read their traces" },
  { value: "runs:write", label: "Start runs", description: "Start, re-run and cancel runs" },
  { value: "approvals:write", label: "Decide approvals", description: "Approve or decline what agents ask for" },
  { value: "knowledge:write", label: "Manage knowledge", description: "Add, sync and remove sources" },
];

/** Work in the console that can run on its own model (Settings → Models). */
export const FEATURES: ModelFeature[] = [
  { id: "titles", label: "Run titles", description: "Names a run from what it was asked" },
  { id: "retrieval", label: "Knowledge answers", description: "Answers test questions in Knowledge" },
];

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  { id: "approval", label: "An agent asks for approval", description: "As soon as a run stops to ask" },
  { id: "failed", label: "A run fails", description: "With the step that failed" },
  { id: "spend", label: "Spend reaches the alert", description: "Once a month, at the percent set in Models" },
];

/** Where notifications go. Swap in the person's real Slack channel once it's connected. */
export function notificationChannels(email: string): NotificationChannel[] {
  return [
    { id: "email", label: "Email", destination: email },
    { id: "slack", label: "Slack", destination: "#agent-ops" },
  ];
}
