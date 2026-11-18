import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getComponentMeta, listComponents } from "@/lib/content";
import { NO_INDEX } from "@/lib/seo/site";
import { LivePreview } from "@/components/live-preview";
import styles from "./page.module.css";

// Bare component canvases for embeds and screenshots, not pages.
export const metadata: Metadata = { robots: NO_INDEX };

export async function generateStaticParams() {
  return (await listComponents()).map(({ name }) => ({ name }));
}

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { name } = await params;
  const { theme } = await searchParams;
  const meta = await getComponentMeta(name);
  if (!meta) notFound();

  return (
    <main className={styles.page} data-theme={theme === "dark" || theme === "light" ? theme : undefined}>
      <div className={styles.canvas}>
        <LivePreview name={name} />
      </div>
    </main>
  );
}
