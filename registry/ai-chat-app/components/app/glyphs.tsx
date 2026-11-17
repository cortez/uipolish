import styles from "./app.module.css";

/* Glyphs the kit's icon set doesn't have, drawn on its 16-unit grid. */

export function ComposeGlyph() {
  return (
    <svg viewBox="0 0 16 16" className={styles.glyph} aria-hidden="true">
      <path d="M13.25 8.75v3a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5h3" />
      <path d="M11.35 2.65a1.35 1.35 0 0 1 1.9 1.9L8.6 9.2l-2.35.55.55-2.35Z" />
    </svg>
  );
}

/** The product's mark, on the switcher's round tile. Swap in your own. */
export function ProductMark() {
  return (
    <svg viewBox="0 0 16 16" className={styles.mark} aria-hidden="true">
      <path d="M8 2.5c.4 2.9 2.6 5.1 5.5 5.5-2.9.4-5.1 2.6-5.5 5.5-.4-2.9-2.6-5.1-5.5-5.5 2.9-.4 5.1-2.6 5.5-5.5Z" />
    </svg>
  );
}
