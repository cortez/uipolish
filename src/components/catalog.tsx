"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/link";
import { LivePreview } from "@/components/live-preview";
import styles from "./catalog.module.css";

export type CatalogItem = {
  name: string;
  title: string;
};

/** One demo at its real size, never scaled, with its name under the card.
 *  The demo mounts when the card nears the screen and then stays. */
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
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The whole card is the link to its docs page. Its demo plays but takes
  // no clicks or focus here (a control inside a link isn't valid), so a
  // click anywhere on the card goes to the page where you can try it.
  return (
    <Link href={`/docs/${item.name}`} className={styles.item}>
      <div ref={stage} className={styles.card} inert aria-hidden="true">
        {near && (
          <div className={styles.demo}>
            <LivePreview name={item.name} />
          </div>
        )}
      </div>
      <span className={styles.name}>{item.title}</span>
    </Link>
  );
}

export function Catalog({ items, screens = false }: { items: CatalogItem[]; screens?: boolean }) {
  return (
    <ul className={screens ? `${styles.grid} ${styles.screens}` : styles.grid}>
      {items.map((item) => (
        <li key={item.name}>
          <Card item={item} />
        </li>
      ))}
    </ul>
  );
}
