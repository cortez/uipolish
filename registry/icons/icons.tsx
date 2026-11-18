"use client";

import { useId, useState, type ComponentProps, type CSSProperties } from "react";
import styles from "./icons.module.css";

/*
 * Each icon is a few keyed strokes on a 16px grid. When `name` changes, a key
 * in both icons morphs (`d` only interpolates when the commands match); old-only
 * keys retract, new-only keys draw in. Give pairs shared keys so little ink moves.
 * Strokes use pathLength 1; a window f/t must touch a path end so it can retract.
 */

type Stroke = {
  d: string;
  /** Visible window along the path, 0–1. One end must touch the path's end. */
  f?: number;
  t?: number;
  /** Cut a gap in the other strokes along this line. */
  cut?: boolean;
  /** Draw as a solid rounded block. */
  block?: boolean;
  /** Degrees, about its own midpoint. */
  rot?: number;
  /** Meets another stroke end to end at rest: morphs without overshoot and
   *  erases in place (no fade or shrink) so the seam never shows. */
  seam?: boolean;
  /** Nudges 1px while the parent control is hovered or focused. */
  fx?: "lid" | "drop" | "out" | "forward";
};

/* Copy's front sheet is two strokes that meet end to end. `sheet` is its left
   edge, bottom-left corner and bottom edge: turned 45° that corner is a check,
   so copy → check moves those points while `rim` (the rest of the square)
   erases from the bottom-right corner round to the top-left. */
const SHEET = {
  d: "M5.76 5.76 C5.43 6.09 5.25 6.54 5.25 7 L5.25 11.5 C5.25 12.47 6.03 13.25 7 13.25 L11.5 13.25",
  seam: true,
} satisfies Stroke;
const RIM = {
  d: "M5.76 5.76A1.75 1.75 0 0 1 7 5.25H11.5A1.75 1.75 0 0 1 13.25 7V11.5A1.75 1.75 0 0 1 11.5 13.25",
  seam: true,
} satisfies Stroke;
// The same commands as SHEET; the corner is a short curve so it can come from the rounded one.
const CHECK = {
  d: "M3.75 8.25 C3.96 8.46 4.17 8.67 4.38 8.88 L6.4 10.9 C6.75 11.25 6.75 11.25 7.08 10.87 L12.25 5",
  seam: true,
} satisfies Stroke;
const BACK_SHEET = "M9.25 2.75H4.5A1.75 1.75 0 0 0 2.75 4.5V9.25";
const EYE = "M1.75 8C3.1 5.1 5.4 3.5 8 3.5s4.9 1.6 6.25 4.5C12.9 10.9 10.6 12.5 8 12.5S3.1 10.9 1.75 8Z";
const PUPIL = "M6 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0";
const RING = "M14.25 8a6.25 6.25 0 1 1-12.5 0a6.25 6.25 0 1 1 12.5 0";
const CHANGE_FRAME = "M2.75 5.75a3 3 0 0 1 3-3h4.5a3 3 0 0 1 3 3v4.5a3 3 0 0 1-3 3h-4.5a3 3 0 0 1-3-3Z";

const CHEVRON_V = ["M2.87 8 L8.88 8", "M7.12 8 L13.13 8"] as const;
const CHEVRON_H = ["M5 5.875 L11 5.875", "M5 10.125 L11 10.125"] as const;

const ARROW_UP = {
  s: { d: "M8 3.25 L8 12.75" },
  h1: { d: "M8 3.25 L3.75 7.5" },
  h2: { d: "M8 3.25 L12.25 7.5" },
};

