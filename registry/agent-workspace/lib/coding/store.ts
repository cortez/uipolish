import { seedWorkspaces } from "./seed";
import type { Person, Session, Workspace } from "./session";

/* Where workspaces, people and sessions live. The template keeps them in
   memory (createMemoryStore); for a database, implement WorkspaceStore and
   export it as `store`. A session is one document: its turns, files, checks
   and pull request are read and written together, so a jsonb column (or a
   document store) suits it; list queries need only its summary fields.
   Safe in the browser: the docs preview runs it there. */

export type Member = { id: string; name: string };

export interface WorkspaceStore {
  /** The person's workspaces. Their first visit creates the sample ones. */
  workspacesFor(user: Member): Promise<Workspace[]>;
  /** Everyone in a workspace, with their presence. */
  people(workspaceId: string): Promise<Person[]>;
  /** The repository's files on its default branch, for All files. Your Git host's tree API in production. */
  repoFiles(workspaceId: string): Promise<string[]>;
  /** Sessions the person owns or that are shared with them, newest activity first. */
  listSessions(workspaceId: string, userId: string): Promise<Session[]>;
  getSession(id: string): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
}

export function createMemoryStore(): WorkspaceStore {
  const workspaces = new Map<string, Workspace & { memberIds: string[]; files: string[] }>();
  const people = new Map<string, Person>();
  const sessions = new Map<string, Session>();
  const seeded = new Set<string>();

  const clone = <T,>(value: T): T => structuredClone(value);

  return {
    async workspacesFor(user) {
      if (!seeded.has(user.id)) {
        seeded.add(user.id);
        const seed = seedWorkspaces(user, Date.now());
        for (const person of seed.people) if (!people.has(person.id)) people.set(person.id, person);
        for (const w of seed.workspaces) workspaces.set(w.id, w);
        for (const s of seed.sessions) sessions.set(s.id, s);
      }
      return [...workspaces.values()]
        .filter((w) => w.memberIds.includes(user.id))
        .map(({ id, name, repo, plan }) => ({ id, name, repo, plan }));
    },
    async people(workspaceId) {
      const ids = workspaces.get(workspaceId)?.memberIds ?? [];
      return ids.flatMap((id) => {
        const p = people.get(id);
        return p ? [clone(p)] : [];
      });
    },
    async repoFiles(workspaceId) {
      return [...(workspaces.get(workspaceId)?.files ?? [])];
    },
    async listSessions(workspaceId, userId) {
      return [...sessions.values()]
        .filter((s) => s.workspaceId === workspaceId && (s.ownerId === userId || s.sharedWith.includes(userId)))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(clone);
    },
    async getSession(id) {
      const s = sessions.get(id);
      return s ? clone(s) : null;
    },
    async saveSession(session) {
      sessions.set(session.id, clone(session));
    },
    async deleteSession(id) {
      sessions.delete(id);
    },
  };
}

const g = globalThis as { __workspaceStore?: WorkspaceStore };

/** One store per server process, so sessions survive hot reloads. Swap this for your database. */
export const store: WorkspaceStore = (g.__workspaceStore ??= createMemoryStore());
