"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Slides one highlight bar to the row Base UI marks `data-highlighted`, and
 * marks a list that fits without scrolling (`data-fits`, for the edge fade).
 *
 * Put `listRef` on the scrolling list and `barRef` on a span that is the
 * list's first child. Base UI keeps the highlighted row in view itself.
 * With `centerSelected`, the chosen row (`data-selected`) starts in the
 * middle of the list each time it opens.
 */
export function useHighlight({ centerSelected = false }: { centerSelected?: boolean } = {}) {
  const listNode = useRef<HTMLElement | null>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  // Bumped when the list mounts or unmounts: Base UI renders it only while open.
  const [mounts, setMounts] = useState(0);
  const listRef = useCallback((node: HTMLElement | null) => {
    listNode.current = node;
    setMounts((n) => n + 1);
  }, []);

  useLayoutEffect(() => {
    const list = listNode.current;
    const bar = barRef.current;
    if (!list || !bar) return;
    const state = { centered: !centerSelected };

    function update() {
      if (!list || !bar) return;
      // Once, when the list first has a height: the chosen row in the middle.
      if (!state.centered && list.clientHeight > 0) {
        state.centered = true;
        const chosen = list.querySelector<HTMLElement>("[data-selected]");
        if (chosen) list.scrollTop = chosen.offsetTop - (list.clientHeight - chosen.offsetHeight) / 2;
      }
      // Not scrollHeight: the bar's height transition can briefly overflow the list.
      const last = list.lastElementChild instanceof HTMLElement ? list.lastElementChild : null;
      const end = last ? last.offsetTop + last.offsetHeight + (parseFloat(getComputedStyle(list).paddingBottom) || 0) : 0;
      list.toggleAttribute("data-fits", end - list.clientHeight <= 1);

      const row = list.querySelector<HTMLElement>("[data-highlighted]");
      if (!row) {
        bar.removeAttribute("data-visible");
        return;
      }
      const jump = !bar.hasAttribute("data-visible");
      if (jump) bar.setAttribute("data-jump", "");
      bar.style.translate = `0 ${row.offsetTop}px`;
      bar.style.height = `${row.offsetHeight}px`;
      bar.setAttribute("data-visible", "");
      if (jump) {
        bar.getBoundingClientRect();
        bar.removeAttribute("data-jump");
      }
    }

    update();
    const mutations = new MutationObserver(update);
    mutations.observe(list, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["data-highlighted"],
    });
    const resize = new ResizeObserver(update);
    resize.observe(list);
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, [mounts, centerSelected]);

  return { listRef, barRef, listNode };
}
