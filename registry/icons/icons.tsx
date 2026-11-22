"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import styles from "./icons.module.css";

/*
 * Each icon is a few keyed strokes on a 16px grid. When `name` changes, the
 * ink on screen becomes the new icon: every stroke is paired with the stroke
 * of the new icon it is nearest to and its points travel there, so nothing
 * fades out and nothing is redrawn. A stroke with no partner grows out of
 * the ink beside it, or shrinks into it. Strokes that keep their key and
 * their command list (copy's sheet and the check) move command by command,
 * so a drawn correspondence holds. Every point travels a straight line to its
 * place, so nothing spins or pivots: the least movement that gets there.
 */

type Stroke = {
  d: string;
  /** A strike drawn across the icon (the eye's slash): it draws on and
   *  retracts along its own length, and cuts a gap in the strokes under it. */
  cut?: boolean;
  /** Draw as a solid rounded block. */
  block?: boolean;
  /** A dot that reads as a point (the overflow menu's three, a grip's six):
   *  at the line's own weight it's a speck, so it draws at twice the line. */
  pip?: boolean;
  /** A filled shape with softly rounded corners (play, pause, stop). */
  solid?: boolean;
  /** Nudges 1px while the parent control is hovered or focused. */
  fx?: "lid" | "drop" | "out" | "forward";
};

/* Copy's front sheet is two strokes that meet end to end: `sheet` (left
   edge, bottom-left corner, bottom edge) and `rim` (the rest), so a change
   that keeps the sheet (duplicate) can redraw the rim alone. */
const SHEET = {
  d: "M5.76 5.76 C5.43 6.09 5.25 6.54 5.25 7 L5.25 11.5 C5.25 12.47 6.03 13.25 7 13.25 L11.5 13.25",
} satisfies Stroke;
const RIM = {
  d: "M5.76 5.76A1.75 1.75 0 0 1 7 5.25H11.5A1.75 1.75 0 0 1 13.25 7V11.5A1.75 1.75 0 0 1 11.5 13.25",
} satisfies Stroke;
const CHECK = {
  d: "M3.75 8.25 L6.75 11.25 L12.75 5.25",
} satisfies Stroke;
const BACK_SHEET = "M9.25 2.75H4.5A1.75 1.75 0 0 0 2.75 4.5V9.25";
const EYE = "M1.75 8C3.1 5.1 5.4 3.5 8 3.5s4.9 1.6 6.25 4.5C12.9 10.9 10.6 12.5 8 12.5S3.1 10.9 1.75 8Z";
const PUPIL = "M6 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0";
const RING = "M14.25 8a6.25 6.25 0 1 1-12.5 0a6.25 6.25 0 1 1 12.5 0";
const CHANGE_FRAME = "M2.75 5.75a3 3 0 0 1 3-3h4.5a3 3 0 0 1 3 3v4.5a3 3 0 0 1-3 3h-4.5a3 3 0 0 1-3-3Z";

const ARROW_UP = {
  s: { d: "M8 3.25 L8 12.75" },
  h1: { d: "M8 3.25 L3.75 7.5" },
  h2: { d: "M8 3.25 L12.25 7.5" },
};

