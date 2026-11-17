import type { ComponentMeta } from "@/lib/content";

// Agents mostly build AI products now, so those come first. Each group is
// alphabetical, so a name is quick to find.
export const AI_COMPONENTS = ["prompt-input", "message-thread", "reasoning", "tool-steps", "code-block", "sources", "model-picker", "response-actions", "voice-input", "diff-view", "diff-stat", "usage-meter", "markdown"];

/** The building blocks the other components are made of, listed last in
 *  their own group: each works on its own too. */
export const PRIMITIVES = ["animated-size", "brand-marks", "field", "icons", "listbox", "text", "text-morph"];

/** The pages before the components, in the order the docs list them. */
export const START = [
  { href: "/docs", title: "Introduction" },
  { href: "/docs/rules", title: "Design rules" },
  { href: "/docs/tailwind", title: "Tailwind CSS" },
  { href: "/docs/shadcn", title: "shadcn/ui" },
];

export function sortComponents(components: ComponentMeta[]) {
  // One list, A to Z.
  return components.filter((c) => !c.primitive).sort((a, b) => a.title.localeCompare(b.title));
}
