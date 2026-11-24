import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Accordion, AccordionItem } from "@registry/accordion/accordion";
import { Alert } from "@registry/alert/alert";
import { ButtonLink } from "@registry/button/button-link";
import { Icon } from "@registry/icons/icons";
import { SCREEN_INFO } from "@pro/index";
import Link from "@/components/link";
import { InstallCommand } from "@/components/install-command";
import { SiteLayout } from "@/components/site-layout";
import {
  CATALOG,
  PRO_FAQ,
  PRO_HEADLINE,
  PRO_INCLUDED,
  PRO_LEDE,
  PRO_OPEN,
  PRO_PORTAL,
  PRO_PRICE,
  PRO_STEPS,
  previewHref,
  proCheckout,
} from "@/lib/pro";
import { JsonLd, proLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/site";
import { MCP_URL } from "@/lib/setup";
import site from "../site.module.css";
import styles from "./screens.module.css";

export const metadata: Metadata = pageMetadata({
  title: "UI Polish Pro: app screens",
  description: PRO_OPEN
    ? `${SCREEN_INFO.length} app screens for AI products, built from UI Polish components with every state done. ${PRO_PRICE}, paid once, with no seat limits and new screens included.`
    : "App screens for AI products, built from UI Polish components with every state done. Try each one live on sample data.",
  path: "/pro",
});

/** Screens with a picture of themselves in public/shots/<name>-{light,dark}.webp. */
const SHOTS = new Set([
  "copper",
  "agent-builder",
  "analytics",
  "approvals",
  "evals",
  "inbox",
  "knowledge",
  "settings",
  "support-widget",
  "traces",
]);

type Card = {
  name: string;
  title: string;
  tagline: string;
  built: boolean;
  components: number;
};

/** The catalog in its order: built screens open, the rest are in the works;
 *  a built screen the catalog doesn't name goes last with its own summary. */
function cards(): Card[] {
  const built = new Map(SCREEN_INFO.map((s) => [s.name, s]));
  const listed = CATALOG.filter((c) => built.has(c.name)).map((c) => ({
    ...c,
    built: true,
    components: built.get(c.name)!.components.length,
  }));
  const extra = SCREEN_INFO.filter(
    (s) => !CATALOG.some((c) => c.name === s.name),
  ).map((s) => ({
    name: s.name,
    title: s.title,
    tagline: s.summary,
    built: true,
    components: s.components.length,
  }));
  return [...listed, ...extra];
}

/** A placeholder: the buyer swaps in the key from their purchase email. */
const KEY = "UIPOLISH-XXXX-XXXX-XXXX";
const MCP_SETUPS = [
  {
    label: "Claude Code",
    command: `claude mcp add --transport http uipolish ${MCP_URL} --header "Authorization: Bearer ${KEY}"`,
  },
  {
    label: "Cursor, in .cursor/mcp.json",
    command: `{ "mcpServers": { "uipolish": { "url": "${MCP_URL}", "headers": { "Authorization": "Bearer ${KEY}" } } } }`,
  },
];

/** UI Polish Pro: what the paid screens are, what they cost, and the way to
 *  buy them. Without the screens, there's no page. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!SCREEN_INFO.length) notFound();
  const purchased = (await searchParams).purchased === "1";
  const checkout = proCheckout();
  const first =
    SCREEN_INFO.find((s) => s.name === CATALOG[0].name) ?? SCREEN_INFO[0];

  const buy = (label: string) =>
    checkout ? (
      <ButtonLink href={checkout} size="lg">
        {label}
      </ButtonLink>
    ) : (
      <ButtonLink as={Link} href="/contact" size="lg">
        Get in touch to buy
      </ButtonLink>
    );

  return (
    <SiteLayout>
      <JsonLd nodes={proLd()} />
      <header className={`${site.intro} ${styles.hero}`}>
        <p className={styles.eyebrow}>UI Polish Pro</p>
        <h1 className={site.title}>
          {PRO_HEADLINE}
        </h1>
        <p className={`${site.text} ${styles.lede}`}>
          {PRO_LEDE}
        </p>
        {PRO_OPEN ? (
          <>
            <div className={styles.cta}>
              {buy(`Buy for ${PRO_PRICE}`)}
              <ButtonLink
                as={Link}
                href={previewHref(first.name)}
                variant="secondary"
                size="lg"
              >
                Try the live preview
              </ButtonLink>
            </div>
            <p className={styles.fine}>
              Pay once. No seat limits. New screens are included.
            </p>
          </>
        ) : (
          <>
            <div className={styles.cta}>
              <ButtonLink as={Link} href={previewHref(first.name)} size="lg">
                Try the live preview
              </ButtonLink>
              <ButtonLink
                as={Link}
                href="/contact"
                variant="secondary"
                size="lg"
              >
                Get in touch
              </ButtonLink>
            </div>
            <p className={styles.fine}>
              No seat limits. New screens are included.
            </p>
          </>
        )}
      </header>

      {purchased && (
        <div className={styles.thanks}>
          <Alert
            tone="success"
            title="Thanks for buying UI Polish Pro"
            actions={
              <ButtonLink href={PRO_PORTAL}>
                Connect GitHub
              </ButtonLink>
            }
          >
            Your license key is in your email. To get the code, sign in to
            Polar’s customer portal with the email you paid with and connect
            GitHub. You’ll get an invite to the private repo. Your key also
            works{" "}
            <a href="#ai-tool">in your AI tool</a>.
          </Alert>
        </div>
      )}

      {SHOTS.has(first.name) && (
        <Link
          href={previewHref(first.name)}
          className={styles.shot}
          aria-label={`${first.title}: open the live preview`}
        >
          <Image
            className={styles.light}
            src={`/shots/${first.name}-light.webp`}
            alt=""
            width={1440}
            height={900}
            priority
            sizes="(max-width: 1100px) 100vw, 1040px"
          />
          <Image
            className={styles.dark}
            src={`/shots/${first.name}-dark.webp`}
            alt=""
            width={1440}
            height={900}
            sizes="(max-width: 1100px) 100vw, 1040px"
          />
          <span className={styles.shotLabel}>
            Open the live preview <Icon name="arrow-right" />
          </span>
        </Link>
      )}

      <section
        className={`${site.section} ${site.wide}`}
        aria-labelledby="screens-title"
      >
        <h2 id="screens-title" className={site.heading}>
          {`${SCREEN_INFO.length} ${SCREEN_INFO.length === 1 ? "screen" : "screens"}`}
        </h2>
        <ul className={styles.grid}>
          {cards().map((c) => (
            <li
              key={c.name}
              className={styles.tile}
              data-planned={c.built ? undefined : ""}
            >
              {c.built ? (
                <Link href={previewHref(c.name)} className={styles.tileLink}>
                  <span className={styles.thumb}>
                    {SHOTS.has(c.name) && (
                      <>
                        <Image
                          className={styles.light}
                          src={`/shots/${c.name}-light.webp`}
                          alt=""
                          width={1440}
                          height={900}
                          sizes="(max-width: 720px) 100vw, 520px"
                        />
                        <Image
                          className={styles.dark}
                          src={`/shots/${c.name}-dark.webp`}
                          alt=""
                          width={1440}
                          height={900}
                          sizes="(max-width: 720px) 100vw, 520px"
                        />
                      </>
                    )}
                  </span>
                  <span className={styles.tileText}>
                    <span className={styles.name}>{c.title}</span>
                    <span className={styles.tagline}>{c.tagline}</span>
                    <span className={styles.open}>
                      Open live preview <Icon name="arrow-right" />
                    </span>
                  </span>
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {PRO_OPEN && (
        <>
          <section className={`${site.section} ${site.split}`} aria-labelledby="how-title">
            <h2 id="how-title" className={site.heading}>
              How it works
            </h2>
            <ol className={styles.steps}>
              {PRO_STEPS.map((step, i) => (
                <li key={step.title} className={styles.step}>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className={styles.name}>{step.title}</h3>
                  <p className={site.text}>{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section
            id="ai-tool"
            className={`${site.section} ${site.split}`}
            aria-labelledby="ai-tool-title"
          >
            <h2 id="ai-tool-title" className={site.heading}>
              Use with your AI tool
            </h2>
            <div className={styles.mcp}>
              <p className={site.text}>
                Add the UI Polish MCP server with your license key, then ask
                your agent for a screen by name, like “add the inbox screen”.
                It writes the files into your project. Replace the placeholder
                key below with yours.
              </p>
              {MCP_SETUPS.map((setup) => (
                <div key={setup.label} className={styles.mcpSetup}>
                  <p className={styles.mcpLabel}>{setup.label}</p>
                  <InstallCommand
                    command={setup.command}
                    label={`${setup.label} setup`}
                  />
                </div>
              ))}
              <p className={styles.fine}>
                Other tools: point them at {MCP_URL} with your key in an
                Authorization: Bearer header. The free components don’t need a
                key.
              </p>
            </div>
          </section>

          <section
            id="buy"
            className={`${site.section} ${site.split}`}
            aria-labelledby="buy-title"
          >
            <h2 id="buy-title" className={site.heading}>
              Pricing
            </h2>
            <div className={styles.price}>
              <p className={styles.amount}>
                {PRO_PRICE}
                <span className={styles.per}>paid once</span>
              </p>
              <ul className={styles.included}>
                {PRO_INCLUDED.map((line) => (
                  <li key={line}>
                    <Icon name="check" className={styles.tick} />
                    {line}
                  </li>
                ))}
              </ul>
              <div className={styles.priceAction}>
                {buy("Buy UI Polish Pro")}
              </div>
            </div>
          </section>
        </>
      )}

      <section className={`${site.section} ${site.split}`} aria-labelledby="faq-title">
        <h2 id="faq-title" className={site.heading}>
          Questions
        </h2>
        <Accordion>
          {PRO_FAQ.map((item, i) => (
            <AccordionItem key={item.q} value={String(i)} title={item.q}>
              <p>{item.a}</p>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </SiteLayout>
  );
}
