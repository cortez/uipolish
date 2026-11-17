import type { Engine } from "./engine";
import { titleFrom } from "./format";
import { mergeStateOf, summarize, type Effort, type Person, type Session, type SessionEvent, type SessionSummary, type Turn, type Workspace } from "./session";
import type { WorkspaceStore } from "./store";

/* What the screens can do, for one person in one workspace. The app calls
   it on the server (lib/coding/server.ts, through app/api and the server
   actions); the docs preview calls it in the browser. Every check of who
   may do what is here. */

export type WorkspaceUser = { id: string; name: string; email: string };

/** A prompt as the composer sends it. */
export type PromptInput = {
  text: string;
  model: string;
  effort: Effort;
  /** Teammates the prompt mentions, by id. */
  mentions?: string[];
  /** Files the prompt points at, by path. */
  attachments?: string[];
};

export type WorkspaceApi = {
  people(): Promise<Person[]>;
  sessions(): Promise<SessionSummary[]>;
  session(id: string): Promise<Session | null>;
  /** The session now, then each change, until the returned function is called. `onError` hears a dropped connection. */
  watch(id: string, onEvent: (event: SessionEvent) => void, onError?: (message: string) => void): () => void;
  /** A new session, its first turn started. */
  create(input: PromptInput): Promise<{ id: string }>;
  prompt(id: string, input: PromptInput): Promise<void>;
  stop(id: string): Promise<void>;
  rename(id: string, title: string): Promise<void>;
  pin(id: string, pinned: boolean): Promise<void>;
  /** Who else can see and prompt the session, by id. */
  share(id: string, people: string[]): Promise<void>;
  remove(id: string): Promise<void>;
  merge(id: string): Promise<void>;
};

type Options = {
  /** The model to run, given the one the composer asked for: on the server, only one the picker offers. */
  model?: (requested: string) => string;
};

const MAX_PROMPT = 20_000;
let n = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function branchFor(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `agent/${slug || "session"}`;
}

