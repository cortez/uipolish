"use client";

import { useLayoutEffect, useRef, useState } from "react";
import styles from "./text-morph.module.css";

type Glyph = { key: string; char: string };
type Layout = { text: string; glyphs: Glyph[]; lefts: Map<string, number>; width: number };

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function split(text: string) {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

type Word = { start: number; end: number; text: string };

function words(chars: string[]): Word[] {
  const out: Word[] = [];
  let start = -1;
  chars.forEach((c, i) => {
    const space = /\s/.test(c);
    if (!space && start === -1) start = i;
    if (space && start !== -1) {
      out.push({ start, end: i, text: chars.slice(start, i).join("").toLowerCase() });
      start = -1;
    }
  });
  if (start !== -1) out.push({ start, end: chars.length, text: chars.slice(start).join("").toLowerCase() });
  return out;
}

/** Shared start and end letters: "Copy" → "Copied" keeps "Cop". */
function edges(a: string[], b: string[]): [number, number][] {
  const pairs: [number, number][] = [];
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) pairs.push([start, start++]);
  for (let k = 1; k <= Math.min(a.length, b.length) - start && a[a.length - k] === b[b.length - k]; k++) {
    pairs.push([a.length - k, b.length - k]);
  }
  return pairs;
}

/** Keys letters, reusing old keys for shared words and gap edges so they slide. */
function toGlyphs(prev: Glyph[] | null, text: string, generation: number): Glyph[] {
  // Same keys on the server and in the browser.
  const fresh = (i: number) => `${generation}:${i}`;
  const chars = split(text);
  if (!prev) return chars.map((char, i) => ({ key: fresh(i), char }));
  const keys: (string | null)[] = chars.map(() => null);
  const old = prev.map((g) => g.char);

  // Numbers match by place value, from the right.
  if (numeric(old.join("")) && numeric(text)) {
    for (let k = 1; k <= Math.min(old.length, chars.length); k++) {
      if (old[old.length - k] === chars[chars.length - k]) keys[chars.length - k] = prev[old.length - k].key;
    }
    return chars.map((char, i) => ({ key: keys[i] ?? fresh(i), char }));
  }

  const oldWords = words(old);
  const used = new Set<number>();
  const anchors: { from: Word; to: Word }[] = [];
  for (const w of words(chars)) {
    const i = oldWords.findIndex((o, k) => !used.has(k) && o.text === w.text);
    if (i === -1) continue;
    used.add(i);
    anchors.push({ from: oldWords[i], to: w });
    for (let k = 0; k < w.end - w.start; k++) {
      if (old[oldWords[i].start + k] === chars[w.start + k]) keys[w.start + k] = prev[oldWords[i].start + k].key;
    }
  }

  const ordered = anchors.every((a, i) => i === 0 || a.from.start > anchors[i - 1].from.end);
  if (ordered) {
    const bounds = [{ from: 0, to: 0 }, ...anchors.map((a) => ({ from: a.from.end, to: a.to.end }))];
    const ends = [...anchors.map((a) => ({ from: a.from.start, to: a.to.start })), { from: old.length, to: chars.length }];
    bounds.forEach((b, g) => {
      const pairs = edges(old.slice(b.from, ends[g].from), chars.slice(b.to, ends[g].to));
      for (const [i, j] of pairs) keys[b.to + j] = prev[b.from + i].key;
    });
  }

  return chars.map((char, i) => ({ key: keys[i] ?? fresh(i), char }));
}

const NUMERIC = /^[^\p{L}]*\d[^\p{L}]*$/u;
const numeric = (text: string) => NUMERIC.test(text);

const NUMBER = /[-\u2212]?\d[\d,.]*/;

function value(text: string) {
  const match = text.match(NUMBER);
  return match ? parseFloat(match[0].replace("\u2212", "-").replace(/,/g, "")) : NaN;
}

function direction(from: string, to: string) {
  const delta = value(to) - value(from);
  return Number.isNaN(delta) ? 0 : Math.sign(delta);
}

