"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
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

/** Every item with a showcase, or only the first `limit` of them. The first
 *  `eager` cards render with the page; the rest as they near the screen.
 *  With `phoneLimit`, a phone shows that many and a button for the rest:
 *  one column of every card is a very long page. Wider screens show all. */
export function Catalog({
  items,
  limit,
  eager = 0,
  phoneLimit,
}: {
  items: CatalogItem[];
  limit?: number;
  eager?: number;
  phoneLimit?: number;
}) {
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const shown = items.filter((item) => SHOWCASES[item.name]).slice(0, limit);
  const folds = phoneLimit !== undefined && shown.length > phoneLimit && !open;

  function showAll() {
    setOpen(true);
    // The button leaves with the click: focus goes to the first card it revealed.
    requestAnimationFrame(() => list.current?.querySelectorAll<HTMLElement>(`li:nth-child(${phoneLimit! + 1}) a`)[0]?.focus());
  }

  return (
    <>
      <ul
        ref={list}
        className={styles.grid}
        data-fold={folds || undefined}
      >
        {shown.map((item, i) => (
          <li key={item.name} data-past-fold={phoneLimit !== undefined && i >= phoneLimit ? "" : undefined}>
            <Card item={item} eager={i < eager} />
          </li>
        ))}
      </ul>
      {folds && (
        <div className={styles.more}>
          <Button variant="secondary" onClick={showAll}>
            Show all {shown.length} components
          </Button>
        </div>
      )}
    </>
  );
}
