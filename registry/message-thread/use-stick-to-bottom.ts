"use client";

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

/* Two ways the thread holds still.

   Loaded or remounted, it shows the latest: pinned to the bottom, following
   growth until the reader scrolls up. The pin runs in the ResizeObserver
   callback (before paint) so no frame shows the old position.

   Once the user sends, their message rises to the top of the view and the
   reply grows into the room below it. A spacer after the last message keeps
   exactly that room: it shrinks as the reply grows and grows if something in
   the reply collapses, so the scroll height never changes and nothing on
   screen moves while a reply streams. When the reply outgrows the view, the
   spacer is gone and "Jump to latest" offers the rest; nothing scrolls on its
   own. Keep overflow-anchor on: it holds what the user reads still. */

const STICK_DISTANCE = 8;
const SHOW_JUMP_DISTANCE = 64;

export function useStickToBottom(
  scrollRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  spacerRef: RefObject<HTMLElement | null>,
) {
  const stuck = useRef(true);
  const jumping = useRef(false);
  /** The message the user just sent, held at the top while the reply grows. */
  const anchor = useRef<HTMLElement | null>(null);
  const [showJump, setShowJump] = useState(false);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    const spacer = spacerRef.current;
    if (!scroller || !content || !spacer) return;

    const pad = (side: "paddingTop" | "paddingBottom") => parseFloat(getComputedStyle(content)[side]) || 0;
    const distance = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    /** How far the last message's bottom is below the view, spacer aside. */
    const unread = () => spacer.getBoundingClientRect().top + pad("paddingBottom") - scroller.getBoundingClientRect().bottom;
    const pin = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
    const sync = () =>
      setShowJump(anchor.current ? unread() > SHOW_JUMP_DISTANCE : !stuck.current && distance() > SHOW_JUMP_DISTANCE);

    /** The spacer's height: enough that the anchor can sit at the top. */
    const room = () => {
      const a = anchor.current;
      if (!a || !a.isConnected) {
        anchor.current = null;
        if (spacer.style.height) spacer.style.height = "";
        return;
      }
      const top = content.getBoundingClientRect().top;
      const want = a.getBoundingClientRect().top - top - pad("paddingTop") + scroller.clientHeight;
      const have = spacer.getBoundingClientRect().top - top + pad("paddingBottom");
      const height = Math.max(0, want - have);
      if (Math.abs(height - (parseFloat(spacer.style.height) || 0)) > 0.5) spacer.style.height = `${height}px`;
    };

    /* Where the anchor sat in the view after the last scroll. A collapse in
       the reply shortens the page before the spacer makes up for it, and the
       browser clamps the scroll in between; putting the anchor back here,
       before paint, keeps that from ever showing. */
    let anchorAt = 0;
    /** The sent message is still rising; don't fight the smooth scroll. */
    let rising = false;
    const anchorTop = () => anchor.current!.getBoundingClientRect().top - scroller.getBoundingClientRect().top;

    /** When the reader last touched the scroll: a move without one is ours or the browser's. */
    let handled = 0;
    const touched = () => (handled = performance.now());

    const release = () => {
      if (!stuck.current && !jumping.current) return;
      stuck.current = false;
      jumping.current = false;
      sync();
    };

    pin();

    const resize = new ResizeObserver(() => {
      if (anchor.current) {
        room();
        if (anchor.current) {
          const off = anchorTop() - anchorAt;
          if (!rising && Math.abs(off) > 0.1) scroller.scrollTop += off;
          anchorAt = anchorTop();
        }
      } else if (stuck.current && !jumping.current) pin();
      sync();
    });
    resize.observe(content);
    resize.observe(scroller);

    // A message the user just sent rises to the top, with the reply's room below.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement && node.dataset.from === "user") {
            anchor.current = node;
            stuck.current = false;
            jumping.current = false;
            room();
            const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
            const top = scroller.scrollTop + node.getBoundingClientRect().top - scroller.getBoundingClientRect().top - pad("paddingTop");
            rising = smooth;
            if (smooth) setTimeout(() => (rising = false), 700);
            scroller.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
            anchorAt = anchorTop();
            sync();
            return;
          }
        }
      }
    });
    mutations.observe(content, { childList: true });

    let touchY = 0;
    const onWheel = (e: WheelEvent) => {
      touched();
      if (e.deltaY < 0) release();
    };
    const onTouchStart = (e: TouchEvent) => {
      touched();
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      touched();
      const y = e.touches[0].clientY;
      if (y > touchY + 2) release();
      touchY = y;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      touched();
      if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home" || (e.key === " " && e.shiftKey)) release();
    };
    // Growth below can fire a scroll before the next pin, so distance alone
    // isn't the reader leaving: only a move up (a scrollbar drag, find in
    // page) lets go. Wheel, touch and keys release above.
    let lastTop = scroller.scrollTop;
    const onScroll = () => {
      const movedUp = scroller.scrollTop < lastTop - 1;
      lastTop = scroller.scrollTop;
      if (anchor.current) {
        // Pulled up to a shorter page's end with nobody scrolling: the
        // browser clamped it. Make the room back and put the anchor back.
        const clamped = movedUp && !rising && distance() <= 1 && performance.now() - handled > 300;
        if (clamped) {
          room();
          if (anchor.current) scroller.scrollTop += anchorTop() - anchorAt;
          lastTop = scroller.scrollTop;
        }
        if (anchor.current) anchorAt = anchorTop();
        return sync();
      }
      const d = distance();
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
      rising = false;
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
    // A scrollbar drag starts with a press on the scroller itself.
    scroller.addEventListener("pointerdown", touched, { passive: true });
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);
    return () => {
      resize.disconnect();
      mutations.disconnect();
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("keydown", onKeyDown);
      scroller.removeEventListener("pointerdown", touched);
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScrollEnd);
    };
  }, [scrollRef, contentRef, spacerRef]);

  const jumpToLatest = useCallback(() => {
    const scroller = scrollRef.current;
    const spacer = spacerRef.current;
    if (!scroller) return;
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    setShowJump(false);
    if (anchor.current && spacer) {
      // The reply has outgrown the view: bring its end into view and follow
      // from there. The spacer is already gone (it only exists while the
      // reply fits), so the bottom is the bottom.
      anchor.current = null;
      spacer.style.height = "";
    }
    stuck.current = true;
    jumping.current = smooth;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    // Browsers without scrollend: settle after the smooth scroll would be done.
    if (smooth && !("onscrollend" in window)) {
      setTimeout(() => {
        if (!jumping.current) return;
        jumping.current = false;
        scroller.scrollTop = scroller.scrollHeight;
      }, 700);
    }
  }, [scrollRef, spacerRef]);

  return { showJump, jumpToLatest };
}
