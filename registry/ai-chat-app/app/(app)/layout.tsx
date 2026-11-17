import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth";
import { store } from "@/lib/db/store";
import { currentWorkspace } from "@/lib/workspace";

/* Every signed-in page sits in the shell: the sidebar with this
   workspace's chats. Signed out, it's the sign-in page. */

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { workspaces, workspace } = await currentWorkspace(user.id);
  const conversations = (await store.listConversations(user.id, workspace.id)).map((c) => ({
    id: c.id,
    title: c.title,
    pinned: c.pinned,
    updatedAt: c.updatedAt,
  }));
  return (
    <AppShell user={user} workspaces={workspaces} workspaceId={workspace.id} conversations={conversations}>
      {children}
    </AppShell>
  );
}
