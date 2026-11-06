"use client";

import { useEffect, useRef, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import type { IconName } from "../icons/icons";
import styles from "./empty-state.module.css";

type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  /** Which drawing. Set it to show one; leave it (and `icon`) out for text alone. */
  art?: EmptyStateArt;
  /**
   * @deprecated Use `art`. An icon name still picks the drawing that fits it (`search` the
   * magnifier, `alert` the unplugged cord, `calendar` the calendar, `file` the folder,
   * `check` the tray); anything else gets the stack. No icon is drawn.
   */
  icon?: IconName | ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** A quieter alternative to `action`. */
  secondaryAction?: ReactNode;
  /** `compact` inside a panel, list or menu; `page` for a whole view. */
  size?: "compact" | "page";
  /** Defaults to h3 (compact) or h2 (page). */
  titleAs?: "h2" | "h3" | "h4" | "p";
};

/** What a list, table or view shows when it has nothing in it yet. */
export function EmptyState({
  icon,
  art,
  title,
  description,
  action,
  secondaryAction,
  size = "compact",
  titleAs,
  className,
  ...props
}: EmptyStateProps) {
  const Title = titleAs ?? (size === "page" ? "h2" : "h3");
  const drawing = art ?? (icon !== undefined && icon !== null ? artFor(icon) : undefined);
  return (
    <div className={className ? `${styles.root} ${className}` : styles.root} data-size={size} {...props}>
      {drawing && <Art art={drawing} />}
      <div className={styles.text}>
        <Title className={styles.title}>{title}</Title>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className={styles.action}>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export type EmptyStateArt = "stack" | "box" | "folder" | "tray" | "search" | "calendar" | "unplugged";

export const EMPTY_STATE_ART = [
  "stack",
  "box",
  "folder",
  "tray",
  "search",
  "calendar",
  "unplugged",
] as const satisfies readonly EmptyStateArt[];

/** The drawing an old `icon` stands for. */
const FOR_ICON: Partial<Record<string, EmptyStateArt>> = {
  search: "search",
  alert: "unplugged",
  warning: "unplugged",
  retry: "unplugged",
  link: "unplugged",
  calendar: "calendar",
  file: "folder",
  upload: "folder",
  download: "folder",
  check: "tray",
  "check-circle": "tray",
};

const artFor = (icon: IconName | ReactNode): EmptyStateArt =>
  (typeof icon === "string" && FOR_ICON[icon]) || "stack";

/* ---------- The drawings ----------
   Isometric drawings on the 2:1 pixel grid (one unit right is half a unit
   down), so straight edges land on clean slopes at 1x and 2x. Corners are
   crisp: each outline is drawn flat on its own plane, a corner only just
   eased (a fillet about a pixel across, two cubics), then projected. Only
   what is round in life is round: a lens, a cord, a coil, a slot. The
   projection is affine, so the curves stay exact.
   Parts that touch in life touch exactly here: a hinge is a shared edge, a
   handle starts on its rim, a coil ends where the pad hides it.
   Solids are a near face over a side: the side is the outline of the face
   and its copy pushed back, the two wrapped in one convex hull. Faces are
   painted back to front with opaque fills, so nearer faces hide what's
   behind them without any hidden-line work. */

type V = readonly [x: number, y: number, z: number];
type P = readonly [a: number, b: number];
/** paper: the surface; shade: the one fill tone; line: an edge with no face; bone: text on a card; mark: the one picked
    out (today); cord: a cable. */
type Tone = "paper" | "shade" | "line" | "bone" | "mark" | "cord";
type Seg = { c?: readonly [V, V]; to: V };
type Run = { from: V; segs: Seg[] };
/** One or more closed runs; two make a ring (filled even-odd). */
type Part = { tone: Tone; step: number; run: Run | Run[] };

/** Every corner of a made thing: crisp, eased by about a pixel so it doesn't glint. */
const R = 0.6;

const iso = ([x, y, z]: V): P => [x - y, (x + y) / 2 - z];

const add = (p: P, q: P, s = 1): P => [p[0] + q[0] * s, p[1] + q[1] * s];
const unit = ([a, b]: P): P => [a / Math.hypot(a, b), b / Math.hypot(a, b)];

/** Maps a point on a flat outline into the scene. */
type Plane = (p: P) => V;
const level =
  (z: number): Plane =>
  ([a, b]) => [a, b, z];
const plane =
  (o: V, u: V, v: V): Plane =>
  ([a, b]) => [o[0] + a * u[0] + b * v[0], o[1] + a * u[1] + b * v[1], o[2] + a * u[2] + b * v[2]];

/** A polygon with each corner filleted by its radius: [in, then two cubics to the arc's middle and out]. */
function fillets(points: readonly P[], radius: number | readonly number[]) {
  return points.map((p, i) => {
    const r = typeof radius === "number" ? radius : radius[i];
    const d1 = unit(add(points[(i + points.length - 1) % points.length], p, -1));
    const d2 = unit(add(points[(i + 1) % points.length], p, -1));
    if (!r) return { in: p, a: [p, p, p] as const, b: [p, p, p] as const };
    const half = Math.acos(d1[0] * d2[0] + d1[1] * d2[1]) / 2;
    const t1 = add(p, d1, r / Math.tan(half));
    const t2 = add(p, d2, r / Math.tan(half));
    const mid = add(p, unit(add(d1, d2)), r / Math.sin(half) - r);
    // Each half spans a quarter of the turn; the usual 4/3·tan(θ/4) handle.
    const k = (4 / 3) * Math.tan((Math.PI - 2 * half) / 4 / 2) * r;
    const along = unit(add(d2, d1, -1));
    return { in: t1, a: [add(t1, d1, -k), add(mid, along, -k), mid] as const, b: [add(mid, along, k), add(t2, d2, -k), t2] as const };
  });
}

/** A crisp outline on a plane, its corners eased. `run(i, j)` follows it from corner i's middle, forward, to corner j's. */
function outline(on: Plane, points: readonly P[], radius: number | readonly number[]) {
  const fs = fillets(points, radius);
  const curve = ([c1, c2, to]: readonly [P, P, P]): Seg => ({ c: [on(c1), on(c2)], to: on(to) });
  const run = (i: number, j: number): Run => {
    const segs = [curve(fs[i].b)];
    for (let k = (i + 1) % fs.length; ; k = (k + 1) % fs.length) {
      segs.push({ to: on(fs[k].in) }, curve(fs[k].a));
      if (k === j) break;
      segs.push(curve(fs[k].b));
    }
    return { from: on(fs[i].a[2]), segs };
  };
  return { run, whole: run(0, 0) };
}

const rect = (x: number, y: number, w: number, d: number): P[] => [
  [x, y],
  [x + w, y],
  [x + w, y + d],
  [x, y + d],
];
// On a level rect the corners are, as seen: 0 back, 1 right, 2 front, 3 left.
const [BACK, RIGHT, LEFT] = [0, 1, 3];

const shift = ({ from, segs }: Run, [dx, dy, dz]: V): Run => {
  const move = ([x, y, z]: V): V => [x + dx, y + dy, z + dz];
  return { from: move(from), segs: segs.map((s) => ({ c: s.c && [move(s.c[0]), move(s.c[1])], to: move(s.to) })) };
};

/** Points along a run, each cubic cut into eight. */
function samples({ from, segs }: Run): V[] {
  const out: V[] = [from];
  let p = from;
  for (const s of segs) {
    if (s.c) {
      const [c1, c2] = s.c;
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const [a, b, c, d] = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3];
        out.push([0, 1, 2].map((k) => a * p[k] + b * c1[k] + c * c2[k] + d * s.to[k]) as unknown as V);
      }
    } else out.push(s.to);
    p = s.to;
  }
  return out;
}