const ICONS = {
  eye: { eye: { d: EYE }, pupil: { d: PUPIL } },
  "eye-off": { eye: { d: EYE }, pupil: { d: PUPIL }, slash: { d: "M2.75 2.75 L13.25 13.25", cut: true } },
  copy: { back: { d: BACK_SHEET }, sheet: SHEET, rim: RIM },
  check: { tick: CHECK },
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
  // Two arms that meet at the point. A flip turns each arm about its own
  // middle, through level, so the chevron keeps its size and stays centered.
  "chevron-up": { a: { d: "M3.75 10.125 L8 5.875" }, b: { d: "M8 5.875 L12.25 10.125" } },
  "chevron-down": { a: { d: "M3.75 5.875 L8 10.125" }, b: { d: "M8 10.125 L12.25 5.875" } },
  "chevron-left": { a: { d: "M10.12 3.75 L5.88 8" }, b: { d: "M5.88 8 L10.12 12.25" } },
  "chevron-right": { a: { d: "M5.88 3.75 L10.12 8" }, b: { d: "M10.12 8 L5.88 12.25" } },
  // Play, pause and stop are solid. Between the three they reshape in place
  // as two halves (see QUADS); to any other icon they move like the rest.
  stop: { a: { d: "M4.5 4.5 L11.5 4.5 L11.5 11.5 L4.5 11.5 Z", solid: true } },
  mic: {
    capsule: { d: "M8 2.25a2.25 2.25 0 0 0-2.25 2.25v3.25a2.25 2.25 0 0 0 4.5 0V4.5A2.25 2.25 0 0 0 8 2.25Z" },
    cradle: { d: "M3.75 7.5a4.25 4.25 0 0 0 8.5 0" },
    stand: { d: "M8 11.75v2" },
  },
  play: { a: { d: "M4.75 3 L12.75 8 L4.75 13 Z", solid: true } },
  pause: {
    a: { d: "M4.25 3.5 L6 3.5 L6 12.5 L4.25 12.5 Z", solid: true },
    b: { d: "M10 3.5 L11.75 3.5 L11.75 12.5 L10 12.5 Z", solid: true },
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
    a: { d: "M3.75 8 L3.76 8", pip: true },
    dot: { d: "M8 8 L8.01 8", pip: true },
    b: { d: "M12.25 8 L12.26 8", pip: true },
  },
  /* Six dots in two columns: a handle to drag something by. */
  grip: {
    a: { d: "M6 3.75 L6.01 3.75 M6 8 L6.01 8 M6 12.25 L6.01 12.25", pip: true },
    b: { d: "M10 3.75 L10.01 3.75 M10 8 L10.01 8 M10 12.25 L10.01 12.25", pip: true },
  },
  /* Rating a reply. Down is up turned half round, point for point, so the
     two share keys and a flip morphs. Fill the icon (fill: currentColor on
     the svg) to show the rating is pressed. */
  "thumbs-up": {
    hand: { d: "M5.25 7.25 L7.6 2.5c.95 0 1.65.85 1.5 1.8l-.35 2.2h3.05a1.4 1.4 0 0 1 1.37 1.7l-.95 4.2a1.4 1.4 0 0 1-1.37 1.1H5.25Z" },
    cuff: { d: "M5.25 7.25h-1.5a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h1.5Z" },
  },
  "thumbs-down": {
    hand: { d: "M10.75 8.75 L8.4 13.5c-.95 0-1.65-.85-1.5-1.8l.35-2.2h-3.05a1.4 1.4 0 0 1-1.37-1.7l.95-4.2a1.4 1.4 0 0 1 1.37-1.1H10.75Z" },
    cuff: { d: "M10.75 8.75h1.5a1 1 0 0 0 1-1v-4.5a1 1 0 0 0-1-1h-1.5Z" },
  },
  /* A push pin: keep a chat or an item at the top. */
  pin: {
    head: { d: "M5.25 2.75h5.5M6.5 2.75v3.5l-2 3h7l-2-3v-3.5" },
    point: { d: "M8 9.25v4" },
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
  inbox: {
    tray: { d: "M2.75 8.75 4.2 3.9a1.5 1.5 0 0 1 1.44-1.15h4.72a1.5 1.5 0 0 1 1.44 1.15l1.45 4.85v2.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5Z" },
    slot: { d: "M2.75 8.75h2.75l1 1.5h3l1-1.5h2.75" },
  },
  user: {
    head: { d: "M10.25 5.25a2.25 2.25 0 1 1-4.5 0a2.25 2.25 0 1 1 4.5 0" },
    shoulders: { d: "M3.25 13.25c.6-2.3 2.45-3.5 4.75-3.5s4.15 1.2 4.75 3.5" },
  },
  snooze: {
    moon: { d: "M12.9 9.6A5.25 5.25 0 0 1 6.4 3.1a5.25 5.25 0 1 0 6.5 6.5Z" },
  },
  sparkle: {
    star: { d: "M7.25 2.75c.35 2.45 1.8 3.9 4.25 4.25-2.45.35-3.9 1.8-4.25 4.25C6.9 8.8 5.45 7.35 3 7c2.45-.35 3.9-1.8 4.25-4.25Z" },
    spark: { d: "M12.25 10.5v2.75M10.875 11.875h2.75" },
  },
  tag: {
    body: { d: "M2.75 3.75v3.6a1 1 0 0 0 .3.7l5.6 5.6a1 1 0 0 0 1.4 0l3.6-3.6a1 1 0 0 0 0-1.4L8.05 3.05a1 1 0 0 0-.7-.3h-3.6a1 1 0 0 0-1 1Z" },
    hole: { d: "M5.5 5.5 L5.5 5.51" },
  },
  book: {
    pages: { d: "M8 4.25C6.75 3.25 5.1 2.75 2.75 2.75v9c2.35 0 4 .5 5.25 1.5M8 4.25c1.25-1 2.9-1.5 5.25-1.5v9c-2.35 0-4 .5-5.25 1.5" },
    spine: { d: "M8 4.25v9" },
  },
  at: {
    ring: { d: "M10.5 8v.9a1.85 1.85 0 0 0 3.7 0V8a6.2 6.2 0 1 0-2.45 4.95" },
    core: { d: "M10.5 8a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0" },
  },
  list: {
    lines: { d: "M6.75 4.5h6.5M6.75 8h6.5M6.75 11.5h6.5" },
    dots: { d: "M3.25 4.5h.01M3.25 8h.01M3.25 11.5h.01", pip: true },
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

const table = ICONS as Record<IconName, Record<string, Stroke>>;

/* ---------- Geometry ---------- */

type Pt = readonly [number, number];
type Seg = (t: number) => Pt;

/** One unbroken line of an icon: a subpath of a stroke. */
type Strand = {
  /** Stroke key and subpath index: the same strand in another icon. */
  key: string;
  /** The subpath on its own, as drawn at rest. */
  d: string;
  /** Command list: two strands with the same one move command by command. */
  sig: string;
  closed: boolean;
  /** N points evenly along its length, corners kept. */
  pts: Pt[];
  /** N points, the same number on each command. */
  seg: Pt[];
  /** Its two ends, when it is a straight line. */
  line?: [Pt, Pt];
  cls: string;
};

/** Points per strand. One more than a number many command counts divide. */
const N = 49;
const NUM = /-?(?:\d+\.\d+|\.\d+|\d+)(?:e-?\d+)?/g;
const ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };

const lineSeg = (x0: number, y0: number, x1: number, y1: number): Seg => (t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];

const cubicSeg = (p: number[]): Seg => (t) => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const e = t * t * t;
  return [a * p[0] + b * p[2] + c * p[4] + e * p[6], a * p[1] + b * p[3] + c * p[5] + e * p[7]];
};

/** An SVG arc from its end points (the spec's conversion to a center). */
function arcSeg(x0: number, y0: number, rx: number, ry: number, deg: number, large: number, sweep: number, x1: number, y1: number): Seg {
  if (!rx || !ry) return lineSeg(x0, y0, x1, y1);
  const phi = (deg * Math.PI) / 180;
  const sin = Math.sin(phi);
  const cos = Math.cos(phi);
  const dx = (x0 - x1) / 2;
  const dy = (y0 - y1) / 2;
  const px = cos * dx + sin * dy;
  const py = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const grow = Math.sqrt((px * px) / (rx * rx) + (py * py) / (ry * ry));
  if (grow > 1) {
    rx *= grow;
    ry *= grow;
  }
  const den = rx * rx * py * py + ry * ry * px * px;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (rx * rx * ry * ry - den) / den));
  const cxp = (k * rx * py) / ry;
  const cyp = (-k * ry * px) / rx;
  const cx = cos * cxp - sin * cyp + (x0 + x1) / 2;
  const cy = sin * cxp + cos * cyp + (y0 + y1) / 2;
  const a0 = Math.atan2((py - cyp) / ry, (px - cxp) / rx);
  let da = Math.atan2((-py - cyp) / ry, (-px - cxp) / rx) - a0;
  if (sweep && da < 0) da += 2 * Math.PI;
  if (!sweep && da > 0) da -= 2 * Math.PI;
  return (t) => {
    const a = a0 + da * t;
    const ex = rx * Math.cos(a);
    const ey = ry * Math.sin(a);
    return [cx + cos * ex - sin * ey, cy + sin * ex + cos * ey];
  };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** N points along a polyline, evenly by length. `keep` are lengths (corners)
 *  the nearest point snaps to, so a sharp corner stays sharp. */
