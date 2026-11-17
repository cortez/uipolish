"use client";

import Link from "@/components/link";
import { useEffect, useRef, type PointerEvent } from "react";
import { Logo } from "./logo";
import styles from "./wordmark.module.css";

// One sparkle per hover, as one fluid gesture. Turning, shrinking and
// moving are separate animations on their own curves that overlap rather
// than take turns: the star turns a quarter turn the whole way through
// (four points, so it lands exactly as it started) while it dips and comes
// back, and two small stars swell out of it and fold back in on the same
// breath. Nothing holds still between beats. It always finishes its cycle;
// hovering again mid-cycle doesn't restart it.
const SPARK = 1300;
// The turn starts softly and settles long. The dip and the return are one
// smooth arc: out decelerating, back accelerating into a gentle landing.
const TURN = "cubic-bezier(0.45, 0, 0.15, 1)";
const OUT = "cubic-bezier(0.3, 0, 0.25, 1)";
const BACK = "cubic-bezier(0.45, 0, 0.25, 1)";

// When the current sparkle began. Every page draws its own mark, so a link
// from one page to another mounts a new one; it picks the sparkle up where
// the old one was instead of cutting it off.
let startedAt = -Infinity;

function sparkle(e: PointerEvent<HTMLAnchorElement>) {
  if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (play(e.currentTarget, 0)) startedAt = performance.now();
}

/** Runs the sparkle on a mark from `elapsed` ms in. False if it's already running. */
function play(link: HTMLElement, elapsed: number) {
  const star = link.querySelector<SVGPathElement>("[data-star]");
  const [a, b] = link.querySelectorAll<SVGPathElement>("[data-spark]");
  if (!star || !a || !b || star.getAnimations().length) return false;

  const turn = (el: Element, delay = 0) =>
    el.animate({ rotate: ["0deg", "90deg"] }, { duration: SPARK - delay, delay, easing: TURN });

  turn(star);
  star.animate(
    [
      { scale: "1", translate: "0 0", easing: OUT },
      { scale: "0.6", translate: "-2px 1.5px", offset: 0.45, easing: BACK },
      { scale: "1", translate: "0 0" },
    ],
    { duration: SPARK },
  );

  const spark = (el: Element, x: number, y: number, size: number, delay: number) => {
    turn(el, delay);
    el.animate(
      [
        { scale: "0", translate: "0 0", opacity: 0, easing: OUT },
        { scale: `${size}`, translate: `${x}px ${y}px`, opacity: 1, offset: 0.5, easing: BACK },
        { scale: "0", translate: "0 0", opacity: 0 },
      ],
      { duration: SPARK - delay, delay, fill: "backwards" },
    );
  };
  spark(a, 5.5, -6, 0.36, 0);
  spark(b, 6.5, 4, 0.26, 60);
  for (const el of [star, a, b]) for (const anim of el.getAnimations()) anim.currentTime = elapsed;
  return true;
}

/** The mark, linking home. */
export function Wordmark({ className }: { className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const elapsed = performance.now() - startedAt;
    if (ref.current && elapsed < SPARK) play(ref.current, elapsed);
  }, []);

  return (
    <Link
      ref={ref}
      href="/"
      aria-label="UI Polish home"
      className={className ? `${styles.mark} ${className}` : styles.mark}
      onPointerEnter={sparkle}
    >
      <Logo height={19} aria-hidden="true" />
    </Link>
  );
}