/** The convex outline, as seen, around points in the scene: a closed run through the ones on it. */
function hull(points: V[]): Run {
  const pts = points.map((v) => ({ v, p: iso(v) })).sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1]);
  type Q = (typeof pts)[number];
  const cross = (o: Q, a: Q, b: Q) => (a.p[0] - o.p[0]) * (b.p[1] - o.p[1]) - (a.p[1] - o.p[1]) * (b.p[0] - o.p[0]);
  const half = (list: Q[]) => {
    const h: Q[] = [];
    for (const q of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 1e-6) h.pop();
      h.push(q);
    }
    return h.slice(0, -1);
  };
  const ring = [...half(pts), ...half([...pts].reverse())];
  return { from: ring[0].v, segs: ring.slice(1).map((q) => ({ to: q.v })) };
}

/** A solid: its near face in the surface over its side in the fill tone. `depth` points away from you. */
function solid(near: Run, depth: V, step: number, face: Tone = "paper"): Part[] {
  return [
    { tone: "shade", step, run: hull([...samples(near), ...samples(shift(near, depth))]) },
    { tone: face, step, run: near },
  ];
}

/** A level slab, its top at z. */
const slab = ([x, y, z]: V, w: number, d: number, h: number, step: number, r = R): Part[] =>
  solid(outline(level(z), rect(x, y, w, d), r).whole, [0, 0, -h], step);

