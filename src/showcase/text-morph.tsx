"use client";

import { useEffect, useState } from "react";
import { TextMorph } from "@registry/text-morph/text-morph";

const PHRASES = ["Sending invitations", "12 guests invited", "9 going, 3 maybe", "Table for 12"];

/** Just the text, changing on its own every 2s, so the morph is the whole
 *  demo. Held on the first phrase under reduced motion. */
export default function Showcase() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % PHRASES.length), 2000);
    return () => clearInterval(t);
  }, []);
  return <TextMorph>{PHRASES[i]}</TextMorph>;
}
