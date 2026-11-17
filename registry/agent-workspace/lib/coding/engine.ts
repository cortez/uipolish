import type { CodingAgent } from "./agent";
import { applyEvent, type Effort, type Session, type SessionEvent, type Turn } from "./session";
import type { WorkspaceStore } from "./store";

/* Runs the agent and keeps everyone watching a session in step. Every
   change to a session (an agent's event, a rename, a merge) goes through
   apply(): it's folded into the session with applyEvent, saved, then sent
   to each watcher, one event at a time per session, so the store, the
   stream and every open tab agree. Runs in the server's process, which
   suits a long-lived Node server; on serverless, run turns in a durable
   worker and have it call apply() (or write events to a table the stream
   reads). Safe in the browser: the docs preview runs it there. */

type Listener = (event: SessionEvent) => void;

export type Engine = ReturnType<typeof createEngine>;

export function createEngine(store: WorkspaceStore, getAgent: () => Promise<CodingAgent>) {
  const listeners = new Map<string, Set<Listener>>();
  /** The session as it is while a turn runs, so events don't wait on a read. */
  const live = new Map<string, Session>();
  const runs = new Map<string, AbortController>();
  /** One queue per session: events fold in the order they came. */
  const queues = new Map<string, Promise<unknown>>();

  function serial<T>(id: string, task: () => Promise<T>): Promise<T> {
    const next = (queues.get(id) ?? Promise.resolve()).then(task, task);
    queues.set(
      id,
      next.catch(() => {}),
    );
    return next;
  }

  async function current(id: string) {
    return live.get(id) ?? (await store.getSession(id));
  }

  /** Folds an event into the session, saves it and sends it to every watcher. */
  function apply(id: string, event: SessionEvent) {
    return serial(id, async () => {
      const before = await current(id);
      if (!before) return null;
      const after = applyEvent(before, event);
      if (live.has(id)) live.set(id, after);
      await store.saveSession(after);
      for (const listener of listeners.get(id) ?? []) listener(event);
      return after;
    });
  }

  return {
    apply,

    /** Sends the session as it is now, then every event after it. Returns a function that stops watching. */
    watch(id: string, listener: Listener) {
      let stopped = false;
      serial(id, async () => {
        const session = await current(id);
        if (stopped) return;
        if (!session) {
          listener({ type: "error", message: "This session was deleted.", at: Date.now() });
          return;
        }
        listener({ type: "snapshot", session });
        let set = listeners.get(id);
        if (!set) listeners.set(id, (set = new Set()));
        set.add(listener);
      });
      return () => {
        stopped = true;
        listeners.get(id)?.delete(listener);
      };
    },

    isRunning: (id: string) => runs.has(id),

    /** Starts a turn on a session that isn't working. The agent's events stream to watchers as they come. */
    async start(session: Session, turn: Turn, model: string, effort: Effort) {
      if (runs.has(session.id)) throw new Error("The agent is still working on this session. Stop it first.");
      const controller = new AbortController();
      runs.set(session.id, controller);
      live.set(session.id, session);
      await apply(session.id, { type: "turn", turn });

      void (async () => {
        try {
          const agent = await getAgent();
          const task = { session: (await current(session.id))!, prompt: turn.prompt, model, effort };
          for await (const event of agent.run(task, controller.signal)) {
            if (controller.signal.aborted) break;
            await apply(session.id, event);
          }
          if (controller.signal.aborted) throw controller.signal.reason;
          await apply(session.id, { type: "done", at: Date.now() });
        } catch (error) {
          if (controller.signal.aborted) await apply(session.id, { type: "stopped", at: Date.now() });
          else {
            const message = error instanceof Error && error.message ? error.message : "The agent stopped with an error.";
            await apply(session.id, { type: "error", message, at: Date.now() });
          }
        } finally {
          runs.delete(session.id);
          await serial(session.id, async () => live.delete(session.id));
        }
      })();
    },

    stop(id: string) {
      runs.get(id)?.abort(new Error("Stopped"));
    },

    /** Stops every turn (the docs preview, when it unmounts). */
    stopAll() {
      for (const controller of runs.values()) controller.abort(new Error("Stopped"));
    },
  };
}
