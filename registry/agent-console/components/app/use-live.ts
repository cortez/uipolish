"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* Loading, polling, and the viewer's time zone. */

export const messageOf = (reason: unknown, fallback: string) => (reason instanceof Error && reason.message ? reason.message : fallback);

/**
 * Data a screen shows: `initial` from the server render when there is one
 * (the app), otherwise fetched on mount (the docs demo). Then re-fetched
 * every `poll` ms (a number, or a function of the data) while there is data.
 */
export function useResource<T>(initial: T | undefined, fetch: () => Promise<T>, poll: number | ((data: T) => number) = 0, failed = "That didn’t load.") {
  const [data, setData] = useState<T | null>(initial ?? null);
  const [error, setError] = useState<string>();

  const reload = useCallback(
    () =>
      fetch().then(
        (next) => {
          setData(next);
          setError(undefined);
        },
        (reason) => setError(messageOf(reason, failed)),
      ),
    [fetch, failed],
  );

  useEffect(() => {
    if (initial !== undefined) return;
    let live = true;
    fetch().then(
      (next) => live && setData(next),
      (reason) => live && setError(messageOf(reason, failed)),
    );
    return () => {
      live = false;
    };
  }, [initial, fetch, failed]);

  const ms = data === null ? 0 : typeof poll === "function" ? poll(data) : poll;
  usePoll(reload, ms || 1000, ms > 0);
  return { data, setData, error, reload };
}

/** Calls `tick` every `ms` while `on`, skipping while the tab is hidden or the last call is still out. */
export function usePoll(tick: () => unknown, ms: number, on = true) {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });
  useEffect(() => {
    if (!on) return;
    let inFlight = false;
    const id = window.setInterval(async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        await latest.current();
      } catch {
        // A missed poll is fine: the next one tries again.
      } finally {
        inFlight = false;
      }
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, on]);
}

const noop = () => () => {};

/** The viewer's IANA time zone; "UTC" while rendering on the server, so the first paint matches. */
export function useTimeZone() {
  return useSyncExternalStore(
    noop,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
}
