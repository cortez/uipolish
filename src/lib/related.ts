import type { ComponentMeta } from "@/lib/content";

/** Pieces nearly everything uses: sharing one says nothing about kinship,
 *  and they are never the suggestion. */
const COMMON = new Set(["button", "icons", "text", "field", "animated-size", "text-morph"]);

/** Components that do the same kind of job, so one leads to the next. */
const FAMILIES = [
  ["text-field", "number-input", "select", "combobox", "date-picker", "search-field", "code-input", "copy-field", "inline-edit", "file-upload"],
  ["checkbox", "radio-group", "switch", "slider", "segmented-control", "chip"],
  ["dialog", "drawer", "popover", "tooltip", "dropdown-menu", "command-palette"],
  ["alert", "toast", "progress", "skeleton", "empty-state", "usage-meter"],
  ["tabs", "breadcrumbs", "pagination", "nav-rail", "sidebar", "accordion"],
  ["avatar", "badge", "kbd", "list", "data-table", "scroll-area"],
  ["prompt-input", "message-thread", "reasoning", "tool-steps", "response-actions", "model-picker", "markdown", "code-block", "diff-view"],
];
const family = (name: string) => FAMILIES.find((f) => f.includes(name));

/**
 * The components most like this one, best first: one built from the other,
 * the same family, shared building blocks, then the same kit. Ties go to alphabetical
 * order. The page shows the first three that have a showcase.
 */
export function related(meta: ComponentMeta, all: ComponentMeta[]) {
  const own = new Set(meta.dependencies.filter((d) => !COMMON.has(d)));
  const mine = family(meta.name);
  const score = (c: ComponentMeta) =>
    (mine?.includes(c.name) ? 3 : 0) +
    (c.dependencies.includes(meta.name) || meta.dependencies.includes(c.name) ? 4 : 0) +
    c.dependencies.filter((d) => own.has(d)).length * 2 +
    (c.kit === meta.kit ? 1 : 0);
  return all
    .filter((c) => c.name !== meta.name && !c.primitive && !COMMON.has(c.name))
    .map((c) => ({ c, s: score(c) }))
    .sort((a, b) => b.s - a.s || a.c.title.localeCompare(b.c.title))
    .map(({ c }) => ({ name: c.name, title: c.title }));
}
