"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * A row of things that come and go (tags in a field, filters in a bar),
 * animated the one way UI Polish does it:
 *
 * - An item that arrives fades in and scales up from 0.97 where it lands.
 * - An item that leaves stays in the layout while it fades and scales down,
 *   then is dropped, and only then does the space close.
 * - Everything marked `data-flip` that the change moved (the items after it,
 *   the input, a button) slides from where it was to where it is now (FLIP).
 *   Interrupted, it slides on from where it visibly is.
 * - `sizeRef`'s height follows the rows on the same beat, so a field or a
 *   bar grows and shrinks with its content instead of jumping.
 *
 * Under reduced motion items still fade in and out; nothing moves or scales.
 *
 * Render `list`; put `ref` on the element the items are laid out in, and
 * `data-flip={key}` on each item (and on anything else in it that moves).
 */

export type FlipEntry<T> = { key: string; item: T; leaving: boolean };

type Leaving<T> = { item: T; after: string | null; index: number };
type Point = { x: number; y: number };
type Snapshot = { points: Map<string, Point>; height: number | null };

type Options = {
  /** What the moves ride: the move spring, or the glide where an edge holds
   *  the items and must never be overshot. */
  spring?: "move" | "glide";
  /** An element whose height follows the content, on the glide. */
  sizeRef?: RefObject<HTMLElement | null>;
};

const ms = (value: string, fallback: number) => {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return value.trim().endsWith("ms") ? n : n * 1000;
};

