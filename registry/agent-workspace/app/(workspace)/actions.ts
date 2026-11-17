"use server";

import { redirect } from "next/navigation";
import { endSession } from "@/lib/coding/auth";
import { apiOrNull, chooseWorkspace } from "@/lib/coding/server";
import type { PromptInput, WorkspaceApi } from "@/lib/coding/service";

/* Every change the screens make, as server actions. Each checks who's
   asking and returns { ok } rather than throwing, so the message survives a
   production build (thrown errors are redacted there);
   components/app/http-workspace.ts turns a failure back into an Error whose
   message shows where it was pressed. Reads go through app/api. */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function act<T>(fn: (api: WorkspaceApi) => Promise<T>): Promise<Result<T>> {
  const api = await apiOrNull();
  if (!api) return { ok: false, error: "Your session ended. Sign in again." };
  try {
    return { ok: true, value: await fn(api) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong. Try again." };
  }
}

export async function createSession(input: PromptInput) {
  return act((api) => api.create(input));
}
export async function sendPrompt(id: string, input: PromptInput) {
  return act((api) => api.prompt(id, input));
}
export async function stopSession(id: string) {
  return act((api) => api.stop(id));
}
export async function renameSession(id: string, title: string) {
  return act((api) => api.rename(id, title));
}
export async function pinSession(id: string, pinned: boolean) {
  return act((api) => api.pin(id, pinned));
}
export async function shareSession(id: string, people: string[]) {
  return act((api) => api.share(id, people));
}
export async function deleteSession(id: string) {
  return act((api) => api.remove(id));
}
export async function mergeSession(id: string) {
  return act((api) => api.merge(id));
}

export async function switchWorkspace(id: string): Promise<Result<null>> {
  return (await chooseWorkspace(id)) ? { ok: true, value: null } : { ok: false, error: "You’re not in that workspace." };
}

export async function signOut() {
  await endSession();
  redirect("/sign-in");
}