function resample(line: Pt[], keep: number[] = []): Pt[] {
  const at = [0];
  for (let i = 1; i < line.length; i++) at.push(at[i - 1] + dist(line[i - 1], line[i]));
  const total = at[at.length - 1];
  if (total === 0) return Array.from({ length: N }, () => line[0]);
  const point = (len: number): Pt => {
    let i = 1;
    while (i < at.length - 1 && at[i] < len) i++;
    const span = at[i] - at[i - 1] || 1;
    const t = (len - at[i - 1]) / span;
    return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
  };
  const out = Array.from({ length: N }, (_, i) => point((total * i) / (N - 1)));
  for (const len of keep) out[Math.round((len / total) * (N - 1))] = point(len);
  return out;
}

function strandsOf(key: string, s: Stroke): Strand[] {
  const out: Strand[] = [];
  const cls = [styles.strand, s.solid && styles.solid, s.block && styles.block, s.pip && styles.pip, s.fx && styles[s.fx]].filter(Boolean).join(" ");
  let segs: Seg[] = [];
  let sig = "";
  let d = "";
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cx = 0;
  let cy = 0;
  const finish = (closed: boolean) => {
    if (!segs.length) return;
    const fine: Pt[] = [];
    const corners: number[] = [];
    let len = 0;
    for (const seg of segs) {
      for (let i = fine.length ? 1 : 0; i <= 16; i++) {
        const p = seg(i / 16);
        if (fine.length) len += dist(fine[fine.length - 1], p);
        fine.push(p);
      }
      corners.push(len);
    }
    const per = Math.floor((N - 1) / segs.length);
    const seg: Pt[] = [];
    for (const one of segs) for (let i = 0; i < per; i++) seg.push(one(i / per));
    const last = segs[segs.length - 1](1);
    while (seg.length < N) seg.push(last);
    const a = fine[0];
    const b = fine[fine.length - 1];
    const straight = len > 0.5 && Math.abs(len - dist(a, b)) < 0.001;
    out.push({ key: `${key}#${out.length}`, d, sig, closed, cls, pts: resample(fine, corners.slice(0, -1)), seg, line: straight ? [a, b] : undefined });
    segs = [];
    sig = "";
  };
  for (const cmd of s.d.match(/[a-zA-Z][^a-zA-Z]*/g) ?? []) {
    const c = cmd[0];
    const up = c.toUpperCase();
    const rel = c !== up;
    const n = (cmd.slice(1).match(NUM) ?? []).map(Number);
    const arity = ARITY[up] ?? 0;
    if (up === "Z") {
      if (dist([x, y], [sx, sy]) > 0.001) {
        segs.push(lineSeg(x, y, sx, sy));
        sig += "L";
      }
      d += "Z";
      finish(true);
      x = sx;
      y = sy;
      continue;
    }
    for (let i = 0; i + arity <= n.length; i += arity) {
      const a = n.slice(i, i + arity);
      const ox = rel ? x : 0;
      const oy = rel ? y : 0;
      if (up === "M" && i === 0) {
        finish(false);
        x = sx = a[0] + ox;
        y = sy = a[1] + oy;
        d = `M${r2(x)} ${r2(y)}`;
        continue;
      }
      // Coordinates after the first pair of an M are lines.
      const as = up === "M" ? "L" : up;
      const word = up === "M" ? (rel ? "l" : "L") : c;
      if (!d) d = `M${r2(x)} ${r2(y)}`;
      d += word + a.join(" ");
      let nx = x;
      let ny = y;
      if (as === "L") [nx, ny] = [a[0] + ox, a[1] + oy];
      else if (as === "H") nx = a[0] + ox;
      else if (as === "V") ny = a[0] + oy;
      else [nx, ny] = [a[arity - 2] + ox, a[arity - 1] + oy];
      if (as === "C") {
        segs.push(cubicSeg([x, y, a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy, nx, ny]));
        [cx, cy] = [a[2] + ox, a[3] + oy];
      } else if (as === "S") {
        const prev = sig.endsWith("C");
        segs.push(cubicSeg([x, y, prev ? 2 * x - cx : x, prev ? 2 * y - cy : y, a[0] + ox, a[1] + oy, nx, ny]));
        [cx, cy] = [a[0] + ox, a[1] + oy];
      } else if (as === "Q") {
        const qx = a[0] + ox;
        const qy = a[1] + oy;
        segs.push(cubicSeg([x, y, x + ((qx - x) * 2) / 3, y + ((qy - y) * 2) / 3, nx + ((qx - nx) * 2) / 3, ny + ((qy - ny) * 2) / 3, nx, ny]));
      } else if (as === "A") {
        segs.push(arcSeg(x, y, a[0], a[1], a[2], a[3], a[4], nx, ny));
      } else {
        segs.push(lineSeg(x, y, nx, ny));
      }
      sig += as === "S" || as === "Q" ? "C" : as === "A" ? "A" : as === "C" ? "C" : "L";
      x = nx;
      y = ny;
    }
  }
  finish(false);
  return out;
}

