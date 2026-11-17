import { ConsoleShell } from "@/components/app/console-shell";
import { consoleFor } from "@/lib/server";

/* Every signed-in screen sits in the shell: the sidebar and the console
   context. Signed out, it's the sign-in page. */

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { user, workspaces, workspace, api } = await consoleFor();
  return (
    <ConsoleShell user={user} workspaces={workspaces} workspaceId={workspace.id} status={await api.status()}>
      {children}
    </ConsoleShell>
  );
}
