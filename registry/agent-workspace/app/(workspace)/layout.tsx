import { WorkspaceShell } from "@/components/app/workspace-shell";
import { availableModels, composerHint } from "@/lib/coding/agents";
import { workspaceFor } from "@/lib/coding/server";

/* Every signed-in page sits in the shell: the sidebar, the open sessions'
   tabs and the workspace context. Signed out, it's the sign-in page. */

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { user, workspaces, workspace, api } = await workspaceFor();
  const [sessions, people] = await Promise.all([api.sessions(), api.people()]);
  return (
    <WorkspaceShell
      user={user}
      workspaces={workspaces}
      workspaceId={workspace.id}
      sessions={sessions}
      people={people}
      models={availableModels()}
      hint={composerHint()}
    >
      {children}
    </WorkspaceShell>
  );
}
