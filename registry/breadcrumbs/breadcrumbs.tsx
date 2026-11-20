"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ElementType,
  type ReactNode,
} from "react";
import { Icon } from "../icons/icons";
import styles from "./breadcrumbs.module.css";

export type Crumb = {
  label: ReactNode;
  /** Omit for a level with no page of its own. */
  href?: string;
};

type BreadcrumbsProps = Omit<ComponentProps<"nav">, "children"> & {
  items: Crumb[];
  /** Your router's link component. Defaults to <a>. */
  as?: ElementType;
  /** Longer trails fold their middle. At least 3; defaults to 4. */
  max?: number;
};

/** A trail of links to the current page. */
export function Breadcrumbs({ items, as: Link = "a", max = 4, className, "aria-label": ariaLabel = "Breadcrumb", ...props }: BreadcrumbsProps) {
  const keep = Math.max(3, Math.floor(max));
  const trail = items.map((item, i) => item.href ?? `#${i}`).join("\n");
  const [openTrail, setOpenTrail] = useState<string | null>(null);
  const folded = items.length > keep && openTrail !== trail;
  const hidden = folded ? items.length - 1 - (keep - 2) : 0;

  const listRef = useRef<HTMLOListElement>(null);
  const justOpened = useRef(false);

  // Gates the @starting-style fade so nothing fades in on mount.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const placed = useRef(new Map<string, [number, number]>());
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const animate = justOpened.current && ready && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, [number, number]>();
    const moving: [HTMLElement, number, number][] = [];
    const revealed: HTMLElement[] = [];
    // The first crumb after the fold: where it was and where it is now.
    let lead: { from: number; to: number; top: number } | null = null;
    for (const el of list.querySelectorAll<HTMLElement>(":scope > [data-key]")) {
      const at: [number, number] = [el.offsetLeft, el.offsetTop];
      const was = placed.current.get(el.dataset.key!);
      next.set(el.dataset.key!, at);
      if (!animate) continue;
      if (!was) revealed.push(el);
      else if (was[0] !== at[0] || was[1] !== at[1]) {
        const [sx = 0, sy = 0] = getComputedStyle(el).translate.split(" ").map((v) => parseFloat(v) || 0);
        moving.push([el, was[0] - at[0] + sx, was[1] - at[1] + sy]);
        if (!lead && was[1] === at[1]) lead = { from: was[0], to: at[0], top: at[1] };
      }
    }
    placed.current = next;
    // A revealed crumb on the line the rest slide along is uncovered by them:
    // clipped at the sliding crumbs' leading edge, on the same curve, so the
    // two never draw over each other. On another line (the trail wrapped), or
    // right to left, it fades in instead (the @starting-style in the CSS).
    const ltr = getComputedStyle(list).direction !== "rtl";
    const wiped: [HTMLElement, number][] = [];
    if (lead && ltr) {
      for (const el of revealed) {
        if (el.offsetTop !== lead.top) continue;
        const end = el.offsetLeft + el.offsetWidth;
        wiped.push([el, end]);
        el.style.transition = "none";
        el.style.clipPath = `inset(-8px ${end - lead.from}px -8px -8px)`;
      }
    }
    if (moving.length) {
      for (const [el, dx, dy] of moving) {
        el.style.transition = "none";
        el.style.translate = `${dx}px ${dy}px`;
      }
      // Force layout so the start position applies before the transition.
      void list.offsetWidth;
      for (const [el] of moving) {
        el.style.transition = "";
        el.style.translate = "";
      }
      for (const [el, end] of wiped) {
        el.style.transition = "";
        // Past its own edge by the end: nothing is clipped once it lands.
        el.style.clipPath = `inset(-8px ${end - lead!.to}px -8px -8px)`;
        const clear = (event: TransitionEvent) => {
          if (event.target !== el || event.propertyName !== "clip-path") return;
          el.style.clipPath = "";
          el.removeEventListener("transitionend", clear);
          el.removeEventListener("transitioncancel", clear);
        };
        el.addEventListener("transitionend", clear);
        el.addEventListener("transitioncancel", clear);
      }
    }

    // The "…" button is gone, so move focus to the first revealed link.
    if (justOpened.current) {
      justOpened.current = false;
      list.querySelector<HTMLElement>(":scope > :not([data-key='0']) :is([data-link], a[href])")?.focus();
    }
  });

  function open() {
    justOpened.current = true;
    setOpenTrail(trail);
  }

  const last = items.length - 1;

  function crumb(item: Crumb, index: number) {
    return (
      <li key={index} data-key={index} className={styles.item}>
        {index === last ? (
          <span className={styles.crumb} aria-current="page">
            <Label>{item.label}</Label>
          </span>
        ) : item.href !== undefined ? (
          <Link href={item.href} className={styles.crumb} data-link="">
            <Label>{item.label}</Label>
          </Link>
        ) : (
          <span className={styles.crumb}>
            <Label>{item.label}</Label>
          </span>
        )}
        {index !== last && <Icon name="chevron-right" className={styles.separator} />}
      </li>
    );
  }

  return (
    <nav aria-label={ariaLabel} className={className ? `${styles.root} ${className}` : styles.root} data-ready={ready || undefined} {...props}>
      <ol ref={listRef} className={styles.list}>
        {/* One flat list either way, so the crumbs after the fold are the same
            elements once it opens: they slide, and only the revealed ones fade in. */}
        {folded
          ? [
              crumb(items[0], 0),
              <li key="more" className={styles.item}>
                <button type="button" className={styles.more} aria-label={`Show ${hidden} more levels`} onClick={open}>
                  <span aria-hidden="true">…</span>
                </button>
                <Icon name="chevron-right" className={styles.separator} />
              </li>,
              ...items.slice(hidden + 1).map((item, i) => crumb(item, hidden + 1 + i)),
            ]
          : items.map(crumb)}
      </ol>
    </nav>
  );
}

/* A label past its max width fades at its end; data-cut turns the fade on
   only when the text is actually cut, and the title gives the full label. */
function Label({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const cut = el.scrollWidth > el.clientWidth + 1;
      el.toggleAttribute("data-cut", cut);
      if (cut) el.title = el.textContent ?? "";
      else el.removeAttribute("title");
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);
  return (
    <span ref={ref} className={styles.label}>
      {children}
    </span>
  );
}
