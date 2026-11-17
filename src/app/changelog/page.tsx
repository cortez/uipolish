import type { Metadata } from "next";
import Link from "@/components/link";
import DocsLayout from "@/app/docs/layout";
import { CHANGELOG } from "@/lib/changelog";
import { formatDate, pageMetadata } from "@/lib/seo/site";
import site from "../site.module.css";
import styles from "./changelog.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Changelog",
  description: "What's new in UI Polish: components, blocks and rules, newest first.",
  path: "/changelog",
});


export default function Page() {
  return (
    <DocsLayout>
        <header className={site.intro}>
          <h1 className={site.title}>Changelog</h1>
          <p className={site.text}>New components, blocks and rules, newest first.</p>
        </header>
        <ol className={styles.entries}>
          {CHANGELOG.map((entry) => (
            <li key={entry.date} className={styles.entry}>
              <time className={styles.date} dateTime={entry.date}>
                {formatDate(entry.date)}
              </time>
              <div className={styles.body}>
                <h2 className={site.heading}>{entry.title}</h2>
                <ul className={styles.items}>
                  {entry.items.map((item) => (
                    <li key={item.text}>
                      {item.href && item.link && item.text.startsWith(item.link) ? (
                        <>
                          <Link href={item.href}>{item.link}</Link>
                          {item.text.slice(item.link.length)}
                        </>
                      ) : (
                        item.text
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
    </DocsLayout>
  );
}