/** A disc on a level plane. */
const disc = (cx: number, cy: number, z: number, radius: number) =>
  outline(level(z), rect(cx - radius, cy - radius, 2 * radius, 2 * radius), radius);

/** A line of text on a card: a filled bar along x. */
const pill = (x: number, y: number, z: number, length: number, step: number): Part => ({
  tone: "bone",
  step,
  run: outline(level(z), rect(x, y - 1.5, length, 3), R).whole,
});

/** A small square on a card: a checkbox, a day. */
const chip = (x: number, y: number, z: number, size: number, step: number, tone: Tone = "bone"): Part => ({
  tone,
  step,
  run: outline(level(z), rect(x, y, size, size), R).whole,
});

/** An open box with walls `rim` thick: the shaded inside, where the far walls meet the floor, then the rim
    over that line's ends, then the near walls. */
function openBox([x, y]: P, w: number, d: number, h: number, rim: number, step: number): Part[] {
  const top = outline(level(h), rect(x, y, w, d), R);
  const inner = rect(x + rim, y + rim, w - 2 * rim, d - 2 * rim);
  const hole = outline(level(h), inner, R).whole;
  return [
    { tone: "shade", step, run: hole },
    { tone: "line", step, run: outline(level(0), inner, R).run(LEFT, RIGHT) },
    { tone: "paper", step, run: [top.whole, hole] },
    { tone: "paper", step: step + 1, run: sideOf(top, h) },
  ];
}

/** The near side of a level outline dropped h: its near edge, down, and back along the same edge h lower. */
function sideOf(top: ReturnType<typeof outline>, h: number): Run {
  const near = top.run(RIGHT, LEFT);
  const under = shift(near, [0, 0, -h]);
  const at = [under.from, ...under.segs.map((s) => s.to)];
  const back = under.segs.map((s, i) => ({ c: s.c && ([s.c[1], s.c[0]] as const), to: at[i] })).reverse();
  return { from: near.from, segs: [...near.segs, { to: at[at.length - 1] }, ...back] };
}

/** Three cards in a loose stack, each lying on the one below, rows of a list on the top one. */
function stack(): Part[] {
  const [w, d, t] = [58, 40, 4];
  // Each a little behind the one below, so every card shows a ledge; each underside is the top below it.
  const at: P[] = [[5, 0], [2.5, 0], [0, 0]];
  const top = 3 * t;
  return [
    ...at.flatMap(([x, y], i) => slab([x, y, (i + 1) * t], w, d, t, i)),
    ...[11, 20, 29].flatMap((y, i) => [chip(10, y - 2.5, top, 5, 3), pill(19, y + 2, top, [26, 18, 30][i], 3)]),
  ];
}

