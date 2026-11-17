import type { Connection } from "./connection";
import type { ProviderEvent } from "./events";
import { ProviderError, type ChatProvider } from "./provider";

/* OpenAI's Chat Completions API, streamed, with plain fetch: OpenAI itself,
   and anything that speaks the same API at AI_BASE_URL (OpenRouter, Groq,
   Together, Fireworks, DeepSeek, Ollama, LM Studio, vLLM, gateways).

   Reasoning shows when the API streams it: `reasoning_content` (DeepSeek,
   vLLM, LM Studio) or `reasoning` (OpenRouter, Groq, Ollama). OpenAI's own
   models keep theirs hidden here, so their replies go straight to text. */

type Chunk = {
  choices?: { delta?: { content?: string | null; reasoning_content?: string | null; reasoning?: string | null }; finish_reason?: string | null }[];
  error?: { message?: string };
};

export function openai(connection: Connection): ChatProvider {
  const name = connection.kind === "openai" ? "OpenAI" : connection.baseUrl!;
  return {
    name: connection.kind,
    async *stream({ model, system, messages, signal }) {
      let response: Response;
      try {
        response = await fetch(`${connection.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(connection.apiKey && { authorization: `Bearer ${connection.apiKey}` }),
          },
          body: JSON.stringify({ model, stream: true, messages: [{ role: "system", content: system }, ...messages] }),
          signal,
        });
      } catch (error) {
        if (signal.aborted) throw error;
        console.error(`[ai] Couldn’t reach ${name}:`, error);
        throw new ProviderError("unavailable", "Couldn’t reach the model. Try again in a minute.");
      }
      if (!response.ok || !response.body) throw await httpError(response, name);

      let finish: string | null | undefined;
      for await (const data of serverSentEvents(response.body)) {
        if (data === "[DONE]") break;
        let chunk: Chunk;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        if (chunk.error) {
          console.error(`[ai] ${name} failed mid-reply:`, chunk.error.message);
          throw new ProviderError("failed", "The model stopped with an error partway through this reply.");
        }
        const choice = chunk.choices?.[0];
        const reasoning = choice?.delta?.reasoning_content ?? choice?.delta?.reasoning;
        if (reasoning) yield { type: "reasoning", text: reasoning } satisfies ProviderEvent;
        if (choice?.delta?.content) yield { type: "text", text: choice.delta.content } satisfies ProviderEvent;
        if (choice?.finish_reason) finish = choice.finish_reason;
      }
      if (finish === "length") throw new ProviderError("failed", "This reply hit its length limit. Ask for the rest, or for a shorter answer.");
      if (finish === "content_filter") throw new ProviderError("refused", "This reply was stopped for safety reasons. Try asking another way.");
    },
  };
}

/** A failed response, as something the person can act on. The details go to the server log. */
async function httpError(response: Response, name: string) {
  const detail = (await response.text().catch(() => "")).slice(0, 500);
  const { status } = response;
  if (status === 429) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const resetsAt = new Date(Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60) * 1000);
    return new ProviderError("rate-limited", "The model is busy with too many requests right now.", resetsAt);
  }
  console.error(`[ai] ${name} answered ${status}:`, detail);
  if (status === 401 || status === 403) return new ProviderError("unavailable", "The assistant isn’t set up correctly. The API key was rejected.");
  if (status === 404) return new ProviderError("unavailable", "The assistant isn’t set up correctly. The model or address wasn’t found.");
  if (status >= 500) return new ProviderError("unavailable", "The model is overloaded right now. Try again in a minute.");
  return new ProviderError("failed", "Something went wrong while writing this reply.");
}

/** The `data` of each server-sent event in a body, joined when it spans lines. Comments and other fields are skipped. */
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
    // Stopped early (Stop, or [DONE] before the body ended): close the connection.
    await reader.cancel().catch(() => {});
  }
}
