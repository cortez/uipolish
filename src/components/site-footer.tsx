import { DONATE_URL, GITHUB_URL } from "@/lib/seo/site";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.links} aria-label="About UI Polish">
        <a href={GITHUB_URL} target="_blank" rel="noopener" className={styles.credit}>
          GitHub
        </a>
        {DONATE_URL && (
          <a href={DONATE_URL} target="_blank" rel="noopener" className={styles.credit}>
            Donate
          </a>
        )}
      </nav>
    </footer>
  );
}
