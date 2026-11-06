"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Button } from "../button/button";
import { ButtonLink } from "../button/button-link";
import { Icon } from "../icons/icons";
import styles from "./pagination.module.css";

type PaginationProps = Omit<ComponentProps<"nav">, "children"> & {
  /** The current page, counted from 1. */
  page: number;
  /** How many pages there are. Optional when `total` and `pageSize` are given. */
  pageCount?: number;
  /** Rows across every page. */
  total?: number;
  /** Rows on a full page. */
  pageSize?: number;
  /** Called with the page to go to; with `href`, before the link navigates. */
  onPageChange?: (page: number) => void;
  /** Makes every control a link: a function of the page, or a string with `{page}` in it. */
  href?: string | ((page: number) => string);
  /** Your router's link component, used with `href`. Defaults to a plain <a>. */
  as?: ElementType;
  /** `pages` (default) shows page numbers; `compact` shows "1–100 of 5,000". */
  variant?: "pages" | "compact";
  /** Locale for the numbers in the compact range. Defaults to the browser's. */
  locale?: string;
};

type Slot = number | "gap-start" | "gap-end";

/** Always `slots` entries once there are more pages, so the width holds. A gap stands for at least two pages. */
function pageSlots(page: number, count: number, slots: number): Slot[] {
  if (count <= slots) return Array.from({ length: count }, (_, i) => i + 1);
  const siblings = (slots - 5) / 2;
  const run = (from: number, length: number) => Array.from({ length }, (_, i) => from + i);
  if (page <= siblings + 3) return [...run(1, slots - 2), "gap-end", count];
  if (page >= count - siblings - 2) return [1, "gap-start", ...run(count - slots + 3, slots - 2)];
  return [1, "gap-start", ...run(page - siblings, siblings * 2 + 1), "gap-end", count];
}

/** Seven slots where they fit, five where they don't, and below that "Page 3 of 20". */
type Fit = 7 | 5 | 0;

const keyOf = (slot: Slot) => String(slot);

