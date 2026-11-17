import Anthropic from "@anthropic-ai/sdk";
import type { Connection } from "./connection";

/* One streamed model call, on whichever API lib/coding/connection.ts picked:
   Claude through the Anthropic SDK, or OpenAI's Chat Completions API (and
   any OpenAI-compatible one at AI_BASE_URL) with plain fetch. The agent
   (model-agent.ts) wraps each call in a tool step. Errors come back in
   words a session can show; the details go to the server log. */

export type ModelCall = {
  model: string;
  system: string;
  prompt: string;
  signal: AbortSignal;
  /** Each piece of the answer as it streams. */
  onText?: (text: string) => void;
};

export type ModelResult = {
  text: string;
  tokens: { input: number; output: number; cached?: number };
  /** True when the API didn't report usage and the counts are estimates. */
  estimated?: boolean;
};

export function callModel(connection: Connection, call: ModelCall): Promise<ModelResult> {
  return connection.kind === "anthropic" ? callClaude(connection, call) : callChatCompletions(connection, call);
}

async function callClaude(connection: Connection, { model, system, prompt, signal, onText }: ModelCall): Promise<ModelResult> {
  const client = new Anthropic({ apiKey: connection.apiKey, ...(connection.baseUrl && { baseURL: connection.baseUrl }) });
  try {
    const stream = client.messages.stream({ model, max_tokens: 16000, system, messages: [{ role: "user", content: prompt }] }, { signal });
    stream.on("text", (text) => onText?.(text));
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") throw new Error("The model declined this task.");
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens } = message.usage;
    const cached = cache_read_input_tokens ?? 0;
    return { text, tokens: { input: input_tokens + cached + (cache_creation_input_tokens ?? 0), output: output_tokens, ...(cached && { cached }) } };
  } catch (error) {
    if (signal.aborted || error instanceof Anthropic.APIUserAbortError) throw error;
    if (error instanceof Anthropic.RateLimitError) throw new Error("Anthropic is rate limiting this key. Try again in a minute.");
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new Error("Anthropic rejected the API key. Check AI_API_KEY in .env.local.");
    }
    if (error instanceof Anthropic.NotFoundError) throw new Error(`Anthropic has no model “${model}”. Pick another in the composer, or set AI_MODEL.`);
    if (error instanceof Anthropic.APIError && (error.status ?? 0) >= 500) throw new Error("Anthropic is overloaded right now. Try again in a minute.");
    if (error instanceof Anthropic.APIConnectionError) throw new Error("Couldn’t reach Anthropic. Try again in a minute.");
    if (error instanceof Error && !(error instanceof Anthropic.APIError)) throw error;
    console.error("[workspace] Anthropic call failed:", error);
    throw new Error("The model call failed.");
  }
}

type Chunk = {
  choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } | null;
  error?: { message?: string };
};

async function callChatCompletions(connection: Connection, { model, system, prompt, signal, onText }: ModelCall): Promise<ModelResult> {
  const name = connection.kind === "openai" ? "OpenAI" : new URL(connection.baseUrl!).host;
  let response: Response;
  try {
    response = await fetch(`${connection.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(connection.apiKey && { authorization: `Bearer ${connection.apiKey}` }) },
      body: JSON.stringify({
        model,
        stream: true,
        // Asks for token counts in the last chunk; APIs that don't send them get estimates.
        stream_options: { include_usage: true },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    console.error(`[workspace] Couldn’t reach ${name}:`, error);
    throw new Error(`Couldn’t reach ${name}. Try again in a minute.`);
  }
  if (!response.ok || !response.body) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    console.error(`[workspace] ${name} answered ${response.status}:`, detail);
    if (response.status === 401 || response.status === 403) throw new Error(`${name} rejected the API key. Check AI_API_KEY in .env.local.`);
    if (response.status === 404) throw new Error(`${name} has no model “${model}”, or AI_BASE_URL is wrong.`);
    if (response.status === 429) throw new Error(`${name} is rate limiting this key. Try again in a minute.`);
    if (response.status >= 500) throw new Error(`${name} is overloaded right now. Try again in a minute.`);
    throw new Error(`${name} refused the call (${response.status}).`);
  }

  let text = "";
  let usage: Chunk["usage"];
  let finish: string | null | undefined;
  for await (const data of serverSentEvents(response.body)) {
    if (data === "[DONE]") break;
    let chunk: Chunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      continue;
    }
    if (chunk.error) throw new Error(`${name} stopped with an error: ${chunk.error.message ?? "unknown"}`);
    const choice = chunk.choices?.[0];
    if (choice?.delta?.content) {
      text += choice.delta.content;
      onText?.(choice.delta.content);
    }
    if (choice?.finish_reason) finish = choice.finish_reason;
    if (chunk.usage) usage = chunk.usage;
  }
  if (finish === "content_filter") throw new Error("The model declined this task.");

  if (usage?.prompt_tokens !== undefined) {
    const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
    return { text, tokens: { input: usage.prompt_tokens, output: usage.completion_tokens ?? 0, ...(cached && { cached }) } };
  }
  // About four characters a token.
  return { text, tokens: { input: Math.ceil((system.length + prompt.length) / 4), output: Math.ceil(text.length / 4) }, estimated: true };
}

/** The `data` of each server-sent event in a body, joined when it spans lines. */
async function* serverSentEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.search(/\r?\n/)) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + (buffer[newline] === "\r" ? 2 : 1));
        if (line === "") {
          if (data.length) yield data.join("\n");
          data = [];
        } else if (line.startsWith("data:")) {
          data.push(line.slice(5).replace(/^ /, ""));
        }
      }
      if (done) break;
    }
    if (data.length) yield data.join("\n");
  } finally {
    await reader.cancel().catch(() => {});
  }
}