/** An open, empty box, its four flaps folded out. */
function box(): Part[] {
  const [w, d, h, f, tilt, droop] = [44, 44, 26, 15, (40 * Math.PI) / 180, (-28 * Math.PI) / 180];
  const [out, up] = [Math.cos(tilt), Math.sin(tilt)];
  // The near flaps hang open, a little below level, so you see their tops.
  const [hang, down] = [Math.cos(droop), Math.sin(droop)];
  // Each flap hinges on the whole of its top edge, so neighbours meet at the box's corners.
  const flap = (o: V, along: V, open: V, step: number): Part => ({
    tone: "paper",
    step,
    run: outline(plane(o, along, open), rect(0, 0, w, f), [0, 0, R, R]).whole,
  });
  return [
    // The far flaps fall open behind the box, the near ones toward you.
    flap([0, 0, h], [1, 0, 0], [0, -out, up], 0),
    flap([0, d, h], [0, -1, 0], [-out, 0, up], 0),
    ...openBox([0, 0], w, d, h, 2.5, 1),
    flap([w, 0, h], [0, 1, 0], [hang, 0, down], 3),
    flap([d, d, h], [-1, 0, 0], [0, hang, down], 3),
  ];
}

/** A folder standing open, a sheet with lines on it inside. One board folded at the bottom: the back stands
    upright, the cover leans out toward you, and the cover's inside meets the back's inside along the fold. */
function folder(): Part[] {
  const [w, h, t, tilt] = [68, 46, 2, (20 * Math.PI) / 180];
  const [s, c] = [Math.sin(tilt), Math.cos(tilt)];
  // The cover's outside rests on the floor, so the fold (where the two insides meet) is a little up.
  const fold = s * t;
  const back = plane([0, 0, fold], [1, 0, 0], [0, 0, 1]);
  const front = plane([0, c * t, 0], [1, 0, 0], [0, s, c]);
  // The sheet stands just off the back, its foot resting on the cover's inside.
  const [gap, foot] = [1, fold + (c / s) * 1];
  const sheet = plane([0, gap, 0], [1, 0, 0], [0, 0, 1]);
  const tab: P[] = [[0, 0], [w, 0], [w, h], [26, h], [21, h + 6], [0, h + 6]];
  const line = (z: number, length: number): Part => ({
    tone: "bone",
    step: 1,
    run: outline(sheet, rect(13, z - 1.5, length, 3), R).whole,
  });
  return [
    ...solid(outline(back, tab, [0, 0, R, R, R, R]).whole, [0, -t, 0], 0, "shade"),
    { tone: "paper", step: 1, run: outline(sheet, rect(7, foot, w - 14, h - 3 + fold - foot), [0, 0, R, R]).whole },
    line(h - 11, 24),
    line(h - 18, 16),
    ...solid(outline(front, rect(0, 0, w, h - 14), [0, 0, R, R]).whole, [0, -c * t, s * t], 2),
  ];
}

/** A shallow tray, a letter dropping into it. */
function tray(): Part[] {
  return [
    ...openBox([0, 0], 62, 44, 10, 2.5, 0),
    ...slab([15, 9, 34], 34, 25, 2, 2),
    ...[16, 23].map((y, i) => pill(21, y, 34, [20, 13][i], 3)),
  ];
}

