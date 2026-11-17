import { DocsNav } from "@/components/docs-nav";
import { DocsPager } from "@/components/docs-pager";
import { DocsShell } from "@/components/docs-shell";
import { START, sortComponents } from "@/components/component-index";
import { SiteActions, SiteMark } from "@/components/site-head";
import { listComponents } from "@/lib/content";
import styles from "./site-layout.module.css";

/**
 * The one layout every page shares: the mark and the nav in the sidebar
 * (a drawer on phones), the theme toggle and GitHub top right, and one
 * content column. `pager` adds previous and next under the content, for
 * pages in the docs' reading order.
 */
export async function SiteLayout({ children, pager = false }: { children: React.ReactNode; pager?: boolean }) {
  const components = sortComponents(await listComponents()).map((c) => ({
    name: c.name,
    title: c.title,
    kit: c.kit,
  }));
  return (
    <DocsShell
      side={
        <>
          <SiteMark />
          <DocsNav components={components} />
        </>
      }
    >
      <SiteActions />
      <main className={styles.main}>
        {children}
        {pager && <DocsPager pages={[...START, ...components.map((c) => ({ href: `/docs/${c.name}`, title: c.title }))]} />}
      </main>
    </DocsShell>
  );
}
