"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Badge } from "../badge/badge";
import styles from "./approvals-inbox.module.css";

/* ---------- Types ---------- */

export type ApprovalStatus = "pending" | "approved" | "declined" | "expired";

/** How soon it needs a look: high shows a badge in the list, low and medium only in the request. */
export type ApprovalPriority = "low" | "medium" | "high";

/** @deprecated Use `ApprovalPriority`. */
export type ApprovalRisk = ApprovalPriority;

/** Who is asking: a person on the team, or an agent or integration acting for one. */
export type ApprovalRequester = {
  id: string;
  /** "Maya Lindqvist". */
  name: string;
  /** Their team or role, shown beside the name: "Sales", "Support agent". */
  detail?: string;
  avatarUrl?: string;
  /** `agent` adds a small Agent badge beside the name. Default `person`. */
  kind?: "person" | "agent";
};

/** @deprecated Use `ApprovalRequester` (`role` is its `detail`). */
export type ApprovalAgent = {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
};

export type ApprovalRecipient = {
  name: string;
  /** An email address or a phone number. */
  detail?: string;
};

/** One line of a `details` preview. */
export type ApprovalDetailRow = {
  /** "Replicas". */
  label: string;
  /** What it will be: "12". */
  value: string;
  /** What it is now, for a change: drawn as "4 → 12". */
  from?: string;
  /** Set in the code face: IDs, hostnames, paths. */
  mono?: boolean;
};

/** What will actually happen, drawn the way the person will see it. */
export type ApprovalPreview =
  | { kind: "email"; from: string; subject: string; body: string }
  | {
      kind: "payment";
      direction: "refund" | "charge" | "payment";
      /** In major units: 84 for $84.00. */
      amount: number;
      /** ISO code: "USD". */
      currency: string;
      /** Who gets it or pays it. */
      counterparty: string;
      /** "Visa ending 4242". */
      method?: string;
      /** The line on the statement or receipt. */
      memo?: string;
    }
  | {
      kind: "post";
      /** "Instagram". */
      channel: string;
      /** Optional mark drawn beside the channel: a 16px SVG, unaltered. */
      mark?: ReactNode;
      /** "@acme". */
      account: string;
      text: string;
      /** The channel's limit, for the count under the text. */
      limit?: number;
    }
  | { kind: "diff"; name: string; before: string; after: string }
  | {
      kind: "delete";
      /** Read after “Deletes”: "312 trial workspaces". */
      what: string;
      /** What goes with it, one line each. */
      items: string[];
    }
  /** A summary of any action as labelled values, changes shown as before → after. */
  | { kind: "details"; rows: ApprovalDetailRow[] }
  /** A query, a command or a payload, exactly as it will run. */
  | {
      kind: "code";
      /** `sql`, `sh`, `json`… */
      language?: string;
      code: string;
      /** The header: a file name or "Runs on prod-main". Defaults to the language. */
      label?: string;
    }
  /** Anything else, drawn by you. */
  | { kind: "custom"; render: ReactNode };

/** The raw call behind the request, for the people who want to check it. Shown folded under "Technical details". */
export type ApprovalTool = { server: string; name: string; arguments?: unknown };

/** A value the person can change before approving. */
export type ApprovalField = {
  /** Comes back in the decision's `edits` under this key: name it after what it changes (`subject`, `amount`, `replicas`). */
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
  hint?: string;
  inputMode?: "text" | "decimal" | "email";
  /** Return a message to block approving: "Refunds can’t be more than the $240.00 paid". */
  validate?: (value: string) => string | null;
};

export type ApprovalOutcome = {
  /** Who decided: "Sam Whitaker". */
  by: string;
  at: Date | string | number;
  note?: string;
  /** Approved with edits. */
  edited?: boolean;
};

