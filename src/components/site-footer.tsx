import Link from "@/components/link";
import { GITHUB_URL } from "@/lib/seo/site";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.links} aria-label="About UI Polish">
        <Link href="/privacy" className={styles.credit}>
          Privacy
        </Link>
        <a href={GITHUB_URL} target="_blank" rel="noopener" className={styles.credit}>
          GitHub
        </a>
      </nav>
    </footer>
  );
}
