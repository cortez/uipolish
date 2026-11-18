import { SiteLayout } from "@/components/site-layout";

/** The docs: the shared layout. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}
