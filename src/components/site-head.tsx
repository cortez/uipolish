import { Wordmark } from "@/components/wordmark";
import { DONATE_URL, GITHUB_URL } from "@/lib/seo/site";
import { SKILL_INSTALLS } from "@/lib/skill";
import { BrandMark } from "@registry/brand-marks/brand-marks";
import { ButtonLink } from "@registry/button/button-link";
import { ThemeToggle } from "@registry/theme-toggle/theme-toggle";
import { GetStarted } from "./get-started";
import { SiteSearch } from "./site-search";
import styles from "./site-head.module.css";

type Item = { name: string; title: string; kit?: "agent" };

/** The top bar every page shares: the mark at the left; Get started, search,
 *  Donate (when it's set up), the theme toggle and GitHub at the right. */
export function SiteHead({ components }: { components: Item[] }) {
  return (
    <header className={styles.bar}>
      <Wordmark />
      <nav className={styles.actions} aria-label="Site">
        <GetStarted installs={SKILL_INSTALLS} />
        <SiteSearch components={components} />
        {DONATE_URL && (
          <ButtonLink href={DONATE_URL} target="_blank" rel="noopener" variant="ghost" size="sm">
            Donate
          </ButtonLink>
        )}
        <ThemeToggle size="sm" />
        <ButtonLink href={GITHUB_URL} target="_blank" rel="noopener" variant="ghost" size="sm" aria-label="UI Polish on GitHub">
          <BrandMark name="github" mono />
        </ButtonLink>
      </nav>
    </header>
  );
}
