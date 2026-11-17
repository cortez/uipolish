"use client";

import { useEffect, useRef, useState } from "react";
import { applyEvent, type Session, type SessionEvent } from "@/lib/coding/session";
import { useWorkspace } from "./workspace-context";

export type SessionLink = "connecting" | "live" | "reconnecting" | "missing";

/* A session as it is right now: the snapshot it starts from, then every
   event folded in with the same applyEvent the server saves with, so what
   streams here is what's stored. Events that change the sidebar (a new
   turn, a title, a turn ending) refresh it. */

const SIDEBAR_EVENTS = new Set<SessionEvent["type"]>(["turn", "title", "renamed", "shared", "done", "stopped", "error", "merged"]);

export function useSession(id: string | null, initial?: Session) {
  const { api, refreshSessions } = useWorkspace();
  const [state, setState] = useState<{ id: string | null; session: Session | null; link: SessionLink }>(() => ({
    id,
    session: initial && initial.id === id ? initial : null,
    link: "connecting",
  }));
  // A new id starts over (the props changed under a kept component).
  if (state.id !== id) setState({ id, session: initial && initial.id === id ? initial : null, link: "connecting" });

  const refresh = useRef(refreshSessions);
  useEffect(() => {
    refresh.current = refreshSessions;
  }, [refreshSessions]);

  useEffect(() => {
    if (!id) return;
    return api.watch(
      id,
      (event) => {
        setState((s) => {
          if (s.id !== id) return s;
          if (event.type === "snapshot") return { ...s, session: event.session, link: "live" };
          // An error before any snapshot: the session is gone.
          if (!s.session) return event.type === "error" ? { ...s, link: "missing" } : s;
          return { ...s, session: applyEvent(s.session, event), link: "live" };
        });
        if (SIDEBAR_EVENTS.has(event.type)) refresh.current();
      },
      (message) => setState((s) => (s.id !== id ? s : { ...s, link: /no session/.test(message) ? "missing" : "reconnecting" })),
    );
  }, [api, id]);

  return { session: state.id === id ? state.session : null, link: state.link };
}
