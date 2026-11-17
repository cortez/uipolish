"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage } from "@/components/ui/chat-app/chat-app";
import type { PromptInputHandle } from "@/components/ui/prompt-input/prompt-input";
import { toast } from "@/components/ui/toast/toast";
import type { ChatConversationSummary } from "@/lib/ai/events";
import type { ModelOption } from "@/components/ui/model-picker/model-picker";
import { ASSISTANT_NAME, GREETING, STARTERS } from "@/lib/config";
import { useShell } from "./app-shell";
import { ChatView } from "./chat-view";
import { useChat } from "./use-chat";

/* A chat page: the conversation from the server, streaming through
   /api/chat. A new chat gets its id with the first reply; the URL changes
   to /chat/<id> in place, so the reply streaming in isn't interrupted. */

export type ChatProps = {
  /** null on a new chat. */
  conversation: { id: string; title: string } | null;
  initialMessages: ChatMessage[];
  /** What the picker offers, from the configured provider (availableModels()). */
  models: ModelOption[];
  model: string;
  /** Set when today's limit is already used up (ISO). */
  limitResetsAt?: string;
  /** A line under the composer: the mock model says so here. */
  hint?: string;
};

export function Chat(props: ChatProps) {
  const { newChatKey } = useShell();
  // Pressing New chat again on a new chat starts a clean one.
  return <ChatScreen key={props.conversation?.id ?? `new-${newChatKey}`} {...props} />;
}

function ChatScreen({ conversation, initialMessages, models, model: initialModel, limitResetsAt, hint }: ChatProps) {
  const router = useRouter();
  const { upsert, conversations, workspaceId } = useShell();
  const composer = useRef<PromptInputHandle>(null);
  const [model, setModel] = useState(initialModel);
  const [id, setId] = useState(conversation?.id ?? null);

  const onConversation = useCallback(
    (c: ChatConversationSummary, created: boolean) => {
      upsert(c);
      if (created) {
        setId(c.id);
        window.history.replaceState(null, "", `/chat/${c.id}`);
      }
    },
    [upsert],
  );
  const onUnsent = useCallback((text: string) => composer.current?.setText(text), []);

  const chat = useChat({
    conversationId: conversation?.id ?? null,
    workspaceId,
    initialMessages,
    model,
    limitResetsAt,
    onConversation,
    onUnsent,
  });

  const { notice, clearNotice } = chat;
  useEffect(() => {
    if (!notice) return;
    toast.error("Message not sent", { description: notice });
    clearNotice();
  }, [notice, clearNotice]);

  // The sidebar's title wins: it's where renames happen.
  const title = conversations.find((c) => c.id === id)?.title ?? conversation?.title ?? "New chat";

  return (
    <ChatView
      title={title}
      messages={chat.messages}
      status={chat.status}
      models={models}
      model={model}
      onModelChange={setModel}
      onSend={chat.send}
      onStop={chat.stop}
      onRetry={chat.retry}
      limitResetsAt={chat.limitResetsAt}
      onUpgrade={() => router.push("/settings?tab=billing")}
      assistantName={ASSISTANT_NAME}
      greeting={GREETING}
      starters={STARTERS}
      hint={hint}
      composerRef={composer}
    />
  );
}
