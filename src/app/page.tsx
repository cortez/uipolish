import type { Metadata } from "next";
import Link from "@/components/link";
import { ButtonLink } from "@registry/button/button-link";
import { Catalog, type CatalogItem } from "@/components/catalog";
import { PRIMITIVES } from "@/components/component-index";
import { CopyPrompt } from "@/components/copy-prompt";
import { SiteLayout } from "@/components/site-layout";
import { getOpinions, listComponents, type ComponentMeta } from "@/lib/content";
import { JsonLd, homeLd } from "@/lib/seo/json-ld";
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from "@/lib/seo/site";
import { AGENT_PROMPT, MCP_URL } from "@/lib/setup";
import site from "./site.module.css";
import styles from "./home.module.css";

const COMMAND = `claude mcp add --transport http uipolish ${MCP_URL}`;

export const metadata: Metadata = pageMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/", absoluteTitle: true });

export default async function Home() {
  const all = (await listComponents()).filter((c) => !c.primitive);
  const primitive = (c: ComponentMeta) => PRIMITIVES.includes(c.name);
  const opinions = await getOpinions();
  const item = (c: ComponentMeta): CatalogItem => ({ name: c.name, title: c.title });
  const byTitle = (a: ComponentMeta, b: ComponentMeta) => a.title.localeCompare(b.title);
  const groups = [
    { id: "components", title: "Components", items: all.filter((c) => c.kit !== "agent" && !primitive(c)) },
    { id: "agent-kit", title: "Agent kit", items: all.filter((c) => c.kit === "agent") },
    { id: "primitives", title: "Primitives", items: all.filter(primitive) },
  ].filter((g) => g.items.length > 0);

  return (
    <SiteLayout>
      <JsonLd nodes={homeLd()} />
      <header className={site.intro}>
        <h1 className={site.title}>React components for AI products, with every state already designed.</h1>
        <div className={site.actions}>
          <CopyPrompt prompt={AGENT_PROMPT} label="Copy agent instructions" />
          <ButtonLink as={Link} href="/docs" variant="secondary">
            Browse components
          </ButtonLink>
        </div>
      </header>

      {groups.map((g) => (
        <section key={g.id} id={g.id} className={`${site.section} ${styles.wide}`} aria-labelledby={`${g.id}-title`}>
          <h2 id={`${g.id}-title`} className={site.heading}>
            {g.title}
          </h2>
          <Catalog items={g.items.sort(byTitle).map(item)} />
        </section>
      ))}

      <section className={site.section} aria-labelledby="install-title">
        <h2 id="install-title" className={site.heading}>
          Connect your agent
        </h2>
        <p className={site.text}>
          Run this in Claude Code, then ask for a component by name. No account, no key. Another agent?{" "}
          <Link href="/docs">See its setup</Link>.
        </p>
        <code className={styles.command}>{COMMAND}</code>
        <div className={site.actions}>
          <CopyPrompt prompt={COMMAND} label="Copy command" variant="secondary" />
        </div>
      </section>

      <section className={site.section} aria-labelledby="rules-title">
        <h2 id="rules-title" className={site.heading}>
          The rules
        </h2>
        <p className={site.text}>
          {opinions.map((o) => o.title.replace(/\.$/, "")).join(". ")}. <Link href="/docs/rules">Read the rules</Link>
        </p>
      </section>
    </SiteLayout>
  );
}
