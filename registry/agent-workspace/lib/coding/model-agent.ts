import type { AgentTask, CodingAgent } from "./agent";
import { SYSTEM_PROMPT } from "./config";
import type { Connection } from "./connection";
import { callModel } from "./model-call";
import type { AgentEvent } from "./session";

/* The agent once a model is set (lib/coding/connection.ts): one streamed
   model call per turn, shown as a tool step, its answer streaming into
   the thread. It has no sandbox, so it reads no files and changes none:
   it answers from the conversation. A real coding agent runs a tool loop
   in a sandbox (the Claude Agent SDK, your own worker) and yields a `step`
   around each tool call, a `file` for each file it changes, `pr` and
   `checks` from your Git host, and `text` for the answer; see agent.ts. */

const EFFORT_NOTE = {
  low: "Answer briefly.",
  medium: "Think it through before you answer.",
  high: "Take your time: consider edge cases and say how you'd check the change.",
};

/** The session so far as one prompt: earlier turns, then this one. */
function promptFor({ session, prompt }: AgentTask) {
  const earlier = session.turns
    .slice(0, -1)
    .filter((t) => t.reply)
    .map((t) => `Teammate: ${t.prompt}\n\nYou: ${t.reply}`);
  return earlier.length ? `Earlier in this session:\n\n${earlier.join("\n\n---\n\n")}\n\n---\n\nNow: ${prompt}` : prompt;
}

export function modelAgent(connection: Connection): CodingAgent {
  return {
    name: connection.kind,
    async *run(task, signal) {
      const model = connection.model ?? task.model;
      const turn = task.session.turns.length;
      const step = { id: `model-${turn}`, icon: "gauge" as const, title: `Asking ${model}` };
      const group = `model-group-${turn}`;
      const startedAt = Date.now();
      yield { type: "step", group, step: { ...step, status: "running", startedAt } };

      // Bridge the SDK's callbacks to this generator: pieces queue up and are yielded in order.
      const queue: AgentEvent[] = [];
      let wake: (() => void) | null = null;
      let finished = false;
      let failure: unknown = null;
      const push = (event: AgentEvent) => {
        queue.push(event);
        wake?.();
      };

      callModel(connection, {
        model,
        system: `${SYSTEM_PROMPT}\n\nRepository: ${task.session.repo}, branch ${task.session.branch}. You can't run tools in this session: answer from what's in it. ${EFFORT_NOTE[task.effort]}`,
        prompt: promptFor(task),
        signal,
        onText: (text) => push({ type: "text", text }),
      }).then(
        (result) => {
          const tokens = `${result.tokens.input.toLocaleString("en-US")} in, ${result.tokens.output.toLocaleString("en-US")} out${result.estimated ? " (estimated)" : ""}`;
          push({ type: "step", group, step: { ...step, title: `Asked ${model}`, status: "done", detail: tokens, startedAt, finishedAt: Date.now() } });
          finished = true;
          wake?.();
        },
        (error) => {
          failure = error;
          finished = true;
          wake?.();
        },
      );

      while (true) {
        while (queue.length) yield queue.shift()!;
        if (finished) break;
        await new Promise<void>((resolve) => (wake = resolve));
        wake = null;
      }
      while (queue.length) yield queue.shift()!;
      if (failure) {
        yield { type: "step", group, step: { ...step, status: "failed", error: failure instanceof Error ? failure.message : String(failure), startedAt, finishedAt: Date.now() } };
        throw failure;
      }
    },
  };
}
