import { DocsPager } from "@/components/docs-pager";
import { sortComponents } from "@/components/component-index";
import { SiteHead } from "@/components/site-head";
import { listComponents } from "@/lib/content";
import styles from "./site-layout.module.css";

/**
 * The one layout every page shares: the top bar (the mark, the docs,
 * search, the theme toggle and GitHub) over one content column, the same
 * width on every page. No sidebar. `pager` adds previous and next under
 * the content, in the docs' order.
 */
export async function SiteLayout({ children, pager = false }: { children: React.ReactNode; pager?: boolean }) {
  const components = sortComponents(await listComponents()).map((c) => ({ name: c.name, title: c.title, kit: c.kit }));
  return (
    <div className={styles.page}>
      <SiteHead components={components} />
      <main className={styles.main}>
        {children}
        {pager && <DocsPager pages={[...components.map((c) => ({ href: `/docs/${c.name}`, title: c.title }))]} />}
      </main>
    </div>
  );
}
