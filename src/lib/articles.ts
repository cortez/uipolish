import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { formatDate } from "@/lib/seo/site";

// Articles: one Markdown file each in articles/, with a short header for the
// title, description, date and the component it's about. The page, its
// Markdown twin, the sitemap and llms.txt all read them from here.

const DIR = path.join(process.cwd(), "articles");

export type Article = {
  slug: string;
  title: string;
  description: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** The registry component the article is about; its demo can be embedded. */
  component?: string;
  /** Markdown, starting with the # title. */
  body: string;
};

function parse(slug: string, raw: string): Article {
  const match = /^---\n([\s\S]*?)\n---\n+/.exec(raw);
  if (!match) throw new Error(`articles/${slug}.md needs a --- header`);
  const head = Object.fromEntries(
    match[1].split("\n").map((line) => {
      const at = line.indexOf(":");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
  );
  for (const field of ["title", "description", "date"]) {
    if (!head[field]) throw new Error(`articles/${slug}.md is missing ${field}`);
  }
  return { slug, title: head.title, description: head.description, date: head.date, component: head.component || undefined, body: raw.slice(match[0].length) };
}

/** Newest first. */
export async function listArticles(): Promise<Article[]> {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".md"));
  const all = await Promise.all(files.map(async (f) => parse(f.slice(0, -3), await readFile(path.join(DIR, f), "utf8"))));
  return all.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export async function getArticle(slug: string): Promise<Article | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    return parse(slug, await readFile(path.join(DIR, `${slug}.md`), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** "November 3, 2026": the site's one date format. */
export const articleDate = (iso: string) => formatDate(iso);

/** The Markdown an agent gets: the article, then where it lives. */
export const articleMarkdown = (a: Article, url: string) =>
  `${a.body.replace(/^\{\{demo [a-z0-9-]+\}\}\n\n?/gm, "").trim()}\n\n---\n\nPublished ${articleDate(a.date)} at ${url}.\n`;
