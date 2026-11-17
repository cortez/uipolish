"use client";

import { useCallback, useSyncExternalStore } from "react";

/* A small value kept in this browser (localStorage), read the same way on
   every render: the server and the first paint see the fallback, then the
   stored value. A write updates every reader on the page. Storage that's
   off or full only means it isn't kept. */

const EVENT = "workspace-stored";
/** What this page wrote, for when storage is off: the value still holds for the visit. */
const memory = new Map<string, string>();

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function read(key: string) {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) return stored;
  } catch {
    // Storage is off: what this page wrote, below.
  }
  return memory.get(key) ?? null;
}

export function useStored<T>(key: string, fallback: T, parse: (raw: unknown) => T | null) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  let value = fallback;
  if (raw !== null) {
    try {
      value = parse(JSON.parse(raw)) ?? fallback;
    } catch {
      // Unreadable: the fallback.
    }
  }
  const set = useCallback(
    (next: T) => {
      const text = JSON.stringify(next);
      memory.set(key, text);
      try {
        localStorage.setItem(key, text);
      } catch {
        // Not kept past this visit.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set] as const;
}