export function createService(store: WorkspaceStore, engine: Engine, options: Options = {}) {
  const pickModel = options.model ?? ((m: string) => m);

  return {
    engine,
    workspaces: (user: WorkspaceUser): Promise<Workspace[]> => store.workspacesFor(user),

    forWorkspace(workspaceId: string, user: WorkspaceUser): WorkspaceApi {
      /** A session this person can see in this workspace, or an error that says why not. */
      async function visible(id: string) {
        const session = await store.getSession(id);
        if (!session || session.workspaceId !== workspaceId || (session.ownerId !== user.id && !session.sharedWith.includes(user.id))) {
          throw new Error("There’s no session with that id in this workspace.");
        }
        return session;
      }

      function check(input: PromptInput) {
        const text = input.text.trim();
        if (!text) throw new Error("Write a prompt first.");
        if (text.length > MAX_PROMPT) throw new Error(`Prompts can be up to ${MAX_PROMPT.toLocaleString("en-US")} characters.`);
        const effort: Effort = input.effort === "low" || input.effort === "high" ? input.effort : "medium";
        return { text, effort, model: pickModel(input.model) };
      }

      function turnFor(text: string, input: PromptInput): Turn {
        return {
          id: newId("turn"),
          authorId: user.id,
          prompt: text,
          mentions: input.mentions ?? [],
          attachments: input.attachments ?? [],
          startedAt: Date.now(),
          status: "working",
          items: [],
          reply: "",
          files: [],
        };
      }

      /** A turn the server lost (it restarted mid-turn) is settled, so the session can go on. */
      async function settled(session: Session) {
        if (session.turns.at(-1)?.status !== "working" || engine.isRunning(session.id)) return session;
        return (await engine.apply(session.id, { type: "error", message: "Stopped: the server restarted while the agent worked.", at: Date.now() })) ?? session;
      }

      return {
        people: () => store.people(workspaceId),

        async sessions() {
          const list = await store.listSessions(workspaceId, user.id);
          return list.map((s) => ({ ...summarize(s), working: engine.isRunning(s.id) }));
        },

        async session(id) {
          try {
            return await settled(await visible(id));
          } catch {
            return null;
          }
        },

        watch(id, onEvent, onError) {
          let stop = () => {};
          let closed = false;
          visible(id).then(
            async (session) => {
              await settled(session);
              if (!closed) stop = engine.watch(id, onEvent);
            },
            (error: Error) => onError?.(error.message),
          );
          return () => {
            closed = true;
            stop();
          };
        },

        async create(input) {
          const { text, effort, model } = check(input);
          const workspace = (await store.workspacesFor(user)).find((w) => w.id === workspaceId);
          if (!workspace) throw new Error("You’re not in this workspace anymore.");
          const title = titleFrom(text);
          const now = Date.now();
          const session: Session = {
            id: newId("ses"),
            workspaceId,
            title,
            pinned: false,
            ownerId: user.id,
            sharedWith: (input.mentions ?? []).filter((m) => m !== user.id),
            repo: workspace.repo,
            branch: branchFor(title),
            model,
            effort,
            createdAt: now,
            updatedAt: now,
            turns: [],
            files: [],
            tree: await store.repoFiles(workspaceId),
            checks: [],
            pr: null,
          };
          await store.saveSession(session);
          await engine.start(session, turnFor(text, input), model, effort);
          return { id: session.id };
        },

        async prompt(id, input) {
          const session = await settled(await visible(id));
          const { text, effort, model } = check(input);
          if (engine.isRunning(id)) throw new Error("The agent is still working on this session. Stop it first, or wait for it to finish.");
          if (session.pr?.merged) throw new Error("This session’s pull request is merged. Start a new session for more changes.");
          const mentions = (input.mentions ?? []).filter((m) => m !== session.ownerId && !session.sharedWith.includes(m));
          const next = { ...session, model, effort, sharedWith: [...session.sharedWith, ...mentions] };
          await store.saveSession(next);
          await engine.start(next, turnFor(text, input), model, effort);
        },

        async stop(id) {
          await visible(id);
          engine.stop(id);
        },

        async rename(id, title) {
          const session = await visible(id);
          const clean = title.replace(/\s+/g, " ").trim();
          if (!clean) throw new Error("Enter a name.");
          if (clean.length > 120) throw new Error("Names can be up to 120 characters.");
          await engine.apply(id, { type: "renamed", title: clean, pinned: session.pinned });
        },

        async pin(id, pinned) {
          const session = await visible(id);
          await engine.apply(id, { type: "renamed", title: session.title, pinned });
        },

        async share(id, people) {
          const session = await visible(id);
          if (session.ownerId !== user.id) throw new Error("Only the person who started a session can change who it’s shared with.");
          const members = new Set((await store.people(workspaceId)).map((p) => p.id));
          const sharedWith = [...new Set(people)].filter((p) => members.has(p) && p !== session.ownerId);
          await engine.apply(id, { type: "shared", sharedWith });
        },

        async remove(id) {
          const session = await visible(id);
          if (session.ownerId !== user.id) throw new Error("Only the person who started a session can delete it.");
          engine.stop(id);
          await store.deleteSession(id);
        },

        async merge(id) {
          const session = await visible(id);
          const state = mergeStateOf(session);
          if (state === "merged") return;
          if (state !== "ready") {
            throw new Error(state === "checks-failed" ? "A check failed. Fix it before merging." : "It can’t be merged yet: wait for the checks.");
          }
          // Your Git host's merge call goes here (GitHub: PUT /repos/{owner}/{repo}/pulls/{number}/merge).
          await new Promise((resolve) => setTimeout(resolve, 900));
          await engine.apply(id, { type: "merged", at: Date.now() });
        },
      };
    },
  };
}

export type Service = ReturnType<typeof createService>;