const cache = new Map<IconName, Strand[]>();

/** The strands of an icon, without its strikes (those are drawn by CSS). */
function strands(name: IconName): Strand[] {
  let all = cache.get(name);
  if (!all) {
    all = Object.entries(table[name]).flatMap(([key, s]) => (s.cut ? [] : strandsOf(key, s)));
    cache.set(name, all);
  }
  return all;
}

/** `to`, turned the way that moves `from` least: an open line may run from
 *  either end, a closed one may also start anywhere round its loop. */
function align(from: Pt[], to: Pt[], closed: boolean): { pts: Pt[]; cost: number } {
  let best = to;
  let least = Infinity;
  const tryOne = (pts: Pt[]) => {
    let sum = 0;
    for (let i = 0; i < N; i += 2) sum += (from[i][0] - pts[i][0]) ** 2 + (from[i][1] - pts[i][1]) ** 2;
    // A near-tie keeps the drawn order: two mirror-image strands (a
    // chevron's arms) must not break the same tie two different ways.
    if (sum < least - 1e-6) {
      least = sum;
      best = pts;
    }
  };
  const turned = (pts: Pt[], by: number) => {
    const ring = pts.slice(0, N - 1);
    const out = ring.slice(by).concat(ring.slice(0, by));
    out.push(out[0]);
    return out;
  };
  for (const pts of [to, [...to].reverse()]) {
    tryOne(pts);
    if (closed) for (let by = 3; by < N - 1; by += 3) tryOne(turned(pts, by));
  }
  return { pts: best, cost: Math.sqrt(least / Math.ceil(N / 2)) };
}

/** The cheapest way to give every row its own column (rows ≤ columns). */
function assign(cost: number[][]): number[] {
  const rows = cost.length;
  const cols = cost[0]?.length ?? 0;
  let best: number[] = [];
  let least = Infinity;
  const pick: number[] = [];
  const used = new Array<boolean>(cols).fill(false);
  const walk = (row: number, sum: number) => {
    if (sum >= least) return;
    if (row === rows) {
      least = sum;
      best = [...pick];
      return;
    }
    for (let c = 0; c < cols; c++) {
      if (used[c]) continue;
      used[c] = true;
      pick[row] = c;
      walk(row + 1, sum + cost[row][c]);
      used[c] = false;
    }
  };
  walk(0, 0);
  return best;
}

