"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "@/components/link";
import { LivePreview } from "@/components/live-preview";
import styles from "./catalog.module.css";

export type CatalogItem = {
  name: string;
  title: string;
  summary: string;
  /** A whole screen or app: drawn at app width, then scaled down to fit. */
  screen?: boolean;
};

/** The smallest a component's demo is drawn. Past this it would be too small
 *  to read, so it shows its top at this size instead. */
const MIN_SCALE = 0.6;

/** How long a demo may still be settling after it mounts, in ms. */
const SETTLE = 1000;

/** The width a screen is drawn at; keep in step with .screen in the CSS. */
const SCREEN_WIDTH = 1040;

/**
 * Draws its content at its own size, then scales it down (never up) to fit
 * the box: whole and centered when it fits at a readable size, otherwise
 * from the top at that size. A screen fills the box's width from the top,
 * like a screenshot. The content is positioned on its own, so it can never
 * stretch the card. The scale only shrinks, so a demo that grows and
 * shrinks as it plays doesn't make the card pulse.
 */
function Fit({ screen, children }: { screen?: boolean; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; whole: boolean }>({ scale: 1, whole: true });

  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    // A demo can measure oddly for a moment as it mounts (before its
    // styles arrive), so the first second takes the latest measurement;
    // after that the scale only shrinks.
    const settled = performance.now() + SETTLE;
    const measure = () => {
      const w = content.offsetWidth;
      const h = content.offsetHeight;
      if (!w || !h || !box.clientWidth) return;
      // A screen has a fixed width: fit that, from the top.
      if (screen) return setFit({ scale: Math.min(1, box.clientWidth / SCREEN_WIDTH), whole: false });
      const byWidth = box.clientWidth / w;
      const whole = Math.min(1, byWidth, box.clientHeight / h);
      const next = whole >= MIN_SCALE ? { scale: whole, whole: true } : { scale: Math.min(1, byWidth, MIN_SCALE), whole: false };
      setFit((f) => (performance.now() < settled || next.scale < f.scale ? next : f));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(content);
    return () => ro.disconnect();
  }, [screen]);

  return (
    <div ref={outer} className={styles.fit}>
      <div
        ref={inner}
        className={screen ? `${styles.content} ${styles.screen}` : styles.content}
        data-whole={fit.whole || undefined}
        style={{ scale: String(fit.scale) }}
      >
        {children}
      </div>
    </div>
  );
}

/** One card: the demo, whole, then its name and one line. The demo mounts
 *  when the card nears the screen and then stays. */
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

  return (
    <article className={styles.card}>
      <div ref={stage} className={styles.stage} inert={item.screen} aria-hidden={item.screen || undefined}>
        {near && (
          <Fit screen={item.screen}>
            <LivePreview name={item.name} />
          </Fit>
        )}
      </div>
      <div className={styles.meta}>
        <h3 className={styles.title}>
          <Link href={`/docs/${item.name}`} className={styles.link}>
            {item.title}
          </Link>
        </h3>
        <p className={styles.summary}>{item.summary}</p>
      </div>
    </article>
  );
}

export function Catalog({ items }: { items: CatalogItem[] }) {
  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <li key={item.name} className={styles.item}>
          <Card item={item} />
        </li>
      ))}
    </ul>
  );
}
