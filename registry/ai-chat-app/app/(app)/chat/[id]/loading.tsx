import { ChatLoading } from "@/components/app/chat-loading";
import { availableModels } from "@/lib/ai/provider";

/* While a chat's messages load: its frame, with "Loading conversation…" after 300ms. */
export default function Loading() {
  return <ChatLoading models={availableModels()} />;
}
