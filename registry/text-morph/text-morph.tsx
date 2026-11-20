"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** Indices of each number in a string: digits, with any `,` or `.` between them. */
function numberRuns(chars: string[]) {
  const runs: number[][] = [];
  let run: number[] = [];
  chars.forEach((c, i) => {
    const digit = /\d/.test(c);
    const joiner = (c === "," || c === ".") && run.length > 0 && /\d/.test(chars[i + 1] ?? "");
    if (digit || joiner) run.push(i);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  });
  if (run.length) runs.push(run);
  return runs;
}

/** The text with each number replaced by `#`: "12 of 240" → "# of #". */
function skeleton(chars: string[], runs: number[][]) {
  const inRun = new Set(runs.flat());
  return chars.map((c, i) => (inRun.has(i) ? (runs.some((r) => r[0] === i) ? "#" : "") : c)).join("");
}

/** A number's whole part and its fraction (from the point on). */
function halves(chars: string[], run: number[]) {
  const dot = run.findLastIndex((i) => chars[i] === ".");
  return dot === -1 ? [run, []] : [run.slice(0, dot), run.slice(dot)];
}

/**
 * Pairs two strings that differ only in their numbers: "12 guests" and "13
 * guests", "$9.95" and "$10.00", "1–10 of 240" and "11–20 of 240". Digits
 * pair by place value (the whole part from the right, the fraction from the
 * point), whether or not they're equal, so a digit that changes keeps its key
 * and rolls in place. Null when the words around the numbers differ.
 */
function alignNumbers(prev: Glyph[], chars: string[]): (string | null)[] | null {
  const old = prev.map((g) => g.char);
  const a = numberRuns(old);
  const b = numberRuns(chars);
  if (!b.length || a.length !== b.length || skeleton(old, a) !== skeleton(chars, b)) return null;
  const keys: (string | null)[] = chars.map(() => null);
  a.forEach((runA, r) => {
    const [wholeA, fracA] = halves(old, runA);
    const [wholeB, fracB] = halves(chars, b[r]);
    for (let k = 1; k <= Math.min(wholeA.length, wholeB.length); k++) keys[wholeB[wholeB.length - k]] = prev[wholeA[wholeA.length - k]].key;
    for (let k = 0; k < Math.min(fracA.length, fracB.length); k++) keys[fracB[k]] = prev[fracA[k]].key;
  });
  // The words around the numbers are the same, in order.
  const inA = new Set(a.flat());
  const inB = new Set(b.flat());
  const restA = old.flatMap((_, i) => (inA.has(i) ? [] : [i]));
  const restB = chars.flatMap((_, i) => (inB.has(i) ? [] : [i]));
  restB.forEach((j, n) => (keys[j] = prev[restA[n]].key));
  return keys;
}

/**
 * Keys letters, reusing old keys for shared words and gap edges so they
 * slide. `roll` is true when only numbers changed: then a reused key may hold
 * a new digit, and that digit rolls.
 */
function toGlyphs(prev: Glyph[] | null, text: string, generation: number): { glyphs: Glyph[]; roll: boolean } {
  // Same keys on the server and in the browser.
  const fresh = (i: number) => `${generation}:${i}`;
  const chars = split(text);
  if (!prev) return { glyphs: chars.map((char, i) => ({ key: fresh(i), char })), roll: false };
  const old = prev.map((g) => g.char);

  const numbers = alignNumbers(prev, chars);
  if (numbers) return { glyphs: chars.map((char, i) => ({ key: numbers[i] ?? fresh(i), char })), roll: true };

  const keys: (string | null)[] = chars.map(() => null);
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

  return { glyphs: chars.map((char, i) => ({ key: keys[i] ?? fresh(i), char })), roll: false };
}

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

/** Where each letter of the plain label sits, read from its text nodes. */
function measureText(row: HTMLElement, text: string, glyphs: Glyph[]): Layout {
  const origin = row.getBoundingClientRect().left;
  const lefts = new Map<string, number>();
  let width = 0;
  // The label is words as text and digit runs in spans, so walk every text node in order.
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node = walker.nextNode() as Text | null;
  let offset = 0;
  for (const g of glyphs) {
    while (node && offset >= node.data.length) {
      node = walker.nextNode() as Text | null;
      offset = 0;
    }
    if (!node) break;
    range.setStart(node, offset);
    range.setEnd(node, (offset = Math.min(node.data.length, offset + g.char.length)));
    const box = range.getBoundingClientRect();
    lefts.set(g.key, box.left - origin);
    width = Math.max(width, box.right - origin);
  }
  return { text, glyphs, lefts, width };
}

const DIGIT = /\d/;

/** The label as runs of digits and of everything else, so the digits alone can be tabular. */
function runs(glyphs: Glyph[]) {
  const out: { digit: boolean; text: string }[] = [];
  for (const g of glyphs) {
    const digit = DIGIT.test(g.char);
    const last = out.at(-1);
    if (last && last.digit === digit) last.text += g.char;
    else out.push({ digit, text: g.char });
  }
  return out;
}