function tokens(el: Element) {
  const s = getComputedStyle(el);
  const read = (name: string) => s.getPropertyValue(name).trim();
  return {
    move: { duration: ms(read("--ui-dur-move"), 380), easing: read("--ui-ease-move") || "ease-out" },
    glide: { duration: ms(read("--ui-dur-glide"), 320), easing: read("--ui-ease-glide") || "ease-out" },
    enter: { duration: ms(read("--ui-dur-fast"), 160), easing: read("--ui-ease-enter") || "ease-out" },
    exit: { duration: ms(read("--ui-dur-instant"), 120), easing: read("--ui-ease-exit") || "ease-in" },
  };
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Where each item is laid out, relative to the container (no slide
 *  included), and the size box's own height. */
function measure(container: HTMLElement, size: HTMLElement | null, growth: Animation | null): Snapshot {
  const points = new Map<string, Point>();
  for (const el of container.querySelectorAll<HTMLElement>("[data-flip]")) {
    points.set(el.dataset.flip!, { x: el.offsetLeft, y: el.offsetTop });
  }
  // While a resize plays, the box is drawn at its frame; its own height is the end.
  const target = growth?.playState === "running" ? (growth.effect as KeyframeEffect | null)?.getKeyframes().at(-1)?.height : undefined;
  return { points, height: size ? (typeof target === "string" ? parseFloat(target) : size.offsetHeight) : null };
}

const opacityOf = (el: Element) => {
  const n = parseFloat(getComputedStyle(el).opacity);
  return Number.isNaN(n) ? 1 : n;
};

/** The slide an element is drawn at right now, from a move still playing. */
function slide(el: Element): Point {
  const [x = 0, y = 0] = getComputedStyle(el).translate.split(" ").map(parseFloat);
  return { x: Number.isNaN(x) ? 0 : x, y: Number.isNaN(y) ? 0 : y };
}

function merge<T>(items: readonly T[], keys: string[], leaving: ReadonlyMap<string, Leaving<T>>): FlipEntry<T>[] {
  const out: FlipEntry<T>[] = items.map((item, i) => ({ key: keys[i], item, leaving: false }));
  for (const [key, l] of leaving) {
    const at = l.after === null ? 0 : out.findIndex((e) => e.key === l.after) + 1;
    out.splice(at > 0 || l.after === null ? at : Math.min(l.index, out.length), 0, { key, item: l.item, leaving: true });
  }
  return out;
}

export function useFlipList<T>(items: readonly T[], keyOf: (item: T, index: number) => string, { spring = "move", sizeRef }: Options = {}) {
  const ref = useRef<HTMLElement | null>(null);
  const keys = items.map(keyOf);

  // Items taken out of `items` stay here, in place, until they have faded.
  const [leaving, setLeaving] = useState<ReadonlyMap<string, Leaving<T>>>(() => new Map());
  const [prev, setPrev] = useState<{ items: readonly T[]; keys: string[] }>({ items, keys });
  let gone = leaving;
  // Compared by key, so a list rebuilt on every render isn't a change.
  if (prev.keys.join("\u0000") !== keys.join("\u0000")) {
    const now = new Set(keys);
    const next = new Map([...leaving].filter(([key]) => !now.has(key)));
    const before = merge(prev.items, prev.keys, leaving);
    before.forEach((entry, i) => {
      if (now.has(entry.key) || next.has(entry.key)) return;
      next.set(entry.key, { item: entry.item, after: i > 0 ? before[i - 1].key : null, index: i });
    });
    gone = next;
    setPrev({ items, keys });
    setLeaving(next);
  }
  const list = merge(items, keys, gone);

  // The layout as last drawn, kept current by a ResizeObserver as well, so
  // a change measures from where things were, whatever moved them since.
  const signature = list.map((e) => (e.leaving ? `~${e.key}` : e.key)).join("\u0000");
  const committed = useRef<string | null>(null);
  const layout = useRef<Snapshot | null>(null);

  const moves = useRef(new WeakMap<Element, Animation>());
  const exits = useRef(new Map<string, Animation>());
  const growth = useRef<Animation | null>(null);
  const leavingRef = useRef(gone);

  useLayoutEffect(() => {
    leavingRef.current = gone;
    const container = ref.current;
    const first = committed.current === null;
    if (!container || committed.current === signature) return;
    committed.current = signature;
    const before = layout.current;
    const size = sizeRef?.current ?? null;
    const record = () => (layout.current = measure(container, size, growth.current));
    if (first || !before) {
      record();
      return;
    }

    const t = tokens(container);
    const reduced = reducedMotion();
    const ride = spring === "glide" ? t.glide : t.move;

    // The box grows from the height it's drawn at: its last height, or
    // wherever a resize still playing has got to.
    if (size && !reduced) {
      const running = growth.current?.playState === "running";
      const from = running ? size.getBoundingClientRect().height : before.height;
      growth.current?.cancel();
      const to = size.offsetHeight;
      if (from !== null && Math.abs(from - to) > 0.5) {
        growth.current = size.animate({ height: [`${from}px`, `${to}px`] }, t.glide);
        size.dataset.sizing = to > from ? "grow" : "shrink";
        growth.current.onfinish = growth.current.oncancel = () => delete size.dataset.sizing;
      }
    }

    for (const el of container.querySelectorAll<HTMLElement>("[data-flip]")) {
      const key = el.dataset.flip!;
      const entry = list.find((e) => e.key === key);
      const was = before.points.get(key);
      // Where it is drawn now: its old place plus any slide still playing.
      const now = slide(el);
      const from = was && { x: was.x + now.x, y: was.y + now.y };

      if (entry?.leaving && !exits.current.has(key)) {
        const exit = el.animate(
          reduced ? { opacity: [opacityOf(el), 0] } : { opacity: [opacityOf(el), 0], scale: [1, 0.97] },
          { ...t.exit, fill: "forwards" },
        );
        exits.current.set(key, exit);
        exit.onfinish = () => {
          exits.current.delete(key);
          if (!leavingRef.current.has(key)) return;
          setLeaving((m) => {
            if (!m.has(key)) return m;
            const next = new Map(m);
            next.delete(key);
            return next;
          });
        };
      } else if (entry && !entry.leaving && exits.current.has(key)) {
        // Back before it finished leaving: it fades back from where it was.
        const exit = exits.current.get(key)!;
        exits.current.delete(key);
        const opacity = opacityOf(el);
        exit.cancel();
        el.animate({ opacity: [opacity, 1], scale: [reduced ? 1 : 0.97, 1] }, t.enter);
      } else if (!from && entry) {
        el.animate(reduced ? { opacity: [0, 1] } : { opacity: [0, 1], scale: [0.97, 1] }, t.enter);
      }

      if (!from || reduced) continue;
      moves.current.get(el)?.cancel();
      const dx = from.x - el.offsetLeft;
      const dy = from.y - el.offsetTop;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      moves.current.set(el, el.animate({ translate: [`${dx}px ${dy}px`, "0px 0px"] }, ride));
    }
    record();
  });

  // Anything that changes a size (the container's width, a label, a font
  // arriving) moves things without a change to the list: keep the layout
  // current so the next change starts from what's on screen.
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const size = sizeRef?.current ?? null;
    const observer = new ResizeObserver(() => (layout.current = measure(container, size, growth.current)));
    observer.observe(container);
    for (const el of container.querySelectorAll("[data-flip]")) observer.observe(el);
    return () => observer.disconnect();
  }, [signature, sizeRef]);

  // An unmounted list leaves nothing playing.
  useLayoutEffect(() => {
    const exitsNow = exits.current;
    return () => {
      for (const a of exitsNow.values()) a.cancel();
      growth.current?.cancel();
    };
  }, []);

  return { list, ref };
}
