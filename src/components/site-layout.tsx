import { sortComponents } from "@/components/component-index";
import { SiteHead } from "@/components/site-head";
import { listComponents } from "@/lib/content";
import styles from "./site-layout.module.css";

/**
 * The one layout every page shares: the top bar (the mark, the docs,
 * search, the theme toggle and GitHub) over one content column, the same
 * width on every page. No sidebar.
 */
export async function SiteLayout({ children }: { children: React.ReactNode }) {
  const components = sortComponents(await listComponents()).map((c) => ({ name: c.name, title: c.title }));
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#content">
        Skip to content
      </a>
      <SiteHead components={components} />
      <main id="content" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  );
}