/** The two closest points of two sets: where new ink buds from old, or old folds into new. */
function nearest(of: Pt[], among: Pt[][]): Pt {
  let best = among[0]?.[0] ?? of[0];
  let least = Infinity;
  for (const pts of among) {
    for (let i = 0; i < pts.length; i += 2) {
      for (let j = 0; j < of.length; j += 4) {
        const far = (pts[i][0] - of[j][0]) ** 2 + (pts[i][1] - of[j][1]) ** 2;
        if (far < least) {
          least = far;
          best = pts[i];
        }
      }
    }
  }
  return best;
}

/* Play, pause and stop reshape in place, with the least movement: each is
   two four-corner halves, left and right, corners in the same order (top
   left, top right, bottom right, bottom left). Play's triangle is cut down
   its middle, so going to pause each half squares off into the bar beside
   it and every corner travels a short straight line. Nothing turns, and
   nothing crosses. */
type Quad = [Pt, Pt, Pt, Pt];
const QUADS: Partial<Record<IconName, [Quad, Quad]>> = {
  play: [
    [[4.75, 3], [8.75, 5.5], [8.75, 10.5], [4.75, 13]],
    [[8.75, 5.5], [12.75, 8], [12.75, 8], [8.75, 10.5]],
  ],
  pause: [
    [[4.25, 3.5], [6, 3.5], [6, 12.5], [4.25, 12.5]],
    [[10, 3.5], [11.75, 3.5], [11.75, 12.5], [10, 12.5]],
  ],
  stop: [
    [[4.5, 4.5], [8, 4.5], [8, 11.5], [4.5, 11.5]],
    [[8, 4.5], [11.5, 4.5], [11.5, 11.5], [8, 11.5]],
  ],
};
const halves = (from: IconName, to: IconName) => from !== to && QUADS[from] !== undefined && QUADS[to] !== undefined;

/* ---------- The engine: owns the strands once an icon has changed ---------- */

type El = {
  node: SVGPathElement;
  /** What it is becoming (or, for one that is leaving, what it was). */
  strand: Strand;
  /** Folding into the new ink; removed when it lands. */
  leaving: boolean;
  /** Where its points are now. */
  now: Pt[];
  from: Pt[];
  to: Pt[];
  /** A half of play, pause or stop reshaping in place. */
  quad?: { from: Quad; to: Quad; now: Quad };
  /** A strand with no partner: it draws on along its own line (grow) or
   *  erases back along it (shrink), from the end nearest the other icon's
   *  ink, so it never travels sideways. */
  trim?: { pts: Pt[]; grow: boolean };
  still: boolean;
};

/* Copy and check swap rather than morph: two shapes this different only
   tangle on the way. The one leaving shrinks a little and fades fast; the
   one arriving pops up from smaller on the bounce, and the check draws its
   stroke as it comes. Both stay centred, so nothing travels. */
const swaps = (a: IconName, b: IconName) => (a === "copy" && b === "check") || (a === "check" && b === "copy");
/** How small a swapped icon is when it's gone. */
const SWAP_SMALL = 0.6;

