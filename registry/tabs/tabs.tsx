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
  type ReactNode,
} from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { TextMorph } from "../text-morph/text-morph";
import { flyPill, stopPill } from "./pill-flight";
import styles from "./tabs.module.css";

type Orientation = "horizontal" | "vertical";

type TabsContextValue = {
  value: string;
  crossfade: boolean;
  manual: boolean;
  setAxis: (axis: Orientation) => void;
  register: (value: string) => () => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(part: string) {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`<${part}> must be inside <Tabs>.`);
  return context;
}

type TabsProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  /** Controlled value. Pair with `onValueChange`. */
  value?: string;
  /** Uncontrolled starting value, used when the URL has no valid `param`. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Arrow keys move focus only; Enter or Space selects. Use when showing a panel is slow. */
  manual?: boolean;
  /** Stack panels in one cell and crossfade between them. */
  crossfade?: boolean;
  /** Keep the selected tab in this search param (`?tab=notes`). Uncontrolled only. */
  param?: string;
  /** `vertical` puts the tabs in a column beside the panels; under 480px wide it falls back to a row. */
  orientation?: Orientation;
};

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  manual = false,
  crossfade = false,
  param,
  orientation = "horizontal",
  className,
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const value = controlledValue ?? uncontrolledValue;
  const controlled = controlledValue !== undefined;
  // The axis the list is laid out on now. A vertical list falls back to a row
  // under 480px, and Base UI's arrow keys follow what's on screen.
  const [axis, setAxis] = useState<Orientation>(orientation);

  // Tabs register their values so a URL can't select a tab that doesn't exist.
  const values = useRef(new Set<string>());
  const register = useCallback((v: string) => {
    values.current.add(v);
    return () => {
      values.current.delete(v);
    };
  }, []);

  const select = useCallback(
    (next: string) => {
      if (!controlled) setUncontrolledValue(next);
      onValueChange?.(next);
      if (param && !controlled) {
        const url = new URL(window.location.href);
        url.searchParams.set(param, next);
        window.history.replaceState(window.history.state, "", url);
      }
    },
    [controlled, onValueChange, param],
  );

  // A layout effect, so children's have run and every tab is registered.
  useLayoutEffect(() => {
    if (!param || controlled) return;
    function sync() {
      const fromUrl = new URLSearchParams(window.location.search).get(param!);
      setUncontrolledValue(fromUrl && values.current.has(fromUrl) ? fromUrl : (defaultValue ?? ""));
    }
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [param, controlled, defaultValue]);

  return (
    <TabsContext value={{ value, crossfade, manual, setAxis, register }}>
      <BaseTabs.Root
        // Always controlled: the URL and `param` live here, not in Base UI.
        value={value === "" ? null : value}
        onValueChange={(next, details) => {
          // Only user picks; ignore Base UI's own fallbacks for missing tabs.
          if (details.reason !== "none" || typeof next !== "string") return;
          select(next);
        }}
        orientation={axis}
        className={className ? `${styles.tabs} ${className}` : styles.tabs}
        data-layout={orientation}
        {...props}
      >
        {children}
      </BaseTabs.Root>
    </TabsContext>
  );
}

