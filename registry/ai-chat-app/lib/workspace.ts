import { cookies } from "next/headers";
import { allowedModel, defaultModel } from "@/lib/ai/provider";
import { store, type Preferences } from "@/lib/db/store";

/* Which workspace the person is in (a cookie set by the sidebar's switcher)
   and their defaults. Server only. */

export async function currentWorkspace(userId: string) {
  const workspaces = await store.listWorkspaces(userId);
  const chosen = (await cookies()).get("workspace")?.value;
  const workspace = workspaces.find((w) => w.id === chosen) ?? workspaces[0];
  return { workspaces, workspace };
}

export function defaultPreferences(): Preferences {
  return { model: defaultModel(), remember: true };
}

/** A saved model the configured provider no longer offers reads as its default. */
export async function preferences(userId: string) {
  const prefs = await store.getPreferences(userId, defaultPreferences());
  return { ...prefs, model: allowedModel(prefs.model) };
}