/** A magnifier lying on a card of results. */
function search(): Part[] {
  const [cx, cy, z, ro, ri, t, hw] = [34, 22, 11, 15, 10.5, 3.5, 3.5];
  // The handle runs toward the lower right, as seen.
  const dir = unit([3, 1]);
  const along: V = [dir[0], dir[1], 0];
  const across: V = [-dir[1], dir[0], 0];
  // It starts where its corners sit on the rim's outer edge, so the rim covers its square end exactly.
  const reach = Math.sqrt(ro * ro - hw * hw);
  const start: V = [cx + dir[0] * reach, cy + dir[1] * reach, z];
  const outer = disc(cx, cy, z, ro).whole;
  const inner = disc(cx, cy, z, ri);
  return [
    ...slab([0, 0, 4], 56, 42, 4, 0),
    ...[10, 18, 26, 34].map((y, i) => pill(8, y, 4, [22, 34, 28, 16][i], 1)),
    // The lens: its rim's side, then the handle against it, the glass a little down in the rim, then the
    // rim's top over all of them, level with the handle's.
    { tone: "shade", step: 2, run: hull([...samples(outer), ...samples(shift(outer, [0, 0, -t]))]) },
    ...solid(outline(plane(start, along, across), rect(0, -hw, 24, 2 * hw), [0, R, R, 0]).whole, [0, 0, -t], 2),
    { tone: "paper", step: 2, run: shift(inner.whole, [0, 0, -t * 0.6]) },
    { tone: "line", step: 3, run: disc(cx, cy, z - t * 0.6, ri * 0.62).run(LEFT, BACK) },
    { tone: "paper", step: 3, run: [outer, inner.whole] },
  ];
}

/** A desk calendar pad: a spiral along the top, a shaded header, a grid of days. */
function calendar(): Part[] {
  const [w, d, h] = [54, 46, 5];
  const days = [0, 1, 2].flatMap((row) => [0, 1, 2, 3, 4].map((col) => [7 + col * 8.5, 19 + row * 8.5] as const));
  // Each coil a circle around the back edge, centered on it halfway down: it comes out of a hole in the
  // top, up and over the edge, and down behind until the pad hides it (where its height above the
  // top equals how far it is behind the back edge).
  const [cz, hole] = [h / 2, 2.4];
  const r = Math.hypot(hole, h - cz);
  const from = Math.atan2(h - cz, hole);
  // Hidden once y + (h − z) ≥ 0 below the top: √2·r·cos(φ + π/4) = −(h − cz), its root behind the pad.
  const to = (7 * Math.PI) / 4 - Math.acos(-(h - cz) / (r * Math.SQRT2));
  const arc = (on: Plane): Run => {
    const n = 3;
    const segs: Seg[] = [];
    const at = (a: number): P => [r * Math.cos(a), cz + r * Math.sin(a)];
    const dt = (to - from) / n;
    const k = (4 / 3) * Math.tan(dt / 4) * r;
    for (let i = 0; i < n; i++) {
      const [a0, a1] = [from + i * dt, from + (i + 1) * dt];
      const [p0, p1] = [at(a0), at(a1)];
      segs.push({
        c: [on([p0[0] - k * Math.sin(a0), p0[1] + k * Math.cos(a0)]), on([p1[0] + k * Math.sin(a1), p1[1] - k * Math.cos(a1)])],
        to: on(p1),
      });
    }
    return { from: on(at(from)), segs };
  };
  const coils = [10, 19, 28, 37, 46].flatMap((x): Part[] => [
    { tone: "mark", step: 3, run: outline(level(h), rect(x - 0.9, hole - 0.9, 1.8, 1.8), 0.9).whole },
    { tone: "line", step: 3, run: arc(plane([x, 0, 0], [0, 1, 0], [0, 0, 1])) },
  ]);
  return [
    ...slab([0, 0, h], w, d, h, 0),
    { tone: "shade", step: 1, run: outline(level(h), rect(0, 0, w, 12), [R, R, 0, 0]).whole },
    ...days.map(([x, y], i) => chip(x, y, h, 5.5, 2, i === 7 ? "mark" : "bone")),
    ...coils,
  ];
}

