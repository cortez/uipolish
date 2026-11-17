import type { ChatMessage } from "@/components/ui/chat-app/chat-app";
import { memoryStore } from "./memory";

/* Everything the app saves, behind one interface. The default keeps it in
   memory, so the app runs without a database; it's gone when the server
   restarts. To keep it, implement Store against your database (Postgres
   with Drizzle or Prisma, SQLite, Supabase…) and export that below. Each
   method is one query; ids are strings you generate (crypto.randomUUID()). */

export type Conversation = {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  pinned: boolean;
  /** The model this chat runs on. */
  model: string;
  createdAt: number;
  updatedAt: number;
  /** Set while it's deleted but can still be restored (Undo). */
  deletedAt?: number;
};

/** A message as the thread shows it, plus when it was written. */
export type StoredMessage = ChatMessage & { createdAt: number };

export type Workspace = { id: string; name: string };

export type Preferences = {
  /** The model new chats start on. */
  model: string;
  /** Remember between conversations (Settings → Assistant). */
  remember: boolean;
};

export interface Store {
  /** The person's workspaces; the first time, their default ones. */
  listWorkspaces(userId: string): Promise<Workspace[]>;

  /** Not deleted, newest activity first. */
  listConversations(userId: string, workspaceId: string): Promise<Conversation[]>;
  /** Only the owner's, and not deleted. */
  getConversation(userId: string, id: string): Promise<Conversation | null>;
  createConversation(input: Omit<Conversation, "id" | "createdAt" | "updatedAt" | "pinned">): Promise<Conversation>;
  /** Returns null when it isn't theirs. Pass `deletedAt: undefined` to restore. */
  updateConversation(
    userId: string,
    id: string,
    patch: Partial<Pick<Conversation, "title" | "pinned" | "model" | "updatedAt" | "deletedAt">>,
  ): Promise<Conversation | null>;

  /** Oldest first. */
  listMessages(conversationId: string): Promise<StoredMessage[]>;
  /** Insert, or replace the message with the same id. */
  saveMessage(conversationId: string, message: StoredMessage): Promise<void>;
  deleteMessage(conversationId: string, id: string): Promise<void>;
  /** For the daily limit: messages the person sent since `since` (ms). */
  countUserMessages(userId: string, since: number): Promise<number>;

  getPreferences(userId: string, defaults: Preferences): Promise<Preferences>;
  setPreferences(userId: string, patch: Partial<Preferences>, defaults: Preferences): Promise<Preferences>;
}

export const store: Store = memoryStore;
