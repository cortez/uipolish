"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { Kbd } from "../kbd/kbd";
import styles from "./nav-rail.module.css";

/** Hover delay before the rail's tooltip first opens; the same as Tooltip's. */
const OPEN_DELAY = 500;
/** After the tooltip closes, coming back to the rail opens it instantly for this long. */
const WARM_WINDOW = 300;
/** On touch, holding an item this long shows its tooltip, the way a long press does on a phone. */
const LONG_PRESS = 400;

export type NavRailItem = {
  id: string;
  /** The item's name: its accessible name and the tooltip's text. */
  label: string;
  /** A 16px icon, drawn in `currentColor`. */
  icon: ReactNode;
  /** One key pressed with ⌘ or Ctrl, like `"1"`. Shown in the tooltip; handled when `shortcuts` is on. */
  shortcut?: string;
  /** Renders a link instead of a button. */
  href?: string;
  /** An unread count on the icon. 0 or undefined hides it. */
  badge?: number;
};

type Payload = { label: string; shortcut?: string };

type RailContext = {
  handle: ReturnType<typeof BaseTooltip.createHandle<Payload>>;
  orientation: "vertical" | "horizontal";
  /** Where the tooltip portals: the nearest open dialog or themed section, so it takes that theme. */
  container: HTMLElement | null;
  /** The rail item look `NavRailTrigger` gives its child; none in a tooltip group. */
  itemClass?: string;
};

const Context = createContext<RailContext | null>(null);

type NavRailProps = Omit<ComponentProps<"nav">, "children" | "onChange"> & {
  /** Names the landmark: "Main". */
  "aria-label"?: string;
  items: NavRailItem[];
  /** The id of the current item. */
  value?: string;
  /** Called with an item's id when it's pressed, or its shortcut is. */
  onValueChange?: (id: string) => void;
  /** Pinned to the far end: an account button, usually. Wrap it in `NavRailTrigger` to give it the tooltip. */
  footer?: ReactNode;
  /** `vertical` (default): a side rail. `horizontal`: a bottom bar; the tooltip opens above. */
  orientation?: "vertical" | "horizontal";
  /** Handle ⌘ or Ctrl plus each item's `shortcut` anywhere on the page. */
  shortcuts?: boolean;
  /** Horizontal only: pin the bar to the bottom of the viewport (or of the nearest transformed or
   * `contain: layout` ancestor), floating clear of the phone's home indicator. */
  fixed?: boolean;
};

