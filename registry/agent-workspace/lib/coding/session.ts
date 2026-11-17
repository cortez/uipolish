import type { FileChange } from "@/components/ui/file-changes/file-changes";
import type { MergeChecks, MergeState } from "@/components/ui/merge-status/merge-status";
import type { TurnItem, TurnStep } from "@/components/ui/turn-summary/turn-summary";

/* What a session is, and the one function that changes it: applyEvent
   folds each event an agent yields into the session. The engine (server)
   and the browser both fold the same events this way, so what streams is
   what's saved. Safe to import from client and server. */

export type Presence = "online" | "away" | "offline";
export type Person = { id: string; name: string; presence: Presence };
export type Workspace = { id: string; name: string; repo: string; plan: string };

export type Effort = "low" | "medium" | "high";

/** A changed file, with the two versions the Review tab diffs when they're known. */
export type ChangedFile = FileChange & { before?: string; after?: string };

export type CheckStatus = "queued" | "running" | "passed" | "failed";
export type CheckRun = { id: string; name: string; status: CheckStatus; detail?: string; startedAt?: number; finishedAt?: number };

export type PullRequest = { number: number; url: string; base: string; merged: boolean };

export type TurnStatus = "working" | "done" | "stopped" | "error";

/** One prompt and everything the agent did about it. */
export type Turn = {
  id: string;
  authorId: string;
  prompt: string;
  /** People the prompt mentions, by id. */
  mentions: string[];
  /** Files the prompt points at, by path. */
  attachments: string[];
  startedAt: number;
  finishedAt?: number;
  status: TurnStatus;
  error?: string;
  /** Notes and runs of tool calls, in order. */
  items: TurnItem[];
  /** The answer, in Markdown. */
  reply: string;
  /** What this turn changed. */
  files: ChangedFile[];
};

export type Session = {
  id: string;
  workspaceId: string;
  title: string;
  pinned: boolean;
  ownerId: string;
  /** Teammates who can see and prompt it, by id. */
  sharedWith: string[];
  /** The repository, "owner/name", and the branch the agent works on. */
  repo: string;
  branch: string;
  model: string;
  effort: Effort;
  createdAt: number;
  updatedAt: number;
  turns: Turn[];
  /** Every file the session has changed, newest change last. */
  files: ChangedFile[];
  /** The repository's files, for All files. */
  tree: string[];
  checks: CheckRun[];
  pr: PullRequest | null;
};

/** A session as the sidebar and the tabs need it. */
export type SessionSummary = Pick<Session, "id" | "workspaceId" | "title" | "pinned" | "ownerId" | "sharedWith" | "updatedAt"> & {
  working: boolean;
};

/** What an agent yields while it works. */
export type AgentEvent =
  /** A note while it works. The same `id` again adds to it. */
  | { type: "note"; id: string; text: string }
  /** A tool call, in the run of calls `group` (one between two notes). The same step id again updates it. */
  | { type: "step"; group: string; step: TurnStep }
  /** A piece of the answer. */
  | { type: "text"; text: string }
  /** A file changed (again): its counts are the session's total for that file. */
  | { type: "file"; file: ChangedFile }
  /** The pull request's check runs, all of them, each time one changes. */
  | { type: "checks"; checks: CheckRun[] }
  | { type: "pr"; pr: PullRequest }
  /** A better title than the first line of the first prompt. */
  | { type: "title"; title: string };

/** Everything that changes a session, as it streams to the browser (one JSON object per line). */
export type SessionEvent =
  | AgentEvent
  /** First line of every watch: the session as it is now. */
  | { type: "snapshot"; session: Session }
  /** A new prompt: its turn starts. */
  | { type: "turn"; turn: Turn }
  | { type: "done"; at: number }
  | { type: "stopped"; at: number }
  | { type: "error"; message: string; at: number }
  | { type: "merged"; at: number }
  | { type: "renamed"; title: string; pinned: boolean }
  | { type: "shared"; sharedWith: string[] };

export function summarize(session: Session): SessionSummary {
  const { id, workspaceId, title, pinned, ownerId, sharedWith, updatedAt } = session;
  return { id, workspaceId, title, pinned, ownerId, sharedWith, updatedAt, working: session.turns.at(-1)?.status === "working" };
}

/** Where the pull request stands, from its checks and the session's last turn. While the agent works it may push again, so it's never ready. */
export function mergeStateOf(session: Session): MergeState | null {
  const { pr, checks } = session;
  if (!pr) return null;
  if (pr.merged) return "merged";
  if (session.turns.at(-1)?.status === "working") return "checks-running";
  if (checks.some((c) => c.status === "failed")) return "checks-failed";
  if (checks.some((c) => c.status === "running" || c.status === "queued")) return "checks-running";
  return checks.length ? "ready" : "draft";
}

