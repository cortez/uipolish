"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import styles from "./split-view.module.css";

/** Pixels as a number (`320`), or a share of the view as a string (`"40%"`). */
export type SplitSize = number | `${number}%`;

export type SplitPaneProps = {
  /** Stable key: what sizes are stored under, and what the narrow switch selects. */
  id: string;
  /** Names the pane: the divider's label ("Resize Chat") and the narrow switch's option. */
  label: string;
  children?: ReactNode;
  /** Where it starts. Panes without one share what's left. */
  defaultSize?: SplitSize;
  /** Default 120px. Dragging never takes it narrower, except to collapse it. */
  minSize?: SplitSize;
  maxSize?: SplitSize;
  /** Dragged under half its `minSize`, it snaps closed; Enter on the divider does the same. */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Controlled collapse, for a "Hide preview" button of your own. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
};

/** One pane of a split view. Only meaningful as a direct child of `SplitView`. */
export function SplitPane(props: SplitPaneProps) {
  void props;
  return null;
}

type SplitViewProps = {
  children: ReactNode;
  /** `horizontal` (default): panes side by side. `vertical`: one above another. */
  orientation?: "horizontal" | "vertical";
  /** Keeps sizes in localStorage under this key, so the layout comes back as it was left. */
  storageKey?: string;
  /** Each pane's share of the view, in percent, as it changes (every frame of a drag). */
  onResize?: (sizes: number[]) => void;
  /** Under 560px wide, a horizontal split shows one pane at a time: with a
   *  switch above (`switch`, default), or as a stack you move through
   *  yourself (`stack`: a list, then the item you picked, with your own Back
   *  setting `narrowPane`). Or it stays side by side (`split`). */
  narrow?: "switch" | "stack" | "split";
  /** The pane shown when narrow, by `id`: control it to open a detail when a row is picked. Default: the first. */
  narrowPane?: string;
  onNarrowPaneChange?: (id: string) => void;
  /** Fires when the view starts or stops showing one pane at a time, so a
   *  stack can show its Back button only then. */
  onNarrowChange?: (narrow: boolean) => void;
  className?: string;
};

type Pane = Omit<SplitPaneProps, "children"> & { children?: ReactNode };
type Layout = { sizes: number[]; last: number[] };
type Drag = { index: number; start: number; from: number[]; space: number; pointer: number; collapsed: boolean[] };
type Motion = { kind: "snap" | "glide"; moving: number[]; n: number } | null;

const DEFAULT_MIN = 120;
const KEY_STEP = 16;
const KEY_STEP_LARGE = 64;
/** Container width under which a horizontal split shows one pane. Keep in sync with the CSS. */
const NARROW = 560;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const near = (a: number, b: number) => Math.abs(a - b) < 0.01;

/** A size in percent of `space` px. */
function percent(size: SplitSize | undefined, space: number, fallback: number) {
  if (size === undefined) return fallback;
  if (typeof size === "number") return space > 0 ? (size / space) * 100 : fallback;
  const n = parseFloat(size);
  return Number.isFinite(n) ? n : fallback;
}

/** A size in px of `space` px. */
function pixels(size: SplitSize | undefined, space: number, fallback: number) {
  if (size === undefined) return fallback;
  return typeof size === "number" ? size : (parseFloat(size) / 100) * space;
}

function bounds(pane: Pane, space: number) {
  const min = percent(pane.minSize ?? DEFAULT_MIN, space, 0);
  const max = percent(pane.maxSize, space, 100);
  return { min: Math.min(min, 100), max: Math.max(max, min) };
}

/**
 * Sizes that add up to 100 and keep each open pane inside its bounds. What
 * one pane can't take or give goes to the others, last pane first (the
 * one that's usually the flexible content).
 */
function fit(sizes: number[], panes: Pane[], space: number) {
  const out = sizes.map((s, i) => (s <= 0 ? 0 : clamp(s, bounds(panes[i], space).min, bounds(panes[i], space).max)));
  for (let pass = 0; pass < 2; pass++) {
    let rest = 100 - out.reduce((a, b) => a + b, 0);
    for (let i = out.length - 1; i >= 0 && Math.abs(rest) > 0.001; i--) {
      if (out[i] <= 0) continue;
      const { min, max } = bounds(panes[i], space);
      // On the second pass bounds give way: a view too small for every
      // minimum still fills, rather than leaving a gap.
      const lo = pass ? 0 : min;
      const hi = pass ? 100 : max;
      const next = clamp(out[i] + rest, lo, hi);
      rest -= next - out[i];
      out[i] = next;
    }
  }
  // Everything collapsed: the last pane takes the room.
  if (out.every((s) => s <= 0) && out.length) out[out.length - 1] = 100;
  return out;
}

