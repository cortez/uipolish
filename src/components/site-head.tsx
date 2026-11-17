import { Wordmark } from "@/components/wordmark";
import { DONATE_URL, GITHUB_URL } from "@/lib/seo/site";
import { BrandMark } from "@registry/brand-marks/brand-marks";
import { ButtonLink } from "@registry/button/button-link";
import { ThemeToggle } from "@registry/theme-toggle/theme-toggle";
import styles from "./site-head.module.css";

/** The mark, top left on every page, at the top of the sidebar. */
export function SiteMark() {
  return (
    <div className={styles.mark}>
      <Wordmark className={styles.wordmark} />
    </div>
  );
}

/** Donate (when it's set up), the theme toggle and GitHub, top right on
 *  every page, level with the mark; on a wide screen they stay pinned
 *  there as the page scrolls. */
export function SiteActions() {
  return (
    <div className={styles.actions}>
      {DONATE_URL && (
        <ButtonLink href={DONATE_URL} target="_blank" rel="noopener" variant="ghost" size="sm">
          Donate
        </ButtonLink>
      )}
      <ThemeToggle size="sm" />
      <ButtonLink href={GITHUB_URL} target="_blank" rel="noopener" variant="ghost" size="sm" aria-label="UI Polish on GitHub">
        <BrandMark name="github" mono />
      </ButtonLink>
    </div>
  );
}
