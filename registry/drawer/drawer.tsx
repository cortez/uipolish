"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { Icon } from "../icons/icons";
import styles from "./drawer.module.css";

const FOCUSABLE = [
  "[autofocus]",
  "input:not([type=hidden]):not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "button:not(:disabled)",
  "a[href]",
  "[contenteditable=true]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function firstFocusable(root: Element | null) {
  if (!root) return null;
  const autofocus = root.querySelector<HTMLElement>("[autofocus]");
  if (autofocus) return autofocus;
  for (const el of root.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (!el.closest("[inert]") && el.getClientRects().length) return el;
  }
  return null;
}

const TEXT_ENTRY = /^(text|search|email|url|tel|password|number|date|time|datetime-local|month|week)$/;

function isTextEntry(el: HTMLElement) {
  if (el instanceof HTMLTextAreaElement || el.isContentEditable) return true;
  return el instanceof HTMLInputElement && TEXT_ENTRY.test(el.type);
}

/** The nearest themed subtree, so the portaled panel keeps its tokens. */
function themeRoot(el: Element | null) {
  const root = el?.closest<HTMLElement>("[data-theme]");
  return root && root !== document.documentElement ? root : undefined;
}

/** Media query under which the drawer becomes a bottom sheet. */
export const SHEET_QUERY = "(max-width: 640px), (pointer: coarse) and (max-height: 500px)";

function subscribe(onChange: () => void) {
  const query = matchMedia(SHEET_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useSheetQuery() {
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(SHEET_QUERY).matches,
    () => false,
  );
}

export type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Logical edge on wider screens; `bottom` makes it a sheet everywhere. */
  side?: "end" | "start" | "bottom";
  size?: "sm" | "md" | "lg";
  /** Focus target on open. Defaults to the first control in the body. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Focus returns here on close. Defaults to the element focused at open. */
  triggerRef?: RefObject<HTMLElement | null>;
  /** Focus target on close when the trigger is gone. */
  finalFocus?: RefObject<HTMLElement | null>;
  /** Blocks every way of dismissing, e.g. while saving. */
  locked?: boolean;
  className?: string;
};

/** A modal panel from the screen edge; a draggable bottom sheet on phones. Built on Base UI's Drawer. */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "end",
  size = "md",
  initialFocus,
  triggerRef,
  finalFocus,
  locked = false,
  className,
}: DrawerProps) {
  const narrow = useSheetQuery();
  const sheet = side === "bottom" || narrow;

  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const [footerEl, setFooterEl] = useState<HTMLDivElement | null>(null);
  // Set once the entrance has finished, so a drag released short of dismissing glides back.
  const [settled, setSettled] = useState(false);
  const [rtl, setRtl] = useState(false);

  // The element that opened it, read as `open` turns true, before Base UI
  // mounts the panel and moves focus inside.
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    const from = triggerRef?.current ?? (active instanceof HTMLElement && active !== document.body ? active : null);
    setTrigger(from);
    setRtl(getComputedStyle(from ?? document.documentElement).direction === "rtl");
  }, [open, triggerRef]);

  const swipeDirection = sheet ? "down" : (side === "start") === rtl ? "right" : "left";

  // Mobile keyboards cover the page without resizing it; lift the sheet by the
  // covered height. Pinch zoom also shrinks the visual viewport, so ignore it.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!open || !sheet || !popup || !viewport) return;
    function update() {
      const covered = viewport!.scale > 1.01 ? 0 : window.innerHeight - viewport!.height - viewport!.offsetTop;
      if (covered > 1) {
        popup!.style.setProperty("--drawer-keyboard", `${Math.round(covered)}px`);
        popup!.setAttribute("data-keyboard", "");
      } else {
        popup!.style.removeProperty("--drawer-keyboard");
        popup!.removeAttribute("data-keyboard");
      }
    }
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      popup.style.removeProperty("--drawer-keyboard");
      popup.removeAttribute("data-keyboard");
    };
  }, [open, sheet, popup]);

  // data-fits works around a Chromium scroll-timeline bug (see the CSS).
  const markFits = useCallback((el: HTMLDivElement | null) => {
    el?.toggleAttribute("data-fits", el.scrollHeight <= el.clientHeight);
  }, []);
  useEffect(() => {
    if (!body) return;
    markFits(body);
    const observer = new ResizeObserver(() => markFits(body));
    observer.observe(body);
    return () => observer.disconnect();
  }, [body, markFits]);

  function dismiss() {
    if (locked) return;
    onOpenChange(false);
  }

  return (
    <BaseDrawer.Root
      open={open}
      onOpenChange={(next) => {
        // Controlled: `locked` (or the owner) can keep it open.
        if (!next) dismiss();
      }}
      onOpenChangeComplete={(isOpen) => setSettled(isOpen)}
      swipeDirection={swipeDirection}
    >
      <BaseDrawer.Portal container={themeRoot(trigger)}>
        <BaseDrawer.Backdrop className={styles.backdrop} />
        <BaseDrawer.Viewport className={styles.viewport}>
          <BaseDrawer.Popup
            ref={setPopup}
            className={className ? `${styles.drawer} ${className}` : styles.drawer}
            data-mode={sheet ? "sheet" : "side"}
            data-side={side === "start" ? "start" : "end"}
            data-from={sheet ? "bottom" : swipeDirection === "right" ? "right" : "left"}
            data-size={size}
            data-settled={settled || undefined}
            initialFocus={() => {
              let el = initialFocus?.current ?? firstFocusable(body) ?? firstFocusable(footerEl);
              // Focusing a field while the sheet rises throws the keyboard over it.
              if (!initialFocus?.current && sheet && el && isTextEntry(el)) el = null;
              return el ?? popup ?? true;
            }}
            finalFocus={() => {
              if (trigger?.isConnected) return trigger;
              return finalFocus?.current ?? true;
            }}
          >
            {/* Side panels and a locked drawer don't swipe; a sheet does. */}
            <div className={styles.frame} data-base-ui-swipe-ignore={!sheet || locked ? "" : undefined}>
              <div className={styles.handle} aria-hidden="true" />
              <header className={styles.header}>
                <div className={styles.heading}>
                  <BaseDrawer.Title className={styles.title}>{title}</BaseDrawer.Title>
                  {description && (
                    <BaseDrawer.Description className={styles.description}>{description}</BaseDrawer.Description>
                  )}
                </div>
                <BaseDrawer.Close className={styles.close} aria-label="Close">
                  <Icon name="close" />
                </BaseDrawer.Close>
              </header>

              {/* Content: a mouse drag here selects text instead of moving the sheet. */}
              {children && (
                <BaseDrawer.Content
                  ref={setBody}
                  className={styles.body}
                  onScroll={(e) => markFits(e.currentTarget)}
                >
                  {children}
                </BaseDrawer.Content>
              )}

              {footer && (
                <div ref={setFooterEl} className={styles.footer}>
                  {footer}
                </div>
              )}
            </div>
          </BaseDrawer.Popup>
        </BaseDrawer.Viewport>
      </BaseDrawer.Portal>
    </BaseDrawer.Root>
  );
}

/** Footer button row; on a sheet the buttons share the width. */
export function DrawerActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
