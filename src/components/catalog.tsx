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
 * padding around it. The showcase mounts when the card nears the screen;
 * an `eager` card (one on the first screen) is in the page's HTML instead,
 * so it doesn't arrive empty and fill in after the script loads.
 */
function Card({ item, eager = false }: { item: CatalogItem; eager?: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(eager);
  const Showcase = SHOWCASES[item.name];

  useEffect(() => {
    const el = stage.current;
    if (!el || eager) return;
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
  }, [eager]);

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

/** Every item with a showcase, or only the first `limit` of them, on every
 *  screen size: nobody should have to press a button to see what's here.
 *  The first `eager` cards render with the page; the rest mount as they
 *  near the screen, so a long list costs nothing up front. */
export function Catalog({
  items,
  limit,
  eager = 0,
}: {
  items: CatalogItem[];
  limit?: number;
  eager?: number;
}) {
  const shown = items.filter((item) => SHOWCASES[item.name]).slice(0, limit);
  return (
    <ul className={styles.grid}>
      {shown.map((item, i) => (
        <li key={item.name}>
          <Card item={item} eager={i < eager} />
        </li>
      ))}
    </ul>
  );
}
