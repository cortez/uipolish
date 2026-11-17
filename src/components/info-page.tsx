import type { Metadata } from "next";
import DocsLayout from "@/app/docs/layout";
import prose from "@/app/docs/[name]/component.module.css";
import site from "@/app/site.module.css";
import type { InfoPage } from "@/lib/info-pages";
import { Markdown } from "@/lib/markdown";
import { pageMetadata } from "@/lib/seo/site";
import styles from "./info-page.module.css";

export const infoMetadata = (page: InfoPage): Metadata =>
  pageMetadata({ title: page.title, description: page.description, path: page.path });

/** About, contact and privacy: the docs frame around one Markdown body. */
export function InfoPageView({ page }: { page: InfoPage }) {
  return (
    <DocsLayout>
      <header className={site.intro}>
        <h1 className={site.title}>{page.heading}</h1>
      </header>
      <article className={`${prose.prose} ${styles.body}`}>
        <Markdown source={page.body} skipTitle />
      </article>
    </DocsLayout>
  );
}
