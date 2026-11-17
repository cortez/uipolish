import type { MetadataRoute } from "next";
import { sortComponents } from "@/components/component-index";
import { listArticles } from "@/lib/articles";
import { listComponents } from "@/lib/content";
import { CONTENT_UPDATED, abs } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const components = sortComponents(await listComponents());
  const pages: [string, number][] = [["/", 1], ["/docs", 0.9], ["/docs/tailwind", 0.7], ["/docs/shadcn", 0.7], ["/docs/theme", 0.7], ["/docs/rules", 0.8], ["/changelog", 0.6], ["/about", 0.5], ["/contact", 0.4], ["/privacy", 0.3], ...components.map((c): [string, number] => [`/docs/${c.name}`, 0.7])];
  const articles = await listArticles();
  return [
    ...pages.map(([path, priority]) => ({
      url: abs(path),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "weekly" as const,
      priority,
    })),
    { url: abs("/articles"), lastModified: articles[0]?.date ?? CONTENT_UPDATED, changeFrequency: "weekly" as const, priority: 0.6 },
    ...articles.map((a) => ({ url: abs(`/articles/${a.slug}`), lastModified: a.date, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