function token(el: Element, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

function ms(value: string) {
  return value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;
}

/** A compact app navigation rail: icon items, one shared tooltip that glides between them, and a capsule on the current one. */
export function NavRail({
  "aria-label": ariaLabel = "Main",
  items,
  value,
  onValueChange,
  footer,
  orientation = "vertical",
  shortcuts = false,
  fixed = false,
  className,
  style,
  ...props
}: NavRailProps) {
  const [handle] = useState(() => BaseTooltip.createHandle<Payload>());
  const [navEl, setNavEl] = useState<HTMLElement | null>(null);
  const container = navEl?.closest<HTMLElement>("dialog[open], [data-theme]") ?? null;
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const placed = useRef<{ value: string; x: number; y: number } | null>(null);
  const vertical = orientation === "vertical";

  // Glide the capsule to the current item, like the segmented control's pill.
  const place = useCallback(
    (animate: boolean) => {
      const list = listRef.current;
      const indicator = indicatorRef.current;
      if (!list || !indicator) return;
      const item = value ? list.querySelector<HTMLElement>(`[data-id="${CSS.escape(value)}"]`) : null;
      if (!item || !value) {
        indicator.removeAttribute("data-visible");
        placed.current = null;
        return;
      }
      const box = item.getBoundingClientRect();
      const origin = list.getBoundingClientRect();
      const x = box.left - origin.left;
      const y = box.top - origin.top;
      const last = placed.current;
      indicator.setAttribute("data-visible", "");
      indicator.style.width = `${box.width}px`;
      indicator.style.height = `${box.height}px`;
      if (last && last.value === value && last.x === x && last.y === y) return;

      let from = last ? `translate(${last.x}px, ${last.y}px)` : null;
      const running = indicator.getAnimations();
      if (running.length) {
        from = getComputedStyle(indicator).transform;
        running.forEach((a) => a.cancel());
      }
      const to = `translate(${x}px, ${y}px)`;
      indicator.style.transform = to;
      placed.current = { value, x, y };

      const moved = last && last.value !== value;
      if (!animate || !moved || !from || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      indicator.animate([{ transform: from }, { transform: to }], {
        duration: ms(token(list, "--ui-dur-glide", "320ms")),
        easing: token(list, "--ui-ease-glide", "ease-out"),
      });
    },
    [value],
  );

  useLayoutEffect(() => {
    place(true);
    listRef.current?.setAttribute("data-ready", "");
  }, [place, orientation]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const remeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place(false));
    };
    const observer = new ResizeObserver(remeasure);
    observer.observe(list);
    for (const item of list.querySelectorAll("[data-id]")) observer.observe(item);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [place, items.length]);

  // ⌘ or Ctrl plus a shortcut presses that item, so a link navigates and a button selects.
  useEffect(() => {
    if (!shortcuts) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.shiftKey || !(e.metaKey || e.ctrlKey)) return;
      const digit = /^Digit(\d)$/.exec(e.code)?.[1];
      const item = items.find(
        (i) => i.shortcut && (i.shortcut.toLowerCase() === e.key.toLowerCase() || i.shortcut === digit),
      );
      if (!item) return;
      e.preventDefault();
      listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(item.id)}"]`)?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, items]);

  // Touch has no hover, so a long press shows the tooltip instead. Sliding the
  // finger along the rail glides it from item to item, and lifting it presses
  // the item under the finger, like a phone's tab bar. A short tap is a tap.
  const press = useRef<{ id: number; timer: number; x: number; y: number; over: HTMLElement | null; held: boolean } | null>(
    null,
  );
  const swallowClick = useRef(false);
  useEffect(() => () => window.clearTimeout(press.current?.timer), []);

  function itemAt(x: number, y: number) {
    const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-rail-item]");
    return hit && navEl?.contains(hit) ? hit : null;
  }

  function endPress(select: boolean) {
    const p = press.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    press.current = null;
    if (!p.held) return;
    handle.close();
    // The browser may still send a click to where the finger went down; the
    // press is ours now, so it lands on the item under the finger instead.
    swallowClick.current = true;
    window.setTimeout(() => (swallowClick.current = false), 400);
    if (select && p.over) {
      swallowClick.current = false;
      p.over.click();
      swallowClick.current = true;
    }
  }

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== "touch" || press.current) return;
    const item = (e.target as Element).closest<HTMLElement>("[data-rail-item]");
    if (!item) return;
    const p = { id: e.pointerId, x: e.clientX, y: e.clientY, over: item, held: false, timer: 0 };
    p.timer = window.setTimeout(() => {
      p.held = true;
      if (p.over?.id) handle.open(p.over.id);
    }, LONG_PRESS);
    press.current = p;
  }

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.held) {
      // Moving before the tooltip shows is a scroll or a swipe, not a press.
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) endPress(false);
      return;
    }
    const over = itemAt(e.clientX, e.clientY);
    if (over !== p.over) {
      p.over = over;
      if (over?.id) handle.open(over.id);
      else handle.close();
    }
  }

  // Arrow keys along the rail, Home and End; Tab still visits every item.
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const prev = vertical ? "ArrowUp" : "ArrowLeft";
    const next = vertical ? "ArrowDown" : "ArrowRight";
    if (![prev, next, "Home", "End"].includes(e.key)) return;
    const all = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-rail-item]")];
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (at === -1) return;
    e.preventDefault();
    const to =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? all.length - 1
          : (at + (e.key === next ? 1 : -1) + all.length) % all.length;
    all[to]?.focus();
  }

  return (
    <Context.Provider value={{ handle, orientation, container, itemClass: styles.item }}>
      <BaseTooltip.Provider delay={OPEN_DELAY} timeout={WARM_WINDOW}>
        <nav
          ref={setNavEl}
          aria-label={ariaLabel}
          data-orientation={orientation}
          data-fixed={(fixed && !vertical) || undefined}
          className={className ? `${styles.rail} ${className}` : styles.rail}
          // How many items share a bottom bar's width, so CSS can size it to fit them.
          style={
            {
              "--nav-rail-items": items.length,
              "--nav-rail-count": items.length + (footer ? 1 : 0),
              ...style,
            } as CSSProperties
          }
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => press.current?.id === e.pointerId && endPress(true)}
          onPointerCancel={(e) => press.current?.id === e.pointerId && endPress(false)}
          onClickCapture={(e) => {
            if (!swallowClick.current) return;
            swallowClick.current = false;
            e.preventDefault();
            e.stopPropagation();
          }}
          // A long press on a link would otherwise open the browser's menu over the tooltip.
          onContextMenu={(e) => press.current && e.preventDefault()}
          {...props}
        >
          <div ref={listRef} className={styles.track}>
            <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
            <ul className={styles.list}>
              {items.map((item) => {
                const current = item.id === value;
                const count = item.badge && item.badge > 0 ? item.badge : 0;
                const name = count ? `${item.label}, ${count} new` : item.label;
                const element = item.href ? <a href={item.href} /> : <button type="button" />;
                return (
                  <li key={item.id} className={styles.cell}>
                    <BaseTooltip.Trigger
                      handle={handle}
                      payload={{ label: item.label, shortcut: item.shortcut }}
                      delay={OPEN_DELAY}
                      render={element}
                      data-id={item.id}
                      data-rail-item=""
                      data-current={current || undefined}
                      aria-label={name}
                      aria-current={current ? "page" : undefined}
                      aria-keyshortcuts={
                        shortcuts && item.shortcut ? `Meta+${item.shortcut} Control+${item.shortcut}` : undefined
                      }
                      className={styles.item}
                      onClick={() => onValueChange?.(item.id)}
                    >
                      <span className={styles.icon} aria-hidden="true">
                        {item.icon}
                      </span>
                      {count > 0 && (
                        <span className={styles.badge} aria-hidden="true">
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </BaseTooltip.Trigger>
                  </li>
                );
              })}
            </ul>
          </div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </nav>
        <RailTooltip />
      </BaseTooltip.Provider>
    </Context.Provider>
  );
}

