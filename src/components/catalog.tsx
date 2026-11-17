"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/link";
import { BLEED, SHOWCASES } from "@/showcase";
import styles from "./catalog.module.css";

export type CatalogItem = {
  name: string;
  title: string;
};

/**
 * One card: the component itself, live and interactive (its showcase, not
 * its docs demo), then its name, the one link to its docs page. A component
 * that is already a box (a code block, a table) is the card: no edge or
 * padding around it. The showcase mounts when the card nears the screen.
 */
function Card({ item }: { item: CatalogItem }) {
  const stage = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const Showcase = SHOWCASES[item.name];

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className={styles.item}>
      <div ref={stage} className={styles.card} data-bleed={BLEED.has(item.name) || undefined}>
        {near && Showcase && (
          <div className={styles.demo}>
            <Showcase />
          </div>
        )}
      </div>
      <Link href={`/docs/${item.name}`} className={styles.name}>
        {item.title}
      </Link>
    </div>
  );
}

/** Every item with a showcase, or only the first `limit` of them. */
export function Catalog({ items, limit }: { items: CatalogItem[]; limit?: number }) {
  return (
    <ul className={styles.grid}>
      {items
        .filter((item) => SHOWCASES[item.name])
        .slice(0, limit)
        .map((item) => (
          <li key={item.name}>
            <Card item={item} />
          </li>
        ))}
    </ul>
  );
}
