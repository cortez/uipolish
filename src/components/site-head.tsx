import Link from "@/components/link";
import { Wordmark } from "@/components/wordmark";
import { DONATE_URL, GITHUB_URL } from "@/lib/seo/site";
import { BrandMark } from "@registry/brand-marks/brand-marks";
import { ButtonLink } from "@registry/button/button-link";
import { ThemeToggle } from "@registry/theme-toggle/theme-toggle";
import { SiteSearch } from "./site-search";
import styles from "./site-head.module.css";

type Item = { name: string; title: string; kit?: "agent" };

/** The top bar every page shares: the mark at the left; the docs, search,
 *  Donate (when it's set up), the theme toggle and GitHub at the right. */
export function SiteHead({ components }: { components: Item[] }) {
  return (
    <header className={styles.bar}>
      <Wordmark />
      <nav className={styles.actions} aria-label="Site">
        <Link href="/docs" className={styles.link}>
          Docs
        </Link>
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
