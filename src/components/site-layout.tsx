import type { ReactNode } from "react";
import { sortComponents } from "@/components/component-index";
import { SiteHead } from "@/components/site-head";
import { listComponents } from "@/lib/content";
import styles from "./site-layout.module.css";

/**
 * The one layout every page shares: the top bar across the whole window,
 * then the page's content in one centered column. With `aside` (the docs'
 * component list), the aside sits against the window's left edge under
 * the bar, as tall as the rest of the window, and the content centers in
 * what's left.
 */
export async function SiteLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const components = sortComponents(await listComponents()).map((c) => ({ name: c.name, title: c.title }));
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#content">
        Skip to content
      </a>
      <div className={styles.head}>
        <SiteHead components={components} />
      </div>
      <div className={styles.frame} data-aside={aside ? "" : undefined}>
        {aside && <div className={styles.aside}>{aside}</div>}
        <main id="content" tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
