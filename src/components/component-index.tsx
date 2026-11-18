import type { ComponentMeta } from "@/lib/content";

// Agents mostly build AI products now, so those come first. Each group is
// alphabetical, so a name is quick to find.
export const AI_COMPONENTS = ["prompt-input", "message-thread", "reasoning", "tool-steps", "code-block", "model-picker", "response-actions", "diff-view", "usage-meter", "markdown"];

export function sortComponents(components: ComponentMeta[]) {
  // One list, A to Z.
  return components.filter((c) => !c.primitive).sort((a, b) => a.title.localeCompare(b.title));
}
