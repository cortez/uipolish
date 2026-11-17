import type { ModelOption } from "@/components/ui/model-picker/model-picker";
import type { CodingAgent } from "./agent";
import { MODELS } from "./config";
import { getConnection } from "./connection";

/* Which agent runs and which models the composer offers, from the
   environment. Server only. */

let agent: Promise<CodingAgent> | null = null;

/** The agent lib/coding/connection.ts picks: the mock until a model is set, so the app runs with no setup. */
export function getAgent(): Promise<CodingAgent> {
  const connection = getConnection();
  agent ??=
    connection.kind === "mock"
      ? import("./mock-agent").then((m) => m.mockAgent)
      : import("./model-agent").then((m) => m.modelAgent(connection));
  return agent;
}

/** The models the composer's picker offers. With OpenAI or an OpenAI-compatible API, the one in AI_MODEL. */
export function availableModels(): ModelOption[] {
  const { kind, model, baseUrl } = getConnection();
  if (kind === "mock" || kind === "anthropic") {
    return model && !MODELS.some((m) => m.id === model) ? [{ id: model, name: model, description: "Set by AI_MODEL" }, ...MODELS] : MODELS;
  }
  let host = baseUrl ?? "";
  try {
    host = new URL(host).host;
  } catch {
    // Not a URL: show it as it is.
  }
  return [{ id: model!, name: model!, description: kind === "openai" ? "From OpenAI" : `From ${host}` }];
}

/** Only models in the picker are accepted from the browser. */
export function allowedModel(model: unknown) {
  const models = availableModels();
  if (typeof model === "string" && models.some((m) => m.id === model)) return model;
  return getConnection().model ?? models[0].id;
}

/** The line under the composer: what's answering, and why the mock is when a setting can't work. */
export function composerHint() {
  const { kind, problem } = getConnection();
  if (problem) return `A mock agent is answering: ${problem}`;
  return kind === "mock" ? "A mock agent is answering. Set AI_PROVIDER and a key in .env.local to use a model." : "Check the diff before you merge.";
}
