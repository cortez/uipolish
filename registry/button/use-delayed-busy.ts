"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Whether to show that work is running. Fast work never shows: the busy
 * state appears only once `busy` has lasted `delay` ms, and once it has
 * appeared it stays at least `minimum` ms, so it never flickers in and out.
 */
export function useDelayedBusy(busy: boolean, delay = 300, minimum = 400) {
  const [shown, setShown] = useState(false);
  const since = useRef(0);

  useEffect(() => {
    if (busy === shown) return;
    const wait = busy ? delay : Math.max(0, minimum - (performance.now() - since.current));
    const timer = window.setTimeout(() => {
      if (busy) since.current = performance.now();
      setShown(busy);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [busy, shown, delay, minimum]);

  return shown;
}