/** A plug lifted out of its socket, its cord curling up and away behind it. */
function unplugged(): Part[] {
  const [s, lift] = [32, 33];
  const [pw, ph] = [18, 13];
  const [px, py] = [(s - pw) / 2, (s - pw) / 2];
  const slots = [s / 2 - 5.5, s / 2 + 3.3];
  const prong = (x: number): Part[] => slab([x, s / 2 - 3, lift], 2.2, 6, 12, 2, 1);
  const top = lift + ph;
  const [ox, oy] = [px + pw / 2, py + pw / 2];
  return [
    ...slab([0, 0, 6], s, s, 6, 0),
    ...slots.map((x): Part => ({ tone: "shade", step: 1, run: outline(level(6), rect(x - 0.2, s / 2 - 4, 2.6, 8), 1.2).whole })),
    ...prong(slots[0]),
    ...prong(slots[1]),
    ...slab([px, py, top], pw, pw, ph, 3),
    ...solid(disc(ox, oy, top + 3.5, 3.6).whole, [0, 0, -3.5], 4),
    {
      tone: "cord",
      step: 5,
      run: {
        from: [ox, oy, top + 3.5],
        segs: [{ c: [[ox, oy, top + 14], [ox + 2, oy - 26, top + 16]], to: [ox + 6, oy - 36, top + 2] }],
      },
    },
  ];
}

/* The art's box, in drawing units: each drawing is centered in it. */
const BOX = { w: 120, h: 88 };

/** The SVG path for each part, the drawing centered in BOX. */
function draw(parts: Part[]) {
  const runs = (run: Run | Run[]) => (Array.isArray(run) ? run : [run]);
  const all = parts
    .flatMap(({ run }) => runs(run).flatMap((r) => [r.from, ...r.segs.flatMap((s) => [...(s.c ?? []), s.to])]))
    .map(iso);
  const [x0, x1] = [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
  const [y0, y1] = [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
  const [dx, dy] = [(BOX.w - x0 - x1) / 2, (BOX.h - y0 - y1) / 2];
  const at = (v: V) => {
    const [x, y] = iso(v);
    return `${Math.round((x + dx) * 100) / 100} ${Math.round((y + dy) * 100) / 100}`;
  };
  const open = (tone: Tone) => tone === "line" || tone === "cord";
  return parts.map(({ tone, step, run }) => ({
    tone,
    step,
    d: runs(run)
      .map(
        (r) =>
          `M${at(r.from)}` +
          r.segs.map((s) => (s.c ? `C${at(s.c[0])} ${at(s.c[1])} ${at(s.to)}` : `L${at(s.to)}`)).join("") +
          (open(tone) ? "" : "Z"),
      )
      .join(""),
  }));
}

const ART: Record<EmptyStateArt, ReturnType<typeof draw>> = {
  stack: draw(stack()),
  box: draw(box()),
  folder: draw(folder()),
  tray: draw(tray()),
  search: draw(search()),
  calendar: draw(calendar()),
  unplugged: draw(unplugged()),
};

const step = (i: number) => ({ "--i": i }) as CSSProperties;

function Art({ art }: { art: EmptyStateArt }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.drawn = "";
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.drawn = "";
          observer.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const parts = ART[art] ?? ART.stack;

  return (
    <span ref={ref} className={styles.art} data-art={art} aria-hidden="true">
      <svg className={styles.sketch} viewBox={`0 0 ${BOX.w} ${BOX.h}`} fill="none" focusable="false">
        {parts.map((part, i) =>
          part.tone === "cord" ? (
            // A cable: a wide stroke in the line color, a narrower one in the surface down its middle.
            <g key={i} style={step(part.step)}>
              <path className={styles.cord} d={part.d} pathLength={1} />
              <path className={styles.core} d={part.d} pathLength={1} />
            </g>
          ) : (
            <path key={i} className={styles[part.tone]} d={part.d} fillRule="evenodd" pathLength={1} style={step(part.step)} />
          ),
        )}
      </svg>
    </span>
  );
}
