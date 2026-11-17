import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "@/components/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@registry/button/button-link";
import DocsLayout from "@/app/docs/layout";
import prose from "@/app/docs/[name]/component.module.css";
import site from "@/app/site.module.css";
import { CopyPage } from "@/components/copy-page";
import { articleDate, getArticle, listArticles } from "@/lib/articles";
import { getComponentMeta } from "@/lib/content";
import { Markdown } from "@/lib/markdown";
import { JsonLd, docsLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/site";
import { LivePreview } from "@/components/live-preview";
import styles from "../articles.module.css";

export async function generateStaticParams() {
  return (await listArticles()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  if (!article) return {};
  return pageMetadata({ title: article.title, description: article.description, path: `/articles/${article.slug}`, type: "article" });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();
  const path = `/articles/${article.slug}`;
  const meta = article.component ? await getComponentMeta(article.component) : null;

  return (
    <DocsLayout>
      <JsonLd
        nodes={docsLd({
          path,
          headline: article.title,
          description: article.description,
          dateModified: article.date,
          datePublished: article.date,
          trail: [["UI Polish", "/"], ["Articles", "/articles"], [article.title, path]],
        })}
      />
      <header className={site.intro}>
        <h1 className={site.title}>{article.title}</h1>
        <p className={styles.meta}>
          <Link href="/articles">Articles</Link> · <time dateTime={article.date}>{articleDate(article.date)}</time>
        </p>
        <div className={site.actions}>
          <CopyPage />
        </div>
      </header>
      {/* A {{demo name}} line places the live component between stretches of
          text, outside the prose styles so it looks as it does in the docs. */}
      <article className={styles.body}>
        {article.body.split(/^\{\{demo [a-z0-9-]+\}\}$/m).map((part, i) => (
          <Fragment key={i}>
            {i > 0 && article.component && (
              <div className={`${site.stage} ${site.embed}`}>
                <LivePreview name={article.component} />
              </div>
            )}
            <div className={prose.prose}>
              <Markdown source={part} skipTitle />
            </div>
          </Fragment>
        ))}
      </article>
      {meta && (
        <aside className={styles.next} aria-labelledby="next">
          <h2 id="next" className={site.heading}>
            {meta.title}
          </h2>
          <p className={site.text}>{meta.summary}</p>
          <div className={site.actions}>
            <ButtonLink as={Link} href={`/docs/${meta.name}`}>
              See the {meta.title.toLowerCase()}
            </ButtonLink>
          </div>
        </aside>
      )}
    </DocsLayout>
  );
}
