import type { Metadata } from "next";
import { ButtonLink } from "@registry/button/button-link";
import { Catalog, type CatalogItem } from "@/components/catalog";
import { CopyPrompt } from "@/components/copy-prompt";
import { SiteLayout } from "@/components/site-layout";
import { getOpinions, listComponents, type ComponentMeta } from "@/lib/content";
import { JsonLd, homeLd } from "@/lib/seo/json-ld";
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from "@/lib/seo/site";
import { AGENT_PROMPT } from "@/lib/setup";
import site from "./site.module.css";
import styles from "./home.module.css";

export const metadata: Metadata = pageMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/", absoluteTitle: true });

export default async function Home() {
  const all = (await listComponents()).filter((c) => !c.primitive);
  const opinions = await getOpinions();
  const item = (c: ComponentMeta): CatalogItem => ({ name: c.name, title: c.title });
  const byTitle = (a: ComponentMeta, b: ComponentMeta) => a.title.localeCompare(b.title);

  return (
    <SiteLayout>
      <JsonLd nodes={homeLd()} />
      <header className={site.intro}>
        <h1 className={site.title}>React components for AI products, with every state already designed.</h1>
        <div className={site.actions}>
          <CopyPrompt prompt={AGENT_PROMPT} label="Copy agent instructions" />
          <ButtonLink href="#get-started" variant="secondary">
            Get started
          </ButtonLink>
        </div>
      </header>

      <section id="components" className={`${site.section} ${styles.wide}`} aria-labelledby="components-title">
        <h2 id="components-title" className={site.heading}>
          Components
        </h2>
        <Catalog items={all.sort(byTitle).map(item)} />
      </section>


      <section className={site.section} aria-labelledby="rules-title">
        <h2 id="rules-title" className={site.heading}>
          The rules
        </h2>
        <p className={site.text}>
          {opinions.map((o) => o.title.replace(/\.$/, "")).join(". ")}. <a href="/rules.md">Read the rules</a>
        </p>
      </section>
    </SiteLayout>
  );
}
