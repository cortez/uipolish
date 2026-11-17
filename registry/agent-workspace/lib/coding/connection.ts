/* Which model API the agent calls, from the environment. Server only.

   AI_PROVIDER   anthropic | openai | openai-compatible | mock
   AI_MODEL      The model the agent runs on. Unset: the one picked in the composer
   AI_API_KEY    The key. ANTHROPIC_API_KEY and OPENAI_API_KEY work too
   AI_BASE_URL   The API's address, for openai-compatible (or a gateway)

   With no AI_PROVIDER, it's picked from what is set: AI_BASE_URL means an
   OpenAI-compatible API, ANTHROPIC_API_KEY Anthropic, OPENAI_API_KEY
   OpenAI, and AI_API_KEY alone Anthropic for an `sk-ant-` key, else OpenAI.
   With nothing set, the mock agent (mock-agent.ts) plays scripted sessions. */

export type ProviderKind = "anthropic" | "openai" | "openai-compatible" | "mock";

export type Connection = {
  kind: ProviderKind;
  apiKey?: string;
  /** Without a trailing slash. */
  baseUrl?: string;
  /** AI_MODEL, or OpenAI's default. When absent, the model picked in the composer. */
  model?: string;
  /** Set when the environment asks for a provider it can't use; the mock runs instead. */
  problem?: string;
};

const KINDS: ProviderKind[] = ["anthropic", "openai", "openai-compatible", "mock"];
const OPENAI_URL = "https://api.openai.com/v1";
/** The model OpenAI runs on without AI_MODEL. */
export const OPENAI_DEFAULT_MODEL = "gpt-5";

const read = (name: string) => process.env[name]?.trim() || undefined;

function pickKind(): ProviderKind | string {
  const named = read("AI_PROVIDER")?.toLowerCase();
  if (named) return named;
  if (read("AI_BASE_URL")) return "openai-compatible";
  if (read("ANTHROPIC_API_KEY")) return "anthropic";
  if (read("OPENAI_API_KEY")) return "openai";
  const key = read("AI_API_KEY");
  if (key) return key.startsWith("sk-ant-") ? "anthropic" : "openai";
  return "mock";
}

function resolve(): Connection {
  const kind = pickKind();
  const baseUrl = read("AI_BASE_URL")?.replace(/\/+$/, "");
  const model = read("AI_MODEL");
  const mock = (problem: string): Connection => (console.error(`[workspace] ${problem} Using the mock agent.`), { kind: "mock", problem });

  switch (kind) {
    case "mock":
      return { kind };
    case "anthropic": {
      const apiKey = read("AI_API_KEY") ?? read("ANTHROPIC_API_KEY");
      if (!apiKey) return mock("AI_PROVIDER is anthropic, but there’s no AI_API_KEY or ANTHROPIC_API_KEY.");
      return { kind, apiKey, baseUrl, model };
    }
    case "openai": {
      const apiKey = read("AI_API_KEY") ?? read("OPENAI_API_KEY");
      if (!apiKey) return mock("AI_PROVIDER is openai, but there’s no AI_API_KEY or OPENAI_API_KEY.");
      return { kind, apiKey, baseUrl: baseUrl ?? OPENAI_URL, model: model ?? OPENAI_DEFAULT_MODEL };
    }
    case "openai-compatible": {
      if (!baseUrl) return mock("AI_PROVIDER is openai-compatible, but AI_BASE_URL isn’t set.");
      if (!model) return mock("AI_PROVIDER is openai-compatible, but AI_MODEL isn’t set.");
      // A local server (Ollama, LM Studio) needs no key.
      return { kind, apiKey: read("AI_API_KEY") ?? read("OPENAI_API_KEY"), baseUrl, model };
    }
    default:
      return mock(`AI_PROVIDER is “${kind}”, which isn’t one of ${KINDS.join(", ")}.`);
  }
}

let connection: Connection | null = null;

/** Read once per server process: restart after changing .env.local. */
export function getConnection(): Connection {
  connection ??= resolve();
  return connection;
}
