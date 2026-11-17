import type { ChatMessage, Source, ToolStep } from "@/components/ui/chat-app/chat-app";

/* The stream between app/api/chat/route.ts and the browser: one JSON event
   per line (NDJSON). Providers yield the first four kinds; the route adds
   the rest. Safe to import from client and server. */

/** What a provider yields while it answers. */
export type ProviderEvent =
  /** A piece of the model's (summarized) reasoning. */
  | { type: "reasoning"; text: string }
  /** A piece of the answer, in the thread's Markdown subset. */
  | { type: "text"; text: string }
  /** A tool step, sent again (same id) each time it changes. */
  | { type: "step"; step: ToolStep }
  /** What the answer cites as [1], [2]…, in order. */
  | { type: "sources"; sources: Source[] };

export type ChatErrorCode = "rate-limited" | "unavailable" | "refused" | "failed";

export type ChatConversationSummary = { id: string; title: string; pinned: boolean; updatedAt: number };

export type ChatEvent =
  | ProviderEvent
  /** First line of every stream: the chat (created now for a new one) and the ids the server gave the two messages. */
  | { type: "start"; conversation: ChatConversationSummary; userMessageId?: string; messageId: string }
  | { type: "done" }
  /** The reply failed partway; what's above it stays. `resetsAt` (ISO) for rate limits. */
  | { type: "error"; code: ChatErrorCode; message: string; resetsAt?: string };

/** Folds one provider event into the reply. The route and the browser both
 *  build the message this way, so what streams is what's saved. */
export function applyEvent(reply: ChatMessage, event: ProviderEvent, now = Date.now()): ChatMessage {
  switch (event.type) {
    case "reasoning": {
      const r = reply.reasoning;
      return { ...reply, reasoning: { text: (r?.text ?? "") + event.text, streaming: true, startedAt: r?.startedAt ?? now } };
    }
    case "step": {
      const steps = reply.steps ?? [];
      const known = steps.some((s) => s.id === event.step.id);
      return {
        ...settleReasoning(reply, now),
        steps: known ? steps.map((s) => (s.id === event.step.id ? event.step : s)) : [...steps, event.step],
      };
    }
    case "sources":
      return { ...reply, sources: event.sources };
    case "text":
      return { ...settleReasoning(reply, now), text: reply.text + event.text };
  }
}

/** Reasoning ends when anything else starts: it folds and shows how long it took. */
export function settleReasoning(reply: ChatMessage, now = Date.now()): ChatMessage {
  const r = reply.reasoning;
  if (!r?.streaming) return reply;
  const duration = Math.max(1, Math.round((now - (r.startedAt ?? now)) / 1000));
  return { ...reply, reasoning: { text: r.text, duration } };
}

/** A reply that stopped, failed or finished: nothing in it is still running. */
export function settle(reply: ChatMessage, status: ChatMessage["status"], error?: string, now = Date.now()): ChatMessage {
  const settled = settleReasoning(reply, now);
  return {
    ...settled,
    status,
    ...(error ? { error } : {}),
    steps: settled.steps?.map((s) =>
      s.status === "running" || s.status === "pending" ? { ...s, status: "cancelled", finishedAt: now } : s,
    ),
  };
}

export function encodeEvent(event: ChatEvent) {
  return JSON.stringify(event) + "\n";
}

/** Reads an NDJSON body as events. Throws if the connection drops. */
export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line) as ChatEvent;
    }
  }
}
