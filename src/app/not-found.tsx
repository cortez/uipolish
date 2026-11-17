import type { Metadata } from "next";
import Link from "@/components/link";
import { ButtonLink } from "@registry/button/button-link";
import { SiteLayout } from "@/components/site-layout";
import site from "./site.module.css";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <SiteLayout>
      <header className={site.intro}>
        <h1 className={site.title}>Page not found</h1>
        <p className={site.text}>Nothing lives at this address. It may have moved, or the link has a typo.</p>
        <div className={site.actions}>
          <ButtonLink as={Link} href="/">
            Home
          </ButtonLink>
          <ButtonLink as={Link} href="/docs" variant="secondary">
            Docs
          </ButtonLink>
        </div>
      </header>
    </SiteLayout>
  );
}
