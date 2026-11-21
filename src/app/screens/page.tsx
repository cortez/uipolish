import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Accordion, AccordionItem } from "@registry/accordion/accordion";
import { Alert } from "@registry/alert/alert";
import { ButtonLink } from "@registry/button/button-link";
import { Icon } from "@registry/icons/icons";
import { SCREEN_INFO } from "@pro/index";
import Link from "@/components/link";
import { SiteLayout } from "@/components/site-layout";
import { PRO_PRICE, previewHref, proCheckout } from "@/lib/pro";
import { pageMetadata } from "@/lib/seo/site";
import site from "../site.module.css";
import styles from "./screens.module.css";

export const metadata: Metadata = pageMetadata({
  title: "UI Polish Pro: app screens",
  description: `Whole app screens built only from UI Polish components, every state designed and working. ${PRO_PRICE} once for your whole team, every screen now and as they're added.`,
  path: "/screens",
});

/** Screens with a picture of themselves in public/screens/<name>-{light,dark}.webp. */
const SHOTS = new Set(["copper"]);

const INCLUDED = [
  "Every screen, now and as they’re added, with lifetime updates",
  "One license for your whole team: unlimited developers and projects, client work included",
  "Each screen’s source, sample data and guide, in a private GitHub repo you’re invited to",
  "Built only from the free UI Polish components, so a screen is code you already know how to change",
];

const STEPS = [
  { title: "Buy once", body: `${PRO_PRICE}, checkout by Polar. Your receipt and license key come by email.` },
  { title: "Get the repo", body: "You’re invited to the private GitHub repo with every screen, and to every screen added later." },
  { title: "Make it yours", body: "Copy a screen into your app, swap the sample data for yours, and change anything: it’s your code." },
];

const FAQ = [
  {
    q: "Are the components free?",
    a: "Yes. Every UI Polish component is free and MIT licensed, and stays that way. Pro is the finished screens built from them.",
  },
  {
    q: "Who does one license cover?",
    a: "Your whole team: every developer, every project, including work you build for clients. You can’t resell or redistribute the screens themselves as a kit or template.",
  },
  {
    q: "What do I need to use a screen?",
    a: "A React app with the UI Polish components installed. Each screen lists the components it imports, and its guide says how to wire in your own data.",
  },
  {
    q: "Do I get new screens?",
    a: "Yes. Every screen added later is yours at no extra cost, along with updates to the ones you have.",
  },
];

/** UI Polish Pro: what the paid screens are, what they cost, and the way to
 *  buy them. Without the screens, there's no page. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!SCREEN_INFO.length) notFound();
  const purchased = (await searchParams).purchased === "1";
  const checkout = proCheckout();
  const first = SCREEN_INFO[0];

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
      <header className={`${site.intro} ${styles.hero}`}>
        <p className={styles.eyebrow}>UI Polish Pro</p>
        <h1 className={site.title}>Whole app screens, built from UI Polish and ready to make yours.</h1>
        <p className={`${site.text} ${styles.lede}`}>
          Start from a finished screen instead of a blank page: every state designed, every interaction working, on the free
          components you already use.
        </p>
        <div className={styles.cta}>
          {buy(`Buy for ${PRO_PRICE}`)}
          <ButtonLink as={Link} href={previewHref(first.name)} variant="secondary" size="lg">
            Try the live preview
          </ButtonLink>
        </div>
        <p className={styles.fine}>One-time payment · Your whole team · Every future screen</p>
      </header>

      {purchased && (
        <div className={styles.thanks}>
          <Alert tone="success" title="Thanks for buying UI Polish Pro">
            Your license key and an invite to the private GitHub repo are on their way to the email you paid with.
          </Alert>
        </div>
      )}

      {SHOTS.has(first.name) && (
        <Link href={previewHref(first.name)} className={styles.shot} aria-label={`${first.title}: open the live preview`}>
          <Image className={styles.light} src={`/screens/${first.name}-light.webp`} alt="" width={1440} height={900} priority sizes="(max-width: 1100px) 100vw, 1040px" />
          <Image className={styles.dark} src={`/screens/${first.name}-dark.webp`} alt="" width={1440} height={900} sizes="(max-width: 1100px) 100vw, 1040px" />
          <span className={styles.shotLabel}>
            Open the live preview <Icon name="arrow-right" />
          </span>
        </Link>
      )}

      <section className={site.section} aria-labelledby="screens-title">
        <h2 id="screens-title" className={site.heading}>
          {SCREEN_INFO.length === 1 ? "The screen so far" : `${SCREEN_INFO.length} screens`}
        </h2>
        <ul className={styles.list}>
          {SCREEN_INFO.map((s) => (
            <li key={s.name} className={styles.card}>
              <h3 className={styles.name}>{s.title}</h3>
              {s.summary && <p className={site.text}>{s.summary}</p>}
              <p className={styles.uses}>Built from {s.components.length} UI Polish components.</p>
              <div className={styles.cardActions}>
                <ButtonLink as={Link} href={previewHref(s.name)} variant="secondary">
                  Open live preview
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={site.section} aria-labelledby="how-title">
        <h2 id="how-title" className={site.heading}>
          How it works
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, i) => (
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

      <section id="buy" className={site.section} aria-labelledby="buy-title">
        <h2 id="buy-title" className={site.heading}>
          One price
        </h2>
        <div className={styles.price}>
          <p className={styles.amount}>
            {PRO_PRICE}
            <span className={styles.per}>one-time</span>
          </p>
          <ul className={styles.included}>
            {INCLUDED.map((line) => (
              <li key={line}>
                <Icon name="check" className={styles.tick} />
                {line}
              </li>
            ))}
          </ul>
          <div className={styles.priceAction}>{buy("Buy UI Polish Pro")}</div>
        </div>
      </section>

      <section className={site.section} aria-labelledby="faq-title">
        <h2 id="faq-title" className={site.heading}>
          Questions
        </h2>
        <Accordion>
          {FAQ.map((item, i) => (
            <AccordionItem key={item.q} value={String(i)} title={item.q}>
              <p>{item.a}</p>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </SiteLayout>
  );
}
