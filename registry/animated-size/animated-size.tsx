"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import styles from "./animated-size.module.css";

type AnimatedSizeProps = ComponentProps<"div"> & {
  /** Which side follows the content. Width and both lay the content out at max-content. */
  axis?: "height" | "width" | "both";
};

/** A box that eases its height and/or width to whatever its content measures. */
export function AnimatedSize({ axis = "height", className, children, ...props }: AnimatedSizeProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof ResizeObserver === "undefined") return;

    let last: { w: number; h: number } | null = null;
    let frame = 0;

    const disarm = () => {
      cancelAnimationFrame(frame);
      delete outer.dataset.armed;
    };
    const arm = () => {
      cancelAnimationFrame(frame);
      // A frame later, so the switch to animated doesn't itself transition the instant size.
      frame = requestAnimationFrame(() => {
        outer.dataset.armed = "";
      });
    };

    const apply = () => {
      // display: none somewhere above: nothing should animate when it comes back.
      if (outer.getClientRects().length === 0) {
        disarm();
        return;
      }
      const w = inner.offsetWidth;
      const h = inner.offsetHeight;
      if (last && last.w === w && last.h === h) return;

      // A reflow from a container width change applies instantly.
      const reflow = axis === "height" && last !== null && last.w !== w;
      if (reflow) disarm();

      const before = last;
      last = { w, h };
      if (before && outer.dataset.armed !== undefined) {
        const grows = axis === "width" ? w > before.w : axis === "height" ? h > before.h : w * h > before.w * before.h;
        outer.dataset.direction = grows ? "grow" : "shrink";
      }
      if (axis !== "width") outer.style.height = `${h}px`;
      if (axis !== "height") outer.style.width = `${w}px`;
      if (outer.dataset.armed === undefined) arm();
    };

    const observer = new ResizeObserver(apply);
    observer.observe(inner);

    const start = (event: TransitionEvent) => {
      if (event.target === outer) outer.dataset.moving = "";
    };
    const end = (event: TransitionEvent) => {
      if (event.target === outer) delete outer.dataset.moving;
    };
    outer.addEventListener("transitionrun", start);
    outer.addEventListener("transitionend", end);
    outer.addEventListener("transitioncancel", end);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      outer.removeEventListener("transitionrun", start);
      outer.removeEventListener("transitionend", end);
      outer.removeEventListener("transitioncancel", end);
      outer.style.height = "";
      outer.style.width = "";
      delete outer.dataset.armed;
      delete outer.dataset.moving;
    };
  }, [axis]);

  return (
    <div ref={outerRef} className={className ? `${styles.root} ${className}` : styles.root} data-axis={axis} {...props}>
      <div ref={innerRef} className={styles.content}>
        {children}
      </div>
    </div>
  );
}
