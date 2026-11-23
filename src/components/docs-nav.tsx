"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/link";
import styles from "./docs-nav.module.css";

/** Every component, A to Z, beside a component's page on a wide screen:
 *  the current one in the text color, the rest muted. It stays in view as
 *  the page scrolls, and scrolls itself so the current one is in sight. */
export function DocsNav({ components }: { components: { name: string; title: string }[] }) {
  const path = usePathname();
  const list = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = list.current;
    const current = nav?.querySelector<HTMLElement>("[aria-current='page']");
    if (!nav || !current) return;
    const top = current.offsetTop - nav.offsetTop;
    // Only when it's out of sight, and without moving the page itself.
    if (top < nav.scrollTop || top + current.offsetHeight > nav.scrollTop + nav.clientHeight) {
      nav.scrollTop = top - nav.clientHeight / 3;
    }
  }, [path]);

  return (
    <nav ref={list} className={styles.nav} aria-label="Components">
      <p className={styles.label}>Components</p>
      <ul className={styles.list}>
        {components.map((c) => {
          const href = `/docs/${c.name}`;
          return (
            <li key={c.name}>
              <Link href={href} className={styles.link} aria-current={path === href ? "page" : undefined}>
                {c.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
