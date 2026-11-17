"use client";

import type { ModelOption } from "@/components/ui/model-picker/model-picker";
import { ASSISTANT_NAME, GREETING } from "@/lib/config";
import { ChatView } from "./chat-view";

const nothing = () => {};

/** A chat's frame while its messages load, so nothing moves when they arrive. */
export function ChatLoading({ models }: { models: ModelOption[] }) {
  return (
    <ChatView
      title=""
      messages={[]}
      status="loading"
      models={models}
      model={models[0].id}
      onModelChange={nothing}
      onSend={() => false}
      onStop={nothing}
      onRetry={nothing}
      assistantName={ASSISTANT_NAME}
      greeting={GREETING}
      starters={[]}
    />
  );
}