function token(el: Element, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

function ms(value: string) {
  return value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;
}

function translateX(el: Element) {
  const transform = getComputedStyle(el).transform;
  return transform && transform !== "none" ? new DOMMatrixReadOnly(transform).m41 : 0;
}

function measureText(row: HTMLElement, text: string, glyphs: Glyph[]): Layout {
  const node = row.firstChild;
  const origin = row.getBoundingClientRect().left;
  const lefts = new Map<string, number>();
  let width = 0;
  if (node?.nodeType === Node.TEXT_NODE) {
    const range = document.createRange();
    let offset = 0;
    for (const g of glyphs) {
      range.setStart(node, offset);
      range.setEnd(node, (offset += g.char.length));
      const box = range.getBoundingClientRect();
      lefts.set(g.key, box.left - origin);
      width = Math.max(width, box.right - origin);
    }
  }
  return { text, glyphs, lefts, width };
}

export function TextMorph({ children, className }: { children: string; className?: string }) {
  const [shown, setShown] = useState(children);
  const [state, setState] = useState(() => ({ generation: 0, glyphs: toGlyphs(null, children, 0) }));
  if (shown !== children) {
    setShown(children);
    setState((prev) => ({ generation: prev.generation + 1, glyphs: toGlyphs(prev.glyphs, children, prev.generation + 1) }));
  }
  const { glyphs } = state;
  // Plain text until the label first changes.
  const split = state.generation > 0;
  const rowRef = useRef<HTMLSpanElement>(null);
  const ghostsRef = useRef<HTMLSpanElement>(null);
  const layout = useRef<Layout | null>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const ghosts = ghostsRef.current;
    if (!row || !ghosts) return;

    if (!split) {
      layout.current = measureText(row, children, glyphs);
      return;
    }

    const nodes = new Map<string, HTMLElement>();
    for (const el of row.querySelectorAll<HTMLElement>("[data-glyph]")) nodes.set(el.dataset.glyph!, el);

    const last = layout.current;
    const lefts = new Map(glyphs.map((g) => [g.key, nodes.get(g.key)!.offsetLeft]));
    const tail = nodes.get(glyphs.at(-1)?.key ?? "");
    // Fractional, like the row's own width: offsetWidth rounds, and the
    // animation would end half a pixel short and then snap.
    const width = tail ? tail.getBoundingClientRect().right - row.getBoundingClientRect().left : 0;
    layout.current = { text: children, glyphs, lefts, width };

    if (!last || last.text === children) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ghosts.replaceChildren();
      return;
    }

    // The glide, not the move spring: a spring's overshoot narrows a button
    // past its new width and springs it back, which reads as the control
    // settling after the click. The glide lands once.
    const spring = token(row, "--ui-ease-glide", "cubic-bezier(0.22, 1, 0.36, 1)");
    const easeExit = token(row, "--ui-ease-exit", "cubic-bezier(0.4, 0, 1, 1)");
    const duration = ms(token(row, "--ui-dur-glide", "320ms"));
    const exit = ms(token(row, "--ui-dur-instant", "150ms"));
    // Letters arrive on the plain enter curve: a spring would bounce them
    // up and down, and vertical bounce reads as jitter in a line of text.
    const enter = token(row, "--ui-ease-enter", "cubic-bezier(0.2, 1, 0.3, 1)");

    // If a previous morph is still running, start from where it visibly is.
    const running = row.getAnimations();
    const fromWidth = running.length ? row.getBoundingClientRect().width : last.width;
    running.forEach((a) => a.cancel());
    const fade = Math.min(16, Math.abs(width - fromWidth));
    row.dataset.morphing = "";
    const grow = row.animate(
      { width: [`${fromWidth}px`, `${width}px`], ["--morph-fade" as string]: [`${fade}px`, "0px"] },
      { duration, easing: spring },
    );
    grow.finished.then(
      () => delete row.dataset.morphing,
      () => {}, // cancelled by a newer morph, which owns the flag now
    );

    const dir = direction(last.text, children) || 1;
    // A small rise with a soft blur: the change reads, the line holds still.
    const enterFrom = `translateY(${0.08 * dir}em)`;
    const leaveTo = `translateY(${-0.08 * dir}em)`;

    // Arrivals wait for leaving letters to clear.
    const current = new Set(glyphs.map((g) => g.key));
    const leaving = last.glyphs.some((g) => !current.has(g.key));
    const lead = exit * (leaving ? 0.85 : 0.4);
    let entering = 0;
    for (const g of glyphs) {
      const el = nodes.get(g.key)!;
      const before = last.lefts.get(g.key);
      if (before === undefined) {
        el.animate(
          {
            opacity: [0, 1],
            transform: [enterFrom, "none"],
            filter: ["blur(2px)", "none"],
          },
          { duration: duration * 0.75, easing: enter, delay: lead + entering++ * 15, fill: "backwards" },
        );
        continue;
      }
      // FLIP from where the letter is on screen now.
      const offset = before + translateX(el) - lefts.get(g.key)!;
      el.getAnimations().forEach((a) => a.cancel());
      if (Math.abs(offset) > 0.5) {
        el.animate({ transform: [`translateX(${offset}px)`, "none"] }, { duration, easing: spring });
      }
    }

    // Ghosts live in a layer React never renders into.
    const kept = new Set(glyphs.map((g) => g.key));
    for (const g of last.glyphs) {
      if (kept.has(g.key)) continue;
      const ghost = document.createElement("span");
      ghost.className = styles.ghost;
      ghost.textContent = g.char;
      ghost.style.left = `${last.lefts.get(g.key)}px`;
      ghosts.append(ghost);
      const fade = ghost.animate(
        {
          opacity: [1, 0],
          transform: ["none", leaveTo],
          filter: ["none", "blur(2px)"],
        },
        { duration: exit, easing: easeExit, fill: "forwards" },
      );
      fade.finished.then(
        () => ghost.remove(),
        () => ghost.remove(),
      );
    }
  }, [children, glyphs, split]);

  return (
    // The letter row must run in the label's own direction.
    <span className={className ? `${styles.root} ${className}` : styles.root} dir="auto">
      <span className={styles.label}>{children}</span>
      <span ref={rowRef} className={styles.row} aria-hidden="true">
        {split
          ? glyphs.map((g) => (
              <span key={g.key} data-glyph={g.key} className={styles.glyph}>
                {g.char}
              </span>
            ))
          : children}
        <span ref={ghostsRef} className={styles.ghosts} />
      </span>
    </span>
  );
}
