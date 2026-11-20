"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import styles from "./animated-size.module.css";

type AnimatedSizeProps = ComponentProps<"div"> & {
  /** Which side follows the content. Width and both lay the content out at max-content. */
  axis?: "height" | "width" | "both";
};

// A transition on one of these inside the box means the content is easing
// its own size on that axis.
const HEIGHT_PROPERTIES = ["height", "block-size", "max-height", "grid-template-rows"];
const WIDTH_PROPERTIES = ["width", "inline-size", "max-width", "grid-template-columns"];

/** Whether something inside is mid-way through a size transition of its own (a panel opening). */
function easesItself(inner: HTMLElement, axis: "height" | "width" | "both") {
  if (typeof inner.getAnimations !== "function" || typeof CSSTransition === "undefined") return false;
  return inner.getAnimations({ subtree: true }).some(
    (a) =>
      a instanceof CSSTransition &&
      a.playState !== "finished" &&
      ((axis !== "width" && HEIGHT_PROPERTIES.includes(a.transitionProperty)) ||
        (axis !== "height" && WIDTH_PROPERTIES.includes(a.transitionProperty))),
  );
}

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

      // Content that eases its own size (a panel opening inside) is followed
      // frame by frame: easing after it again would trail behind and clip it.
      // A resize already under way keeps its transition and retargets.
      const follow = easesItself(inner, axis) && (outer.dataset.following !== undefined || outer.dataset.moving === undefined);
      if (follow) outer.dataset.following = "";
      else delete outer.dataset.following;

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
      delete outer.dataset.following;
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