export type ApprovalRequest = {
  id: string;
  /** Who is asking. Required unless the legacy `agent` is given. */
  requester?: ApprovalRequester;
  /** @deprecated Use `requester` with `kind: "agent"`. Read as one when `requester` is missing. */
  agent?: ApprovalAgent;
  /** What is being approved, as a short phrase: "Reimburse $1,284.50 in travel expenses". */
  title: string;
  /** Where it belongs, shown under the title: "Expense report EXP-2291". */
  context?: string;
  /** Leave out when it doesn't apply: no badge shows. */
  priority?: ApprovalPriority;
  /** @deprecated Use `priority`. */
  risk?: ApprovalPriority;
  status: ApprovalStatus;
  requestedAt: Date | string | number;
  /** When it's due. After this it can't be approved and moves to Expired. Leave out for requests that wait. */
  expiresAt?: Date | string | number;
  preview?: ApprovalPreview;
  /** Everyone it reaches. Long lists are fine: the first few show, the rest open on demand. */
  recipients?: ApprovalRecipient[];
  /** The requester's message: why they're asking, in their words. */
  note?: string;
  /** @deprecated Use `note`. */
  reasoning?: string;
  /** The raw call, folded away under "Technical details". Leave out when there isn't one. */
  tool?: ApprovalTool;
  /** Values the person may change before approving. */
  fields?: ApprovalField[];
  /** For approved, declined and expired requests. */
  outcome?: ApprovalOutcome;
};

/* ---------- Reading a request: new fields first, legacy aliases after ---------- */

const UNKNOWN: ApprovalRequester = { id: "unknown", name: "Someone" };

export function requesterOf(r: ApprovalRequest): ApprovalRequester {
  if (r.requester) return r.requester;
  if (r.agent) return { id: r.agent.id, name: r.agent.name, detail: r.agent.role, avatarUrl: r.agent.avatarUrl, kind: "agent" };
  return UNKNOWN;
}

export const priorityOf = (r: ApprovalRequest) => r.priority ?? r.risk;
export const noteOf = (r: ApprovalRequest) => r.note ?? r.reasoning;

export type ApprovalDecision = {
  id: string;
  decision: "approve" | "decline";
  /** What the person told the requester, when declining. */
  note?: string;
  /** Changed fields only, by `key`. */
  edits?: Record<string, string>;
};

/* ---------- Time ---------- */

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const toTime = (value: Date | string | number) => new Date(value).getTime();

