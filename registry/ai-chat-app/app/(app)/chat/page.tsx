import { Chat } from "@/components/app/chat";
import { requireUser } from "@/lib/auth";
import { availableModels, composerHint } from "@/lib/ai/provider";
import { usage } from "@/lib/usage";
import { preferences } from "@/lib/workspace";

export const metadata = { title: "New chat" };

export default async function NewChatPage() {
  const user = await requireUser();
  const [prefs, limits] = await Promise.all([preferences(user.id), usage(user.id)]);
  return (
    <Chat
      conversation={null}
      initialMessages={[]}
      models={availableModels()}
      model={prefs.model}
      limitResetsAt={limits.reached ? limits.resetsAt.toISOString() : undefined}
      hint={composerHint()}
    />
  );
}
