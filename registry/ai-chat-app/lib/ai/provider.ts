import type { ModelOption } from "@/components/ui/model-picker/model-picker";
import { ASSISTANT_NAME, MODELS } from "@/lib/config";
import { getConnection } from "./connection";
import type { ChatErrorCode, ProviderEvent } from "./events";

/* The one seam between the app and a model. A provider takes the
   conversation as plain text turns and yields events; everything else
   (saving, limits, streaming to the browser) is the route's job.

   Which one answers comes from the environment (lib/ai/connection.ts):
   anthropic.ts for Claude, openai.ts for OpenAI and any OpenAI-compatible
   API, mock.ts when nothing is set. For another kind of API, write a file
   like openai.ts that implements ChatProvider and return it from
   getProvider(). */

export type ProviderMessage = { role: "user" | "assistant"; content: string };

export type ProviderRequest = {
  model: string;
  system: string;
  messages: ProviderMessage[];
  /** Aborts when the person presses Stop or leaves. */
  signal: AbortSignal;
};

export interface ChatProvider {
  /** "anthropic", "openai", "openai-compatible" or "mock". */
  name: string;
  stream(request: ProviderRequest): AsyncIterable<ProviderEvent>;
}

/** Throw from a provider to show the person a specific message. Anything else reads as "failed". */
export class ProviderError extends Error {
  constructor(
    readonly code: ChatErrorCode,
    message: string,
    /** For rate limits: when to try again. */
    readonly resetsAt?: Date,
  ) {
    super(message);
  }
}

/** The models people can pick: the list in lib/config.ts for Claude and the
 *  mock (with AI_MODEL added if it isn't there), and AI_MODEL alone for
 *  OpenAI and OpenAI-compatible APIs. */
export function availableModels(): ModelOption[] {
  const { kind, model, baseUrl } = getConnection();
  if (kind === "mock" || kind === "anthropic") {
    return model && !MODELS.some((m) => m.id === model) ? [{ id: model, name: model, description: "Set by AI_MODEL" }, ...MODELS] : MODELS;
  }
  return [{ id: model!, name: model!, description: kind === "openai" ? "From OpenAI" : `From ${hostOf(baseUrl)}` }];
}

const hostOf = (url = "") => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/** The model new chats start on: AI_MODEL, or the first in the list. */
export function defaultModel() {
  return getConnection().model ?? availableModels()[0].id;
}

/** Only models in the picker are accepted from the browser. */
export function allowedModel(model: unknown) {
  if (typeof model === "string" && availableModels().some((m) => m.id === model)) return model;
  return defaultModel();
}

let provider: Promise<ChatProvider> | null = null;

/** The provider lib/ai/connection.ts picks from the environment; the mock when nothing is set, so the app runs with no setup. */
export function getProvider(): Promise<ChatProvider> {
  const connection = getConnection();
  provider ??=
    connection.kind === "anthropic"
      ? import("./anthropic").then((m) => m.anthropic(connection))
      : connection.kind === "openai" || connection.kind === "openai-compatible"
        ? import("./openai").then((m) => m.openai(connection))
        : import("./mock").then((m) => m.mock);
  return provider;
}

export function usingMock() {
  return getConnection().kind === "mock";
}

/** The line under the composer. With the mock, it says how to connect a model (or what's wrong with the setup). */
export function composerHint() {
  const { kind, problem } = getConnection();
  if (problem) return `Replies come from a mock model: ${problem}`;
  return kind === "mock"
    ? "Replies come from a mock model. Set AI_PROVIDER and a key in .env.local to use a real one."
    : `${ASSISTANT_NAME} can make mistakes. Check what matters.`;
}
