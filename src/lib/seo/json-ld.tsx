import { SUPPORT_EMAIL } from "@/lib/info-pages";
import { AUTHOR, OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_SLOGAN, abs, siteUrl } from "./site";

// Schema.org nodes joined by @id. @id only resolves inside one document, so
// every page's graph includes the Organization and WebSite it points at.

const id = (frag: string) => `${siteUrl()}/#${frag}`;
const person = { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url };

const organization = () => ({
  "@type": "Organization",
  "@id": id("organization"),
  name: SITE_NAME,
  alternateName: "uipolish",
  slogan: SITE_SLOGAN,
  url: siteUrl(),
  description: SITE_DESCRIPTION,
  logo: { "@type": "ImageObject", url: abs("/apple-icon"), width: 180, height: 180 },
  founder: person,
  email: SUPPORT_EMAIL,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: SUPPORT_EMAIL,
    url: abs("/contact"),
    availableLanguage: "English",
  },
});

const website = () => ({
  "@type": "WebSite",
  "@id": id("website"),
  name: SITE_NAME,
  url: siteUrl(),
  description: SITE_DESCRIPTION,
  publisher: { "@id": id("organization") },
  inLanguage: "en",
});

const software = () => ({
  "@type": "SoftwareApplication",
  "@id": id("software"),
  name: SITE_NAME,
  url: siteUrl(),
  description: SITE_DESCRIPTION,
  applicationCategory: "DeveloperApplication",
  applicationSubCategory: "UI components for AI products",
  slogan: SITE_SLOGAN,
  keywords: "UI kit, AI products, React components, agent UI, MCP, design system, coding agents",
  operatingSystem: "Any",
  softwareRequirements: "React, and a coding agent that supports MCP",
  image: OG_IMAGE.url,
  publisher: { "@id": id("organization") },
  author: person,
  isAccessibleForFree: true,
  license: "https://opensource.org/licenses/MIT",
  offers: { "@type": "Offer", price: 0, priceCurrency: "USD", url: siteUrl() },
});

/** Home: who, what site, what product. */
export const homeLd = () => [organization(), website(), software()];

/** A docs page: TechArticle plus its breadcrumb trail ([label, path], root first). */
export function docsLd(a: {
  path: string;
  headline: string;
  description: string;
  dateModified: string;
  datePublished?: string;
  trail: [string, string][];
}) {
  return [
    organization(),
    website(),
    {
      "@type": "TechArticle",
      "@id": `${abs(a.path)}#article`,
      headline: a.headline,
      description: a.description,
      url: abs(a.path),
      mainEntityOfPage: abs(a.path),
      image: OG_IMAGE.url,
      inLanguage: "en",
      dateModified: a.dateModified,
      ...(a.datePublished ? { datePublished: a.datePublished } : {}),
      isPartOf: { "@id": id("website") },
      author: { "@id": id("organization") },
      publisher: { "@id": id("organization") },
      about: { "@id": id("software") },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: a.trail.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(p) })),
    },
  ];
}

/** One <script type="application/ld+json">. `<` is escaped so no string can close the tag. */
export function JsonLd({ nodes }: { nodes: object[] }) {
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
