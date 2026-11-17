import styles from "./console.module.css";

/* The product's mark and the nav's glyphs, drawn on the kit's 16-unit
   grid in the icon stroke, for the items the icon set doesn't cover. */

/** The product's mark, on the switcher's round tile and the sign-in page. Swap in your own. */
export function ProductMark() {
  return (
    <svg viewBox="0 0 16 16" className={styles.mark} aria-hidden="true">
      <path d="M8 1.75 13.5 4.9v6.2L8 14.25 2.5 11.1V4.9Z M8 5.25 5.6 6.6v2.8L8 10.75l2.4-1.35V6.6Z" fillRule="evenodd" />
    </svg>
  );
}

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" className={styles.glyph} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Runs: a play mark beside lines of a log. */
export const RunsGlyph = () => <Glyph d="M2.75 3.75v4.5L6.5 6Z M9 4h4.25M9 8h4.25M2.75 12h10.5" />;
/** Approvals: a check in a tray. */
export const ApprovalsGlyph = () => <Glyph d="M2.75 9.25h3l1 1.75h2.5l1-1.75h3M2.75 9.25v2.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5v-2.5M2.75 9.25l1.5-5.5h1.5M13.25 9.25l-1.5-5.5h-1.5M6 5.25l1.4 1.5L10 3.5" />;
/** Knowledge: an open book. */
export const KnowledgeGlyph = () => <Glyph d="M8 4.5c-1.5-1-3.5-1.25-5.25-.75v8.5c1.75-.5 3.75-.25 5.25.75 1.5-1 3.5-1.25 5.25-.75v-8.5C11.5 3.25 9.5 3.5 8 4.5Zm0 0V13" />;
/** Agents: a spark in a rounded frame. */
export const AgentsGlyph = () => <Glyph d="M8 4.5c.3 1.9 1.6 3.2 3.5 3.5-1.9.3-3.2 1.6-3.5 3.5-.3-1.9-1.6-3.2-3.5-3.5 1.9-.3 3.2-1.6 3.5-3.5Z M4.25 2.75h7.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5Z" />;
/** Usage: a gauge. */
export const UsageGlyph = () => <Glyph d="M2.75 11.25a5.25 5.25 0 1 1 10.5 0M8 11.25l2.5-3.5M2.75 13.25h10.5" />;
/** Settings: sliders. */
export const SettingsGlyph = () => <Glyph d="M2.75 4.5h4.5M10.25 4.5h3M2.75 11.5h1.5M7.25 11.5h6M8.75 3v3M5.75 10v3" />;