/** The one tooltip every item shares. */
function RailTooltip() {
  const rail = useContext(Context)!;
  // Position and width glide only once it's on screen, so it never slides in from the corner.
  const [gliding, setGliding] = useState(false);
  const open = useRef(false);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <BaseTooltip.Root
      handle={rail.handle}
      onOpenChange={(next) => {
        open.current = next;
        cancelAnimationFrame(frame.current);
        // Two frames: placed, then painted where it belongs. Already gliding means
        // it never left: the pointer crossed a gap and came back while it faded.
        if (next)
          frame.current = requestAnimationFrame(() => {
            frame.current = requestAnimationFrame(() => setGliding(true));
          });
      }}
      // Stop gliding only once it's gone. Crossing the gap between two items
      // closes it for a moment; dropping the glide then made it jump to the next
      // item instead of gliding, whenever the pointer happened to land in the gap.
      onOpenChangeComplete={(done) => {
        if (!done && !open.current) setGliding(false);
      }}
    >
      {({ payload }) => (
        <BaseTooltip.Portal container={rail.container ?? undefined}>
          <BaseTooltip.Positioner
            className={styles.positioner}
            side={rail.orientation === "vertical" ? "inline-end" : "top"}
            sideOffset={8}
            collisionPadding={8}
            data-glide={gliding || undefined}
          >
            {/* The items carry the names; this is a visual echo of them. */}
            <BaseTooltip.Popup className={styles.tooltip} aria-hidden="true">
              <BaseTooltip.Viewport className={styles.viewport}>
                {payload && (
                  <span className={styles.tip}>
                    <span className={styles.tipLabel}>{payload.label}</span>
                    {payload.shortcut && (
                      <Kbd className={styles.tipKbd} keys={["mod", payload.shortcut]} variant="plain" size="sm" />
                    )}
                  </span>
                )}
              </BaseTooltip.Viewport>
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      )}
    </BaseTooltip.Root>
  );
}

type NavRailTooltipGroupProps = {
  /** An element inside the group: the tooltip portals into its nearest open dialog or themed section. */
  root?: HTMLElement | null;
  /** `vertical` (default): the tooltip opens beside the triggers; `horizontal`: above them. */
  orientation?: "vertical" | "horizontal";
  children: ReactNode;
};

/**
 * The rail's one gliding tooltip, for triggers that aren't in a `NavRail`:
 * a collapsed sidebar's icons, a toolbar. Wrap each trigger in `NavRailTrigger`.
 */
export function NavRailTooltipGroup({ root = null, orientation = "vertical", children }: NavRailTooltipGroupProps) {
  const [handle] = useState(() => BaseTooltip.createHandle<Payload>());
  const container = root?.closest<HTMLElement>("dialog[open], [data-theme]") ?? null;
  return (
    <Context.Provider value={{ handle, orientation, container }}>
      <BaseTooltip.Provider delay={OPEN_DELAY} timeout={WARM_WINDOW}>
        {children}
        <RailTooltip />
      </BaseTooltip.Provider>
    </Context.Provider>
  );
}

type NavRailTriggerProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  /** What the tooltip says; give the child the same accessible name. */
  label: string;
  shortcut?: string;
  /** Keep the tooltip closed, as while a sidebar shows its labels. */
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
  /** One focusable element, like the account button in `footer`. */
  children: ReactElement;
};

/**
 * Joins a control to the rail's shared tooltip. In a `NavRail` it's styled as a
 * rail item; in a `NavRailTooltipGroup` it keeps its own look. Other props pass
 * through to the child, so a menu can render it as its trigger.
 */
export function NavRailTrigger({ label, shortcut, disabled = false, children, ...props }: NavRailTriggerProps) {
  const rail = useContext(Context);
  if (!rail) return children;
  return (
    <BaseTooltip.Trigger
      {...props}
      handle={rail.handle}
      payload={{ label, shortcut }}
      delay={OPEN_DELAY}
      disabled={disabled}
      render={children}
      data-rail-item=""
      className={rail.itemClass}
    />
  );
}
