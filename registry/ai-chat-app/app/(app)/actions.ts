"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { allowedModel } from "@/lib/ai/provider";
import { endSession, getUser } from "@/lib/auth";
import { store, type Preferences } from "@/lib/db/store";
import { defaultPreferences } from "@/lib/workspace";

/* What the sidebar and settings change, as server actions. Each checks who's
   asking and returns { ok } rather than throwing, so the message survives a
   production build (thrown errors are redacted there). */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const SIGNED_OUT = { ok: false, error: "Your session ended. Sign in again." } as const;
const GONE = { ok: false, error: "This chat was deleted." } as const;

export async function renameConversation(id: string, title: string): Promise<Result<{ title: string }>> {
  const user = await getUser();
  if (!user) return SIGNED_OUT;
  const clean = title.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!clean) return { ok: false, error: "Enter a name." };
  const c = await store.updateConversation(user.id, id, { title: clean });
  return c ? { ok: true, title: c.title } : GONE;
}

export async function pinConversation(id: string, pinned: boolean): Promise<Result> {
  const user = await getUser();
  if (!user) return SIGNED_OUT;
  return (await store.updateConversation(user.id, id, { pinned })) ? { ok: true } : GONE;
}

/** Soft delete, so the toast's Undo can bring it back. A real database would purge deleted rows after a while. */
export async function deleteConversation(id: string): Promise<Result> {
  const user = await getUser();
  if (!user) return SIGNED_OUT;
  return (await store.updateConversation(user.id, id, { deletedAt: Date.now() })) ? { ok: true } : GONE;
}

export async function restoreConversation(id: string): Promise<Result> {
  const user = await getUser();
  if (!user) return SIGNED_OUT;
  return (await store.updateConversation(user.id, id, { deletedAt: undefined })) ? { ok: true } : GONE;
}

export async function switchWorkspace(id: string): Promise<Result> {
  const user = await getUser();
  if (!user) return SIGNED_OUT;
  if (!(await store.listWorkspaces(user.id)).some((w) => w.id === id)) return { ok: false, error: "That workspace doesn’t exist." };
  (await cookies()).set("workspace", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { ok: true };
}

export async function savePreferences(patch: Partial<Preferences>): Promise<Result> {
  const user = await getUser();
  if (!user) return SIGNED_OUT;
  if (patch.model !== undefined && allowedModel(patch.model) !== patch.model) return { ok: false, error: "Pick one of the models listed." };
  await store.setPreferences(user.id, patch, defaultPreferences());
  return { ok: true };
}

export async function signOut() {
  await endSession();
  redirect("/sign-in");
}