/** The starting layout: given sizes, then the rest shared by those without one. */
function initial(panes: Pane[], space: number): Layout {
  const given = panes.map((p) => (p.defaultSize === undefined ? null : percent(p.defaultSize, space, 0)));
  const free = given.filter((g) => g === null).length;
  const left = Math.max(0, 100 - given.reduce<number>((a, g) => a + (g ?? 0), 0));
  const open = given.map((g) => g ?? (free ? left / free : 0));
  const sizes = panes.map((p, i) => ((p.collapsed ?? p.defaultCollapsed) && p.collapsible ? 0 : open[i]));
  return { sizes: fit(sizes, panes, space), last: open };
}

/** Before the view is measured: the defaults as CSS, so the server renders the right layout. */
function cssTemplate(panes: Pane[]) {
  return panes
    .map((p) => {
      if ((p.collapsed ?? p.defaultCollapsed) && p.collapsible) return "0px";
      if (p.defaultSize === undefined) return "minmax(0, 1fr)";
      return typeof p.defaultSize === "number" ? `${p.defaultSize}px` : p.defaultSize;
    })
    .join(" 0px ");
}

function readStore(key: string | undefined, count: number): Layout | null {
  if (!key) return null;
  try {
    const raw = JSON.parse(window.localStorage.getItem(`split-view:${key}`) ?? "null");
    if (Array.isArray(raw?.sizes) && raw.sizes.length === count && Array.isArray(raw.last) && raw.last.length === count) {
      if ([...raw.sizes, ...raw.last].every((n: unknown) => typeof n === "number" && Number.isFinite(n))) return raw;
    }
  } catch {
    // Storage can be off or full; the defaults stand.
  }
  return null;
}

