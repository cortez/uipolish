import { SiteLayout } from "@/components/site-layout";

/** The docs: the shared layout, with previous and next under each page. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayout pager>{children}</SiteLayout>;
}
