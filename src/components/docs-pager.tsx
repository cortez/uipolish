"use client";

import Link from "@/components/link";
import { usePathname } from "next/navigation";
import styles from "./docs-pager.module.css";

type Page = { href: string; title: string };

/** The pages either side of this one, in sidebar order, so the docs read
 *  front to back. Nothing on a page outside the list. */
export function DocsPager({ pages }: { pages: Page[] }) {
  const path = usePathname();
  const i = pages.findIndex((p) => p.href === path);
  if (i === -1) return null;
  const prev = pages[i - 1];
  const next = pages[i + 1];
  return (
    <nav className={styles.pager} aria-label="Previous and next page">
      {prev && (
        <Link href={prev.href} rel="prev" className={styles.link}>
          <span className={styles.dir}>Previous</span>
          {prev.title}
        </Link>
      )}
      {next && (
        <Link href={next.href} rel="next" className={styles.link} data-next="">
          <span className={styles.dir}>Next</span>
          {next.title}
        </Link>
      )}
    </nav>
  );
}
