import type { ToolEffect } from "@/components/ui/agent-settings/agent-settings";
import type { RunOutput, RunStep } from "@/components/ui/run-history/run-history";
import type { Agent, Passage } from "@/lib/db/database";
import { getConnection } from "./connection";
import { mockRunner } from "./mock";
import type { Ask } from "./scenarios";

/* The one seam between the console and whatever runs your agents. A runner
   takes a task and yields the run's steps as they start and finish; the
   engine (engine.ts) saves them, adds up tokens and cost, and decides how
   the run ended. Before any tool call, the runner asks `authorize`: it
   resolves at once when the agent's policy allows the tool, and otherwise
   when a person decides in Approvals.

   Which runner runs comes from the environment (lib/agents/connection.ts):
   with AI_PROVIDER and a key set, model-runner.ts answers each task with
   one call to that model; with nothing set, mock.ts plays scripted runs.
   For a full agent (a tool loop, the Claude Agent SDK, your own worker),
   write a file that implements AgentRunner and return it from getRunner(). */

export type RunTask = {
  runId: string;
  agent: Agent;
  /** What the agent was asked. */
  task: string;
  /** Searches the workspace's Knowledge, for agents that answer from it. */
  searchKnowledge: (query: string) => Promise<Passage[]>;
};

export type ToolRequest = Ask & {
  /** The MCP server's name, as the agent's Connections list it: "Stripe". */
  server: string;
  /** As the server names it: `create_refund`. */
  name: string;
  effect: ToolEffect;
  arguments: Record<string, unknown>;
};

export type ToolDecision =
  /** `edits`: the fields the person changed before approving, by key. `by`: who approved, when a person did. */
  | { allowed: true; edits?: Record<string, string>; by?: string }
  /** Why, in a sentence: "Declined by Ana Ruiz: wrong customer." */
  | { allowed: false; reason: string };

export type RunEvent =
  /** A step started or changed. Send the same `id` again to update it. */
  | { type: "step"; step: RunStep }
  | { type: "output"; output: RunOutput };

export type RunContext = {
  /** Aborts when someone cancels the run. */
  signal: AbortSignal;
  authorize(request: ToolRequest): Promise<ToolDecision>;
};

export interface AgentRunner {
  /** "mock", a provider ("anthropic", "openai"…), or yours. Sample traffic runs only with the mock. */
  name: string;
  /** Return when done; throw to fail the run with the error's message. */
  run(task: RunTask, context: RunContext): AsyncIterable<RunEvent>;
}

/** The model runner once a provider is set; until then the mock, which plays scripted runs in real time so the console is whole with no setup. */
export function getRunner(): AgentRunner {
  const connection = getConnection();
  if (connection.kind === "mock") return mockRunner;
  return {
    name: connection.kind,
    // Loaded on the first run, so the mock never loads a model client.
    async *run(task, context) {
      const { modelRunner } = await import("./model-runner");
      yield* modelRunner(connection).run(task, context);
    },
  };
}