/** Whether any check is still to finish: only then is a count ("3 of 5") worth showing. */
export const checksPending = (checks: CheckRun[]) => checks.some((c) => c.status === "running" || c.status === "queued");

export function checkCounts(checks: CheckRun[]): MergeChecks {
  return {
    passed: checks.filter((c) => c.status === "passed").length,
    failed: checks.filter((c) => c.status === "failed").length,
    total: checks.length,
  };
}

/** A check run as a tool step, so the Checks tab can show it with Tool steps. */
export function checkAsStep(check: CheckRun): TurnStep {
  const status = check.status === "passed" ? "done" : check.status === "failed" ? "failed" : check.status === "running" ? "running" : "pending";
  return {
    id: check.id,
    title: check.name,
    status,
    // A failure's words go in the error, not twice.
    detail: check.status === "failed" ? undefined : check.detail,
    error: check.status === "failed" ? (check.detail ?? "This check failed.") : undefined,
    startedAt: check.startedAt,
    finishedAt: check.finishedAt,
  };
}

function upsertFile(files: ChangedFile[], file: ChangedFile) {
  return files.some((f) => f.path === file.path) ? files.map((f) => (f.path === file.path ? { ...f, ...file } : f)) : [...files, file];
}

function patchTurn(session: Session, change: (turn: Turn) => Turn): Session {
  const last = session.turns.at(-1);
  if (!last) return session;
  return { ...session, turns: [...session.turns.slice(0, -1), change(last)] };
}

/** A turn that ended: nothing in it is still running. */
export function settleTurn(turn: Turn, status: Exclude<TurnStatus, "working">, at: number, error?: string): Turn {
  return {
    ...turn,
    status,
    finishedAt: at,
    ...(error ? { error } : {}),
    items: turn.items.map((item) =>
      item.kind === "steps"
        ? {
            ...item,
            steps: item.steps.map((s) => (s.status === "running" || s.status === "pending" ? { ...s, status: "cancelled", finishedAt: at } : s)),
          }
        : item,
    ),
  };
}

/** Folds one event into the session. */
export function applyEvent(session: Session, event: SessionEvent, now = Date.now()): Session {
  switch (event.type) {
    case "snapshot":
      return event.session;
    case "turn":
      return { ...session, updatedAt: now, turns: [...session.turns, event.turn] };
    case "note":
      return patchTurn(session, (turn) => {
        const at = turn.items.findIndex((i) => i.kind === "message" && i.id === event.id);
        if (at === -1) return { ...turn, items: [...turn.items, { kind: "message", id: event.id, text: event.text }] };
        return {
          ...turn,
          items: turn.items.map((i, k) => (k === at && i.kind === "message" ? { ...i, text: i.text + event.text } : i)),
        };
      });
    case "step":
      return patchTurn(session, (turn) => {
        const at = turn.items.findIndex((i) => i.kind === "steps" && i.id === event.group);
        if (at === -1) return { ...turn, items: [...turn.items, { kind: "steps", id: event.group, steps: [event.step] }] };
        return {
          ...turn,
          items: turn.items.map((i, k) => {
            if (k !== at || i.kind !== "steps") return i;
            const known = i.steps.some((s) => s.id === event.step.id);
            return { ...i, steps: known ? i.steps.map((s) => (s.id === event.step.id ? event.step : s)) : [...i.steps, event.step] };
          }),
        };
      });
    case "text":
      return patchTurn(session, (turn) => ({ ...turn, reply: turn.reply + event.text }));
    case "file":
      return { ...patchTurn(session, (turn) => ({ ...turn, files: upsertFile(turn.files, event.file) })), files: upsertFile(session.files, event.file) };
    case "checks":
      return { ...session, checks: event.checks };
    case "pr":
      return { ...session, pr: event.pr };
    case "title":
      return { ...session, title: event.title };
    case "renamed":
      return { ...session, title: event.title, pinned: event.pinned };
    case "shared":
      return { ...session, sharedWith: event.sharedWith };
    case "done":
      return { ...patchTurn(session, (turn) => settleTurn(turn, "done", event.at)), updatedAt: event.at };
    case "stopped":
      return { ...patchTurn(session, (turn) => settleTurn(turn, "stopped", event.at)), updatedAt: event.at };
    case "error":
      return { ...patchTurn(session, (turn) => settleTurn(turn, "error", event.at, event.message)), updatedAt: event.at };
    case "merged":
      return { ...session, updatedAt: event.at, pr: session.pr && { ...session.pr, merged: true } };
  }
}

export function encodeEvent(event: SessionEvent) {
  return JSON.stringify(event) + "\n";
}

/** Reads an NDJSON body, one value per line. Throws if the connection drops. */
export async function* readLines<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) yield JSON.parse(line) as T;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}
