import { DocsNav } from "@/components/docs-nav";
import { DocsPager } from "@/components/docs-pager";
import { DocsShell } from "@/components/docs-shell";
import { START, sortComponents } from "@/components/component-index";
import { SiteActions, SiteMark } from "@/components/site-head";
import { listComponents } from "@/lib/content";
import styles from "./layout.module.css";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const components = sortComponents(await listComponents()).map((c) => ({
    name: c.name,
    title: c.title,
    kit: c.kit,
  }));
  return (
    <DocsShell
      side={
        <>
          <SiteMark placement="sidebar" />
          <DocsNav components={components} />
        </>
      }
    >
      <SiteActions />
      <main className={styles.main}>
        {children}
        <DocsPager pages={[...START, ...components.map((c) => ({ href: `/docs/${c.name}`, title: c.title }))]} />
      </main>
    </DocsShell>
  );
}