function writeStore(key: string | undefined, layout: Layout) {
  if (!key) return;
  try {
    window.localStorage.setItem(`split-view:${key}`, JSON.stringify(layout));
  } catch {
    // Not saved; the layout still works for this visit.
  }
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Panes side by side (or stacked) with dividers you drag, step with the keyboard, or double-click to reset. */
export function SplitView({
  children,
  orientation = "horizontal",
  storageKey,
  onResize,
  narrow = "switch",
  narrowPane,
  onNarrowPaneChange,
  onNarrowChange,
  className,
}: SplitViewProps) {
  const panes: Pane[] = Children.toArray(children)
    .filter((c): c is ReactElement<SplitPaneProps> => isValidElement(c) && c.type === SplitPane)
    .map((c) => c.props);
  const count = panes.length;
  const horizontal = orientation === "horizontal";

  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState(0);
  const [width, setWidth] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [motion, setMotion] = useState<Motion>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [shown, setShown] = useState(panes[0]?.id ?? "");
  const drag = useRef<Drag | null>(null);
  const frame = useRef(0);
  const latest = useRef<Layout | null>(null);
  const report = useRef(onResize);
  useLayoutEffect(() => {
    report.current = onResize;
    latest.current = layout;
  });

  const isNarrow = horizontal && narrow !== "split" && width > 0 && width < NARROW;
  const reportNarrow = useRef(onNarrowChange);
  useEffect(() => {
    reportNarrow.current = onNarrowChange;
  });
  const measured = width > 0;
  useEffect(() => {
    if (measured) reportNarrow.current?.(isNarrow);
  }, [isNarrow, measured]);

  // Measure before paint: the defaults (or what was stored) become
  // percentages, and stay in step with the view's size from then on.
  useLayoutEffect(() => {
    const el = frameRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const measure = () => {
      setSpace(horizontal ? el.clientWidth : el.clientHeight);
      setWidth(root.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(root);
    return () => observer.disconnect();
  }, [horizontal]);

  // The first measure sets the layout; later ones refit it, so a pane's
  // pixel minimum holds as the window narrows.
  const [fitted, setFitted] = useState<{ space: number; count: number } | null>(null);
  if (space > 0 && (fitted?.space !== space || fitted.count !== count)) {
    setFitted({ space, count });
    const base = layout && layout.sizes.length === count ? layout : (readStore(storageKey, count) ?? initial(panes, space));
    let next: Layout = { sizes: fit(base.sizes, panes, space), last: base.last };
    // A controlled `collapsed` wins over what was stored.
    panes.forEach((p, i) => {
      if (p.collapsible && p.collapsed !== undefined && p.collapsed !== next.sizes[i] <= 0) next = toggle(next, i, p.collapsed);
    });
    setLayout(next);
  }

  // Opening springs on the snap, a little past and back. Closing lands
  // flush on the glide: the snap's overshoot would push the pane past the
  // view's edge and the one beside it wider than the view.
  const animate = useCallback((kind: "snap" | "glide", moving: number[]) => {
    if (reduced()) return;
    setMotion((m) => ({ kind, moving, n: (m?.n ?? 0) + 1 }));
  }, []);

  // The transition is on only while a change plays, so a drag follows the
  // pointer 1:1.
  useEffect(() => {
    if (!motion) return;
    const ms = motion.kind === "snap" ? 240 : 320;
    const timer = window.setTimeout(() => setMotion((m) => (m?.n === motion.n ? null : m)), ms + 40);
    return () => window.clearTimeout(timer);
  }, [motion]);

  const commit = useCallback(
    (next: Layout, persist = true) => {
      setLayout(next);
      report.current?.(next.sizes);
      if (persist) writeStore(storageKey, next);
    },
    [storageKey],
  );

  // Panes whose collapse is controlled: follow the prop.
  const wanted = panes.map((p) => (p.collapsible ? p.collapsed : undefined));
  const [seen, setSeen] = useState(wanted);
  if (layout && wanted.some((w, i) => w !== seen[i])) {
    setSeen(wanted);
    let next = layout;
    wanted.forEach((w, i) => {
      if (w === undefined || w === next.sizes[i] <= 0) return;
      next = toggle(next, i, w);
    });
    if (next !== layout) {
      setLayout(next);
      writeStore(storageKey, next);
      animate(wanted.some((w, i) => w && w !== seen[i]) ? "glide" : "snap", wanted.map((w, i) => (w === seen[i] ? -1 : i)).filter((i) => i >= 0));
    }
  }

  /** Collapse or reopen pane `i`, trading with the pane across its nearest divider. */
  function toggle(from: Layout, i: number, close: boolean): Layout {
    const sizes = [...from.sizes];
    const last = [...from.last];
    const other = i < count - 1 ? i + 1 : i - 1;
    if (other < 0) return from;
    if (close) {
      if (sizes[i] <= 0) return from;
      last[i] = sizes[i];
      sizes[other] += sizes[i];
      sizes[i] = 0;
    } else {
      if (sizes[i] > 0) return from;
      const want = Math.max(last[i] || 0, bounds(panes[i], space).min);
      sizes[i] = want;
      sizes[other] -= want;
    }
    return { sizes: fit(sizes, panes, space), last };
  }

  const sizes = layout?.sizes;
  const collapsedAt = (i: number) => (sizes ? sizes[i] <= 0 : Boolean((panes[i].collapsed ?? panes[i].defaultCollapsed) && panes[i].collapsible));

  function setCollapsed(i: number, close: boolean) {
    if (!layout || !panes[i]?.collapsible || collapsedAt(i) === close) return;
    commit(toggle(layout, i, close));
    animate(close ? "glide" : "snap", [i]);
    panes[i].onCollapsedChange?.(close);
  }

  /* ---------- Dragging ---------- */

  const axis = (e: { clientX: number; clientY: number }) => (horizontal ? e.clientX : e.clientY);
  const rtl = () => horizontal && rootRef.current !== null && getComputedStyle(rootRef.current).direction === "rtl";

  /** Divider `d` dragged so the pane before it is `a` px: the pair's new sizes. */
  function place(from: number[], d: number, a: number, room: number): number[] {
    const A = panes[d];
    const B = panes[d + 1];
    const pair = ((from[d] + from[d + 1]) / 100) * room;
    const minA = Math.min(pixels(A.minSize ?? DEFAULT_MIN, room, 0), pair);
    const minB = Math.min(pixels(B.minSize ?? DEFAULT_MIN, room, 0), pair);
    const maxA = pixels(A.maxSize, room, pair);
    const maxB = pixels(B.maxSize, room, pair);
    let next = a;
    // Past half its minimum a collapsible pane lets go and snaps shut;
    // short of that it holds at its minimum.
    if (A.collapsible && next < minA / 2) next = 0;
    else if (B.collapsible && pair - next < minB / 2) next = pair;
    else {
      const lo = Math.max(minA, pair - maxB);
      const hi = Math.min(maxA, pair - minB);
      next = lo <= hi ? clamp(next, lo, hi) : (lo + hi) / 2;
    }
    const out = [...from];
    out[d] = (next / room) * 100;
    out[d + 1] = ((pair - next) / room) * 100;
    return out;
  }

  function onPointerDown(d: number, e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !sizes || space <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Focus follows, so the keys work next, but with no ring: that's for keyboards.
    e.currentTarget.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    drag.current = { index: d, start: axis(e), from: sizes, space, pointer: e.pointerId, collapsed: sizes.map((s) => s <= 0) };
    setDragging(d);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = drag.current;
    if (!g || g.pointer !== e.pointerId) return;
    const delta = (axis(e) - g.start) * (rtl() ? -1 : 1);
    const before = (g.from[g.index] / 100) * g.space;
    const next = place(g.from, g.index, before + delta, g.space);
    // One layout per frame, however fast the pointer reports.
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const current = latest.current;
      if (!current) return;
      const was = current.sizes.map((s) => s <= 0);
      const now = next.map((s) => s <= 0);
      const flipped = now.map((c, i) => (c !== was[i] ? i : -1)).filter((i) => i >= 0);
      const last = [...current.last];
      // A pane closing remembers the size it had when the drag began.
      flipped.forEach((i) => {
        if (now[i] && g.from[i] > 0) last[i] = g.from[i];
      });
      if (sizes && next.every((s, i) => near(s, current.sizes[i]))) return;
      commit({ sizes: next, last }, false);
      if (flipped.length) animate(flipped.some((i) => now[i]) ? "glide" : "snap", flipped);
    });
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    const g = drag.current;
    if (!g || g.pointer !== e.pointerId) return;
    drag.current = null;
    setDragging(null);
    cancelAnimationFrame(frame.current);
    // Settle on the last position the pointer reported.
    frame.current = requestAnimationFrame(() => {
      const current = latest.current;
      if (!current) return;
      writeStore(storageKey, current);
      current.sizes.forEach((s, i) => {
        if (s <= 0 !== g.collapsed[i]) panes[i].onCollapsedChange?.(s <= 0);
      });
    });
  }

  // The resize cursor stays while the pointer is off the divider mid-drag.
  useEffect(() => {
    if (dragging === null) return;
    const page = document.documentElement;
    page.style.cursor = horizontal ? "col-resize" : "row-resize";
    return () => {
      page.style.cursor = "";
    };
  }, [dragging, horizontal]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /* ---------- Keyboard and double-click ---------- */

  function onKeyDown(d: number, e: KeyboardEvent<HTMLDivElement>) {
    if (!sizes || space <= 0) return;
    const back = horizontal ? (rtl() ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
    const forward = horizontal ? (rtl() ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
    const before = (sizes[d] / 100) * space;
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    let a: number | null = null;
    if (e.key === back) a = before - step;
    else if (e.key === forward) a = before + step;
    else if (e.key === "Home") a = 0;
    else if (e.key === "End") a = ((sizes[d] + sizes[d + 1]) / 100) * space;
    else if (e.key === "Enter") {
      e.preventDefault();
      const i = panes[d].collapsible ? d : panes[d + 1].collapsible ? d + 1 : -1;
      if (i >= 0) setCollapsed(i, !collapsedAt(i));
      return;
    }
    if (a === null) return;
    e.preventDefault();
    // Keys step through a collapsible pane's minimum, never past it: Enter
    // is the one key that closes, so holding an arrow can't lose a pane.
    const holdA = panes[d].collapsible && sizes[d] > 0 && e.key !== "Home";
    const holdB = panes[d + 1].collapsible && sizes[d + 1] > 0 && e.key !== "End";
    const minPx = (p: Pane) => pixels(p.minSize ?? DEFAULT_MIN, space, 0);
    const pair = ((sizes[d] + sizes[d + 1]) / 100) * space;
    if (holdA) a = Math.max(a, minPx(panes[d]));
    if (holdB) a = Math.min(a, pair - minPx(panes[d + 1]));
    // Stepping out of a collapsed pane opens it at its minimum.
    if (sizes[d] <= 0 && a > 0) a = Math.max(a, minPx(panes[d]));
    if (sizes[d + 1] <= 0 && a < pair) a = Math.min(a, pair - minPx(panes[d + 1]));
    const next = place(sizes, d, a, space);
    if (next.every((s, i) => near(s, sizes[i]))) return;
    const last = [...layout!.last];
    const flipped = next.map((s, i) => ((s <= 0) !== (sizes[i] <= 0) ? i : -1)).filter((i) => i >= 0);
    flipped.forEach((i) => {
      if (next[i] <= 0) last[i] = sizes[i];
      panes[i].onCollapsedChange?.(next[i] <= 0);
    });
    commit({ sizes: next, last });
    animate(flipped.some((i) => next[i] <= 0) ? "glide" : "snap", flipped);
  }

  function reset(d: number) {
    if (!sizes || space <= 0) return;
    const base = initial(panes, space);
    const pair = sizes[d] + sizes[d + 1];
    const share = base.last[d] + base.last[d + 1] || 1;
    const next = [...sizes];
    next[d] = (pair * base.last[d]) / share;
    next[d + 1] = pair - next[d];
    const closed = [d, d + 1].filter((i) => sizes[i] <= 0);
    commit({ sizes: fit(next, panes, space), last: layout!.last });
    closed.forEach((i) => panes[i].onCollapsedChange?.(false));
    animate("glide", closed);
  }

  /* ---------- Render ---------- */

  const template = sizes ? sizes.map((s) => `${s}%`).join(" 0px ") : cssTemplate(panes);
  const want = narrowPane ?? shown;
  const active = panes.some((p) => p.id === want) ? want : panes[0]?.id;
  const activeIndex = panes.findIndex((p) => p.id === active);
  const moving = new Set(motion?.moving ?? []);

  const cells: ReactNode[] = [];
  panes.forEach((pane, i) => {
    const closed = collapsedAt(i);
    // A pane opening or closing holds its open width, so its content never
    // rewraps on the way; it rests against its outer edge.
    const held = sizes && space > 0 && (closed || moving.has(i)) ? ((closed ? layout!.last[i] : sizes[i]) / 100) * space : null;
    cells.push(
      <section
        key={pane.id}
        className={pane.className ? `${styles.pane} ${pane.className}` : styles.pane}
        aria-label={pane.label}
        data-collapsed={closed || undefined}
        data-anchor={i === count - 1 && count > 1 ? "end" : "start"}
        data-active={pane.id === active || undefined}
        data-side={i < activeIndex ? "before" : i > activeIndex ? "after" : undefined}
        inert={isNarrow ? pane.id !== active : closed}
        data-held={held ? "" : undefined}
        style={held ? ({ "--split-held": `${held}px` } as CSSProperties) : undefined}
      >
        <div className={styles.content}>{pane.children}</div>
      </section>,
    );
    if (i === count - 1) return;
    const value = sizes ? Math.round(sizes[i]) : undefined;
    const next = panes[i + 1];
    const a = sizes ? bounds(pane, space) : undefined;
    const b = sizes ? bounds(next, space) : undefined;
    // Against the view's edge (everything past it closed), the grip moves
    // inside, where a pointer can reach all of it.
    const edge = !sizes ? undefined : sizes.slice(i + 1).every((s) => s <= 0) ? "end" : sizes.slice(0, i + 1).every((s) => s <= 0) ? "start" : undefined;
    cells.push(
      <div
        key={`${pane.id}-divider`}
        role="separator"
        tabIndex={isNarrow ? -1 : 0}
        aria-orientation={horizontal ? "vertical" : "horizontal"}
        aria-label={`Resize ${pane.label}`}
        aria-valuenow={value}
        aria-valuemin={a && b ? Math.round(pane.collapsible ? 0 : Math.max(a.min, 100 - b.max)) : undefined}
        aria-valuemax={a && b ? Math.round(next.collapsible ? 100 : Math.min(a.max, 100 - b.min)) : undefined}
        aria-valuetext={
          value === undefined
            ? undefined
            : closed
              ? `${pane.label} collapsed`
              : collapsedAt(i + 1)
                ? `${next.label} collapsed`
                : `${pane.label} ${value}%`
        }
        className={styles.divider}
        data-dragging={dragging === i || undefined}
        data-edge={edge}
        onPointerDown={(e) => onPointerDown(i, e)}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={(e) => onKeyDown(i, e)}
        onDoubleClick={() => reset(i)}
      >
        <span className={styles.line} />
        <span className={styles.handle} />
      </div>,
    );
  });

  return (
    <div
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-orientation={orientation}
      data-narrow={horizontal ? narrow : undefined}
      data-dragging={dragging !== null || undefined}
      data-motion={motion?.kind}
    >
      {horizontal && narrow === "switch" && (
        <div className={styles.switch} inert={width > 0 && !isNarrow}>
          <SegmentedControl
            aria-label="Show pane"
            value={active}
            onValueChange={(id) => {
              setShown(id);
              onNarrowPaneChange?.(id);
            }}
          >
            {panes.map((p) => (
              <Segment key={p.id} value={p.id}>
                {p.label}
              </Segment>
            ))}
          </SegmentedControl>
        </div>
      )}
      <div ref={frameRef} className={styles.frame} style={{ "--split-template": template } as CSSProperties}>
        {cells}
      </div>
    </div>
  );
}
