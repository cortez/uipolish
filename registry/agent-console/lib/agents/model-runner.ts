import type { RunStep } from "@/components/ui/run-history/run-history";
import { costOf } from "@/lib/product";
import { modelFor, type Connection } from "./connection";
import { callModel } from "./model-call";
import type { AgentRunner } from "./runner";

/* A runner with a real model behind it, on the API lib/agents/connection.ts
   picks from the environment. A run is one model call: the agent's
   instructions as the system prompt and the task as the message, with what
   Knowledge has on it first when the agent may search Knowledge. The
   answer streams into the step and becomes the run's output.

   It doesn't call the agent's MCP tools yet. For that, make it a loop: send
   the tools with the call, and for each tool call the model makes, ask
   `authorize` with what the approval should show, run it on its server
   inside a `tool` step, and send the result back, until the model answers. */

const KNOWLEDGE = { server: "Knowledge", tool: "search_knowledge" };

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function modelRunner(connection: Connection): AgentRunner {
  return {
    name: connection.kind,
    async *run({ runId, agent, task, searchKnowledge }, { signal, authorize }) {
      const started = Date.now();
      const at = () => Date.now() - started;
      let n = 0;
      const id = () => `${runId}-s${++n}`;

      let prompt = task;
      if (agent.allowed.some((t) => t.server === KNOWLEDGE.server && t.tool === KNOWLEDGE.tool)) {
        const args = { query: task, top_k: 4 };
        const decision = await authorize({
          server: KNOWLEDGE.server,
          name: KNOWLEDGE.tool,
          effect: "read",
          arguments: args,
          title: `Let ${agent.name} search Knowledge`,
          preview: { kind: "code", language: "json", label: "Knowledge · search_knowledge", code: JSON.stringify(args, null, 2) },
        });
        if (!decision.allowed) return;
        const step: RunStep = { id: id(), kind: "tool", name: KNOWLEDGE.tool, status: "running", startMs: at(), input: JSON.stringify(args, null, 2) };
        yield { type: "step", step };
        const found = await searchKnowledge(task);
        const passages = found.map((p, i) => `[${i + 1}] ${p.location ? `${p.location}: ` : ""}${p.text}`).join("\n\n");
        yield { type: "step", step: { ...step, status: "succeeded", durationMs: at() - step.startMs, output: passages || "Nothing in Knowledge matched." } };
        if (passages) prompt = `${task}\n\nWhat this workspace's Knowledge says about it:\n\n${passages}`;
      }

      const model = modelFor(agent.model);
      const step: RunStep = { id: id(), kind: "llm", name: "Answer the task", status: "running", startMs: at(), model, input: prompt };
      yield { type: "step", step };

      let streamed = "";
      let settled = false;
      const call = callModel(connection, { model, system: agent.instructions, prompt, signal, onText: (t) => (streamed += t) });
      call.then(
        () => (settled = true),
        () => (settled = true),
      );
      // The answer shows in the open trace as it streams, a few times a second.
      let shown = "";
      while (!settled) {
        await Promise.race([call.catch(() => {}), pause(400)]);
        if (streamed !== shown && !settled) {
          shown = streamed;
          yield { type: "step", step: { ...step, output: shown } };
        }
      }

      let result;
      try {
        result = await call;
      } catch (error) {
        if (signal.aborted) throw error;
        const message = error instanceof Error ? error.message : "The model call failed.";
        yield { type: "step", step: { ...step, status: "failed", durationMs: at() - step.startMs, error: message, ...(streamed && { output: streamed }) } };
        throw new Error(message);
      }
      yield {
        type: "step",
        step: { ...step, status: "succeeded", durationMs: at() - step.startMs, output: result.text, tokens: result.tokens, cost: costOf(model, result.tokens) },
      };
      yield { type: "output", output: { text: result.text } };
    },
  };
}
