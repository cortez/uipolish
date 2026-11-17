import { cookies } from "next/headers";
import { getRunner } from "@/lib/agents/runner";
import { db } from "@/lib/db/database";
import { createService, type ConsoleApi, type Service } from "@/lib/service";
import { getUser, requireUser, type User } from "@/lib/session";

/* The service, bound to the request: who's signed in and which of their
   workspaces they're in (a cookie the sidebar's switcher sets). Pages call
   consoleFor(); route handlers and server actions call apiOrNull(), which
   answers null when the session has ended. Server only. */

const g = globalThis as { __agentConsole?: Service };

/** One service per server process, so runs keep going across requests and hot reloads. */
export const service: Service = (g.__agentConsole ??= createService(db, getRunner()));

async function bind(user: User) {
  const workspaces = await service.workspaces(user);
  const chosen = (await cookies()).get("workspace")?.value;
  const workspace = workspaces.find((w) => w.id === chosen) ?? workspaces[0];
  return { user, workspaces, workspace, api: service.forWorkspace(workspace.id, user) };
}

/** For pages and layouts: the person, their workspaces and the API; or a redirect to sign in. */
export async function consoleFor() {
  return bind(await requireUser());
}

/** For route handlers and server actions. */
export async function apiOrNull(): Promise<ConsoleApi | null> {
  const user = await getUser();
  return user ? (await bind(user)).api : null;
}

/** Only a workspace the person belongs to can be chosen. */
export async function chooseWorkspace(id: string) {
  const user = await getUser();
  if (!user) return false;
  if (!(await service.workspaces(user)).some((w) => w.id === id)) return false;
  (await cookies()).set("workspace", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return true;
}
