import { Wordmark } from "@/components/wordmark";
import { GITHUB_URL } from "@/lib/seo/site";
import { Mark } from "./marks";
import { ButtonLink } from "@registry/button/button-link";
import { ThemeToggle } from "@registry/theme-toggle/theme-toggle";
import { SiteSearch } from "./site-search";
import styles from "./site-head.module.css";

type Item = { name: string; title: string };

/** The top bar every page shares: the mark at the left; search, the theme
 *  toggle and GitHub at the right. */
export function SiteHead({ components }: { components: Item[] }) {
  return (
    <header className={styles.bar}>
      <Wordmark />
      <nav className={styles.actions} aria-label="Site">
        <SiteSearch components={components} />
        <ThemeToggle size="sm" />
        <ButtonLink href={GITHUB_URL} target="_blank" rel="noopener" variant="ghost" size="sm" aria-label="UI Polish on GitHub">
          <Mark name="github" />
        </ButtonLink>
      </nav>
    </header>
  );
}