/** CSS cubic-bezier(x1, y1, x2, y2) at time `t`. */
function bezier(x1: number, y1: number, x2: number, y2: number, t: number) {
  const at = (a: number, b: number, u: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  let lo = 0;
  let hi = 1;
  let u = t;
  for (let i = 0; i < 24; i++) {
    u = (lo + hi) / 2;
    if (at(x1, x2, u) < t) lo = u;
    else hi = u;
  }
  return at(y1, y2, u);
}

/** `pts` turned so it starts at the end nearer `ink`. */
function fromNearEnd(pts: Pt[], ink: Pt[][]): Pt[] {
  const near = (p: Pt) => dist(p, nearest([p], ink));
  return near(pts[0]) <= near(pts[pts.length - 1]) ? [...pts] : [...pts].reverse();
}

/** The first `f` (0–1) of a line of points, ending exactly at the cut. */
function head(pts: Pt[], f: number): Pt[] {
  const at = Math.max(0, Math.min(1, f)) * (pts.length - 1);
  const whole = Math.floor(at);
  const out = pts.slice(0, whole + 1);
  if (whole < pts.length - 1) {
    const a = pts[whole];
    const b = pts[whole + 1];
    const t = at - whole;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out.length > 1 ? out : [out[0], out[0]];
}

const poly = (pts: Pt[]) => "M" + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join("L");

function createEngine(host: SVGGElement, start: IconName) {
  let name = start;
  let frame = 0;
  let els: El[] = [];

  const make = (strand: Strand, at: Pt[]): El => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
    node.setAttribute("class", strand.cls);
    host.appendChild(node);
    return { node, strand, leaving: false, now: at, from: at, to: at, still: true };
  };
  const rest = (el: El) => {
    el.node.setAttribute("d", el.strand.d);
    el.now = el.strand.pts;
    el.quad = el.trim = undefined;
    el.node.style.opacity = "";
    el.still = true;
  };
  /** The icon as it rests, on fresh strands. */
  const lay = (icon: IconName) => {
    for (const el of els) el.node.remove();
    els = strands(icon).map((strand) => {
      const el = make(strand, strand.pts);
      rest(el);
      return el;
    });
  };
  const settle = () => {
    // The halves of a quarter turn give way to the icon's own strands.
    if (els.some((el) => el.quad)) return lay(name);
    for (const el of els) {
      if (el.leaving) el.node.remove();
      else rest(el);
    }
    els = els.filter((el) => !el.leaving);
  };

  lay(start);

  /** The glide token, read from the page: its curve and its length. */
  const timing = () => {
    const css = getComputedStyle(host);
    const stops = /linear\(([^)]+)\)/.exec(css.getPropertyValue("--ui-ease-glide"))?.[1].split(",").map(parseFloat) ?? [];
    const raw = css.getPropertyValue("--ui-dur-glide").trim();
    const ms = parseFloat(raw) * (/\ds$/.test(raw) && !raw.endsWith("ms") ? 1000 : 1) || 320;
    const ease =
      stops.length > 1 && !stops.some(Number.isNaN)
        ? (t: number) => {
            const u = t * (stops.length - 1);
            const i = Math.min(stops.length - 2, Math.floor(u));
            return stops[i] + (stops[i + 1] - stops[i]) * (u - i);
          }
        : (t: number) => 1 - (1 + 9.2 * t) * Math.exp(-9.2 * t);
    return { ms, ease };
  };

  /** A duration token in ms, and an easing token as a function: a sampled
   *  spring (linear(...)) or a cubic-bezier. */
  const token = (dur: string, ease: string, fallback: number) => {
    const css = getComputedStyle(host);
    const raw = css.getPropertyValue(dur).trim();
    const ms = parseFloat(raw) * (/\ds$/.test(raw) && !raw.endsWith("ms") ? 1000 : 1) || fallback;
    const val = css.getPropertyValue(ease);
    const stops = /linear\(([^)]+)\)/.exec(val)?.[1].split(",").map(parseFloat);
    if (stops && stops.length > 1 && !stops.some(Number.isNaN)) {
      return {
        ms,
        ease: (t: number) => {
          const u = t * (stops.length - 1);
          const i = Math.min(stops.length - 2, Math.floor(u));
          return stops[i] + (stops[i + 1] - stops[i]) * (u - i);
        },
      };
    }
    const [x1, y1, x2, y2] = /cubic-bezier\(([^)]+)\)/.exec(val)?.[1].split(",").map(parseFloat) ?? [0.2, 1, 0.3, 1];
    return { ms, ease: (t: number) => bezier(x1, y1, x2, y2, t) };
  };

  /** Sets every strand on its way to `next`. */
  function plan(next: IconName) {
    const want = strands(next);
    if (halves(name, next)) {
      // Caught mid-way between two of them, the halves turn round from where
      // they are; from rest, two halves take the place of whatever drew the
      // icon (play and stop are one shape): together they look the same.
      const mid = els.length === 2 && els.every((el) => el.quad) ? els.map((el) => el.quad!.now) : null;
      if (!mid) for (const el of els) el.node.remove();
      const from = mid ?? QUADS[name]!;
      const to = QUADS[next]!;
      els = from.map((quad, i) => {
        const el = mid ? els[i] : make(want[0], []);
        el.strand = want[0];
        el.node.setAttribute("class", el.strand.cls);
        el.quad = { from: quad, to: to[i], now: quad };
        el.leaving = false;
        el.still = false;
        return el;
      });
      return;
    }

    const free = new Set(els);
    const open = new Set(want);
    const move = (el: El, strand: Strand, to: Pt[] | null) => {
      free.delete(el);
      open.delete(strand);
      const resting = el.still;
      const was = el.strand;
      el.leaving = false;
      el.quad = el.trim = undefined;
      el.node.style.opacity = "";
      el.strand = strand;
      el.node.setAttribute("class", strand.cls);
      if (resting && was.d === strand.d) return;
      el.still = false;
      if (to) {
        // The same commands under the same key: command by command.
        el.from = resting ? was.seg : el.now;
        el.to = to;
        return;
      }
      // Every point goes straight to its place: the least movement there is.
      // Nothing pivots or turns on the way.
      el.from = resting ? was.pts : el.now;
      el.to = align(el.from, strand.pts, strand.closed).pts;
    };

    // 1. A strand both icons name and draw with the same commands.
    for (const el of [...free]) {
      if (el.leaving) continue;
      const same = [...open].find((s) => s.key === el.strand.key && (s.d === el.strand.d || s.sig === el.strand.sig));
      if (same) move(el, same, el.still && same.d !== el.strand.d ? same.seg : null);
    }

    // 2. The rest pair off by how little ink has to travel.
    const olds = [...free];
    const news = [...open];
    if (olds.length && news.length) {
      const cost = olds.map((el) => news.map((s) => align(el.now, s.pts, s.closed).cost + (el.strand.cls === s.cls ? 0 : 1)));
      if (olds.length <= news.length) assign(cost).forEach((c, r) => move(olds[r], news[c], null));
      else assign(news.map((_, c) => olds.map((_, r) => cost[r][c]))).forEach((r, c) => move(olds[r], news[c], null));
    }

    // 3. New strands with no partner draw on along their own line, from
    //    the end nearest the ink already there.
    const ink = els.map((el) => el.now);
    for (const strand of open) {
      const el = make(strand, Array.from({ length: N }, () => strand.pts[0]));
      el.trim = { pts: fromNearEnd(strand.pts, ink), grow: true };
      el.still = false;
      els.push(el);
    }

    // 4. Old strands with no partner erase back along their own line, into
    //    the end nearest the new icon's ink.
    const wanted = want.map((s) => s.pts);
    for (const el of free) {
      el.leaving = true;
      el.quad = undefined;
      el.still = false;
      el.trim = { pts: fromNearEnd(el.now, wanted).reverse(), grow: false };
      el.node.setAttribute("class", styles.strand + (el.strand.cls.includes(styles.solid) ? " " + styles.solid : ""));
    }
  }

  function draw(k: number) {
    for (const el of els) {
      if (el.still) continue;
      if (el.trim) {
        // The part of the line from its anchored end, a fraction long.
        // Ink that leaves is gone in the first 60% of the move, so it never
        // lingers beside the new shape; the last stub fades rather than
        // shrinking to the round cap's dot.
        const { pts, grow } = el.trim;
        const f = grow ? k : Math.max(0, 1 - k / 0.6);
        const part = grow ? head(pts, f) : head([...pts].reverse(), f).reverse();
        el.now = resample(part);
        el.node.setAttribute("d", poly(part));
        el.node.style.opacity = f >= 0.25 ? "" : String(f / 0.25);
      } else if (el.quad) {
        const q = el.quad.from.map((p, i) => {
          const g = el.quad!.to[i];
          return [p[0] + (g[0] - p[0]) * k, p[1] + (g[1] - p[1]) * k] as Pt;
        }) as Quad;
        el.quad.now = q;
        el.now = resample([...q, q[0]], []);
        el.node.setAttribute("d", poly(q) + "Z");
      } else {
        el.now = el.from.map((p, i) => [p[0] + (el.to[i][0] - p[0]) * k, p[1] + (el.to[i][1] - p[1]) * k] as Pt);
        el.node.setAttribute("d", poly(el.now));
      }
    }
  }

  /* ---------- Copy ↔ check: the swap (see swaps) ---------- */

  type Layer = { g: SVGGElement; paths: SVGPathElement[]; o: number; s: number; d: number };
  let swap: { copy: Layer; check: Layer } | null = null;

  const paint = (l: Layer, drawn: boolean) => {
    l.g.setAttribute("transform", `translate(8 8) scale(${r2(l.s * 100) / 100}) translate(-8 -8)`);
    l.g.style.opacity = String(Math.max(0, Math.min(1, l.o)));
    l.g.style.visibility = l.o > 0.001 ? "" : "hidden";
    if (drawn) for (const p of l.paths) p.style.strokeDasharray = `${Math.max(0, Math.min(1, l.d))} 2`;
  };
  const endSwap = () => {
    if (!swap) return;
    swap.copy.g.remove();
    swap.check.g.remove();
    swap = null;
  };

  function startSwap(next: IconName) {
    if (!swap) {
      for (const el of els) el.node.remove();
      els = [];
      const layer = (icon: IconName, on: boolean): Layer => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const paths = strands(icon).map((st) => {
          const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
          n.setAttribute("class", st.cls);
          n.setAttribute("d", st.d);
          n.setAttribute("pathLength", "1");
          g.appendChild(n);
          return n;
        });
        host.appendChild(g);
        return { g, paths, o: on ? 1 : 0, s: on ? 1 : SWAP_SMALL, d: on ? 1 : 0 };
      };
      swap = { copy: layer("copy", name === "copy"), check: layer("check", name === "check") };
      paint(swap.copy, false);
      paint(swap.check, true);
    }
    name = next;
    const sw = swap;
    const inn = next === "check" ? sw.check : sw.copy;
    const out = next === "check" ? sw.copy : sw.check;
    // A check that has gone draws again from nothing.
    if (inn === sw.check && inn.o < 0.05) inn.d = 0;
    const o0 = { inO: inn.o, inS: inn.s, inD: inn.d, outO: out.o, outS: out.s };
    const leave = token("--ui-dur-instant", "--ui-ease-exit", 120);
    const pop = token("--ui-dur-bounce", "--ui-ease-bounce", 380);
    const drawOn = token("--ui-dur-base", "--ui-ease-draw", 200);
    const fadeIn = token("--ui-dur-fast", "--ui-ease-enter", 160);
    // The new icon starts once the old one is mostly gone: a sliver of overlap,
    // never both at full strength.
    const lag = leave.ms * 0.75;
    const total = lag + Math.max(pop.ms, drawOn.ms, fadeIn.ms);
    const began = performance.now();
    const part = (now: number, from: number, ms: number) => Math.min(1, Math.max(0, (now - began - from) / ms));
    const step = (now: number) => {
      const lt = leave.ease(part(now, 0, leave.ms));
      out.o = o0.outO * (1 - lt);
      out.s = o0.outS + (SWAP_SMALL - o0.outS) * lt;
      inn.o = o0.inO + (1 - o0.inO) * fadeIn.ease(part(now, lag, fadeIn.ms));
      inn.s = o0.inS + (1 - o0.inS) * pop.ease(part(now, lag, pop.ms));
      inn.d = o0.inD + (1 - o0.inD) * drawOn.ease(part(now, lag, drawOn.ms));
      paint(out, out === sw.check);
      paint(inn, inn === sw.check);
      if (now - began >= total) {
        frame = 0;
        endSwap();
        lay(name);
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  return {
    to(next: IconName) {
      if (next === name) return;
      cancelAnimationFrame(frame);
      frame = 0;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        endSwap();
        name = next;
        lay(next);
        return;
      }
      if (swaps(name, next)) return startSwap(next);
      // Anything else ends the swap on the icon it was heading for.
      if (swap) {
        endSwap();
        lay(name);
        if (next === name) return;
      }
      plan(next);
      name = next;
      const { ms, ease } = timing();
      const began = performance.now();
      draw(0);
      const step = (now: number) => {
        // A frame's time can sit a hair before the moment the move began.
        const t = Math.min(1, Math.max(0, (now - began) / ms));
        if (t === 1) {
          frame = 0;
          settle();
          return;
        }
        const k = ease(t);
        draw(k);
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    },
    stop() {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
      if (swap) {
        endSwap();
        lay(name);
      } else settle();
    },
  };
}

/* ---------- Strikes: drawn on and retracted by CSS ---------- */

type Cut = { id: string; key: string; s: Stroke; on: boolean; enter: boolean };

const cutsOf = (name: IconName) => Object.entries(table[name]).filter(([, s]) => s.cut);

function nextCuts(prev: Cut[], name: IconName, gen: number): Cut[] {
  const want = new Map(cutsOf(name));
  const out: Cut[] = [];
  for (const c of prev) {
    if (want.has(c.key) && c.on) {
      want.delete(c.key);
      out.push(c);
    } else if (want.has(c.key)) {
      want.delete(c.key);
      out.push({ ...c, on: true, enter: true });
    } else {
      out.push({ ...c, on: false, enter: false });
    }
  }
  for (const [key, s] of want) out.push({ id: `${key}.${gen}`, key, s, on: true, enter: true });
  return out;
}

export type IconProps = Omit<ComponentProps<"svg">, "children"> & { name: IconName };

export function Icon({ name, className, ...props }: IconProps) {
  const [state, setState] = useState(() => ({
    name,
    /** The icon it showed before it first changed: where the engine starts. */
    first: name,
    gen: 0,
    cuts: cutsOf(name).map(([key, s]): Cut => ({ id: `${key}.0`, key, s, on: true, enter: false })),
  }));
  if (state.name !== name) setState({ name, first: state.first, gen: state.gen + 1, cuts: nextCuts(state.cuts, name, state.gen + 1) });

  const mask = `icon-cut-${useId()}`;
  const host = useRef<SVGGElement>(null);
  const engine = useRef<ReturnType<typeof createEngine> | null>(null);

  // Before paint: the engine takes the strands over on the first change, and
  // heads for the new icon from wherever the ink is.
  useLayoutEffect(() => {
    if (state.gen === 0 || !host.current) return;
    engine.current ??= createEngine(host.current, state.first);
    engine.current.to(state.name);
  }, [state.gen, state.name, state.first]);
  useEffect(() => () => engine.current?.stop(), []);

  const cut = (c: Cut, extra?: string) => (
    <path
      key={c.id + (extra ?? "")}
      d={c.s.d}
      pathLength={1}
      className={extra ? `${styles.stroke} ${extra}` : styles.stroke}
      data-off={c.on ? undefined : ""}
      data-enter={c.enter ? "" : undefined}
      onTransitionEnd={
        c.on || extra
          ? undefined
          : (e) => {
              if (e.propertyName === "stroke-dashoffset") setState((s) => ({ ...s, cuts: s.cuts.filter((x) => x.id !== c.id || x.on) }));
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
      {state.cuts.length > 0 && (
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
          <rect width="16" height="16" fill="white" stroke="none" />
          {state.cuts.map((c) => cut(c, styles.cut))}
        </mask>
      )}
      <g mask={state.cuts.length > 0 ? `url(#${mask})` : undefined}>
        {/* Until the first change the strokes are plain markup, as the server sent them. */}
        {state.gen === 0 &&
          Object.entries(table[name]).map(([key, s]) =>
            s.cut ? null : (
              <path
                key={key}
                d={s.d}
                className={[styles.strand, s.solid && styles.solid, s.block && styles.block, s.pip && styles.pip, s.fx && styles[s.fx]].filter(Boolean).join(" ")}
              />
            ),
          )}
        <g ref={host} />
      </g>
      {state.cuts.map((c) => cut(c))}
    </svg>
  );
}
