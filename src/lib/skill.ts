import { getChecklist, getOpinions, getRule, getTokens } from "@/lib/content";
import { abs } from "@/lib/seo/site";

// The design rules as one file an agent can keep: the opinions, the tokens,
// every rule topic and the checklist. Served three ways: /skill.md (a Claude
// Code skill), /cursor-rule.md (a Cursor rule) and /rules.md (plain, for
// AGENTS.md or anything else). The same rules, split into references, are
// the skill folder in the repo (skills/ui-polish, from npm run skill).

const ORDER = ["foundations", "typography", "spacing", "surfaces", "states", "motion", "antipatterns"];

export const SKILL_DESCRIPTION =
  "Design rules for building UI with concrete values: motion and easing, loading and empty states, typography, spacing, surfaces and shadows, focus, and the anti-patterns that pass code review. Use when writing, changing or reviewing any user interface.";

async function body() {
  const rules = await Promise.all(ORDER.map(async (t) => (await getRule(t)) ?? ""));
  const opinions = (await getOpinions()).map((o) => `- **${o.title}** ${o.body}`).join("\n");
  return [
    "# UI Polish design rules",
    `Concrete rules for UI, with values. Before you write or change UI, read the section for what you're touching (spacing for a layout, motion for anything that moves, states for loading and errors). Before you call UI work done, go through the checklist at the end. Components built on these rules: ${abs("/")}.`,
    "## Opinions",
    opinions,
    "## Tokens",
    "Every rule names these roles. Add the file once, or map the roles onto variables the project already has.",
    "```css\n" + (await getTokens()) + "```",
    ...rules.map((r) => r.trim()),
    (await getChecklist()).trim(),
  ].join("\n\n") + "\n";
}

export async function rulesMarkdown() {
  return body();
}

export async function skillMarkdown() {
  return `---\nname: ui-polish\ndescription: ${JSON.stringify(SKILL_DESCRIPTION)}\n---\n\n${await body()}`;
}

export async function cursorRuleMarkdown() {
  return `---\ndescription: ${JSON.stringify(SKILL_DESCRIPTION)}\nalwaysApply: false\n---\n\n${await body()}`;
}

/** One-line installs, per agent. `id` picks the agent's mark. */
export const SKILL_INSTALLS = [
  {
    id: "claude-code",
    label: "Claude Code",
    note: "A skill: Claude reads it when the work touches UI.",
    command: `mkdir -p .claude/skills/ui-polish && curl -fsSL ${abs("/skill.md")} -o .claude/skills/ui-polish/SKILL.md`,
  },
  {
    id: "cursor",
    label: "Cursor",
    note: "A project rule the agent pulls in for UI work.",
    command: `mkdir -p .cursor/rules && curl -fsSL ${abs("/cursor-rule.md")} -o .cursor/rules/ui-polish.mdc`,
  },
  {
    id: "codex",
    label: "Codex",
    note: "Codex, and any agent that reads AGENTS.md.",
    command: `curl -fsSL ${abs("/rules.md")} -o UI-POLISH.md && echo "Before writing or changing UI, follow UI-POLISH.md." >> AGENTS.md`,
  },
] as const;

