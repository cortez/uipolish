import type { Metadata } from "next";
import { Accordion, AccordionItem } from "@registry/accordion/accordion";
import { ButtonLink } from "@registry/button/button-link";
import { Catalog, type CatalogItem } from "@/components/catalog";
import { GetStarted } from "@/components/get-started";
import Link from "@/components/link";
import { SCREENS } from "@pro/index";
import { SKILL_INSTALLS } from "@/lib/skill";
import { CopyPrompt } from "@/components/copy-prompt";
import { SiteLayout } from "@/components/site-layout";
import { listComponents, type ComponentMeta } from "@/lib/content";
import { getFaq } from "@/lib/faq";
import { JsonLd, homeLd } from "@/lib/seo/json-ld";
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from "@/lib/seo/site";
import { AGENT_PROMPT } from "@/lib/setup";
import site from "./site.module.css";

export const metadata: Metadata = pageMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/", absoluteTitle: true });

export default async function Home() {
  const all = (await listComponents()).filter((c) => !c.primitive);
  const faq = await getFaq();
  const item = (c: ComponentMeta): CatalogItem => ({ name: c.name, title: c.title });
  const byTitle = (a: ComponentMeta, b: ComponentMeta) => a.title.localeCompare(b.title);

  return (
    <SiteLayout>
      <JsonLd nodes={homeLd(faq)} />
      <header className={site.intro}>
        <h1 className={site.title}>React components for AI products, with every state already designed.</h1>
        <div className={site.actions}>
          <CopyPrompt prompt={AGENT_PROMPT} label="Copy agent instructions" />
          <GetStarted installs={SKILL_INSTALLS} />
          {SCREENS.copper && (
            <ButtonLink as={Link} href="/example" variant="secondary">
              See it in an app
            </ButtonLink>
          )}
        </div>
      </header>

      <section id="components" className={`${site.section} ${site.wide}`} aria-labelledby="components-title">
        <h2 id="components-title" className={site.heading}>
          Components
        </h2>
        {/* The first two rows of a wide screen come with the page; a phone
            shows the first twelve and a button for the rest. */}
        <Catalog items={all.sort(byTitle).map(item)} eager={6} />
      </section>

      <section id="faq" className={`${site.section} ${site.split}`} aria-labelledby="faq-title">
        <h2 id="faq-title" className={site.heading}>
          Questions
        </h2>
        <Accordion hash>
          {faq.map((q) => (
            <AccordionItem key={q.id} value={q.id} title={q.question}>
              <p>{q.answer}</p>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </SiteLayout>
  );
}
