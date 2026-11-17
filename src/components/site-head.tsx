import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@registry/theme-toggle/theme-toggle";
import styles from "./site-head.module.css";

/** The mark, top left on every page: in the docs sidebar, or in the same
 *  box on a page without one. */
export function SiteMark({ placement }: { placement: "sidebar" | "page" }) {
  return (
    <div className={`${styles.mark} ${styles[placement]}`}>
      <Wordmark className={styles.wordmark} />
    </div>
  );
}

/** The theme toggle, top right on every page, level with the mark; on a
 *  wide screen it stays pinned there as the page scrolls. `inline`
 *  puts it in the page's own flow instead, at the end of a header row
 *  that sits in the content column (pages without the docs sidebar). */
export function SiteActions({ inline = false }: { inline?: boolean }) {
  return (
    <div className={inline ? `${styles.actions} ${styles.inline}` : styles.actions}>
      <ThemeToggle size="sm" />
    </div>
  );
}
