import type { ModelOption } from "../model-picker/model-picker";
import type { SelectOption } from "../select/select";
import type { UsageSegment } from "../usage-meter/usage-meter";

export type SettingsSection = "general" | "api-keys" | "models" | "notifications";

/** The values the save bar saves. Logo, keys and notifications save on their own. */
export type WorkspaceSettings = {
  name: string;
  /** The workspace's part of its URL: `halden-robotics`. */
  slug: string;
  /** An IANA zone: `Europe/London`. */
  timezone: string;
  /** A BCP 47 tag: `en-GB`. */
  locale: string;
  /** The id of a model in `models`. */
  defaultModel: string;
  /** Feature id to model id. A feature left out follows `defaultModel`. */
  overrides: Record<string, string>;
  /** Per month, in currency units. */
  spendLimit: number;
  /** Percent of `spendLimit` at which admins are told, 50 to 100. */
  alertAt: number;
  requestsPerMinute: number;
  tokensPerMinute: number;
};

export type SettingsField = keyof WorkspaceSettings;

export type ApiKey = {
  id: string;
  name: string;
  /** The last four characters of the secret: shown as `sk-…4f2a`. */
  last4: string;
  /** Scope values from `scopes`. */
  scopes: string[];
  createdAt: Date | string | number;
  /** Who made it: "Ines Duarte". */
  createdBy: string;
  /** `null`: never used. */
  lastUsedAt: Date | string | number | null;
  /** `null` or left out: never expires. */
  expiresAt?: Date | string | number | null;
};

export type ApiKeyScope = { value: string; label: string; description?: string };

export type NewApiKey = {
  name: string;
  scopes: string[];
  /** Days until it expires; `null` for never. */
  expiresInDays: number | null;
};

/** A feature that can run on its own model. */
export type ModelFeature = { id: string; label: string; description?: string };

export type SettingsUsage = {
  /** Spent so far this period, in currency units. */
  spent: number;
  /** What the spend is made of, as the usage meter takes them. */
  segments?: UsageSegment[];
  /** "this month". */
  period?: string;
  /** The busiest minute lately, shown under each rate limit. */
  peakRequestsPerMinute?: number;
  peakTokensPerMinute?: number;
};

export type SettingsPlanLimits = {
  maxSpendLimit?: number;
  maxRequestsPerMinute?: number;
  maxTokensPerMinute?: number;
};

export type NotificationEvent = { id: string; label: string; description?: string };

export type NotificationChannel = {
  id: string;
  label: string;
  /** Where it goes: "ines@halden.co", "#ops-alerts". */
  destination: string;
};

/** Event id to channel id to on. */
export type NotificationMatrix = Record<string, Record<string, boolean>>;

export type SettingsNotifications = {
  events: NotificationEvent[];
  channels: NotificationChannel[];
  value: NotificationMatrix;
  /** Saves one switch. The switch moves at once and moves back if this rejects. */
  onChange?: (event: string, channel: string, on: boolean) => Promise<unknown>;
  /** Sends a test to the channel. */
  onTest?: (channel: string) => Promise<unknown>;
};

/** Reject `onSave` with this to put messages under the fields they belong to. */
export class SettingsError extends Error {
  fields: Partial<Record<SettingsField, string>>;
  constructor(message: string, fields: Partial<Record<SettingsField, string>> = {}) {
    super(message);
    this.name = "SettingsError";
    this.fields = fields;
  }
}

export type { ModelOption, SelectOption, UsageSegment };

/* ---------- Words and numbers ---------- */

export const DAY = 86_400_000;

export const toTime = (value: Date | string | number) => new Date(value).getTime();

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

export function message(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

export function dateLabel(time: number, now: number) {
  const date = new Date(time);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
}

/** "just now", "3 hours ago", "yesterday", "Oct 12". */
export function ago(time: number, now: number) {
  const diff = Math.max(0, now - time);
  const hour = 3_600_000;
  if (diff < 5 * 60_000) return "just now";
  if (diff < hour) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < DAY - hour / 2) return `${plural(Math.round(diff / hour), "hour")} ago`;
  if (diff < 1.5 * DAY) return "yesterday";
  if (diff < 6.5 * DAY) return `${Math.round(diff / DAY)} days ago`;
  return dateLabel(time, now);
}

export function masked(key: Pick<ApiKey, "last4">) {
  return `sk-…${key.last4}`;
}

/** Keys that are expired or haven't been used for `staleDays`. */
export function keyFlag(key: ApiKey, now: number, staleDays: number): "expired" | "stale" | null {
  if (key.expiresAt != null && toTime(key.expiresAt) <= now) return "expired";
  const since = key.lastUsedAt === null ? toTime(key.createdAt) : toTime(key.lastUsedAt);
  return now - since >= staleDays * DAY ? "stale" : null;
}

/** The changes between two values, one entry per thing a person would name. */
export function changes(from: WorkspaceSettings, to: WorkspaceSettings) {
  const out: { field: SettingsField; key: string }[] = [];
  for (const field of Object.keys(to) as SettingsField[]) {
    if (field === "overrides") {
      const ids = new Set([...Object.keys(from.overrides), ...Object.keys(to.overrides)]);
      for (const id of ids) if ((from.overrides[id] ?? "") !== (to.overrides[id] ?? "")) out.push({ field, key: `overrides.${id}` });
    } else if (from[field] !== to[field]) {
      out.push({ field, key: field });
    }
  }
  return out;
}

export const SECTION_OF: Record<SettingsField, SettingsSection> = {
  name: "general",
  slug: "general",
  timezone: "general",
  locale: "general",
  defaultModel: "models",
  overrides: "models",
  spendLimit: "models",
  alertAt: "models",
  requestsPerMinute: "models",
  tokensPerMinute: "models",
};

export const FIELD_NAME: Record<SettingsField, string> = {
  name: "workspace name",
  slug: "URL",
  timezone: "time zone",
  locale: "language and region",
  defaultModel: "default model",
  overrides: "model overrides",
  spendLimit: "spend limit",
  alertAt: "alert threshold",
  requestsPerMinute: "request limit",
  tokensPerMinute: "token limit",
};

export function listWords(words: string[]) {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
