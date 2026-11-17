"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/link";
import { LivePreview } from "@/components/live-preview";
import styles from "./catalog.module.css";

export type CatalogItem = {
  name: string;
  title: string;
  summary: string;
  /** "Screen" or "Template": a word beside the name. */
  tag?: string;
  /** A whole screen: two columns wide, and still (a picture of the app). */
  screen?: boolean;
};

/**
 * One card per component: its live demo on top, its name and what it is
 * under it. A demo loads when its card comes near the screen and then stays,
 * so scrolling back never reloads it. The demo's box has a fixed height,
 * so nothing on the page moves when it arrives.
 */
function Card({ item }: { item: CatalogItem }) {
  const stage = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

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
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <article className={styles.card}>
      <div ref={stage} className={styles.stage}>
        {near && (
          <div
            className={item.screen ? `${styles.frame} ${styles.screen}` : styles.frame}
            inert={item.screen}
            aria-hidden={item.screen || undefined}
          >
            <LivePreview name={item.name} />
          </div>
        )}
      </div>
      <div className={styles.meta}>
        <div className={styles.head}>
          <h3 className={styles.title}>
            <Link href={`/docs/${item.name}`} className={styles.link}>
              {item.title}
            </Link>
          </h3>
          {item.tag && <span className={styles.tag}>{item.tag}</span>}
        </div>
        <p className={styles.summary}>{item.summary}</p>
      </div>
    </article>
  );
}

/** Every component, block and template in one grid, like a shop window. */
export function Catalog({ items }: { items: CatalogItem[] }) {
  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <li key={item.name} className={item.screen ? `${styles.item} ${styles.wide}` : styles.item}>
          <Card item={item} />
        </li>
      ))}
    </ul>
  );
}
