import { DocsPager } from "@/components/docs-pager";
import { START, sortComponents } from "@/components/component-index";
import { SiteHead } from "@/components/site-head";
import { listComponents } from "@/lib/content";
import styles from "./site-layout.module.css";

/**
 * The one layout every page shares: the top bar (the mark, the docs,
 * search, the theme toggle and GitHub) over one content column. No
 * sidebar. `wide` gives the column the directory's width; reading pages
 * keep a reading width. `pager` adds previous and next under the content,
 * in the docs' order.
 */
export async function SiteLayout({
  children,
  wide = false,
  pager = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
  pager?: boolean;
}) {
  const components = sortComponents(await listComponents()).map((c) => ({ name: c.name, title: c.title, kit: c.kit }));
  return (
    <div className={wide ? `${styles.page} ${styles.wide}` : styles.page}>
      <SiteHead components={components} />
      <main className={styles.main}>
        {children}
        {pager && <DocsPager pages={[...START, ...components.map((c) => ({ href: `/docs/${c.name}`, title: c.title }))]} />}
      </main>
    </div>
  );
}
