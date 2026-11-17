import Link from "@/components/link";
import DocsLayout from "@/app/docs/layout";
import site from "@/app/site.module.css";
import { articleDate, listArticles } from "@/lib/articles";
import { JsonLd, docsLd } from "@/lib/seo/json-ld";
import { CONTENT_UPDATED, pageMetadata } from "@/lib/seo/site";
import styles from "./articles.module.css";

const PAGE = {
  path: "/articles",
  title: "Articles: designing the UI of AI products",
  description: "How to design the parts specific to AI products: MCP consent screens, tool approval and agent runs. Each article comes with a component that implements it.",
};

export const metadata = pageMetadata({ title: PAGE.title, description: PAGE.description, path: PAGE.path });

export default async function ArticlesPage() {
  const articles = await listArticles();
  return (
    <DocsLayout>
      <JsonLd
        nodes={docsLd({ path: PAGE.path, headline: PAGE.title, description: PAGE.description, dateModified: CONTENT_UPDATED, trail: [["UI Polish", "/"], ["Articles", PAGE.path]] })}
      />
      <header className={site.intro}>
        <h1 className={site.title}>Articles</h1>
        <p className={site.text}>
          How to design the parts specific to AI products, such as MCP consent screens, tool approval and agent runs.
          Each article comes with a live component that implements it.
        </p>
      </header>
      <ol className={styles.list}>
        {articles.map((a) => (
          <li key={a.slug} className={styles.item}>
            <Link href={`/articles/${a.slug}`} className={styles.link}>
              <span className={styles.title}>{a.title}</span>
              <span className={styles.description}>{a.description}</span>
              <time className={styles.date} dateTime={a.date}>
                {articleDate(a.date)}
              </time>
            </Link>
          </li>
        ))}
      </ol>
    </DocsLayout>
  );
}
