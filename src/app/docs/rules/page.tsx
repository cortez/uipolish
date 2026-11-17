import Link from "@/components/link";
import { listRuleTopics } from "@/lib/content";
import { SKILL_INSTALLS } from "@/lib/skill";
import { SkillPicker } from "@/components/skill-picker";
import { DocPage, docMetadata } from "../doc-page";
import site from "../../site.module.css";
import styles from "./rules.module.css";

const DOC = {
  path: "/docs/rules",
  heading: "Design rules",
  title: "Design rules: a skill for the UI your coding agent writes",
  description:
    "UI Polish's design rules as a skill your agent keeps: ten opinions, then motion, states, typography, spacing, surfaces, focus and anti-patterns, with concrete values. Free. One line to install.",
};

export const metadata = docMetadata(DOC);

const TOPICS: Record<string, string> = {
  foundations: "The few decisions everything else rests on",
  typography: "Sizes, weights, line heights and tracking that hold up",
  spacing: "One scale, and where each step goes",
  surfaces: "Edges, fills, shadows and how things sit on the page",
  states: "Loading, empty, error, disabled and busy, done right",
  motion: "Durations, curves and springs for every kind of movement",
  antipatterns: "The things that pass code review and still look wrong",
};

export default async function RulesPage() {
  // In reading order, the same as the rules file: foundations first,
  // anti-patterns last. TOPICS is written in that order.
  const available = new Set(await listRuleTopics());
  const topics = Object.keys(TOPICS).filter((t) => available.has(t));
  return (
    <DocPage
      doc={DOC}
      lede="The rules every UI Polish component is built on, as a skill your agent keeps and follows for the UI it writes itself. Each rule gives concrete values: durations, easings, spacing steps and shadow recipes."
    >
      <section className={site.section} aria-labelledby="install">
        <h2 id="install" className={site.heading}>
          Installation
        </h2>
        <p className={site.text}>Run this in your project:</p>
        <SkillPicker installs={SKILL_INSTALLS} />
        <p className={site.text}>
          Already connected over <Link href="/docs">MCP</Link>? You have them: the server hands your agent the rules as it
          works. Read the whole file at <a href="/rules.md">/rules.md</a>.
        </p>
      </section>

      <section className={site.section} aria-labelledby="inside">
        <h2 id="inside" className={site.heading}>
          What&rsquo;s in it
        </h2>
        <ul className={styles.topics}>
          {topics.map((t) => (
            <li key={t}>
              <a href={`/api/rules/${t}`} className={styles.topic}>
                {t[0].toUpperCase() + t.slice(1)}
              </a>
              <span>{TOPICS[t]}</span>
            </li>
          ))}
          <li>
            <span className={styles.topic}>Tokens and checklist</span>
            <span>The --ui-* roles every rule names, and the yes/no checks to run before calling UI done</span>
          </li>
        </ul>
      </section>
    </DocPage>
  );
}