const ICONS = {
  eye: { eye: { d: EYE }, pupil: { d: PUPIL } },
  "eye-off": { eye: { d: EYE }, pupil: { d: PUPIL }, slash: { d: "M2.75 2.75 L13.25 13.25", cut: true } },
  copy: { back: { d: BACK_SHEET }, sheet: SHEET, rim: RIM },
  check: { sheet: CHECK },
  duplicate: { back: { d: BACK_SHEET }, sheet: SHEET, rim: RIM, add: { d: "M9.25 7.5v3.5M7.5 9.25h3.5" } },
  plus: { a: { d: "M3.25 8 L12.75 8" }, b: { d: "M8 12.75 L8 3.25" } },
  close: { a: { d: "M4.75 4.75 L11.25 11.25" }, b: { d: "M4.75 11.25 L11.25 4.75" } },
  minus: { a: { d: "M3.25 8 L12.75 8" } },
  menu: {
    a: { d: "M2.75 4.75 L13.25 4.75" },
    m: { d: "M2.75 8 L13.25 8" },
    b: { d: "M2.75 11.25 L13.25 11.25" },
  },
  "arrow-up": ARROW_UP,
  send: ARROW_UP,
  "arrow-down": {
    s: { d: "M8 3.25 L8 12.75" },
    h1: { d: "M8 12.75 L3.75 8.5" },
    h2: { d: "M8 12.75 L12.25 8.5" },
  },
  "arrow-left": {
    s: { d: "M3.25 8 L12.75 8" },
    h1: { d: "M3.25 8 L7.5 3.75" },
    h2: { d: "M3.25 8 L7.5 12.25" },
  },
  "arrow-right": {
    s: { d: "M3.25 8 L12.75 8", fx: "forward" },
    h1: { d: "M12.75 8 L8.5 3.75", fx: "forward" },
    h2: { d: "M12.75 8 L8.5 12.25", fx: "forward" },
  },
  "chevron-up": { a: { d: CHEVRON_V[0], rot: -45 }, b: { d: CHEVRON_V[1], rot: 45 } },
  "chevron-down": { a: { d: CHEVRON_V[0], rot: 45 }, b: { d: CHEVRON_V[1], rot: -45 } },
  "chevron-left": { a: { d: CHEVRON_H[0], rot: -45 }, b: { d: CHEVRON_H[1], rot: 45 } },
  "chevron-right": { a: { d: CHEVRON_H[0], rot: 45 }, b: { d: CHEVRON_H[1], rot: -45 } },
  stop: { block: { d: "M6 6 L10 6 L10 10 L6 10 Z", block: true } },
  mic: {
    capsule: { d: "M8 2.25a2.25 2.25 0 0 0-2.25 2.25v3.25a2.25 2.25 0 0 0 4.5 0V4.5A2.25 2.25 0 0 0 8 2.25Z" },
    cradle: { d: "M3.75 7.5a4.25 4.25 0 0 0 8.5 0" },
    stand: { d: "M8 11.75v2" },
  },
  // Pause's right bar is drawn with play's commands (a line through its own
  // midpoint), so it bends out into the triangle's point while the left bar
  // stays put: one motion, nothing erased or drawn in. On the glide (seam),
  // so the bar never bows past straight on its way back.
  play: {
    l: { d: "M5.25 12.5 L5.25 3.5", seam: true },
    t: { d: "M5.25 3.5 L12.25 8 L5.25 12.5", seam: true },
  },
  pause: {
    l: { d: "M5.75 12.25 L5.75 3.75", seam: true },
    t: { d: "M10.25 3.75 L10.25 8 L10.25 12.25", seam: true },
  },
  search: {
    ring: { d: "M11.75 7.25a4.5 4.5 0 1 1-9 0a4.5 4.5 0 1 1 9 0" },
    handle: { d: "M10.5 10.5 L13.25 13.25" },
  },
  link: {
    l1: { d: "M6.75 9.25 9.25 6.75" },
    l2: { d: "M7.4 4.6 8.2 3.8a2.65 2.65 0 0 1 3.75 3.75l-.8.8" },
    l3: { d: "M8.6 11.4 7.8 12.2a2.65 2.65 0 0 1-3.75-3.75l.8-.8" },
  },
  download: {
    arrow: { d: "M8 2.75v7M4.75 6.75 8 10l3.25-3.25", fx: "drop" },
    base: { d: "M3 13.25h10" },
  },
  trash: {
    lid: { d: "M2.75 4.5h10.5M6.25 4.5V3.5a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v1", fx: "lid" },
    can: { d: "M4.25 4.5l.6 8a1.35 1.35 0 0 0 1.35 1.25h3.6a1.35 1.35 0 0 0 1.35-1.25l.6-8" },
  },
  external: { out: { d: "M4.75 11.25 11.25 4.75M5.75 4.75h5.5v5.5", fx: "out" } },
  upload: {
    arrow: { d: "M8 10.25v-7.5M4.75 6 8 2.75 11.25 6", fx: "lid" },
    base: { d: "M3 13.25h10" },
  },
  file: {
    sheet: { d: "M4.25 3.75A1.5 1.5 0 0 1 5.75 2.25h3.5l3.5 3.5v6.5a1.5 1.5 0 0 1-1.5 1.5h-5.5a1.5 1.5 0 0 1-1.5-1.5Z" },
    fold: { d: "M9.25 2.5v3.25h3.25" },
  },
  /* The arc runs into a short straight lead, and the head is a clean
     corner at its end, so the two never pile up into a blob. */
  retry: {
    arc: { d: "M13.5 8a5.5 5.5 0 1 1-5.5-5.5c1.54 0 3.01.61 4.12 1.67L13.5 5.5" },
    head: { d: "M13.5 2.44 L13.5 5.5 L10.44 5.5" },
  },
  calendar: {
    body: { d: "M2.75 5.25A1.75 1.75 0 0 1 4.5 3.5h7a1.75 1.75 0 0 1 1.75 1.75v6.5a1.75 1.75 0 0 1-1.75 1.75h-7a1.75 1.75 0 0 1-1.75-1.75Z" },
    bar: { d: "M2.75 7.25 L13.25 7.25" },
    pins: { d: "M5.5 2.25v2.5M10.5 2.25v2.5" },
  },
  /* Dots are near-zero-length strokes drawn by the round cap. */
  info: {
    ring: { d: RING },
    stem: { d: "M8 7.25 L8 11.25" },
    dot: { d: "M8 4.75 L8 4.76" },
  },
  alert: {
    ring: { d: RING },
    stem: { d: "M8 4.75 L8 8.5" },
    dot: { d: "M8 11.25 L8 11.26" },
  },
  "check-circle": {
    ring: { d: RING },
    tick: { d: "M5.5 8.25 L7.25 10 L10.5 6.25" },
  },
  /* Three dots in a row: the overflow menu on a row or a card. */
  more: {
    a: { d: "M3.75 8 L3.76 8" },
    dot: { d: "M8 8 L8.01 8" },
    b: { d: "M12.25 8 L12.26 8" },
  },
  pencil: {
    body: { d: "M10.25 3.25a1.5 1.5 0 0 1 2.12 0l.38.38a1.5 1.5 0 0 1 0 2.12L6.5 12 3 13l1-3.5Z" },
    edge: { d: "M9.25 4.25 L11.75 6.75" },
  },
  /* A panel with its side column: show or hide a sidebar. */
  sidebar: {
    frame: { d: "M2.75 4.5A1.75 1.75 0 0 1 4.5 2.75h7a1.75 1.75 0 0 1 1.75 1.75v7a1.75 1.75 0 0 1-1.75 1.75h-7a1.75 1.75 0 0 1-1.75-1.75Z" },
    rail: { d: "M6.25 2.75 L6.25 13.25" },
  },
  warning: {
    tri: { d: "M6.92 3.1a1.25 1.25 0 0 1 2.16 0l5 8.65a1.25 1.25 0 0 1-1.08 1.875H3a1.25 1.25 0 0 1-1.08-1.875Z" },
    stem: { d: "M8 6.25 L8 9" },
    dot: { d: "M8 11.25 L8 11.26" },
  },
  /* App chrome: places, tools and panes an app's frame needs. Static. */
  home: {
    roof: { d: "M2.25 7.25 8 2.5l5.75 4.75" },
    body: { d: "M3.75 6v6.25a1 1 0 0 0 1 1h6.5a1 1 0 0 0 1-1V6" },
    door: { d: "M6.75 13.25v-3h2.5v3" },
  },
  compose: {
    frame: { d: "M13.25 8.75v3a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5h3" },
    pen: { d: "M11.35 2.65a1.35 1.35 0 0 1 1.9 1.9L8.6 9.2l-2.35.55.55-2.35Z" },
  },
  settings: {
    rails: { d: "M2.75 4.5h4.5M10.25 4.5h3M2.75 11.5h1.5M7.25 11.5h6" },
    knobs: { d: "M8.75 3v3M5.75 10v3" },
  },
  help: {
    ring: { d: RING },
    hook: { d: "M6.25 6.4a1.8 1.8 0 1 1 2.55 1.65c-.5.25-.8.6-.8 1.1v.25" },
    dot: { d: "M8 11.25 L8 11.26" },
  },
  clock: {
    ring: { d: RING },
    hands: { d: "M8 4.75v3.5l2.25 1.5" },
  },
  share: {
    arrow: { d: "M8 9.75v-7M5.25 5.25 8 2.5l2.75 2.75", fx: "lid" },
    tray: { d: "M4.75 7.5h-.5a1.5 1.5 0 0 0-1.5 1.5v2.75a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-.5" },
  },
  folder: {
    body: { d: "M2.75 4.75a1.5 1.5 0 0 1 1.5-1.5h2.3l1.4 1.5h3.8a1.5 1.5 0 0 1 1.5 1.5v5.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5Z" },
  },
  paperclip: {
    clip: { d: "M12.75 7.25 8.1 11.9a2.9 2.9 0 0 1-4.1-4.1l4.85-4.85a1.85 1.85 0 0 1 2.6 2.6L6.6 10.4a.8.8 0 0 1-1.1-1.1l4.35-4.35" },
  },
  at: {
    ring: { d: "M10.5 8v.9a1.85 1.85 0 0 0 3.7 0V8a6.2 6.2 0 1 0-2.45 4.95" },
    core: { d: "M10.5 8a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0" },
  },
  list: {
    lines: { d: "M6.75 4.5h6.5M6.75 8h6.5M6.75 11.5h6.5" },
    dots: { d: "M3.25 4.5h.01M3.25 8h.01M3.25 11.5h.01" },
  },
  terminal: {
    frame: { d: "M2.75 4.5A1.75 1.75 0 0 1 4.5 2.75h7a1.75 1.75 0 0 1 1.75 1.75v7a1.75 1.75 0 0 1-1.75 1.75h-7a1.75 1.75 0 0 1-1.75-1.75Z" },
    prompt: { d: "M5.25 6.25 7 8l-1.75 1.75M8.5 10h2.25" },
  },
  branch: {
    a: { d: "M6.25 4a1.25 1.25 0 1 1-2.5 0a1.25 1.25 0 1 1 2.5 0" },
    b: { d: "M6.25 12a1.25 1.25 0 1 1-2.5 0a1.25 1.25 0 1 1 2.5 0" },
    c: { d: "M12.25 5a1.25 1.25 0 1 1-2.5 0a1.25 1.25 0 1 1 2.5 0" },
    trunk: { d: "M5 5.25v5.5" },
    twig: { d: "M11 6.25v.5a3 3 0 0 1-3 3H7.25a2.25 2.25 0 0 0-2.25 1" },
  },
  /* An amount of effort: a dial and its needle. */
  gauge: {
    dial: { d: "M2.75 11.75a5.25 5.25 0 1 1 10.5 0" },
    needle: { d: "M8 11.75l2.5-3.5" },
  },
  /* A panel with its column on the other side: show or hide a side panel at the end. */
  panel: {
    frame: { d: "M2.75 4.5A1.75 1.75 0 0 1 4.5 2.75h7a1.75 1.75 0 0 1 1.75 1.75v7a1.75 1.75 0 0 1-1.75 1.75h-7a1.75 1.75 0 0 1-1.75-1.75Z" },
    rail: { d: "M9.75 2.75 L9.75 13.25" },
  },
  /* What happened to a file: one rounded square, and inside it a plus, a
     dot, a minus or an arrow. They share the square and the bar, so a file
     whose change kind moves morphs only the mark. */
  "diff-added": {
    frame: { d: CHANGE_FRAME },
    bar: { d: "M5.5 8 L10.5 8" },
    stem: { d: "M8 10.5 L8 5.5" },
  },
  "diff-modified": {
    frame: { d: CHANGE_FRAME },
    dot: { d: "M8 8 L8.01 8", block: true },
  },
  "diff-removed": {
    frame: { d: CHANGE_FRAME },
    bar: { d: "M5.5 8 L10.5 8" },
  },
  "diff-renamed": {
    frame: { d: CHANGE_FRAME },
    bar: { d: "M5.5 8 L10.5 8" },
    head: { d: "M8.5 6 L10.5 8 L8.5 10" },
  },
} satisfies Record<string, Record<string, Stroke>>;

