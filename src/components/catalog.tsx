"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "@/components/link";
import { LivePreview } from "@/components/live-preview";
import styles from "./catalog.module.css";

export type CatalogItem = {
  name: string;
  title: string;
};

/** How long a demo may still be settling after it mounts, in ms: its code
 *  loads on demand, so its full width can arrive a moment later. */
const SETTLE = 1500;

/**
 * A bento: a card spans more columns only when its demo needs the room.
 * Text wraps, so most demos fit one column; a demo with something that
 * can't wrap (a table, a line of code, a row of controls) overflows it,
 * and its card takes one more column at a time until nothing overflows,
 * up to the columns the grid has. Checked as the demo settles (its code
 * loads on demand) and when the window resizes. Dense packing fills the
 * gaps with smaller cards.
 */
function useSpan(stage: React.RefObject<HTMLDivElement | null>, mounted: boolean) {
  useLayoutEffect(() => {
    const card = stage.current;
    const item = card?.closest("li");
    const grid = item?.parentElement;
    if (!mounted || !card || !item || !grid) return;
    const until = performance.now() + SETTLE;
    const overflows = () => {
      const demo = card.querySelector<HTMLElement>(":scope > *");
      return !!demo && demo.scrollWidth > demo.clientWidth + 1;
    };
    const measure = () => {
      const cols = Number(getComputedStyle(grid).getPropertyValue("--cols")) || 1;
      let span = 1;
      item.style.gridColumn = "";
      while (span < cols && overflows()) {
        span += 1;
        item.style.gridColumn = `span ${span}`;
      }
    };
    measure();
    const ro = new ResizeObserver(() => performance.now() < until && measure());
    const content = card.querySelector(":scope > * > *");
    if (content) ro.observe(content);
    const done = setTimeout(() => ro.disconnect(), SETTLE);
    addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      clearTimeout(done);
      removeEventListener("resize", measure);
    };
  }, [stage, mounted]);
}

/** One demo at its real size, never scaled, with its name under the card.
 *  The demo mounts when the card nears the screen and then stays. */
function Card({ item }: { item: CatalogItem }) {
  const stage = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useSpan(stage, near);

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

export function Catalog({ items }: { items: CatalogItem[] }) {
  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <li key={item.name}>
          <Card item={item} />
        </li>
      ))}
    </ul>
  );
}
