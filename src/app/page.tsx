import type { Metadata } from "next";
import Link from "@/components/link";
import { Accordion, AccordionItem } from "@registry/accordion/accordion";
import { ButtonLink } from "@registry/button/button-link";
import { AgentDemo } from "@/components/agent-demo";
import { CopyPrompt } from "@/components/copy-prompt";
import { getFaq } from "@/lib/faq";
import { getOpinions, listComponents } from "@/lib/content";
import { AGENT_PROMPT } from "@/lib/setup";
import { SiteFooter } from "@/components/site-footer";
import { Specimens } from "@/components/specimens";
import { SiteActions } from "@/components/site-head";
import { JsonLd, homeLd } from "@/lib/seo/json-ld";
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from "@/lib/seo/site";
import site from "./site.module.css";
import { Tiles } from "@/components/tiles";
import styles from "./home.module.css";

/** Block tiles shown before the fade: two rows on a desktop. */
const SHOWN = 4;

export const metadata: Metadata = pageMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/", absoluteTitle: true });

export default async function Home() {
  const faq = await getFaq();
  const components = (await listComponents()).filter((c) => !c.primitive);
  const opinions = await getOpinions();
  // Templates lead: a whole app built from the blocks after them.
  const blocks = components
    .filter((c) => c.type)
    .sort((a, b) => Number(b.type === "template") - Number(a.type === "template") || a.title.localeCompare(b.title));
  return (
    <>
      {/* The content column's top: the name at its left, level with the theme
          toggle at its right; what it is in one muted line, and
          the two ways in, under them. */}
      <header className={styles.hero}>
        <h1 className={site.title}>UI Polish</h1>
        <SiteActions inline />
        <p className={styles.lede}>
          React components and complete screens with every state already designed. Your coding agent installs them
          and builds everything else to match.
        </p>
        <div className={styles.heroActions}>
          <CopyPrompt prompt={AGENT_PROMPT} label="Copy agent instructions" />
          <ButtonLink as={Link} href="/docs" variant="secondary">
            Browse components
          </ButtonLink>
        </div>
      </header>
      <main className={styles.main}>
        <JsonLd nodes={homeLd(faq)} />


        <Specimens
          kit={components.filter((c) => c.kit === "agent").map((c) => c.name)}
          after={
            <ButtonLink as={Link} href="/docs/button" variant="secondary">
              See every component
            </ButtonLink>
          }
        />

        <section id="demo" className={styles.section} aria-labelledby="demo-title">
          <div className={styles.sectionHead}>
            <h2 id="demo-title" className={site.heading}>
              What your agent builds
            </h2>
            <p className={styles.lede}>
              Ask a coding agent for a screen and it gets the main view right. The difference is the moment in between:
              one refund sent, one in flight, one the bank turned down. Here is that moment, built twice.
            </p>
          </div>
          <AgentDemo />
        </section>

        {blocks.length > 0 && (
          <section id="blocks" className={styles.section} aria-labelledby="blocks-title">
            <div className={styles.sectionHead}>
              <h2 id="blocks-title" className={site.heading}>
                Blocks
              </h2>
              <p className={styles.lede}>
                Complete product screens, every state handled, and templates that put them together into working
                Next.js apps.
              </p>
            </div>
            {/* The first rows, then one more row fading out under the way to
                the rest. That row is a picture of more: inert, so nothing in
                it can be focused or clicked through the fade. */}
            <div className={styles.preview}>
              <Tiles items={blocks.slice(0, SHOWN)} className={styles.shown} />
              <div className={styles.more}>
                <div className={styles.ghost} inert aria-hidden="true">
                  <Tiles items={blocks.slice(SHOWN, SHOWN + 2)} />
                </div>
                <div className={`${site.actions} ${styles.actions} ${styles.cta}`}>
                  <ButtonLink as={Link} href={`/docs/${blocks.find((b) => b.type === "block")?.name ?? blocks[0].name}`}>
                    Browse blocks
                  </ButtonLink>
                </div>
              </div>
            </div>
          </section>
        )}

        <section id="opinions" className={styles.section} aria-labelledby="opinions-title">
          <div className={styles.sectionHead}>
            <h2 id="opinions-title" className={site.heading}>
              The rules
            </h2>
            <p className={styles.lede}>
              Ten decisions every component shares. Change one token and every component follows.
            </p>
          </div>
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
        </section>

        <section id="questions" className={`${styles.section} ${styles.questions}`} aria-labelledby="questions-title">
          <h2 id="questions-title" className={site.heading}>
            Questions
          </h2>
          <Accordion hash headingLevel={3} className={styles.faq}>
            {faq.map((q) => (
              <AccordionItem key={q.id} value={q.id} title={q.question}>
                {q.answer}
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
