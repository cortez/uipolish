import { sortComponents } from "@/components/component-index";
import { DocsNav } from "@/components/docs-nav";
import { SiteLayout } from "@/components/site-layout";
import { listComponents } from "@/lib/content";
import styles from "./docs.module.css";

/** The docs: the shared layout, with every component listed beside the
 *  page on a wide screen. */
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const components = sortComponents(await listComponents()).map((c) => ({ name: c.name, title: c.title }));
  return (
    <SiteLayout>
      <div className={styles.shell}>
        <DocsNav components={components} />
        <div className={styles.body}>{children}</div>
      </div>
    </SiteLayout>
  );
}