export type IconName = keyof typeof ICONS;

/** Every name in the set, in table order. */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

type Live = { id: string; key: string; s: Stroke; on: boolean; enter: boolean };
type State = { name: IconName; gen: number; live: Live[] };

const table = ICONS as Record<IconName, Record<string, Stroke>>;

/** Command letters and argument counts: `d` interpolates only when these match. */
const shape = (d: string) =>
  (d.match(/[a-zA-Z][^a-zA-Z]*/g) ?? []).map((c) => c[0] + ((c.slice(1).match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).length)).join();

let morphD: boolean | undefined;
const canMorphD = () => (morphD ??= typeof CSS !== "undefined" && CSS.supports("d", 'path("M0 0")'));

function morphs(from: Stroke, to: Stroke) {
  if (Boolean(from.block) !== Boolean(to.block) || Boolean(from.cut) !== Boolean(to.cut)) return false;
  return from.d === to.d || (canMorphD() && shape(from.d) === shape(to.d));
}

function initial(name: IconName): State {
  return {
    name,
    gen: 0,
    live: Object.entries(table[name]).map(([key, s]) => ({ id: `${key}.0`, key, s, on: true, enter: false })),
  };
}

function next(prev: State, name: IconName): State {
  const want = table[name];
  const gen = prev.gen + 1;
  const taken = new Set<string>();
  const live: Live[] = [];
  for (const l of [...prev.live].sort((a, b) => Number(b.on) - Number(a.on))) {
    const s = want[l.key];
    if (s && !taken.has(l.key) && morphs(l.s, s)) {
      taken.add(l.key);
      live.push({ ...l, s, on: true, enter: !l.on });
    } else {
      live.push({ ...l, on: false, enter: false });
    }
  }
  for (const [key, s] of Object.entries(want)) {
    if (!taken.has(key)) live.push({ id: `${key}.${gen}`, key, s, on: true, enter: true });
  }
  const gone = live.filter((l) => !l.on);
  const drop = new Set(gone.slice(0, Math.max(0, gone.length - 8)).map((l) => l.id));
  return { name, gen, live: live.filter((l) => !drop.has(l.id)) };
}

