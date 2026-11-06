"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps, type Ref } from "react";
import styles from "./scroll-area.module.css";

type ScrollAreaProps = Omit<ComponentProps<"div">, "ref"> & {
  /** Accessible name; makes the area a named region. */
  label?: string;
  orientation?: "vertical" | "horizontal";
  /** Fade edges that have more content past them. */
  fade?: boolean;
  /** The scrolling element. */
  ref?: Ref<HTMLDivElement>;
};

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, summary, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';

/** A scroll container whose edges fade where there's more content past them. */
export function ScrollArea({
  label,
  orientation = "vertical",
  fade = true,
  className,
  style,
  children,
  ref,
  "aria-labelledby": labelledBy,
  ...props
}: ScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Keyboard users need a tab stop to scroll, but only when nothing inside is focusable.
  const [tabStop, setTabStop] = useState(false);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const vertical = orientation === "vertical";
    const cssFades = typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");
    let frame = 0;
    let ready = false;

    const measure = () => {
      const pos = Math.abs(vertical ? viewport.scrollTop : viewport.scrollLeft);
      const max = vertical
        ? viewport.scrollHeight - viewport.clientHeight
        : viewport.scrollWidth - viewport.clientWidth;
      viewport.toggleAttribute("data-fits", max <= 1);
      if (!cssFades) {
        viewport.style.setProperty("--scroll-area-start", pos > 1 ? "0" : "1");
        viewport.style.setProperty("--scroll-area-end", pos < max - 1 ? "0" : "1");
      }
      const bar = vertical ? viewport.offsetWidth - viewport.clientWidth : viewport.offsetHeight - viewport.clientHeight;
      viewport.style.setProperty("--scroll-area-bar", `${Math.max(0, bar)}px`);
      setTabStop(max > 1 && content.querySelector(FOCUSABLE) === null);
      if (!ready) {
        ready = true;
        frame = requestAnimationFrame(() => {
          viewport.dataset.ready = "";
        });
      }
    };

    let pending = 0;
    const onScroll = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        measure();
      });
    };

    // Vertical wheel scrolls a horizontal row until it hits an end, then the page.
    const onWheel = (event: WheelEvent) => {
      if (vertical || event.ctrlKey || event.shiftKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const max = viewport.scrollWidth - viewport.clientWidth;
      if (max <= 1) return;
      const rtl = getComputedStyle(viewport).direction === "rtl";
      const step = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * viewport.clientWidth : event.deltaY;
      const pos = Math.abs(viewport.scrollLeft);
      const forward = step > 0;
      if ((forward && pos >= max - 1) || (!forward && pos <= 1)) return;
      event.preventDefault();
      viewport.scrollLeft += rtl ? -step : step;
    };

    measure();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    viewport.addEventListener("wheel", onWheel, { passive: false });
    const resize = new ResizeObserver(measure);
    resize.observe(viewport);
    resize.observe(content);
    const mutation = new MutationObserver(measure);
    mutation.observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "tabindex", "href"] });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pending);
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("wheel", onWheel);
      resize.disconnect();
      mutation.disconnect();
      delete viewport.dataset.ready;
      viewport.removeAttribute("data-fits");
    };
  }, [orientation]);

  function setRefs(node: HTMLDivElement | null) {
    viewportRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  const named = Boolean(label || labelledBy);

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root} style={style} data-orientation={orientation}>
      <div
        ref={setRefs}
        className={styles.viewport}
        data-orientation={orientation}
        data-fade={fade ? "" : undefined}
        role={named ? "region" : undefined}
        aria-label={label}
        aria-labelledby={labelledBy}
        tabIndex={tabStop ? 0 : undefined}
        {...props}
      >
        <div ref={contentRef} className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
