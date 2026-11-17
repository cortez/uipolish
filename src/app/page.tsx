import type { Metadata } from "next";
import Link from "@/components/link";
import { ButtonLink } from "@registry/button/button-link";
import { PRIMITIVES } from "@/components/component-index";
import { CopyPrompt } from "@/components/copy-prompt";
import { HomeShowcase } from "@/components/home-showcase";
import { SiteFooter } from "@/components/site-footer";
import { SiteActions } from "@/components/site-head";
import { Wordmark } from "@/components/wordmark";
import { getOpinions, listComponents, type ComponentMeta } from "@/lib/content";
import { JsonLd, homeLd } from "@/lib/seo/json-ld";
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from "@/lib/seo/site";
import { AGENT_PROMPT, MCP_URL } from "@/lib/setup";
import styles from "./home.module.css";

/** The one live demo on the home page: a component that holds its size,
 *  shown whole. Every other demo is on its docs page. */
const SHOWCASE = "authorize";

const COMMAND = `claude mcp add --transport http uipolish ${MCP_URL}`;

export const metadata: Metadata = pageMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/", absoluteTitle: true });

export default async function Home() {
  const all = (await listComponents()).filter((c) => !c.primitive && !PRIMITIVES.includes(c.name));
  const opinions = await getOpinions();
  const byTitle = (a: ComponentMeta, b: ComponentMeta) => a.title.localeCompare(b.title);
  const groups: { key: "kit" | "components" | "screens" | "templates"; title: string; items: ComponentMeta[] }[] = [
    { key: "kit", title: "Agent kit", items: all.filter((c) => !c.type && c.kit === "agent").sort(byTitle) },
    { key: "components", title: "Components", items: all.filter((c) => !c.type && c.kit !== "agent").sort(byTitle) },
    { key: "screens", title: "Screens", items: all.filter((c) => c.type === "block").sort(byTitle) },
    { key: "templates", title: "Templates", items: all.filter((c) => c.type === "template").sort(byTitle) },
  ];

  return (
    <>
      <div className={styles.bar}>
        <Wordmark />
        <SiteActions inline />
      </div>

      <header className={styles.hero}>
        <h1 className={styles.title}>Every state, already designed.</h1>
        <p className={styles.text}>
          React components and complete screens for AI products. Your coding agent installs them and builds everything
          else to match.
        </p>
        <div className={styles.actions}>
          <CopyPrompt prompt={AGENT_PROMPT} label="Copy agent instructions" />
          <ButtonLink as={Link} href="/docs" variant="secondary">
            Browse components
          </ButtonLink>
        </div>
      </header>

      <main className={styles.main}>
        <JsonLd nodes={homeLd()} />

        <figure className={styles.showcase}>
          <div className={styles.stage}>
            <HomeShowcase name={SHOWCASE} />
          </div>
          <figcaption className={styles.small}>
            <Link href={`/docs/${SHOWCASE}`} className={styles.link}>
              Authorize
            </Link>
            , the consent screen an MCP server shows an agent. Live: try it.
          </figcaption>
        </figure>

        <section className={styles.section} aria-labelledby="install-title">
          <h2 id="install-title" className={styles.heading}>
            Connect your agent
          </h2>
          <p className={styles.text}>
            Run this in Claude Code, then ask for a component by name. No account, no key. Another agent?{" "}
            <Link href="/docs" className={styles.link}>
              See its setup
            </Link>
            .
          </p>
          <code className={styles.command}>{COMMAND}</code>
          <CopyPrompt prompt={COMMAND} label="Copy command" variant="secondary" />
        </section>

        <section className={styles.section} aria-labelledby="components-title">
          <h2 id="components-title" className={styles.heading}>
            Everything in it
          </h2>
          <p className={styles.text}>Each one has a live demo and a guide your agent reads before using it.</p>
          <div className={styles.directory}>
            {groups
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <nav key={g.key} aria-label={g.title} className={`${styles.group} ${styles[g.key]}`}>
                  <h3 className={styles.heading}>{g.title}</h3>
                  <ul className={styles.list}>
                    {g.items.map((c) => (
                      <li key={c.name}>
                        <Link href={`/docs/${c.name}`} className={styles.item}>
                          {c.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="rules-title">
          <h2 id="rules-title" className={styles.heading}>
            The rules
          </h2>
          <p className={styles.text}>Ten decisions every component shares. Change one token and every component follows.</p>
          <ol className={styles.rules}>
            {opinions.map((o) => (
              <li key={o.title}>{o.title.replace(/\.$/, "")}</li>
            ))}
          </ol>
          <ButtonLink as={Link} href="/docs/rules" variant="secondary">
            Read every rule
          </ButtonLink>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
