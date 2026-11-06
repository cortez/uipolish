"use client";

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

/* Pin in the ResizeObserver callback (before paint) so no frame shows the old position.
   Keep overflow-anchor on: it holds what the user reads still. */

const STICK_DISTANCE = 8;
const SHOW_JUMP_DISTANCE = 64;

export function useStickToBottom(
  scrollRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
) {
  const stuck = useRef(true);
  const jumping = useRef(false);
  const [showJump, setShowJump] = useState(false);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;

    const distance = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const pin = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
    const sync = () => setShowJump(!stuck.current && distance() > SHOW_JUMP_DISTANCE);
    const release = () => {
      if (!stuck.current && !jumping.current) return;
      stuck.current = false;
      jumping.current = false;
      sync();
    };

    pin();

    const resize = new ResizeObserver(() => {
      if (stuck.current && !jumping.current) pin();
      sync();
    });
    resize.observe(content);
    resize.observe(scroller);

    // A message the user just sent always brings them to the bottom.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement && node.dataset.from === "user") {
            stuck.current = true;
            jumping.current = false;
            pin();
            sync();
            return;
          }
        }
      }
    });
    mutations.observe(content, { childList: true });

    let touchY = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) release();
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      if (y > touchY + 2) release();
      touchY = y;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home" || (e.key === " " && e.shiftKey)) release();
    };
    // Growth below can fire a scroll before the next pin, so distance alone
    // isn't the reader leaving: only a move up (a scrollbar drag, find in
    // page) lets go. Wheel, touch and keys release above.
    let lastTop = scroller.scrollTop;
    const onScroll = () => {
      const d = distance();
      const movedUp = scroller.scrollTop < lastTop - 1;
      lastTop = scroller.scrollTop;
      if (jumping.current) {
        if (d <= 1) {
          jumping.current = false;
          stuck.current = true;
        }
      } else if (d <= STICK_DISTANCE) {
        stuck.current = true;
      } else if (stuck.current && movedUp) {
        stuck.current = false;
      } else if (stuck.current) {
        pin();
      }
      sync();
    };
    // The smooth jump aimed at the old bottom; finish any growth instantly.
    const onScrollEnd = () => {
      if (!jumping.current) return;
      jumping.current = false;
      stuck.current = true;
      pin();
      sync();
    };

    scroller.addEventListener("wheel", onWheel, { passive: true });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: true });
    scroller.addEventListener("keydown", onKeyDown);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);
    return () => {
      resize.disconnect();
      mutations.disconnect();
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("keydown", onKeyDown);
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScrollEnd);
    };
  }, [scrollRef, contentRef]);

  const jumpToLatest = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    stuck.current = true;
    jumping.current = smooth;
    setShowJump(false);
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    // Browsers without scrollend: settle after the smooth scroll would be done.
    if (smooth && !("onscrollend" in window)) {
      setTimeout(() => {
        if (!jumping.current) return;
        jumping.current = false;
        scroller.scrollTop = scroller.scrollHeight;
      }, 700);
    }
  }, [scrollRef]);

  return { showJump, jumpToLatest };
}
