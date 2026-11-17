"use client";

import { PREVIEWS } from "@/previews";

/** A component's live demo, by name; nothing for a name without one. */
export function LivePreview({ name }: { name: string }) {
  const Preview = Object.hasOwn(PREVIEWS, name) ? PREVIEWS[name] : null;
  return Preview ? <Preview /> : null;
}