/** Previous, page numbers and next, in a row that keeps its width on every page. */
export function Pagination({
  page: requestedPage,
  pageCount,
  total,
  pageSize,
  onPageChange,
  href,
  as,
  variant = "pages",
  locale,
  className,
  style,
  "aria-label": ariaLabel = "Pagination",
  ...props
}: PaginationProps) {
  const count = Math.max(
    1,
    pageCount ?? (total !== undefined && pageSize ? Math.ceil(total / pageSize) : 1),
  );
  const page = Math.min(Math.max(1, Math.round(requestedPage)), count);
  const compact = variant === "compact";

  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [fit, setFit] = useState<Fit>(7);
  const slots = compact || fit === 0 ? [] : pageSlots(page, count, fit);
  const current = slots.indexOf(page);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // The nav is capped at its row, so its own width is the room there is.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (compact || !root) return;
    const measure = () => {
      const style = getComputedStyle(root);
      const slot = parseFloat(style.getPropertyValue("--pagination-slot")) || 32;
      const arrow = parseFloat(style.getPropertyValue("--pagination-arrow")) || 44;
      const gap = parseFloat(style.getPropertyValue("--pagination-gap")) || 0;
      const room = root.getBoundingClientRect().width + 0.5;
      const needs = (n: number) => {
        const shown = Math.min(n, count);
        return 2 * arrow + shown * slot + (shown + 1) * gap;
      };
      setFit(needs(7) <= room ? 7 : needs(5) <= room ? 5 : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [compact, count]);

  // FLIP from the old slot. A change of fit isn't a move: it lands at once.
  const placed = useRef(new Map<string, number>());
  const lastFit = useRef(fit);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;
    const refit = lastFit.current !== fit;
    lastFit.current = fit;
    const animate = ready && !refit && !matchMedia("(prefers-reduced-motion: reduce)").matches;

    const next = new Map<string, number>();
    const moving: [HTMLElement, number][] = [];
    for (const el of list.querySelectorAll<HTMLElement>("[data-key]")) {
      const x = el.offsetLeft;
      const was = placed.current.get(el.dataset.key!);
      next.set(el.dataset.key!, x);
      if (animate && was !== undefined && was !== x) {
        const shown = parseFloat(getComputedStyle(el).translate) || 0;
        moving.push([el, was - x + shown]);
      }
    }
    placed.current = next;

    if (moving.length) {
      for (const [el, dx] of moving) {
        el.style.transition = "none";
        el.style.translate = `${dx}px 0`;
      }
      // Lay out the starting point before letting the transition run.
      void list.offsetWidth;
      for (const [el] of moving) {
        el.style.transition = "";
        el.style.translate = "";
      }
    }

    if (refit) {
      root.dataset.instant = "";
      // Style the new place now, so re-enabling transitions next frame animates nothing.
      void root.offsetWidth;
      const frame = requestAnimationFrame(() => delete root.dataset.instant);
      return () => cancelAnimationFrame(frame);
    }
  });

  const numbers = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const target = (p: number) => (typeof href === "function" ? href(p) : href!.replaceAll("{page}", String(p)));

  function control(p: number, label: string, children: ReactNode, state: { current?: boolean; disabled?: boolean; arrow?: boolean } = {}) {
    const inert = state.current || state.disabled;
    const common = {
      variant: "ghost" as const,
      size: "sm" as const,
      className: styles.control,
      "aria-label": label,
      "aria-current": state.current ? ("page" as const) : undefined,
      // Still focusable at the ends, so focus stays on Next instead of dropping to the page.
      "aria-disabled": state.disabled || undefined,
      // Previous and next are capsules; page numbers are squares.
      "data-arrow": state.arrow || undefined,
    };

    if (href !== undefined) {
      const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (state.disabled) {
          event.preventDefault();
          return;
        }
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (state.current) {
          event.preventDefault();
          return;
        }
        onPageChange?.(p);
      };
      // A control that's off still links to this page, so it keeps its href and focus.
      return (
        <ButtonLink as={as} href={target(state.disabled ? page : p)} onClick={onClick} {...common}>
          {children}
        </ButtonLink>
      );
    }

    return (
      <Button onClick={() => !inert && onPageChange?.(p)} {...common}>
        {children}
      </Button>
    );
  }

  const previous = control(page - 1, "Previous page", <Icon name="chevron-left" />, { disabled: page <= 1, arrow: true });
  const nextPage = control(page + 1, "Next page", <Icon name="chevron-right" />, { disabled: page >= count, arrow: true });

  if (compact) {
    const size = pageSize ?? 0;
    const rows = total ?? 0;
    const from = rows === 0 ? 0 : (page - 1) * size + 1;
    const to = Math.min(page * size, rows);
    const widestFrom = rows === 0 ? 0 : (count - 1) * size + 1;
    const known = total !== undefined && pageSize !== undefined;
    const range = (a: number, b: number, widest = false) =>
      known ? (
        <>
          <span className={styles.range}>
            {a === b && !widest ? numbers.format(a) : `${numbers.format(a)}–${numbers.format(b)}`}
          </span>{" "}
          of {numbers.format(rows)}
        </>
      ) : (
        <>
          Page <span className={styles.range}>{numbers.format(a)}</span> of {numbers.format(count)}
        </>
      );

    return (
      <nav
        ref={rootRef}
        aria-label={ariaLabel}
        className={className ? `${styles.root} ${className}` : styles.root}
        data-variant="compact"
        style={style}
        {...props}
      >
        {/* The widest range holds the cell open, so the buttons never move. */}
        <p className={styles.summary} aria-live="polite" aria-atomic="true">
          <span className={styles.sizer} aria-hidden="true">
            {known ? range(widestFrom, rows, true) : range(count, count)}
          </span>
          <span className={styles.text}>{known ? range(from, to) : range(page, count)}</span>
        </p>
        <ul ref={listRef} className={styles.list}>
          <li className={styles.item}>{previous}</li>
          <li className={styles.item}>{nextPage}</li>
        </ul>
      </nav>
    );
  }

  const status = `Page ${page} of ${count}`;
  return (
    <nav
      ref={rootRef}
      aria-label={ariaLabel}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-variant="pages"
      data-fit={fit === 0 ? "text" : fit}
      data-ready={ready || undefined}
      style={
        {
          ...style,
          "--pagination-digits": String(count).length,
          "--pagination-slots": Math.min(7, count),
          "--pagination-index": current,
        } as CSSProperties
      }
      {...props}
    >
      <div className={styles.track}>
        {current >= 0 && <span className={styles.indicator} aria-hidden="true" />}
        <ul ref={listRef} className={styles.list}>
          <li className={styles.item}>{previous}</li>
          {slots.map((slot) => (
            <li key={keyOf(slot)} data-key={keyOf(slot)} className={styles.item} aria-hidden={typeof slot === "number" ? undefined : true}>
              {typeof slot === "number" ? (
                control(slot, `Page ${slot}`, slot, { current: slot === page })
              ) : (
                <span className={styles.gap}>…</span>
              )}
            </li>
          ))}
          {fit === 0 && (
            <li className={styles.item} aria-hidden="true">
              <span className={styles.summary}>
                <span className={styles.sizer}>{`Page ${count} of ${count}`}</span>
                <span className={styles.text}>{status}</span>
              </span>
            </li>
          )}
          <li className={styles.item}>{nextPage}</li>
        </ul>
      </div>
      {/* Announces the page: focus stays on the pressed control, which doesn't say it. */}
      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {status}
      </p>
    </nav>
  );
}
