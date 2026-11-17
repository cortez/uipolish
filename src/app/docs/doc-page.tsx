import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CopyPage } from "@/components/copy-page";
import { JsonLd, docsLd } from "@/lib/seo/json-ld";
import { CONTENT_UPDATED, pageMetadata } from "@/lib/seo/site";
import site from "../site.module.css";

type Doc = { path: string; title: string; heading: string; description: string };

export const docMetadata = (doc: Doc): Metadata =>
  pageMetadata({ title: doc.title, description: doc.description, path: doc.path });

/** A plain docs page: title, lede, then its sections. */
export function DocPage({ doc, lede, children }: { doc: Doc; lede: ReactNode; children: ReactNode }) {
  const trail: [string, string][] = [["UI Polish", "/"], ["Docs", "/docs"]];
  if (doc.path !== "/docs") trail.push([doc.heading, doc.path]);
  return (
    <>
      <JsonLd
        nodes={docsLd({ path: doc.path, headline: doc.title, description: doc.description, dateModified: CONTENT_UPDATED, trail })}
      />
      <header className={site.intro}>
        <h1 className={site.title}>{doc.heading}</h1>
        <p className={site.text}>{lede}</p>
        <div className={site.actions}>
          <CopyPage />
        </div>
      </header>
      {children}
    </>
  );
}
