import type { Metadata } from "next";

// Site facts every crawler-facing surface reads, so canonicals, sitemap,
// robots, llms.txt and JSON-LD can't drift apart.

/** Absolute origin, no trailing slash. Previews and dev name production too. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://uipolish.com").replace(/\/+$/, "");
}

export const abs = (p: string) => `${siteUrl()}${p.startsWith("/") ? p : `/${p}`}`;

export const SITE_NAME = "UI Polish";
export const GITHUB_URL = "https://github.com/cortez/uipolish";
export const SITE_TITLE = "UI Polish: polished UI for AI products";
/** The one sentence that says what UI Polish is. The home page, About, the
 *  FAQ, llms.txt and the structured data all use it word for word, so a search
 *  or answer engine finds the same definition wherever it reads. */
export const DEFINITION =
  "UI Polish is polished UI for AI products: React components, complete screens and design rules that coding agents install over MCP, with every state, transition and edge case already designed.";
export const SITE_SLOGAN = "Polished UI for AI products";
export const SITE_DESCRIPTION = DEFINITION;
export const AUTHOR = { name: "Joseph Cortez", url: "https://cortez.io" };

/** Clip to snippet length at a word boundary. */
export function clip(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/** One share image for every page: the mark, white on black. Hosted, so the
 *  repo carries no image files. */
export const OG_IMAGE = {
  url: "https://rstr.in/mo3ymucdlps90r/web/EAKupwUfnAO",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "UI Polish",
};

/** Canonical, Open Graph and Twitter for one page. A child's openGraph replaces
 *  the parent's wholesale, so each page sets all of it, image included. */
export function pageMetadata({
  title,
  description,
  path: url,
  absoluteTitle = false,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  type?: "website" | "article";
}): Metadata {
  const social = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: { type, url, siteName: SITE_NAME, locale: "en_US", title: social, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: social, description, images: [OG_IMAGE.url] },
  };
}

export const NO_INDEX = { index: false, follow: false } as const;

/** The one "last updated" date: the home footer, llms.txt, sitemap lastmod
 *  and TechArticle dateModified. Bump when site or registry content changes
 *  materially; a date that is always "today" gets ignored. */
export const CONTENT_UPDATED = "2026-11-05";

/** A YYYY-MM-DD date for people, the one way the site writes dates (US):
 *  "November 5, 2026". UTC, so the server and the browser agree. */
export const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/** CONTENT_UPDATED for people. */
export const CONTENT_UPDATED_LABEL = formatDate(CONTENT_UPDATED);
