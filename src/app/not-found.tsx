import type { Metadata } from "next";
import Link from "@/components/link";
import { ButtonLink } from "@registry/button/button-link";
import { SiteActions } from "@/components/site-head";
import { Wordmark } from "@/components/wordmark";
import site from "./site.module.css";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main className={styles.page}>
      {/* The content column's top: the mark at its left, the theme
          toggle at its right. */}
      <div className={styles.bar}>
        <Wordmark />
        <SiteActions inline />
      </div>
      <div className={styles.body}>
        <h1 className={site.title}>Page not found</h1>
        <p className={site.text}>Nothing lives at this address. It may have moved, or the link has a typo.</p>
        <div className={styles.actions}>
          <ButtonLink as={Link} href="/">
            Home
          </ButtonLink>
          <ButtonLink as={Link} href="/docs" variant="secondary">
            Docs
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
