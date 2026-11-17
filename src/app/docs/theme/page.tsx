import { ThemeBuilder } from "@/components/theme-builder";
import { DocPage, docMetadata } from "../doc-page";
import site from "../../site.module.css";

const DOC = {
  path: "/docs/theme",
  heading: "Theme",
  title: "Theme: every UI Polish component in your color, from one hue",
  description:
    "Pick one hue and get the accent, the text on it, tinted grays and colored primary buttons for every UI Polish component, light and dark, with every text color checked for contrast.",
};

export const metadata = docMetadata(DOC);

export default function ThemePage() {
  return (
    <DocPage
      doc={DOC}
      lede="Pick one color. The accent, the text on it and in it, the grays and the primary buttons follow, in light and dark, and every text color is checked to read at 4.5:1."
    >
      <ThemeBuilder />
      <section className={site.section} aria-labelledby="use">
        <h2 id="use" className={site.heading}>
          Use it
        </h2>
        <p className={site.text}>
          Paste the CSS after <code>tokens.css</code>. It only sets the roles it changes, so it sits on top of the tokens,
          or of the shadcn/ui mapping if you use that. Agents can ask for the same thing: <code>get_theme</code> over MCP,
          or <code>GET /api/theme?hue=262&amp;tint=1&amp;brand=true</code>.
        </p>
      </section>
    </DocPage>
  );
}
