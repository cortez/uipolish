"use client";

import { useEffect, useState } from "react";
import { TextMorph } from "@registry/text-morph/text-morph";

const PHRASES = ["Inviting 12 guests", "Invited 12 guests", "12 guests going", "12 guests seated"];

/** Just the text, changing on its own every 2s. The phrases share their
 *  words, so what you see is letters moving, not a swap. Held on the first phrase under reduced motion. */
export default function Showcase() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % PHRASES.length), 2000);
    return () => clearInterval(t);
  }, []);
  return <TextMorph>{PHRASES[i]}</TextMorph>;
}
