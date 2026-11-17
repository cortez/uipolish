import { DEFAULT_DAILY_LIMIT } from "@/lib/config";
import { store } from "@/lib/db/store";

/* The daily message limit: what a free plan gets. Counted from midnight UTC.
   Swap it for your billing plan's limit, or set DAILY_MESSAGE_LIMIT=0 to
   turn it off. */

export function dailyLimit() {
  const n = Number(process.env.DAILY_MESSAGE_LIMIT ?? DEFAULT_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export async function usage(userId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const resetsAt = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const limit = dailyLimit();
  const used = await store.countUserMessages(userId, today.getTime());
  return { used, limit, resetsAt, reached: limit !== null && used >= limit };
}
