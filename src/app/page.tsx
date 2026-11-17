import type { Metadata } from "next";
import Link from "@/components/link";
import { Accordion, AccordionItem } from "@registry/accordion/accordion";
import { ButtonLink } from "@registry/button/button-link";
import { CopyPrompt } from "@/components/copy-prompt";
import { getFaq } from "@/lib/faq";
import { getOpinions, listComponents, type ComponentMeta } from "@/lib/content";
import { AGENT_PROMPT } from "@/lib/setup";
import { Catalog, type CatalogItem } from "@/components/catalog";
import { PRIMITIVES } from "@/components/component-index";
import { SiteFooter } from "@/components/site-footer";
import { SiteActions } from "@/components/site-head";
import { Wordmark } from "@/components/wordmark";
import { JsonLd, homeLd } from "@/lib/seo/json-ld";
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from "@/lib/seo/site";
import site from "./site.module.css";
import styles from "./home.module.css";

/** A summary's opening phrase (before its colon or first full stop), so the
 *  cards stay even; the docs page has the whole summary. */
function lead(summary: string) {
  const end = summary.search(/[:.](\s|$)/);
  return (end === -1 ? summary : summary.slice(0, end)).trim() + ".";
}

export const metadata: Metadata = pageMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/", absoluteTitle: true });

export default async function Home() {
  const faq = await getFaq();
  const components = (await listComponents()).filter((c) => !c.primitive);
  const opinions = await getOpinions();
  // One catalog, blocks and templates in it like any component: the agent
  // kit first (what the page is about), then whole screens and apps, then
  // everything else, each group A to Z.
  const rank = (c: ComponentMeta) =>
    c.kit === "agent" ? 0 : c.type === "block" ? 1 : c.type === "template" ? 2 : PRIMITIVES.includes(c.name) ? 4 : 3;
  const catalog: CatalogItem[] = components
    .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title))
    .map((c) => ({
      name: c.name,
      title: c.title,
      summary: c.blurb ?? lead(c.summary),
      tag: c.type === "template" ? "Template" : c.type === "block" ? "Screen" : c.kit === "agent" ? "Agent kit" : undefined,
      screen: c.type !== undefined,
    }));
  return (
    <>
      {/* The content column's top: the mark at its left, level with the theme
          toggle at its right. Then a long quiet drop to the one large line on
          the page, what it is under it in the muted color, and the two ways in. */}
      <header className={styles.hero}>
        <Wordmark />
        <SiteActions inline />
        <div className={styles.statement}>
          <h1 className={styles.display}>Every state, already designed.</h1>
          <p className={styles.lede}>
            React components and complete screens for AI products. Your coding agent installs them and builds
            everything else to match.
          </p>
          <div className={styles.heroActions}>
            <CopyPrompt prompt={AGENT_PROMPT} label="Copy agent instructions" />
            <ButtonLink as={Link} href="/docs" variant="secondary">
              Browse components
            </ButtonLink>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <JsonLd nodes={homeLd(faq)} />


        <section id="components" className={styles.catalog} aria-labelledby="components-title">
          <h2 id="components-title" className={site.heading}>
            All components
          </h2>
          <Catalog items={catalog} />
        </section>

        <section id="opinions" className={styles.section} aria-labelledby="opinions-title">
          <div className={styles.sectionHead}>
            <h2 id="opinions-title" className={site.heading}>
              The rules
            </h2>
            <p className={styles.lede}>
              Ten decisions every component shares. Change one token and every component follows.
            </p>
          </div>
          <div className={styles.sectionBody}>
            <ol className={styles.rules}>
              {opinions.map((o) => (
                <li key={o.title} className={styles.rule}>
                  <h3 className={styles.ruleTitle}>{o.title.replace(/\.$/, "")}</h3>
                </li>
              ))}
            </ol>
            <div className={`${site.actions} ${styles.actions}`}>
              <ButtonLink as={Link} href="/docs/rules" variant="secondary">
                Read every rule
              </ButtonLink>
            </div>
          </div>
        </section>

        <section id="questions" className={`${styles.section} ${styles.questions}`} aria-labelledby="questions-title">
          <div className={styles.sectionHead}>
            <h2 id="questions-title" className={site.heading}>
              Questions
            </h2>
          </div>
          <div className={styles.sectionBody}>
            <Accordion hash headingLevel={3} className={styles.faq}>
              {faq.map((q) => (
                <AccordionItem key={q.id} value={q.id} title={q.question}>
                  {q.answer}
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
