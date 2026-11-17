import { STARTERS, SYSTEM_PROMPT } from "@/lib/config";
import { applyEvent, encodeEvent, settle, type ChatEvent } from "@/lib/ai/events";
import { allowedModel, getProvider, ProviderError, type ProviderMessage } from "@/lib/ai/provider";
import { getUser } from "@/lib/auth";
import { store, type StoredMessage } from "@/lib/db/store";
import { usage } from "@/lib/usage";

/* POST /api/chat streams one reply as NDJSON (lib/ai/events.ts).
   Body: { conversationId?, workspaceId?, text?, model?, retryOf? }
   - No conversationId: a new chat, created from the first message.
   - retryOf: the id of the last reply, to write it again.
   The reply is saved however it ends: complete, stopped or failed. */

export const runtime = "nodejs";

type Body = { conversationId?: string; workspaceId?: string; text?: string; model?: string; retryOf?: string };

const problem = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  Response.json({ error: { code, message, ...extra } }, { status });

/** A starter's own title, or the first line of the first message cut on a word near 40
 *  characters. To have the model name chats, ask it here and update the title when it answers. */
function titleFrom(text: string) {
  const starter = STARTERS.find((s) => (s.prompt ?? s.title) === text);
  if (starter) return starter.title;
  const line = text.split("\n")[0].replace(/\s+/g, " ");
  if (line.length <= 40) return line;
  const cut = line.lastIndexOf(" ", 38);
  return line.slice(0, cut > 16 ? cut : 38).replace(/[\s.,;:!?-]+$/, "") + "…";
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return problem(401, "signed-out", "Sign in again to keep chatting.");

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return problem(400, "bad-request", "The request wasn’t JSON.");
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!body.retryOf && !text) return problem(400, "bad-request", "There’s no message to send.");

  if (!body.retryOf) {
    const limits = await usage(user.id);
    if (limits.reached) {
      return problem(429, "rate-limited", `You’ve sent ${limits.limit} messages today.`, { resetsAt: limits.resetsAt.toISOString() });
    }
  }

  // The chat: an existing one of theirs, or a new one named after the first message.
  let conversation = body.conversationId ? await store.getConversation(user.id, body.conversationId) : null;
  if (body.conversationId && !conversation) return problem(404, "not-found", "This chat was deleted.");
  if (!conversation) {
    const workspaces = await store.listWorkspaces(user.id);
    const workspaceId = workspaces.find((w) => w.id === body.workspaceId)?.id ?? workspaces[0].id;
    conversation = await store.createConversation({ userId: user.id, workspaceId, title: titleFrom(text), model: allowedModel(body.model) });
  }
  const model = allowedModel(body.model ?? conversation.model);
  if (model !== conversation.model) conversation = (await store.updateConversation(user.id, conversation.id, { model })) ?? conversation;

  let userMessageId: string | undefined;
  if (body.retryOf) {
    const last = (await store.listMessages(conversation.id)).at(-1);
    if (last?.id !== body.retryOf || last.role !== "assistant") return problem(409, "conflict", "Only the last reply can be written again.");
    await store.deleteMessage(conversation.id, last.id);
  } else {
    userMessageId = crypto.randomUUID();
    await store.saveMessage(conversation.id, { id: userMessageId, role: "user", text, createdAt: Date.now() });
  }

  // Earlier turns as plain text. A reply that failed before saying anything is left out.
  const history: ProviderMessage[] = (await store.listMessages(conversation.id))
    .filter((m) => m.text.trim())
    .map((m) => ({ role: m.role, content: m.text }));

  const now = Date.now();
  conversation = (await store.updateConversation(user.id, conversation.id, { updatedAt: now })) ?? conversation;
  const chat = conversation;
  let reply: StoredMessage = { id: crypto.randomUUID(), role: "assistant", text: "", status: "streaming", createdAt: now };
  const provider = await getProvider();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: ChatEvent) => {
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          // The browser went away; the reply is still saved below.
        }
      };
      send({
        type: "start",
        conversation: { id: chat.id, title: chat.title, pinned: chat.pinned, updatedAt: chat.updatedAt },
        userMessageId,
        messageId: reply.id,
      });
      try {
        for await (const event of provider.stream({ model, system: SYSTEM_PROMPT, messages: history, signal: request.signal })) {
          reply = { ...applyEvent(reply, event), createdAt: reply.createdAt };
          send(event);
        }
        reply = { ...settle(reply, "complete"), createdAt: reply.createdAt };
        send({ type: "done" });
      } catch (error) {
        if (request.signal.aborted) {
          reply = { ...settle(reply, "stopped"), createdAt: reply.createdAt };
        } else {
          const known = error instanceof ProviderError ? error : null;
          if (!known) console.error("[chat] reply failed:", error);
          const message = known?.message ?? "Something went wrong while writing this reply.";
          reply = { ...settle(reply, "error", message), createdAt: reply.createdAt };
          send({ type: "error", code: known?.code ?? "failed", message, resetsAt: known?.resetsAt?.toISOString() });
        }
      } finally {
        await store.saveMessage(chat.id, reply);
        try {
          controller.close();
        } catch {
          // Already closed by a disconnect.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      // Proxies that buffer (nginx) would hold the reply until it's done.
      "x-accel-buffering": "no",
    },
  });
}
