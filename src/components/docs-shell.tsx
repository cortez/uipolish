"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { Wordmark } from "./wordmark";
import styles from "./docs-shell.module.css";

const NARROW = "(max-width: 860px)";

/** The docs frame. On a wide screen, the sidebar beside the page. On a narrow
 *  one, the sidebar waits under the page, and the button by the mark slides
 *  the whole page aside to reveal it. Tapping the page, Escape, or going to
 *  another page slides it back. */
export function DocsShell({ side, children }: { side: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const [lastPath, setLastPath] = useState(path);
  const toggle = useRef<HTMLButtonElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  // Set when the person closed it from the sidebar, so focus goes back to the
  // menu button once the page is no longer inert.
  const refocus = useRef(false);

  // A link in the sidebar navigated: the new page arrives with it closed.
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }

  function close() {
    refocus.current = true;
    setOpen(false);
  }

  useEffect(() => {
    if (open || !refocus.current) return;
    refocus.current = false;
    toggle.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Into the sidebar, at the page you're on.
    const frame = requestAnimationFrame(() => {
      const side = sideRef.current;
      const target = side?.querySelector<HTMLElement>('[aria-current="page"]') ?? side?.querySelector<HTMLElement>("a, button");
      target?.focus({ preventScroll: false });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // Widening past the breakpoint puts the sidebar back beside the page.
    const wide = matchMedia(NARROW);
    const onWide = () => !wide.matches && setOpen(false);
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      cancelAnimationFrame(frame);
      root.style.overflow = overflow;
      removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <div className={styles.shell} data-open={open || undefined}>
      <div ref={sideRef} id="docs-sidebar" className={styles.side}>
        {side}
      </div>
      <div className={styles.page}>
        <div className={styles.content} inert={open || undefined}>
          <div className={styles.bar}>
            <Button
              ref={toggle}
              variant="ghost"
              size="sm"
              aria-label="Open the docs menu"
              aria-expanded={open}
              aria-controls="docs-sidebar"
              onClick={() => setOpen(true)}
            >
              <Icon name="sidebar" />
            </Button>
            <Wordmark />
          </div>
          {children}
        </div>
        {/* The page, pushed aside, is one big way back. */}
        {open && <button type="button" className={styles.scrim} aria-label="Close the docs menu" onClick={close} />}
      </div>
    </div>
  );
}
