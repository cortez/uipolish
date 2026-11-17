import { BrandMark, type BrandName } from "@registry/brand-marks/brand-marks";
import styles from "./client-mark.module.css";

/** The mark for each agent the site gives setup steps for, in muted gray
 * so a row of them reads as one quiet set and the name carries the row. An agent without a mark gets its
 * letter in a tile, as the brand-marks rule says. */
const MARKS: Record<string, BrandName> = {
  "claude-code": "claude",
  "Claude Code": "claude",
  codex: "codex",
  chatgpt: "openai",
  "Codex and AGENTS.md": "codex",
  cursor: "cursor",
  Cursor: "cursor",
  vscode: "visualstudiocode",
  antigravity: "antigravity",
  gemini: "googlegemini",
  other: "modelcontextprotocol",
};

export function ClientMark({ client, label }: { client: string; label: string }) {
  const mark = MARKS[client];
  if (mark)
    return (
      <span className={styles.mark}>
        <BrandMark name={mark} size={16} mono />
      </span>
    );
  return (
    <span className={styles.letter} aria-hidden="true">
      {label.charAt(0)}
    </span>
  );
}
