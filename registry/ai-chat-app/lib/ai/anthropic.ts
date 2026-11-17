import Anthropic from "@anthropic-ai/sdk";
import type { ProviderEvent } from "./events";
import type { Connection } from "./connection";
import { ProviderError, type ChatProvider } from "./provider";

/* Claude, through the Anthropic SDK, with the key from AI_API_KEY or
   ANTHROPIC_API_KEY (lib/ai/connection.ts) and AI_BASE_URL for a gateway.
   Reasoning streams as a summary (thinking display "summarized"), so the
   thread can show what the model is working through while it thinks. */

export function anthropic(connection: Connection): ChatProvider {
  const client = new Anthropic({ apiKey: connection.apiKey, ...(connection.baseUrl && { baseURL: connection.baseUrl }) });
  return {
    name: "anthropic",
    async *stream({ model, system, messages, signal }) {
      const stream = client.messages.stream(
        {
          model,
          max_tokens: 64000,
          system,
          thinking: { type: "adaptive", display: "summarized" },
          messages,
        },
        { signal },
      );

      try {
        for await (const event of stream) {
          if (event.type !== "content_block_delta") continue;
          if (event.delta.type === "thinking_delta") yield { type: "reasoning", text: event.delta.thinking } satisfies ProviderEvent;
          else if (event.delta.type === "text_delta") yield { type: "text", text: event.delta.text } satisfies ProviderEvent;
        }
        const message = await stream.finalMessage();
        if (message.stop_reason === "refusal") {
          throw new ProviderError("refused", "This reply was stopped for safety reasons. Try asking another way.");
        }
        if (message.stop_reason === "max_tokens") {
          throw new ProviderError("failed", "This reply hit its length limit. Ask for the rest, or for a shorter answer.");
        }
      } catch (error) {
        throw toProviderError(error);
      }
    },
  };
}

/** The SDK's errors, as something the person can act on. Most specific first. */
function toProviderError(error: unknown) {
  if (error instanceof ProviderError || error instanceof Anthropic.APIUserAbortError) return error;
  if (error instanceof Anthropic.RateLimitError) {
    const retryAfter = Number(error.headers?.get("retry-after"));
    const resetsAt = new Date(Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60) * 1000);
    return new ProviderError("rate-limited", "The model is busy with too many requests right now.", resetsAt);
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("[ai] Anthropic rejected the API key:", error.message);
    return new ProviderError("unavailable", "The assistant isn’t set up correctly. The API key was rejected.");
  }
  if (error instanceof Anthropic.APIError && (error.status === 529 || (error.status ?? 0) >= 500)) {
    return new ProviderError("unavailable", "The model is overloaded right now. Try again in a minute.");
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new ProviderError("unavailable", "Couldn’t reach the model. Try again in a minute.");
  }
  console.error("[ai] Anthropic stream failed:", error);
  return new ProviderError("failed", "Something went wrong while writing this reply.");
}
