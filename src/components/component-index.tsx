import type { ComponentMeta } from "@/lib/content";

// Agents mostly build AI products now, so those come first. Each group is
// alphabetical, so a name is quick to find.
export const AI_COMPONENTS = ["prompt-input", "message-thread", "reasoning", "tool-steps", "batch-progress", "research-progress", "plan-approval", "pipeline", "code-block", "sources", "model-picker", "response-actions", "voice-input", "diff-view", "authorize", "connections", "usage-meter", "tool-approval", "background-run", "agent-settings"];

/** The building blocks the other components are made of, listed last in
 *  their own group: each works on its own too. */
export const PRIMITIVES = ["animated-size", "brand-marks", "field", "icons", "listbox", "text", "text-morph"];

/** The pages before the components, in the order the docs list them. */
export const START = [
  { href: "/docs", title: "Introduction" },
  { href: "/docs/rules", title: "Design rules" },
  { href: "/docs/tailwind", title: "Tailwind CSS" },
  { href: "/docs/shadcn", title: "shadcn/ui" },
  { href: "/docs/theme", title: "Theme" },
];

export function sortComponents(components: ComponentMeta[]) {
  // The agent kit, everything else, then the primitives, each A to Z (the
  // docs nav's groups).
  const rank = (c: ComponentMeta) => (c.kit === "agent" ? 0 : PRIMITIVES.includes(c.name) ? 2 : 1);
  return components
    .filter((c) => !c.primitive)
    .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}