const HIDE = 0.3;

// CSS `d` is set only after the first change; until then the attribute draws.
function dash(l: Live, morphing: boolean): CSSProperties | undefined {
  const f = l.s.f ?? 0;
  const t = l.s.t ?? 1;
  const len = t - f;
  const off = f === 0 ? len + HIDE : -(1 + HIDE);
  const style = {
    d: morphing ? `path("${l.s.d}")` : undefined,
    rotate: l.s.rot ? `${l.s.rot}deg` : undefined,
    "--len": len === 1 ? undefined : len,
    "--on": f === 0 ? undefined : -f,
    "--off": off === 1 + HIDE ? undefined : off,
  } as CSSProperties;
  return Object.values(style).some((v) => v !== undefined) ? style : undefined;
}

export type IconProps = Omit<ComponentProps<"svg">, "children"> & { name: IconName };

export function Icon({ name, className, ...props }: IconProps) {
  const [state, setState] = useState(() => initial(name));
  const mask = `icon-cut-${useId()}`;
  if (state.name !== name) setState(next(state, name));

  const cuts = state.live.filter((l) => l.s.cut);
  const path = (l: Live, extra?: string) => (
    <path
      key={l.id + (extra ?? "")}
      d={l.s.d}
      pathLength={1}
      className={[styles.stroke, l.s.block && styles.block, l.s.seam && styles.seam, l.s.fx && styles[l.s.fx], extra].filter(Boolean).join(" ")}
      data-off={l.on ? undefined : ""}
      data-enter={l.enter ? "" : undefined}
      style={dash(l, state.gen > 0)}
      onTransitionEnd={
        l.on || extra
          ? undefined
          : (e) => {
              if (e.propertyName === "stroke-dashoffset") {
                setState((s) => ({ ...s, live: s.live.filter((x) => x.id !== l.id || x.on) }));
              }
            }
      }
    />
  );

  return (
    // Size attributes keep it from drawing huge before CSS loads.
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      data-icon={name}
      data-ready={state.gen > 0 ? "" : undefined}
      className={className ? `${styles.icon} ${className}` : styles.icon}
      {...props}
    >
      {cuts.length > 0 && (
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
          <rect width="16" height="16" fill="white" stroke="none" />
          {cuts.map((l) => path(l, styles.cut))}
        </mask>
      )}
      <g mask={cuts.length > 0 ? `url(#${mask})` : undefined}>{state.live.filter((l) => !l.s.cut).map((l) => path(l))}</g>
      {cuts.map((l) => path(l))}
    </svg>
  );
}
