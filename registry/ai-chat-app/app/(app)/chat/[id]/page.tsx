import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Chat } from "@/components/app/chat";
import { requireUser } from "@/lib/auth";
import { allowedModel, availableModels, composerHint } from "@/lib/ai/provider";
import { store } from "@/lib/db/store";
import { usage } from "@/lib/usage";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await requireUser();
  const chat = await store.getConversation(user.id, (await params).id);
  return { title: chat?.title ?? "Chat" };
}

export default async function ChatPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const conversation = await store.getConversation(user.id, id);
  if (!conversation) notFound();
  const [messages, limits] = await Promise.all([store.listMessages(id), usage(user.id)]);
  return (
    <Chat
      conversation={{ id, title: conversation.title }}
      initialMessages={messages}
      models={availableModels()}
      model={allowedModel(conversation.model)}
      limitResetsAt={limits.reached ? limits.resetsAt.toISOString() : undefined}
      hint={composerHint()}
    />
  );
}
