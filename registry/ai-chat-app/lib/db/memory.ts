import type { Conversation, Preferences, Store, StoredMessage, Workspace } from "./store";

/* The in-memory Store. It lives on globalThis so it survives hot reloads in
   development; it's lost when the server restarts, and each serverless
   instance has its own. Fine for trying the app, not for production. */

type Data = {
  workspaces: Map<string, Workspace[]>;
  conversations: Map<string, Conversation>;
  messages: Map<string, StoredMessage[]>;
  preferences: Map<string, Preferences>;
};

const g = globalThis as { __chatStore?: Data };
const db: Data = (g.__chatStore ??= {
  workspaces: new Map(),
  conversations: new Map(),
  messages: new Map(),
  preferences: new Map(),
});

const owned = (userId: string, id: string) => {
  const c = db.conversations.get(id);
  return c && c.userId === userId ? c : null;
};

export const memoryStore: Store = {
  async listWorkspaces(userId) {
    let list = db.workspaces.get(userId);
    if (!list) {
      list = [
        { id: `${userId}-team`, name: "Acme" },
        { id: `${userId}-personal`, name: "Personal" },
      ];
      db.workspaces.set(userId, list);
    }
    return list;
  },

  async listConversations(userId, workspaceId) {
    return [...db.conversations.values()]
      .filter((c) => c.userId === userId && c.workspaceId === workspaceId && !c.deletedAt)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async getConversation(userId, id) {
    const c = owned(userId, id);
    return c && !c.deletedAt ? c : null;
  },

  async createConversation(input) {
    const now = Date.now();
    const c: Conversation = { ...input, id: crypto.randomUUID(), pinned: false, createdAt: now, updatedAt: now };
    db.conversations.set(c.id, c);
    return c;
  },

  async updateConversation(userId, id, patch) {
    const c = owned(userId, id);
    if (!c) return null;
    const next = { ...c, ...patch };
    db.conversations.set(id, next);
    return next;
  },

  async listMessages(conversationId) {
    return db.messages.get(conversationId) ?? [];
  },

  async saveMessage(conversationId, message) {
    const list = db.messages.get(conversationId) ?? [];
    const i = list.findIndex((m) => m.id === message.id);
    db.messages.set(conversationId, i === -1 ? [...list, message] : list.with(i, message));
  },

  async deleteMessage(conversationId, id) {
    db.messages.set(conversationId, (db.messages.get(conversationId) ?? []).filter((m) => m.id !== id));
  },

  async countUserMessages(userId, since) {
    let n = 0;
    for (const c of db.conversations.values()) {
      if (c.userId !== userId) continue;
      for (const m of db.messages.get(c.id) ?? []) if (m.role === "user" && m.createdAt >= since) n++;
    }
    return n;
  },

  async getPreferences(userId, defaults) {
    return { ...defaults, ...db.preferences.get(userId) };
  },

  async setPreferences(userId, patch, defaults) {
    const next = { ...defaults, ...db.preferences.get(userId), ...patch };
    db.preferences.set(userId, next);
    return next;
  },
};