/** At most five changes a second, so each one is seen; the latest always lands. */
const PACE = 200;
/** How far a rolling digit travels, in em: past the line, where the row's mask hides it. */
const ROLL = 0.6;
/** How far an arriving or leaving letter rises in a label. */
const LIFT = 0.08;

export function TextMorph({ children, className }: { children: string; className?: string }) {
  const [shown, setShown] = useState(children);
  const [state, setState] = useState(() => ({ generation: 0, roll: false, glyphs: toGlyphs(null, children, 0).glyphs }));
  // Paced: a change that comes while the last one is still fresh waits its turn.
  const [resting, setResting] = useState(false);
  if (shown !== children && !resting) {
    setShown(children);
    setResting(true);
    setState((prev) => ({ generation: prev.generation + 1, ...toGlyphs(prev.glyphs, children, prev.generation + 1) }));
  }
  const { glyphs, roll, generation } = state;
  // Keyed on the generation too: a change that waited its turn lands in the
  // same render that ends the rest, so `resting` alone never changes and the
  // next rest would have no timer to end it.
  useEffect(() => {
    if (!resting) return;
    const timer = window.setTimeout(() => setResting(false), PACE);
    return () => window.clearTimeout(timer);
  }, [resting, generation]);

  // Plain text until the label first changes.
  const split = generation > 0;
  const rowRef = useRef<HTMLSpanElement>(null);
  const ghostsRef = useRef<HTMLSpanElement>(null);
  const layout = useRef<Layout | null>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const ghosts = ghostsRef.current;
    if (!row || !ghosts) return;

    if (!split) {
      layout.current = measureText(row, shown, glyphs);
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
    layout.current = { text: shown, glyphs, lefts, width };

    if (!last || last.text === shown) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ghosts.replaceChildren();
      return;
    }

    // The glide, not the move spring: a spring's overshoot narrows a button
    // past its new width and springs it back, which reads as the control
    // settling after the click. The glide lands once, and a count lands on
    // its value without passing it.
    const spring = token(row, "--ui-ease-glide", "cubic-bezier(0.22, 1, 0.36, 1)");
    const easeExit = token(row, "--ui-ease-exit", "cubic-bezier(0.4, 0, 1, 1)");
    const easeColor = token(row, "--ui-ease-color", "cubic-bezier(0.2, 0, 0, 1)");
    const duration = ms(token(row, "--ui-dur-glide", "320ms"));
    // A digit rolling into place lands on the bounce spring: it passes its
    // line by a hair and settles, like a counter's wheel clicking home. Only
    // its rise and fall: sideways moves and the width keep the glide.
    const bounce = token(row, "--ui-ease-bounce", spring);
    const bounceMs = ms(token(row, "--ui-dur-bounce", "340ms"));
    const exit = ms(token(row, "--ui-dur-instant", "120ms"));
    const fast = ms(token(row, "--ui-dur-fast", "160ms"));
    // Letters arrive on the plain enter curve: a spring would bounce them
    // up and down, and vertical bounce reads as jitter in a line of text.
    const enter = token(row, "--ui-ease-enter", "cubic-bezier(0.2, 1, 0.3, 1)");

    // If a previous morph is still running, start from where it visibly is.
    const running = row.getAnimations();
    // The computed width, not the box: mid-morph the box also holds the soft edge's padding.
    const fromWidth = running.length ? parseFloat(getComputedStyle(row).width) || last.width : last.width;
    running.forEach((a) => a.cancel());
    const fade = Math.min(16, Math.abs(width - fromWidth));
    row.dataset.morphing = "";
    if (roll) row.dataset.rolling = "";
    else delete row.dataset.rolling;
    const grow = row.animate(
      { width: [`${fromWidth}px`, `${width}px`], ["--morph-fade" as string]: [`${fade}px`, "0px"] },
      { duration, easing: spring },
    );
    grow.finished.then(
      () => {
        delete row.dataset.morphing;
        delete row.dataset.rolling;
      },
      () => {}, // cancelled by a newer morph, which owns the flags now
    );

    // Up when the number grows, like a counter: the new digit comes from
    // below and the old one leaves upward. A label only rises a little; a
    // digit rolls a whole step, past the row's edge, where its mask hides it.
    const dir = direction(last.text, shown) || 1;
    const lift = roll ? ROLL : LIFT;
    const enterFrom = `translateY(${lift * dir}em)`;
    const leaveTo = `translateY(${-lift * dir}em)`;

    /** Draws a letter once more where it was, and sends it out. */
    function ghost(char: string, left: number, from: { y: number; opacity: number }) {
      const el = document.createElement("span");
      el.className = styles.ghost;
      if (DIGIT.test(char)) el.dataset.digit = "";
      el.textContent = char;
      el.style.left = `${left}px`;
      ghosts!.append(el);
      const start = `translateY(${from.y}px)`;
      if (roll) {
        // A digit leaves on the same glide as the one replacing it, so the two
        // read as one wheel turning; its opacity drops early, the way an
        // offset crossfade's leaving half does.
        el.animate({ transform: [start, leaveTo] }, { duration, easing: spring, fill: "forwards" });
        el.animate({ opacity: [from.opacity, 0] }, { duration: exit, easing: easeColor, fill: "forwards" })
          .finished.then(
            () => window.setTimeout(() => el.remove(), Math.max(0, duration - exit)),
            () => el.remove(),
          );
        return;
      }
      el.animate(
        { opacity: [from.opacity, 0], transform: [start, leaveTo], filter: ["none", "blur(2px)"] },
        { duration: exit, easing: easeExit, fill: "forwards" },
      ).finished.then(
        () => el.remove(),
        () => el.remove(),
      );
    }

    // Arrivals wait for leaving letters to clear.
    const was = new Map(last.glyphs.map((g) => [g.key, g.char]));
    const current = new Set(glyphs.map((g) => g.key));
    const leaving = last.glyphs.some((g) => !current.has(g.key));
    const lead = exit * (leaving ? 0.85 : 0.4);
    let entering = 0;
    for (const g of glyphs) {
      const el = nodes.get(g.key)!;
      const before = last.lefts.get(g.key);
      if (before === undefined) {
        if (roll) {
          // A new place (9 → 10): it rolls in like the digits beside it.
          el.animate({ transform: [enterFrom, "none"] }, { duration: bounceMs, easing: bounce });
          el.animate({ opacity: [0, 1] }, { duration: fast, easing: enter, delay: exit * 0.5, fill: "backwards" });
          continue;
        }
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
      const style = getComputedStyle(el);
      const matrix = style.transform && style.transform !== "none" ? new DOMMatrixReadOnly(style.transform) : null;
      // Sideways travel runs on `translate`, the roll on `transform`.
      const across = style.translate && style.translate !== "none" ? parseFloat(style.translate) || 0 : 0;
      const offset = before + across + (matrix?.m41 ?? 0) - lefts.get(g.key)!;
      const changed = was.get(g.key) !== g.char;
      const y = matrix?.m42 ?? 0;
      const opacity = Number(style.opacity || 1);
      if (changed) {
        // The same place, a new digit: the old one rolls out from where it
        // visibly is, the new one rolls in, sliding sideways too if the number widened.
        ghost(was.get(g.key)!, before, { y, opacity });
        el.getAnimations().forEach((a) => a.cancel());
        if (Math.abs(offset) > 0.5) el.animate({ translate: [`${offset}px 0`, "0 0"] }, { duration, easing: spring });
        el.animate({ transform: [`translateY(${lift * dir}em)`, "none"] }, { duration: roll ? bounceMs : duration, easing: roll ? bounce : spring });
        el.animate({ opacity: [0, 1] }, { duration: fast, easing: enter, delay: exit * 0.5, fill: "backwards" });
      } else if (Math.abs(offset) > 0.5) {
        // Moved: it slides over, carrying on from mid-roll if it was rolling.
        el.getAnimations().forEach((a) => a.cancel());
        el.animate({ translate: [`${offset}px 0`, "0 0"] }, { duration, easing: spring });
        if (Math.abs(y) > 0.1) el.animate({ transform: [`translateY(${y}px)`, "none"] }, { duration: roll ? bounceMs : duration, easing: roll ? bounce : spring });
        if (opacity < 1) el.animate({ opacity: [opacity, 1] }, { duration: fast, easing: enter });
      }
      // Unmoved and unchanged: a roll still in flight finishes as it was.
    }

    // Ghosts live in a layer React never renders into.
    for (const g of last.glyphs) {
      if (!current.has(g.key)) ghost(g.char, last.lefts.get(g.key)!, { y: 0, opacity: 1 });
    }
  }, [shown, glyphs, roll, split]);

  return (
    // The letter row must run in the label's own direction.
    <span className={className ? `${styles.root} ${className}` : styles.root} dir="auto">
      <span className={styles.label}>{children}</span>
      <span ref={rowRef} className={styles.row} aria-hidden="true">
        {split
          ? glyphs.map((g) => (
              <span key={g.key} data-glyph={g.key} data-digit={DIGIT.test(g.char) || undefined} className={styles.glyph}>
                {g.char}
              </span>
            ))
          : // Digits are tabular from the first paint, as they are once split,
            // so the first change never shifts them.
            runs(glyphs).map((run, i) =>
              run.digit ? (
                <span key={i} className={styles.digits}>
                  {run.text}
                </span>
              ) : (
                run.text
              ),
            )}
        <span ref={ghostsRef} className={styles.ghosts} />
      </span>
    </span>
  );
}