type TabListProps = Omit<ComponentProps<"div">, "role"> & {
  /** Names the set of tabs for screen readers, e.g. "Estimate sections". */
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/** The axis the list is laid out on now: read, not assumed, since the CSS can fall back to a row. */
function axisOf(list: HTMLElement): Orientation {
  return getComputedStyle(list).flexDirection.startsWith("column") ? "vertical" : "horizontal";
}

/** A tab's offset and length along the list, measured the way Base UI places the indicator. */
function span(tab: HTMLElement, list: HTMLElement, vertical: boolean) {
  const t = tab.getBoundingClientRect();
  const l = list.getBoundingClientRect();
  return vertical
    ? { start: t.top - l.top + list.scrollTop - list.clientTop, length: t.height }
    : { start: t.left - l.left + list.scrollLeft - list.clientLeft, length: t.width };
}

export function TabList({ className, children, ...props }: TabListProps) {
  const { value, manual, setAxis } = useTabs("TabList");
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const previous = useRef<string | null>(null);
  // Nothing animates until the first paint, so a tab picked from the URL is simply there.
  const painted = useRef(false);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        painted.current = true;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Base UI's Indicator rests the pill on the selected tab through its CSS
  // variables. On a change of tab, this plays the flight between them on top.
  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    const from = previous.current;
    previous.current = value;
    if (!list || !indicator || from === null || from === value) return;
    const tab = list.querySelector<HTMLElement>('[role="tab"][data-active]');
    const last = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]')).find((t) => t.dataset.value === from);
    if (!tab || !last) return;

    const vertical = axisOf(list) === "vertical";
    // A change mid-move starts from where the pill is on screen.
    const origin = stopPill(indicator, vertical) ?? span(last, list, vertical);
    if (!painted.current) return;
    flyPill(indicator, origin, span(tab, list, vertical), vertical);
  }, [value]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    setAxis(axisOf(list));
    setDirection(getComputedStyle(list).direction === "rtl" ? "rtl" : "ltr");
  }, [setAxis]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const edges = () => {
      const max = list.scrollWidth - list.clientWidth;
      const start = Math.abs(list.scrollLeft);
      list.toggleAttribute("data-overflow-start", start > 1);
      list.toggleAttribute("data-overflow-end", max - start > 1);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setAxis(axisOf(list)));
      edges();
    });
    observer.observe(list);
    // The scrollbar is hidden, so a vertical wheel scrolls the tabs; at either
    // end it goes back to scrolling the page.
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const max = list.scrollWidth - list.clientWidth;
      if (max <= 1) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientWidth : 1;
      const rtl = getComputedStyle(list).direction === "rtl";
      const by = event.deltaY * unit * (rtl ? -1 : 1);
      const start = Math.abs(list.scrollLeft);
      if ((by > 0) !== rtl ? max - start <= 1 : start <= 1) return;
      event.preventDefault();
      list.scrollBy({ left: by });
    };
    list.addEventListener("scroll", edges, { passive: true });
    list.addEventListener("wheel", wheel, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      list.removeEventListener("scroll", edges);
      list.removeEventListener("wheel", wheel);
    };
  }, [setAxis]);

  return (
    <DirectionProvider direction={direction}>
      <BaseTabs.List
        ref={listRef}
        activateOnFocus={!manual}
        className={className ? `${styles.list} ${className}` : styles.list}
        {...props}
      >
        <BaseTabs.Indicator ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
        {children}
      </BaseTabs.List>
    </DirectionProvider>
  );
}

type TabProps = Omit<ComponentProps<"button">, "value" | "role"> & {
  value: string;
  children: ReactNode;
  /** A count after the label, read as part of the tab's name ("Guests, 14"). */
  count?: number | string;
};

export function Tab({ value, count, className, children, onFocus, ...props }: TabProps) {
  const { register } = useTabs("Tab");

  useLayoutEffect(() => register(value), [register, value]);

  return (
    <BaseTabs.Tab
      value={value}
      data-value={value}
      className={className ? `${styles.tab} ${className}` : styles.tab}
      onFocus={(event) => {
        onFocus?.(event);
        // Arrowing to a tab hidden past the fade scrolls it into view.
        if (event.currentTarget.matches(":focus-visible")) {
          event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      }}
      {...props}
    >
      {count === undefined || count === "" ? (
        children
      ) : (
        <>
          <span className={styles.label}>
            {children}
            {/* Screen-reader-only pause, so the name reads "Guests, 14". */}
            <span className={styles.pause}>,</span>
          </span>
          <span className={styles.count}>
            <TextMorph>{String(count)}</TextMorph>
          </span>
        </>
      )}
    </BaseTabs.Tab>
  );
}

type TabPanelProps = Omit<ComponentProps<"div">, "role"> & {
  value: string;
};

export function TabPanel({ value, className, children, ...props }: TabPanelProps) {
  const { value: selected, crossfade } = useTabs("TabPanel");
  return (
    <BaseTabs.Panel
      value={value}
      // Unselected panels stay mounted, so their state survives a switch.
      keepMounted
      data-crossfade={crossfade || undefined}
      data-selected={value === selected || undefined}
      className={className ? `${styles.panel} ${className}` : styles.panel}
      {...props}
    >
      {children}
    </BaseTabs.Panel>
  );
}

/** Wraps the panels when `crossfade` is on, so they share one grid cell. */
export function TabPanels({ className, ...props }: ComponentProps<"div">) {
  return <div className={className ? `${styles.panels} ${className}` : styles.panels} {...props} />;
}