export function clock(time: number) {
  return new Date(time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "just now", "12 min ago", "2:14 PM", "Yesterday", "Oct 12". */
export function when(time: number, now: number) {
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  const date = new Date(time);
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) return clock(time);
  const yesterday = new Date(now - DAY);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The row's quiet due label: "Due 4:00 PM", "Due tomorrow", "Due Fri", "Due Nov 12". */
export function dueLabel(time: number, now: number) {
  const date = new Date(time);
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) return `Due ${clock(time)}`;
  if (date.toDateString() === new Date(now + DAY).toDateString()) return "Due tomorrow";
  if (time - now < 6 * DAY) return `Due ${date.toLocaleDateString("en-US", { weekday: "short" })}`;
  return `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** "14:32" under an hour, "3h 05m" under a day, then "2 days". */
export function remaining(ms: number) {
  const s = Math.max(0, Math.ceil(ms / SECOND));
  if (s < 3600) return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
  const days = Math.round(s / 86400);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

/** The words a search should find a request by: what it is, who it's from and what it would do. */
export function searchText(r: ApprovalRequest) {
  const who = requesterOf(r);
  const parts = [r.title, who.name, who.detail, r.context, noteOf(r)];
  const p = r.preview;
  if (p?.kind === "email") parts.push(p.subject);
  else if (p?.kind === "payment") parts.push(p.counterparty, p.memo);
  else if (p?.kind === "post") parts.push(p.channel, p.account);
  else if (p?.kind === "diff") parts.push(p.name);
  else if (p?.kind === "delete") parts.push(p.what);
  else if (p?.kind === "details") for (const row of p.rows) parts.push(row.value, row.from);
  else if (p?.kind === "code") parts.push(p.label);
  for (const person of r.recipients ?? []) parts.push(person.name);
  return parts.filter(Boolean).join("\n").toLowerCase();
}

export function message(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

/* ---------- Countdown: digits keep their width ---------- */

/**
 * The clock differs between the server's render and the browser's, so the
 * readouts below say so with suppressHydrationWarning rather than mismatch.
 *
 * Time left before a request is due. Each digit sits in a box one
 * `ch` wide, so the readout never jiggles as it counts, even in a face
 * without tabular figures. Screen readers get the deadline, not the tick.
 */
export function Countdown({ expiresAt, now, prefix }: { expiresAt: number; now: number; prefix?: string }) {
  const left = expiresAt - now;
  const expired = left <= 0;
  const text = expired ? "Expired" : remaining(left);
  const tone = expired ? "expired" : left < 10 * MINUTE ? "urgent" : left < HOUR ? "soon" : undefined;
  return (
    <span className={styles.countdown} data-tone={tone}>
      <span aria-hidden="true" className={styles.countdownText} suppressHydrationWarning>
        {prefix && !expired ? <span className={styles.countdownPrefix}>{prefix} </span> : null}
        {expired
          ? text
          : [...text].map((char, i) =>
              /\d/.test(char) ? (
                <span key={i} className={styles.digit} suppressHydrationWarning>
                  {char}
                </span>
              ) : (
                char
              ),
            )}
      </span>
      <span className={styles.srOnly} suppressHydrationWarning>{expired ? "Expired" : `Due at ${clock(expiresAt)}`}</span>
    </span>
  );
}

/* ---------- Priority ---------- */

const PRIORITY: Record<ApprovalPriority, string> = { low: "Low priority", medium: "Medium priority", high: "High priority" };

/** The priority in words; high asks for attention, so it's amber. In a row, only high shows, as "High". */
export function PriorityBadge({ priority, short = false }: { priority: ApprovalPriority; short?: boolean }) {
  return (
    <Badge size="sm" tone={priority === "high" ? "warning" : "neutral"} className={styles.priority}>
      {short ? PRIORITY[priority].split(" ")[0] : PRIORITY[priority]}
    </Badge>
  );
}

/* ---------- Presence: rows that leave close in place ---------- */

export type Shown<T> = { item: T; leaving: boolean; arrived: boolean };

/**
 * Keeps removed entries in place, flagged as leaving, until their row has
 * closed; flags entries that arrive after the first render.
 */
export function usePresence<T extends { id: string }>(items: T[]) {
  const [previous, setPrevious] = useState(items);
  const [leaving, setLeaving] = useState<{ item: T; index: number }[]>([]);
  const [arrived, setArrived] = useState<ReadonlySet<string>>(() => new Set());

  if (previous !== items) {
    setPrevious(items);
    const ids = new Set(items.map((i) => i.id));
    const before = new Set(previous.map((p) => p.id));
    const gone = previous.flatMap((item, index) => (ids.has(item.id) ? [] : [{ item, index }]));
    setLeaving((l) => [...l.filter((x) => !ids.has(x.item.id)), ...gone.filter((g) => !l.some((x) => x.item.id === g.item.id))]);
    const fresh = items.filter((i) => !before.has(i.id));
    if (fresh.length) setArrived((a) => new Set([...a, ...fresh.map((i) => i.id)]));
  }

  const done = useCallback((id: string) => setLeaving((l) => l.filter((x) => x.item.id !== id)), []);

  const rows: Shown<T>[] = items.map((item) => ({ item, leaving: false, arrived: arrived.has(item.id) }));
  for (const l of [...leaving].sort((a, b) => a.index - b.index)) {
    rows.splice(Math.min(l.index, rows.length), 0, { item: l.item, leaving: true, arrived: false });
  }
  return { rows, done };
}
