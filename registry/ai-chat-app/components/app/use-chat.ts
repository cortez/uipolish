"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChatMessage } from "@/components/ui/chat-app/chat-app";
import { applyEvent, readEvents, settle, type ChatConversationSummary, type ChatEvent } from "@/lib/ai/events";

/* One conversation's messages and what's happening to them. The hook owns
   the stream; the server owns what's saved. Sending is optimistic: the
   message and an empty reply appear at once and fill in as events arrive. */

export type ChatRequest = {
  conversationId: string | null;
  workspaceId?: string;
  text?: string;
  model: string;
  /** Write the last reply again. */
  retryOf?: string;
};

/** Where events come from: the route by default, a mock in the docs preview or a test. */
export type ChatTransport = (request: ChatRequest, signal: AbortSignal) => AsyncIterable<ChatEvent>;

/** Thrown by a transport before any event, for answers like 429. */
export class ChatRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly resetsAt?: string,
  ) {
    super(message);
  }
}

export const fetchTransport: ChatTransport = async function* (request, signal) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new ChatRequestError(body?.error?.code ?? "failed", body?.error?.message ?? "The reply couldn’t start.", body?.error?.resetsAt);
  }
  yield* readEvents(res.body);
};

export type ChatHookStatus = "ready" | "streaming" | "offline" | "rate-limited";

type Options = {
  conversationId: string | null;
  workspaceId?: string;
  initialMessages: ChatMessage[];
  model: string;
  /** Set when the daily limit is already used up. */
  limitResetsAt?: string;
  transport?: ChatTransport;
  /** The server named the chat (or touched it): add it to the list. */
  onConversation?: (conversation: ChatConversationSummary, created: boolean) => void;
  /** A message couldn't be sent at all; its text goes back in the composer. */
  onUnsent?: (text: string) => void;
};

const DROPPED = "The connection dropped before this reply finished.";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

let local = 0;
const localId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++local}`;

export function useChat({
  conversationId: initialId,
  workspaceId,
  initialMessages,
  model,
  limitResetsAt: initialLimit,
  transport = fetchTransport,
  onConversation,
  onUnsent,
}: Options) {
  const [messages, setMessages] = useState(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [limitResetsAt, setLimitResetsAt] = useState(initialLimit);
  // A failure before anything was saved has no reply to show it on; the caller shows it as a toast.
  const [notice, setNotice] = useState<string | null>(null);
  const online = useOnline();
  const conversationId = useRef(initialId);
  const controller = useRef<AbortController | null>(null);

  // Leaving the page stops the reply; the server saves what it had.
  useEffect(() => () => controller.current?.abort(), []);

  // The limit lifts at its reset time without a reload.
  useEffect(() => {
    if (!limitResetsAt) return;
    const timer = window.setTimeout(() => setLimitResetsAt(undefined), Math.max(0, new Date(limitResetsAt).getTime() - Date.now()));
    return () => window.clearTimeout(timer);
  }, [limitResetsAt]);

  const patch = useCallback(
    (id: string, change: (m: ChatMessage) => ChatMessage) => setMessages((list) => list.map((m) => (m.id === id ? change(m) : m))),
    [],
  );

  const run = useCallback(
    async (request: ChatRequest, replyId: string, userId?: string, text?: string) => {
      const abort = new AbortController();
      controller.current = abort;
      setStreaming(true);
      let id = replyId;
      let started = false;
      try {
        for await (const event of transport(request, abort.signal)) {
          if (event.type === "start") {
            started = true;
            const created = conversationId.current === null;
            conversationId.current = event.conversation.id;
            onConversation?.(event.conversation, created);
            // The server's ids, so Retry and the saved copy agree.
            setMessages((list) =>
              list.map((m) => (m.id === replyId ? { ...m, id: event.messageId } : m.id === userId && event.userMessageId ? { ...m, id: event.userMessageId } : m)),
            );
            id = event.messageId;
          } else if (event.type === "done") {
            patch(id, (m) => settle(m, "complete"));
          } else if (event.type === "error") {
            patch(id, (m) => settle(m, "error", event.message));
            if (event.code === "rate-limited" && event.resetsAt) setLimitResetsAt(event.resetsAt);
          } else {
            patch(id, (m) => applyEvent(m, event));
          }
        }
        // A stream that ends without "done" or "error" was cut off.
        patch(id, (m) => (m.status === "streaming" ? settle(m, "error", DROPPED) : m));
      } catch (error) {
        if (abort.signal.aborted) {
          patch(id, (m) => settle(m, "stopped"));
        } else if (!started && error instanceof ChatRequestError) {
          // Nothing was saved: take the message back and keep its text.
          setMessages((list) => list.filter((m) => m.id !== replyId && m.id !== userId));
          if (text) onUnsent?.(text);
          if (error.code === "rate-limited") setLimitResetsAt(error.resetsAt ?? new Date(Date.now() + 60_000).toISOString());
          else setNotice(error.message);
        } else {
          patch(id, (m) => settle(m, "error", started ? DROPPED : "The reply couldn’t start. Check your connection and try again."));
        }
      } finally {
        if (controller.current === abort) controller.current = null;
        setStreaming(false);
      }
    },
    [transport, onConversation, onUnsent, patch],
  );

  const send = useCallback(
    (text: string) => {
      if (streaming) return false;
      const userId = localId("user");
      const replyId = localId("reply");
      setMessages((list) => [...list, { id: userId, role: "user", text }, { id: replyId, role: "assistant", text: "", status: "streaming" }]);
      run({ conversationId: conversationId.current, workspaceId, text, model }, replyId, userId, text);
    },
    [streaming, run, workspaceId, model],
  );

  const retry = useCallback(
    (replyId: string) => {
      if (streaming || conversationId.current === null) return;
      const fresh = localId("reply");
      setMessages((list) => list.map((m) => (m.id === replyId ? { id: fresh, role: "assistant", text: "", status: "streaming" } : m)));
      run({ conversationId: conversationId.current, model, retryOf: replyId }, fresh);
    },
    [streaming, run, model],
  );

  const stop = useCallback(() => controller.current?.abort(), []);

  const status: ChatHookStatus = streaming ? "streaming" : limitResetsAt ? "rate-limited" : !online ? "offline" : "ready";

  return { messages, status, send, retry, stop, limitResetsAt, notice, clearNotice: useCallback(() => setNotice(null), []) };
}
