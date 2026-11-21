"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
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

/** A height the sheet rests at: a fraction of the screen's height (0 to 1),
    pixels as a number over 1, or a `px` or `rem` string. */
export type DrawerSnapPoint = number | string;

/** Resolves a snap point to pixels, as Base UI does. */
function snapHeight(point: DrawerSnapPoint, viewport: number, rem: number) {
  if (typeof point === "number") return point <= 1 ? Math.max(0, point) * viewport : point;
  const value = Number.parseFloat(point);
  if (!Number.isFinite(value)) return 0;
  return point.trim().endsWith("rem") ? value * rem : value;
}

export type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The panel's name, shown in the header. Leave it out with `header={false}` and name it with `aria-label`. */
  title?: ReactNode;
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
  /** `false`: no scrim, focus trap or scroll lock; the page stays live and a press on it doesn't close the drawer. */
  modal?: boolean;
  /** Heights the sheet rests at, lowest first. Phones and `side="bottom"` only. */
  snapPoints?: DrawerSnapPoint[];
  /** Controlled snap point. Defaults to the first on every open. */
  snapPoint?: DrawerSnapPoint | null;
  onSnapPointChange?: (snapPoint: DrawerSnapPoint | null) => void;
  /** `false` drops the header row (title, description, close button); a node replaces it with your own row. */
  header?: ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
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
  modal = true,
  snapPoints,
  snapPoint,
  onSnapPointChange,
  header = true,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  className,
}: DrawerProps) {
  const narrow = useSheetQuery();
  const sheet = side === "bottom" || narrow;
  const builtInHeader = header === true;

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !open) return;
    if (!(builtInHeader && title) && !ariaLabel && !ariaLabelledby) {
      console.warn("Drawer: give it a `title`, or an `aria-label` or `aria-labelledby` when `header` isn't the built-in one.");
    }
  }, [open, builtInHeader, title, ariaLabel, ariaLabelledby]);

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

  // Snap points: Base UI resolves them, runs the drag and picks where a release
  // lands. The state lives here so the sheet can be sized to its top point and
  // the body knows whether it may scroll.
  const snapsWanted = sheet && Boolean(snapPoints?.length);
  const [ownSnap, setOwnSnap] = useState<DrawerSnapPoint | null>(snapPoints?.[0] ?? null);
  const activeSnap = snapPoint !== undefined ? snapPoint : ownSnap;
  const changeSnap = useCallback(
    (next: DrawerSnapPoint | null) => {
      if (snapPoint === undefined) setOwnSnap(next);
      onSnapPointChange?.(next);
    },
    [snapPoint, onSnapPointChange],
  );
  // Every open starts at the first point, however the last one ended.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOwnSnap(snapPoints?.[0] ?? null);
  }

  const [screen, setScreen] = useState({ height: 0, rem: 16 });
  useLayoutEffect(() => {
    if (!open || !snapsWanted) return;
    function measure() {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setScreen({ height: window.innerHeight, rem });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, snapsWanted]);
  // Base UI gets whole pixels, so the sheet never rests on a fractional offset
  // that blurs its text; the owner's own values map back in onSnapPointChange.
  const px = (point: DrawerSnapPoint) => Math.max(2, Math.round(snapHeight(point, screen.height, screen.rem)));
  const snaps = snapsWanted && screen.height ? snapPoints!.map(px) : undefined;
  // The sheet is as tall as its top point; lower points slide it down.
  const sheetHeight = snaps ? Math.max(...snaps) : 0;
  const activeIndex = activeSnap === null || !snapPoints ? -1 : snapPoints.findIndex((p) => Object.is(p, activeSnap));
  const activeHeight = !snaps || activeSnap === null ? null : activeIndex >= 0 ? snaps[activeIndex] : px(activeSnap);
  // While it closes the sheet stays at the point it left from: Base UI resets
  // the snap point as it starts closing, which would move a sheet that only fades.
  const [openHeight, setOpenHeight] = useState<number | null>(null);
  if (open && activeHeight !== openHeight) setOpenHeight(activeHeight);
  const restHeight = open ? activeHeight : openHeight;
  const atTop = restHeight === null || restHeight >= sheetHeight - 1;

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

  // Moves `by` points up (positive) or down, never past the ends: the keyboard
  // and the handle's own press never close the sheet.
  function stepSnap(by: number) {
    if (!snaps || !snapPoints) return;
    const order = snaps.map((h, i) => [h, i] as const).sort((a, b) => a[0] - b[0]);
    const current = Math.max(0, order.findIndex(([h]) => h >= (restHeight ?? sheetHeight) - 1));
    const next = Math.min(order.length - 1, Math.max(0, current + (Number.isFinite(by) ? by : by > 0 ? order.length : -order.length)));
    changeSnap(snapPoints[order[next][1]]);
  }

  // A finger that lands on the sheet while it settles catches it where it is.
  // Base UI measures a snap drag from the point it was settling to, so the
  // difference rides along in --drawer-grab until the release, when it glides
  // out with the settle.
  const snapping = Boolean(snaps);
  useEffect(() => {
    if (!snapping || !popup) return;
    const el = popup;
    function grab(e: TouchEvent | PointerEvent) {
      if ("pointerType" in e) {
        // Touch is handled from touchstart; a mouse on the body selects text.
        if (e.pointerType === "touch") return;
        const target = e.target as Element;
        if (target.closest("[data-drawer-content], [data-base-ui-swipe-ignore]")) return;
      }
      const style = getComputedStyle(el);
      const visual = new DOMMatrix(style.transform).m42;
      const rest =
        (Number.parseFloat(el.style.getPropertyValue("--drawer-snap-point-offset")) || 0) +
        (Number.parseFloat(el.style.getPropertyValue("--drawer-swipe-movement-y")) || 0);
      const offset = Math.abs(visual - rest) > 0.5 ? visual - rest : 0;
      el.style.setProperty("--drawer-grab", `${offset}px`);
    }
    function release() {
      // After Base UI has handled the release, in the same frame as its new offset.
      requestAnimationFrame(() => el.style.setProperty("--drawer-grab", "0px"));
    }
    el.addEventListener("touchstart", grab, { capture: true, passive: true });
    el.addEventListener("pointerdown", grab, true);
    window.addEventListener("touchend", release, true);
    window.addEventListener("touchcancel", release, true);
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);
    return () => {
      el.removeEventListener("touchstart", grab, true);
      el.removeEventListener("pointerdown", grab, true);
      window.removeEventListener("touchend", release, true);
      window.removeEventListener("touchcancel", release, true);
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
      el.style.removeProperty("--drawer-grab");
    };
  }, [snapping, popup]);

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
      onOpenChange={(next, details) => {
        // Controlled: `locked` (or the owner) can keep it open. Cancelling also
        // keeps Base UI from resetting the snap point of a drawer that stays.
        if (next) return;
        if (locked) details.cancel();
        dismiss();
      }}
      onOpenChangeComplete={(isOpen) => setSettled(isOpen)}
      swipeDirection={swipeDirection}
      modal={modal}
      // A sheet that leaves the page live stays while you use the page.
      disablePointerDismissal={!modal}
      snapPoints={snaps}
      // Always controlled, so a resize between sheet and side panel doesn't switch modes.
      snapPoint={restHeight}
      onSnapPointChange={(next) => {
        if (!snaps) return;
        // null: a drag is closing it. Tell the owner, but keep the point the sheet leaves from.
        if (next === null) onSnapPointChange?.(null);
        else changeSnap(snapPoints![snaps.indexOf(Number(next))] ?? null);
      }}
      // A flick moves one point at a time, as vaul does, not straight to closed.
      snapToSequentialPoints
    >
      <BaseDrawer.Portal container={themeRoot(trigger)}>
        {modal && <BaseDrawer.Backdrop className={styles.backdrop} />}
        <BaseDrawer.Viewport className={styles.viewport}>
          <BaseDrawer.Popup
            ref={setPopup}
            className={className ? `${styles.drawer} ${className}` : styles.drawer}
            data-mode={sheet ? "sheet" : "side"}
            data-side={side === "start" ? "start" : "end"}
            data-from={sheet ? "bottom" : swipeDirection === "right" ? "right" : "left"}
            data-size={size}
            data-settled={settled || undefined}
            data-modal={modal ? undefined : "false"}
            data-snaps={snaps ? "" : undefined}
            data-snap-top={snaps && atTop ? "" : undefined}
            style={sheetHeight ? ({ "--drawer-snap-height": `${sheetHeight}px` } as CSSProperties) : undefined}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            onFocus={(e) => {
              // Tab to something below the screen's edge raises the sheet to its top
              // point. Not the focus that lands while it rises, which is off screen too.
              if (!snaps || atTop || !settled || !e.target.matches(":focus-visible")) return;
              const rect = e.target.getBoundingClientRect();
              if (rect.bottom > (window.visualViewport?.height ?? window.innerHeight)) {
                changeSnap(snapPoints![snaps.indexOf(sheetHeight)]);
              }
            }}
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
              {snaps ? (
                // With snap points the handle is a button: it steps the sheet up
                // (back to the lowest point from the top), and the arrow keys move it.
                <button
                  type="button"
                  className={`${styles.handle} ${styles.grabber}`}
                  aria-label={atTop ? "Collapse sheet" : "Expand sheet"}
                  onClick={() => stepSnap(atTop ? -Infinity : 1)}
                  onKeyDown={(e) => {
                    const step = { ArrowUp: 1, ArrowDown: -1, PageUp: 1, PageDown: -1, Home: Infinity, End: -Infinity }[e.key];
                    if (!step) return;
                    e.preventDefault();
                    stepSnap(step);
                  }}
                />
              ) : (
                <div className={styles.handle} aria-hidden="true" />
              )}
              {builtInHeader ? (
                <header className={styles.header}>
                  <div className={styles.heading}>
                    {title && <BaseDrawer.Title className={styles.title}>{title}</BaseDrawer.Title>}
                    {description && (
                      <BaseDrawer.Description className={styles.description}>{description}</BaseDrawer.Description>
                    )}
                  </div>
                  <BaseDrawer.Close className={styles.close} aria-label="Close">
                    <Icon name="close" />
                  </BaseDrawer.Close>
                </header>
              ) : (
                header !== false && header !== null && <div className={styles.top}>{header}</div>
              )}

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
