import type { AgentEvent, Effort, Session } from "./session";

/* The one seam between the workspace and whatever does the coding. An
   agent takes a prompt in a session and yields what it does as it does
   it: notes, tool calls, the files it changes with their diff stats, the
   pull request and its checks, and the answer. The engine (engine.ts)
   folds each event into the session, saves it and streams it to everyone
   watching. Return when the work is done; throw to fail the turn with the
   error's message; stop when `signal` aborts.

   lib/coding/agents.ts picks one from the environment: with a model set
   (lib/coding/connection.ts), model-agent.ts answers with that model; with
   nothing set, mock-agent.ts plays a scripted session. For a real coding
   agent (the Claude Agent SDK in a sandbox, your own worker), write a file
   that implements CodingAgent and return it from getAgent(). */

export type AgentTask = {
  /** The session as it is, this turn's prompt included as its last turn. */
  session: Session;
  prompt: string;
  model: string;
  effort: Effort;
};

export interface CodingAgent {
  /** "mock", a provider ("anthropic", "openai"…), or yours. */
  name: string;
  run(task: AgentTask, signal: AbortSignal): AsyncIterable<AgentEvent>;
}

/** Waits, or throws as soon as `signal` aborts. */
export function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(done, ms);
    function done() {
      signal.removeEventListener("abort", abort);
      resolve();
    }
    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}
