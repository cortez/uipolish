import Link from "@/components/link";
import { SetupPicker } from "@/components/setup-picker";
import { DocPage, docMetadata } from "./doc-page";
import site from "../site.module.css";
import styles from "./docs.module.css";

const DOC = {
  path: "/docs",
  heading: "Introduction",
  title: "Introduction: connect your coding agent over MCP",
  description:
    "UI Polish gives coding agents React components and the design rules behind them, over MCP. Connect Claude Code, Codex, Cursor, VS Code, Gemini CLI or ChatGPT; nothing needs an account.",
};

export const metadata = docMetadata(DOC);

const TOOLS = [
  ["get_rules(topic?)", "The rules for one topic: motion, states, typography, spacing, surfaces, foundations or antipatterns. Without a topic, the tokens and the pre-ship checklist."],
  ["list_components()", "Every component, with a one-line summary, its access and its version."],
  ["get_component(name, tailwind?)", "One component’s code and guide, with the components it depends on. With tailwind: true, its CSS comes in Tailwind’s components layer."],
];

export default function DocsPage() {
  return (
    <DocPage
      doc={DOC}
      lede="UI Polish is polished UI for AI products: React components with every state, transition and edge case worked out, plus the design rules behind them. Your coding agent gets both over MCP. It writes the components into your project as files you own, and follows the rules for the UI it writes itself."
    >
      <section className={site.section} aria-labelledby="installation">
        <h2 id="installation" className={site.heading}>
          Installation
        </h2>
        <SetupPicker />
      </section>

      <section className={site.section} aria-labelledby="how">
        <h2 id="how" className={site.heading}>
          How it works
        </h2>
        <p className={site.text}>
          Ask for a component by name, like “add a date picker”. Your agent calls <code>get_component</code>, gets the
          code, its CSS and a guide to using it, and writes them into your project. The interactive ones (menus,
          selects, dialogs, tabs) run on <a href="https://base-ui.com">Base UI</a> for focus, keyboard and positioning, so
          your agent also installs <code>@base-ui/react</code> once. Before writing any other UI, the server has your agent read the rules for what it’s touching, so the
          screens it writes itself keep the same spacing, motion and states as the components.
        </p>
        <p className={site.text}>
          All of it is free under the MIT license, with no account or key.
        </p>
        <p className={site.text}>
          Using Tailwind? Your agent gets the components in Tailwind’s components layer, so your utility classes
          override them. <Link href="/docs/tailwind">Tailwind CSS</Link> has the setup.
        </p>
      </section>

      <section className={site.section} aria-labelledby="design-system">
        <h2 id="design-system" className={site.heading}>
          Your design system
        </h2>
        <p className={site.text}>
          Components read only <code>--ui-*</code> tokens: space, radius, control heights, durations, easings, color,
          focus and elevation. Your agent maps each one to a variable you already have, so a button takes your color
          and radius and its behavior comes from UI Polish.
        </p>
      </section>

      <section className={site.section} aria-labelledby="tools">
        <h2 id="tools" className={site.heading}>
          Tools
        </h2>
        <div className={site.table}>
          <table className={styles.tools}>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Returns</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map(([name, text]) => (
                <tr key={name}>
                  <td className={styles.tool}>
                    <code>{name}</code>
                  </td>
                  <td>{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DocPage>
  );
}
