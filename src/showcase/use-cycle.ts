"use client";

import { useEffect, useState } from "react";

/**
 * Steps through `length` states, one every `every` ms, so a showcase's
 * numbers change on their own and the roll can be seen. Held on the first
 * state under reduced motion.
 */
export function useCycle(length: number, every: number) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % length), every);
    return () => clearInterval(timer);
  }, [length, every]);
  return step;
}
