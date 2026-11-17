import type { AllowedTool, EffectPolicy } from "@/components/ui/agent-settings/agent-settings";
import type { ApprovalPreview, ApprovalPriority, ApprovalRecipient, ApprovalStatus, ApprovalTool } from "@/components/ui/approvals-inbox/approvals-inbox";
import type { Connection } from "@/components/ui/connections/connections";
import type { KnowledgeService, KnowledgeSource } from "@/components/ui/knowledge-base/knowledge-base";
import type { RunOutput, RunStatus, RunStep, RunSummary, RunTrigger } from "@/components/ui/run-history/run-history";
import type { ApiKey, NotificationMatrix, WorkspaceSettings } from "@/components/ui/settings/settings";
import { createMemoryDatabase } from "./in-memory";

/* Everything the console saves, behind one interface. The default keeps it
   in memory, so the app runs without a database; it's gone when the server
   restarts. To keep it, implement Database against yours (Postgres with
   Drizzle or Prisma, SQLite, Supabase…) and export that at the bottom. Each
   method is one query; ids are strings you generate. Nothing here imports
   server-only code, so the docs demo runs the same store in the browser. */

export type Workspace = { id: string; name: string };

/** An MCP server an agent can use. The same shape Connections draws, minus the logo. */
export type AgentServer = Omit<Connection, "mark">;

export type Agent = {
  /** `agt_support`. */
  id: string;
  workspaceId: string;
  name: string;
  /** One line on what it's for. */
  description: string;
  /** A model id from MODELS. */
  model: string;
  /** The system prompt: who it is and how it works. */
  instructions: string;
  /** Whether reads and changes need a person's yes. Sends, deletes and spends always do. */
  policy: EffectPolicy;
  /** Dollars a day. New runs wait once it's spent. */
  dailyLimit: number;
  servers: AgentServer[];
  /** Tools set to "Always allow": they never ask. */
  allowed: AllowedTool[];
  createdAt: number;
};

/** A run as the table shows it, with its trace and what started it. */
export type Run = RunSummary & {
  workspaceId: string;
  agentId: string;
  /** What it was asked, in full. `title` is the line the table shows. */
  task: string;
  steps: RunStep[];
  output?: RunOutput;
  cancelNote?: string;
};

/** Approval previews that can be stored: everything but `custom`, which is a React node. */
export type StoredPreview = Exclude<ApprovalPreview, { kind: "custom" }>;

/** A value the person may change before approving. `max` caps a decimal (a refund's amount). */
export type StoredField = {
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
  hint?: string;
  inputMode?: "text" | "decimal" | "email";
  max?: number;
};

/** A run that stopped to ask. Deciding it resumes the run, or stops it. */
export type Approval = {
  id: string;
  workspaceId: string;
  runId: string;
  agentId: string;
  title: string;
  context?: string;
  priority?: ApprovalPriority;
  status: ApprovalStatus;
  requestedAt: number;
  expiresAt?: number;
  note?: string;
  preview?: StoredPreview;
  recipients?: ApprovalRecipient[];
  tool?: ApprovalTool;
  fields?: StoredField[];
  outcome?: { by: string; at: number; note?: string; edited?: boolean };
};

/** A passage retrieval can find: what the agent answers from. */
export type Passage = { location?: string; text: string };

export type Source = KnowledgeSource & { workspaceId: string; addedAt: number; passages: Passage[] };

/** The apps a workspace has connected for Knowledge, with the account. */
export type KnowledgeAccounts = Partial<Record<KnowledgeService, string>>;

export type RunQuery = {
  workspaceId: string;
  status?: RunStatus;
  agent?: string;
  trigger?: RunTrigger;
  /** Ms; started at or after. */
  since?: number;
  /** Ms; started before. */
  until?: number;
  /** Matches the id, title, agent or error. */
  text?: string;
  offset?: number;
  limit?: number;
};

export interface Database {
  /** The person's workspaces; the first time, their sample ones. */
  listWorkspaces(userId: string, userName: string, email: string): Promise<Workspace[]>;

  getSettings(workspaceId: string): Promise<WorkspaceSettings | null>;
  updateSettings(workspaceId: string, patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings | null>;
  listApiKeys(workspaceId: string): Promise<ApiKey[]>;
  saveApiKey(workspaceId: string, key: ApiKey): Promise<void>;
  /** False when it wasn't there. */
  deleteApiKey(workspaceId: string, id: string): Promise<boolean>;
  getNotifications(workspaceId: string): Promise<NotificationMatrix>;
  setNotification(workspaceId: string, event: string, channel: string, on: boolean): Promise<void>;

  listAgents(workspaceId: string): Promise<Agent[]>;
  getAgent(workspaceId: string, id: string): Promise<Agent | null>;
  saveAgent(agent: Agent): Promise<void>;

  /** Newest first, with the count of every match. */
  findRuns(query: RunQuery): Promise<{ runs: Run[]; total: number }>;
  getRun(workspaceId: string, id: string): Promise<Run | null>;
  /** Insert, or replace the run with the same id. */
  saveRun(run: Run): Promise<void>;

  /** Newest first. */
  listApprovals(workspaceId: string): Promise<Approval[]>;
  getApproval(workspaceId: string, id: string): Promise<Approval | null>;
  saveApproval(approval: Approval): Promise<void>;

  /** Newest first. */
  listSources(workspaceId: string): Promise<Source[]>;
  getSource(workspaceId: string, id: string): Promise<Source | null>;
  saveSource(source: Source): Promise<void>;
  deleteSource(workspaceId: string, id: string): Promise<boolean>;
  getKnowledgeAccounts(workspaceId: string): Promise<KnowledgeAccounts>;
  setKnowledgeAccount(workspaceId: string, service: KnowledgeService, account: string): Promise<void>;
}

const g = globalThis as { __agentConsoleDb?: Database };

/** One store per server process, kept across hot reloads. */
export const db: Database = (g.__agentConsoleDb ??= createMemoryDatabase());
