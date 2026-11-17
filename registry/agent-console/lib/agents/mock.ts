import type { RunStep } from "@/components/ui/run-history/run-history";
import { costOf } from "@/lib/product";
import type { AgentRunner, RunEvent } from "./runner";
import { scriptFor, type Beat } from "./scenarios";

/* A runner with no model behind it: it plays the agent's script from
   scenarios.ts in real time, with the waits a real run has, and asks before
   each tool call like a real one must. One run in eight hits a flaky tool
   and retries; one in twelve fails. */

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

export class ToolFailed extends Error {}

export const mockRunner: AgentRunner = {
  name: "mock",
  async *run({ runId, agent, task, searchKnowledge }, { signal, authorize }) {
    const roll = Math.random();
    const beats = scriptFor(agent.id, task, Math.random, { fail: roll < 1 / 12, flaky: roll > 7 / 8 });
    const started = Date.now();
    const at = () => Date.now() - started;
    let n = 0;
    const id = () => `${runId}-s${++n}`;
    let edits: Record<string, string> = {};

    for (const beat of beats) {
      if (beat.kind === "output") {
        const edited = beat.fromField ? edits[beat.fromField] : undefined;
        yield { type: "output", output: edited ? { ...beat.output, text: edited } : beat.output };
        continue;
      }

      if (beat.kind === "llm") {
        const step: RunStep = { id: id(), kind: "llm", name: beat.name, status: "running", startMs: at(), model: agent.model, input: beat.input };
        yield { type: "step", step };
        await sleep(beat.ms, signal);
        yield {
          type: "step",
          step: { ...step, status: "succeeded", durationMs: at() - step.startMs, output: beat.output, tokens: beat.tokens, cost: costOf(agent.model, beat.tokens) },
        };
        continue;
      }

      const decision = await authorize({
        server: beat.server,
        name: beat.name,
        effect: beat.effect,
        arguments: beat.args,
        title: beat.ask?.title ?? `Let ${agent.name} run ${beat.name} on ${beat.server}`,
        note: beat.ask?.note,
        priority: beat.ask?.priority,
        preview: beat.ask?.preview ?? { kind: "code", language: "json", label: `${beat.server} · ${beat.name}`, code: JSON.stringify(beat.args, null, 2) },
        recipients: beat.ask?.recipients,
        fields: beat.ask?.fields,
      });
      if (!decision.allowed) return;
      edits = { ...edits, ...decision.edits };
      // An edited amount comes back in dollars; the tool takes cents.
      const changed = Object.entries(decision.edits ?? {}).map(([key, value]) => [key, typeof beat.args[key] === "number" ? Math.round(Number(value) * 100) : value]);
      yield* tool(beat, { ...beat.args, ...Object.fromEntries(changed) }, id, at, signal, searchKnowledge);
    }
  },
};

async function* tool(
  beat: Extract<Beat, { kind: "tool" }>,
  args: Record<string, unknown>,
  id: () => string,
  at: () => number,
  signal: AbortSignal,
  searchKnowledge: (query: string) => Promise<{ location?: string; text: string }[]>,
): AsyncGenerator<RunEvent> {
  const input = JSON.stringify(args, null, 2);
  for (let attempt = 1; attempt <= (beat.flaky?.times ?? 0) + 1; attempt++) {
    const step: RunStep = { id: id(), kind: "tool", name: beat.name, status: "running", startMs: at(), input, ...(attempt > 1 && { attempt }) };
    yield { type: "step", step };
    await sleep(beat.ms, signal);
    const retrying = beat.flaky && attempt <= beat.flaky.times;
    if (retrying) {
      yield { type: "step", step: { ...step, status: "retried", durationMs: at() - step.startMs, error: beat.flaky!.error } };
      continue;
    }
    if (beat.error) {
      yield { type: "step", step: { ...step, status: "failed", durationMs: at() - step.startMs, error: beat.error } };
      throw new ToolFailed(`${beat.name} failed: ${beat.error}`);
    }
    // The support agent's search reads the workspace's real Knowledge.
    let output = beat.result;
    if (beat.name === "search_knowledge") {
      const found = await searchKnowledge(String(args.query ?? ""));
      output = found.length
        ? found.map((p, i) => `[${i + 1}] ${p.location ? `${p.location}: ` : ""}${p.text}`).join("\n\n")
        : "Nothing in Knowledge matched. Add the help center in Knowledge.";
    }
    yield { type: "step", step: { ...step, status: "succeeded", durationMs: at() - step.startMs, output } };
  }
}
