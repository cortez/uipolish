import Link from "@/components/link";
import { CONTENT_UPDATED, CONTENT_UPDATED_LABEL, GITHUB_URL } from "@/lib/seo/site";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.links} aria-label="About UI Polish">
        <Link href="/changelog" className={styles.credit}>
          Changelog
        </Link>
        <Link href="/articles" className={styles.credit}>
          Articles
        </Link>
        <Link href="/about" className={styles.credit}>
          About
        </Link>
        <Link href="/privacy" className={styles.credit}>
          Privacy
        </Link>
        <a href={GITHUB_URL} target="_blank" rel="noopener" className={styles.credit}>
          GitHub
        </a>
      </nav>
      <time dateTime={CONTENT_UPDATED}>Updated {CONTENT_UPDATED_LABEL}</time>
    </footer>
  );
}
