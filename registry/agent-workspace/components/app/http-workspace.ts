"use client";

import * as actions from "@/app/(workspace)/actions";
import type { Result } from "@/app/(workspace)/actions";
import { readLines, type Person, type Session, type SessionEvent, type SessionSummary } from "@/lib/coding/session";
import type { WorkspaceApi } from "@/lib/coding/service";

/* WorkspaceApi in the browser: reads from the route handlers in app/api,
   changes through the server actions in app/(workspace)/actions.ts, and
   watches a session on its event stream, reconnecting when it drops. A
   failed action comes back as { ok: false, error } and is thrown here as
   an Error, so the part that called it shows the message where it was
   pressed. */

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 401) {
    window.location.assign("/sign-in");
    throw new Error("Your session ended. Sign in again.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "That didn’t load. Check your connection and try again.");
  }
  return response.json() as Promise<T>;
}

async function unwrap<T>(pending: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await pending;
  } catch {
    throw new Error("Couldn’t reach the server. Check your connection and try again.");
  }
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

/** Reads a session's stream; on a drop, waits and reconnects, starting again from a fresh snapshot. */
function watch(id: string, onEvent: (event: SessionEvent) => void, onError?: (message: string) => void) {
  const controller = new AbortController();
  void (async () => {
    let wait = 1000;
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(`/api/sessions/${encodeURIComponent(id)}/events`, { signal: controller.signal, cache: "no-store" });
        if (response.status === 401) return window.location.assign("/sign-in");
        if (response.status === 404) return onError?.("There’s no session with that id in this workspace.");
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
        for await (const event of readLines<SessionEvent>(response.body)) {
          wait = 1000;
          onEvent(event);
        }
      } catch {
        if (controller.signal.aborted) return;
        onError?.("Reconnecting…");
      }
      await new Promise((resolve) => setTimeout(resolve, wait));
      wait = Math.min(wait * 2, 15_000);
    }
  })();
  return () => controller.abort();
}

export const httpWorkspace: WorkspaceApi = {
  people: () => get<Person[]>("/api/people"),
  sessions: () => get<SessionSummary[]>("/api/sessions"),
  session: async (id) => {
    try {
      return await get<Session>(`/api/sessions/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  },
  watch,
  create: (input) => unwrap(actions.createSession(input)),
  prompt: (id, input) => unwrap(actions.sendPrompt(id, input)),
  stop: (id) => unwrap(actions.stopSession(id)),
  rename: (id, title) => unwrap(actions.renameSession(id, title)),
  pin: (id, pinned) => unwrap(actions.pinSession(id, pinned)),
  share: (id, people) => unwrap(actions.shareSession(id, people)),
  remove: (id) => unwrap(actions.deleteSession(id)),
  merge: (id) => unwrap(actions.mergeSession(id)),
};
