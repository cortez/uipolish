"use client";

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./slider.module.css";

type SliderProps = {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** The value as shown at the end of the label row. */
  format?: (value: number) => string;
  /** The value as read by screen readers. Defaults to `format`. */
  valueText?: (value: number) => string;
  /** Morph the shown value from one to the next. Turn off for wide ranges dragged fast. */
  morph?: boolean;
  name?: string;
  disabled?: boolean;
  className?: string;
};

/** At most this many values are formatted to find the widest readout. */
const MAX_SAMPLES = 500;

/** A press that wanders less than this is still a click on the track, and glides. */
const DRAG_SLOP = 3;

/** A sunken track with a raised thumb, Base UI's Slider underneath for all input and assistive tech. */
export function Slider({
  label,
  min = 0,
  max = 100,
  step = 1,
  value: controlled,
  defaultValue,
  onValueChange,
  format = String,
  valueText,
  morph = true,
  name,
  disabled,
  className,
}: SliderProps) {
  const [uncontrolled, setUncontrolled] = useState(() => clamp(defaultValue ?? min, min, max));
  const value = controlled !== undefined ? clamp(controlled, min, max) : uncontrolled;
  const fraction = max > min ? (value - min) / (max - min) : 0;
  const steps = step > 0 ? Math.round((max - min) / step) : 0;
  const shown = format(value);
  // A drag or a held arrow key follows the input 1:1, without gliding or morphing.
  // A click on the track, a slightly wobbly one included, and a single key press glide.
  // (Base UI's own data-dragging is on from pointerdown, so it can't tell a click from a drag.)
  const [following, setFollowing] = useState(false);
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  // Where the thumb was on screen when a drag took over from a glide.
  const caughtAt = useRef<number | null>(null);

  // A drag that starts while the thumb is still gliding to the press would
  // cut the rest of the glide in one frame. The thumb and range go under the
  // pointer at once, as a drag must, and what was left of the glide plays out
  // as an offset added on top, so the hand-off is a quick settle, not a jump.
  useLayoutEffect(() => {
    const from = caughtAt.current;
    caughtAt.current = null;
    const rail = railRef.current;
    if (!following || from === null || !rail) return;
    const layer = rail.querySelector<HTMLElement>(`.${styles.knobLayer}`);
    const range = rail.querySelector<HTMLElement>(`.${styles.range}`);
    if (!layer || !range || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const left = from - layer.getBoundingClientRect().left;
    if (Math.abs(left) < 1) return;
    const style = getComputedStyle(rail);
    const timing = {
      duration: ms(style.getPropertyValue("--ui-dur-fast"), 160),
      easing: style.getPropertyValue("--ui-ease-enter").trim() || "ease-out",
      composite: "add" as const,
    };
    for (const el of [layer, range]) el.animate({ translate: [`${left}px 0`, "0px 0"] }, timing);
  }, [following]);

  // The readout holds the width of its widest value, so dragging never moves the label.
  // Callers pass `format` inline, so the list is rebuilt only when the range or what it shows changes.
  const formatKey = `${format(min)}\n${format(max)}\n${format(min + step)}`;
  const candidates = useMemo(
    () => {
      const count = Math.min(steps, MAX_SAMPLES);
      const texts = new Set<string>();
      for (let i = 0; i <= count; i++) {
        const raw = count ? min + ((max - min) * i) / count : min;
        texts.add(format(step > 0 ? clamp(min + Math.round((raw - min) / step) * step, min, max) : raw));
      }
      // A string a character shorter can still be wider; any shorter can't.
      const longest = Math.max(...Array.from(texts, (t) => t.length));
      return Array.from(texts).filter((t) => t.length >= longest - 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step, steps, formatKey],
  );
  const [widest, setWidest] = useState(() => candidates.reduce((a, b) => (b.length > a.length ? b : a)));
  const valueRef = useRef<HTMLSpanElement>(null);

  // Not every font has tabular figures, so measure the candidates in the readout's own font,
  // drawn as the readout draws them: equal-width digits, everything else as it is.
  useLayoutEffect(() => {
    const host = valueRef.current;
    if (!host) return;
    const measure = () => {
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
      host.appendChild(probe);
      let best = candidates[0];
      let bestWidth = -1;
      for (const text of candidates) {
        probe.replaceChildren(
          ...text.split(DIGITS).map((part, i) => {
            if (i % 2 === 0) return part;
            const figure = document.createElement("span");
            figure.className = styles.figure;
            figure.textContent = part;
            return figure;
          }),
        );
        const width = probe.getBoundingClientRect().width;
        if (width > bestWidth) [best, bestWidth] = [text, width];
      }
      probe.remove();
      setWidest(best);
    };
    measure();
    let live = true;
    document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
    };
  }, [candidates]);

  function set(next: number) {
    if (next === value) return;
    if (controlled === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  return (
    <BaseSlider.Root
      className={className ? `${styles.root} ${className}` : styles.root}
      value={value}
      min={min}
      max={max}
      step={step}
      largeStep={step * 10}
      name={name}
      disabled={disabled}
      // Keeps the thumb inside the track, so a press lands where the drawn thumb goes.
      thumbAlignment="edge"
      onValueChange={(next, details) => {
        const event = details.event;
        if (details.reason === "drag" && !following) {
          const press = pressRef.current;
          const at = pointOf(event);
          if (!press || !at || Math.hypot(at.x - press.x, at.y - press.y) >= DRAG_SLOP) {
            caughtAt.current = railRef.current?.querySelector(`.${styles.knobLayer}`)?.getBoundingClientRect().left ?? null;
            // Committed now, so the measure above and the hand-off are the same frame.
            flushSync(() => setFollowing(true));
          }
        } else if (details.reason === "keyboard") {
          setFollowing(event instanceof KeyboardEvent && event.repeat);
        }
        set(Array.isArray(next) ? next[0] : next);
      }}
      // A key commits on every press, so a held key is let go of on keyup instead.
      onValueCommitted={(_, details) => {
        if (details.reason !== "keyboard") setFollowing(false);
      }}
      onKeyUp={() => setFollowing(false)}
      onBlur={() => setFollowing(false)}
      data-follow={following || undefined}
      style={{ "--slider-fraction": fraction } as CSSProperties}
    >
      <div className={styles.header}>
        <BaseSlider.Label className={styles.label}>{label}</BaseSlider.Label>
        <span ref={valueRef} className={styles.value} aria-hidden="true">
          <span className={styles.sizer}>{figures(widest)}</span>
          <span className={styles.shown}>{morph && !following ? <TextMorph>{shown}</TextMorph> : figures(shown)}</span>
        </span>
      </div>
      <BaseSlider.Control
        className={styles.control}
        onPointerDown={(event) => {
          pressRef.current = { x: event.clientX, y: event.clientY };
          setFollowing(false);
        }}
      >
        <span ref={railRef} className={styles.rail} aria-hidden="true">
          <span className={styles.track}>
            <span className={styles.range} />
          </span>
          <span className={styles.knobLayer}>
            <span className={styles.knob} />
          </span>
        </span>
        <BaseSlider.Track className={styles.hitTrack}>
          <BaseSlider.Thumb className={styles.thumb} getAriaValueText={(_, v) => (valueText ?? format)(v)} />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

const DIGITS = /(\d+)/;

/** Equal-width figures on the digits alone: on the whole readout, some fonts widen its spaces too. */
function figures(text: string): ReactNode {
  return text.split(DIGITS).map((part, i) => (i % 2 ? <span key={i} className={styles.figure}>{part}</span> : part));
}

/** A CSS time token in ms. Browsers may report "160ms" as ".16s". */
function ms(value: string, fallback: number) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return value.trim().endsWith("ms") ? n : n * 1000;
}

function pointOf(event: Event) {
  if ("clientX" in event && typeof event.clientX === "number") {
    return { x: event.clientX, y: (event as MouseEvent).clientY };
  }
  const touch = "changedTouches" in event ? (event as TouchEvent).changedTouches[0] : undefined;
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
