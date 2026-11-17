"use client";

import { useEffect, useState, type RefObject } from "react";
import { NavRailTooltipGroup, NavRailTrigger } from "@/components/ui/nav-rail/nav-rail";
import { titleFrom } from "@/lib/coding/format";
import styles from "./session.module.css";

/* A rail on the thread's edge with a tick for each prompt, placed where
   the prompt sits in the whole conversation. The tick for the part you're
   reading is in the text color; the rest are the edge's gray. Pressing a
   tick scrolls to its prompt; one tooltip names them, gliding between
   ticks like a nav rail's. Hidden when everything fits. */

type Mark = { id: string; label: string };

type ScrollTicksProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
  marks: Mark[];
  onJump: (id: string) => void;
};

export function ScrollTicks({ scrollRef, marks, onJump }: ScrollTicksProps) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState<{ tops: Record<string, number>; current: string | null; scrolls: boolean }>({
    tops: {},
    current: null,
    scrolls: false,
  });
  const key = marks.map((m) => m.id).join(" ");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const total = el.scrollHeight;
        const tops: Record<string, number> = {};
        let current: string | null = null;
        // The prompt that owns the top third of the view is the one being read.
        const reading = el.scrollTop + el.clientHeight / 3;
        for (const turn of el.querySelectorAll<HTMLElement>("[data-turn]")) {
          const id = turn.dataset.turn!;
          tops[id] = total > 0 ? turn.offsetTop / total : 0;
          if (turn.offsetTop <= reading) current = id;
        }
        setLayout({ tops, current: current ?? marks[0]?.id ?? null, scrolls: el.scrollHeight > el.clientHeight + 1 });
      });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
    // `key` re-measures when prompts come and go.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollRef, key]);

  if (marks.length < 2 || !layout.scrolls) return null;

  return (
    <nav ref={setRoot} className={styles.ticks} aria-label="Prompts in this session">
      <NavRailTooltipGroup root={root}>
        {marks.map((mark, i) => {
          const label = titleFrom(mark.label);
          return (
            <NavRailTrigger key={mark.id} label={label}>
              <button
                type="button"
                className={styles.tick}
                style={{ top: `${(layout.tops[mark.id] ?? i / marks.length) * 100}%` }}
                aria-label={`Prompt ${i + 1}: ${label}`}
                aria-current={layout.current === mark.id ? "location" : undefined}
                onClick={() => onJump(mark.id)}
              />
            </NavRailTrigger>
          );
        })}
      </NavRailTooltipGroup>
    </nav>
  );
}
