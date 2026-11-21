import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@registry/alert/alert";
import { Badge } from "@registry/badge/badge";
import { ButtonLink } from "@registry/button/button-link";
import { SCREEN_INFO } from "@pro/index";
import Link from "@/components/link";
import { SiteLayout } from "@/components/site-layout";
import { pageMetadata } from "@/lib/seo/site";
import site from "../site.module.css";
import styles from "./screens.module.css";

export const metadata: Metadata = pageMetadata({
  title: "UI Polish Pro screens",
  description:
    "Whole app screens built only from UI Polish components, ready to make yours. $299 once for your whole team, every screen now and as they're added.",
  path: "/screens",
});

/** Where each screen's live preview opens. Copper predates /screens/<name>. */
const previewHref = (name: string) => (name === "copper" ? "/example" : `/screens/${name}`);

const INCLUDED = [
  "Every screen, now and as they’re added, with lifetime updates.",
  "One price for your whole team: unlimited developers and projects, client work included.",
  "Access to the private GitHub repo with every screen’s source, sample data and guide.",
    "Built only from the free UI Polish components, so a screen is code you already know how to change.",
];

/** UI Polish Pro: what the paid screens are, what they cost, and the way to
 *  buy them. The checkout link comes from PRO_CHECKOUT_URL (Polar); until
 *  it's set there's no Buy button. Without the screens, there's no page. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!SCREEN_INFO.length) notFound();
  const purchased = (await searchParams).purchased === "1";
  const checkout = process.env.PRO_CHECKOUT_URL?.trim();

  return (
    <SiteLayout>
      <header className={site.intro}>
        <h1 className={site.title}>Whole app screens, built from UI Polish and ready to make yours.</h1>
        <p className={site.text}>$299 once, for your whole team. Every screen, now and as they&rsquo;re added.</p>
        <div className={site.actions}>
          {checkout && <ButtonLink href={checkout}>Buy UI Polish Pro</ButtonLink>}
          <ButtonLink as={Link} href={previewHref(SCREEN_INFO[0].name)} variant="secondary">
            See a screen live
          </ButtonLink>
        </div>
      </header>

      {purchased && (
        <section className={site.section}>
          <Alert tone="success" title="Thanks for buying UI Polish Pro">
            Your license key and an invite to the private GitHub repo are on their way to the email you paid with.
          </Alert>
        </section>
      )}

      <section className={site.section} aria-labelledby="screens-title">
        <h2 id="screens-title" className={site.heading}>
          Screens
        </h2>
        <ul className={styles.list}>
          {SCREEN_INFO.map((s) => (
            <li key={s.name} className={styles.card}>
              <div className={styles.head}>
                <h3 className={styles.name}>{s.title}</h3>
                <Badge>{s.components.length} components</Badge>
              </div>
              {s.summary && <p className={site.text}>{s.summary}</p>}
              <div className={styles.actions}>
                <ButtonLink as={Link} href={previewHref(s.name)} variant="secondary">
                  Open live preview
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={site.section} aria-labelledby="included-title">
        <h2 id="included-title" className={site.heading}>
          What you get
        </h2>
        <ul className={styles.included}>
          {INCLUDED.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </SiteLayout>
  );
}
