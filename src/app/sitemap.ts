import { SCREENS } from "@pro/index";
import type { MetadataRoute } from "next";
import { sortComponents } from "@/components/component-index";
import { listComponents } from "@/lib/content";
import { CONTENT_UPDATED, abs } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const components = sortComponents(await listComponents());
  const pages: [string, number][] = [["/", 1], ...(SCREENS.copper ? [["/screens", 0.8], ["/example", 0.6]] as [string, number][] : []), ["/contact", 0.4], ...components.map((c): [string, number] => [`/docs/${c.name}`, 0.7])];
  return [
    ...pages.map(([path, priority]) => ({
      url: abs(path),
      lastModified: CONTENT_UPDATED,
      changeFrequency: "weekly" as const,
      priority,
    })),
  ];
}
