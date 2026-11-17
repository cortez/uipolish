import { cookies } from "next/headers";
import { allowedModel, getAgent } from "./agents";
import { getUser, requireUser, type User } from "./auth";
import { createEngine } from "./engine";
import { createService, type Service, type WorkspaceApi } from "./service";
import { store } from "./store";

/* The service, bound to the request: who's signed in and which of their
   workspaces they're in (a cookie the sidebar's switcher sets). Pages call
   workspaceFor(); route handlers and server actions call apiOrNull(),
   which answers null once the session has ended. Server only. */

const g = globalThis as { __workspaceService?: Service };

/** One service per server process, so turns keep running across requests and hot reloads. */
export const service: Service = (g.__workspaceService ??= createService(store, createEngine(store, getAgent), { model: allowedModel }));

const WORKSPACE_COOKIE = "workspace";

async function bind(user: User) {
  const workspaces = await service.workspaces(user);
  const chosen = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const workspace = workspaces.find((w) => w.id === chosen) ?? workspaces[0];
  return { user, workspaces, workspace, api: service.forWorkspace(workspace.id, user) };
}

/** For pages and layouts: the person, their workspaces and the API; or a redirect to sign in. */
export async function workspaceFor() {
  return bind(await requireUser());
}

/** For route handlers and server actions. */
export async function apiOrNull(): Promise<WorkspaceApi | null> {
  const user = await getUser();
  return user ? (await bind(user)).api : null;
}

/** Only a workspace the person belongs to can be chosen. */
export async function chooseWorkspace(id: string) {
  const user = await getUser();
  if (!user) return false;
  if (!(await service.workspaces(user)).some((w) => w.id === id)) return false;
  (await cookies()).set(WORKSPACE_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return true;
}
