import { sortComponents } from "@/components/component-index";
import { DocsNav } from "@/components/docs-nav";
import { SiteLayout } from "@/components/site-layout";
import { listComponents } from "@/lib/content";

/** The docs: the shared layout, with every component listed against the
 *  window's left edge on a wide screen. */
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const components = sortComponents(await listComponents()).map((c) => ({ name: c.name, title: c.title }));
  return <SiteLayout aside={<DocsNav components={components} />}>{children}</SiteLayout>;
}
