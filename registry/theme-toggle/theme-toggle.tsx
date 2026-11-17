"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore, type ComponentProps } from "react";
import { Button } from "../button/button";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import { Tooltip } from "../tooltip/tooltip";
import { THEME_STORAGE_KEY } from "./theme-script";
import styles from "./theme-toggle.module.css";

// ThemeScript and themeScript() live in ./theme-script, which has no "use
// client": imported from here, a server layout would get a client reference.

/** What the person chose. "system" follows the OS. */
export type Theme = "light" | "dark" | "system";
/** What is on screen. */
export type ResolvedTheme = "light" | "dark";

const QUERY = "(prefers-color-scheme: dark)";
/** Same-tab writes; `storage` only fires in other tabs. */
const CHANGE = "uipolish:theme";

function readStored(key: string): Theme {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function readSystem(): ResolvedTheme {
  return matchMedia(QUERY).matches ? "dark" : "light";
}

/** The theme on <html>, or the system's when nothing is forced. */
function readResolved(): ResolvedTheme {
  const forced = document.documentElement.dataset.theme;
  return forced === "light" || forced === "dark" ? forced : readSystem();
}

function apply(theme: Theme) {
  const resolved = theme === "system" ? readSystem() : theme;
  const root = document.documentElement;
  if (root.dataset.theme !== resolved) root.dataset.theme = resolved;
}

type TransitionDocument = Document & {
  startViewTransition?: (options: { update: () => void; types: string[] }) => unknown;
};

/** A quick crossfade of the whole page, where view transition types exist. */
function withTransition(update: () => void) {
  const doc = document as TransitionDocument;
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return update();
  try {
    // Browsers with view transitions but without types take only a callback and throw here.
    doc.startViewTransition({ update, types: ["theme"] });
  } catch {
    update();
  }
}

function subscribe(onChange: () => void) {
  const media = matchMedia(QUERY);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

const unknown = () => undefined;

/** The OS's theme, following it live. Undefined until hydration. */
export function useSystemTheme() {
  return useSyncExternalStore(subscribe, readSystem, unknown);
}

type UseThemeOptions = {
  /** localStorage key. Match it in `ThemeScript`. */
  storageKey?: string;
  /** Crossfade the page when the theme changes (never under reduced motion). */
  transition?: boolean;
};

/** The document's theme. Every value is undefined until hydration. */
function useDocumentTheme({ storageKey = THEME_STORAGE_KEY, transition = true }: UseThemeOptions, active: boolean) {
  const readTheme = useCallback(() => readStored(storageKey), [storageKey]);
  const theme = useSyncExternalStore(subscribe, readTheme, unknown);
  const resolvedTheme = useSyncExternalStore(subscribe, readResolved, unknown);
  const systemTheme = useSystemTheme();

  // Without ThemeScript, or after another tab or the OS changes it.
  useEffect(() => {
    if (!active) return;
    const sync = () => apply(readStored(storageKey));
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey || e.key === null) sync();
    };
    sync();
    const media = matchMedia(QUERY);
    media.addEventListener("change", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [active, storageKey]);

  const setTheme = useCallback(
    (next: Theme) => {
      try {
        if (next === "system") localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, next);
      } catch {
        // Private mode: the theme still changes for this page.
      }
      window.dispatchEvent(new Event(CHANGE));
      const update = () => apply(next);
      if (transition) withTransition(update);
      else update();
    },
    [storageKey, transition],
  );

  return { theme, resolvedTheme, systemTheme, setTheme };
}

/**
 * The page's theme: what was chosen, what is showing, and a setter that
 * stores it and sets `data-theme` on <html>. Values are undefined until
 * hydration, so the server and the first client render agree.
 */
export function useTheme(options: UseThemeOptions = {}) {
  return useDocumentTheme(options, true);
}

type ThemeToggleProps = Omit<ComponentProps<"button">, "value" | "children"> & {
  /** Controlled: the theme this button shows. Leave it out to drive the page (`useTheme`). */
  value?: Theme;
  /** The theme it switches to. */
  onValueChange?: (theme: ResolvedTheme) => void;
  size?: "sm" | "md";
  variant?: "ghost" | "secondary";
  /** Show the next theme in a tooltip. */
  tooltip?: boolean;
  tooltipSide?: "top" | "bottom" | "left" | "right";
} & UseThemeOptions;

/** One capsule that switches light and dark; its sun turns into a moon. */
export function ThemeToggle({
  value,
  onValueChange,
  size = "md",
  variant = "ghost",
  tooltip = true,
  tooltipSide = "bottom",
  storageKey,
  transition,
  onClick,
  className,
  "aria-label": label = "Dark theme",
  ...props
}: ThemeToggleProps) {
  const controlled = value !== undefined;
  const page = useDocumentTheme({ storageKey, transition }, !controlled);
  const system = useSystemTheme();
  const resolved = controlled ? (value === "system" ? system : value) : page.resolvedTheme;
  const next: ResolvedTheme = resolved === "dark" ? "light" : "dark";

  // Fade (reduced motion) only on a real change, never on hydration.
  const [shown, setShown] = useState(resolved);
  const [changed, setChanged] = useState(false);
  if (resolved !== shown) {
    setShown(resolved);
    if (shown !== undefined && resolved !== undefined) setChanged(true);
  }

  const button = (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      aria-pressed={resolved === undefined ? undefined : resolved === "dark"}
      // Until hydration there's no state: CSS draws it from <html data-theme>.
      data-state={resolved}
      data-changed={changed || undefined}
      className={className ? `${styles.toggle} ${className}` : styles.toggle}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || resolved === undefined) return;
        onValueChange?.(next);
        // Back to the OS's theme means following the OS again.
        if (!controlled) page.setTheme(next === page.systemTheme ? "system" : next);
      }}
      {...props}
    >
      <Glyph />
    </Button>
  );

  if (!tooltip) return button;
  return (
    <Tooltip
      side={tooltipSide}
      describe={false}
      content={resolved === undefined ? "Switch theme" : `Switch to ${next} theme`}
    >
      {button}
    </Tooltip>
  );
}

// Eight short rays on a 16px grid, 5.25 to 6.75 from the center.
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (r: number) => `${+(8 + r * Math.cos(a)).toFixed(3)} ${+(8 + r * Math.sin(a)).toFixed(3)}`;
  return `M${p(5.25)}L${p(6.75)}`;
});

/**
 * One drawing for both themes, as an outline made of filled circles so the
 * crescent's tips come to clean points. The disc grows into the moon while a
 * second circle slides over it on the mask and bites the crescent out. The
 * rays turn, pull in and fade.
 */
function Glyph() {
  const mask = `${useId()}-moon`;
  return (
    <svg viewBox="0 0 16 16" className={styles.glyph} aria-hidden="true">
      <defs>
        {/* Hidden: the disc's inside, and the bite. The bite's own edge
            stays, so the crescent has an inner line as thick as its outer. */}
        <mask id={mask} maskUnits="userSpaceOnUse" x="-8" y="-8" width="32" height="32">
          <rect x="-8" y="-8" width="32" height="32" fill="white" />
          <circle className={`${styles.disc} ${styles.inner}`} fill="black" />
          <circle className={`${styles.bite} ${styles.outer}`} fill="white" />
          <circle className={`${styles.bite} ${styles.inner}`} fill="black" />
        </mask>
      </defs>
      <g className={styles.rays}>
        {RAYS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle className={`${styles.disc} ${styles.outer} ${styles.ring}`} mask={`url(#${mask})`} />
    </svg>
  );
}

type ThemeSelectProps = Omit<
  ComponentProps<typeof SegmentedControl>,
  "value" | "defaultValue" | "onValueChange" | "children"
> & {
  /** Controlled. Leave it out to drive the page (`useTheme`). */
  value?: Theme;
  onValueChange?: (theme: Theme) => void;
} & UseThemeOptions;

/** Light, Dark and System side by side, for a settings page. */
export function ThemeSelect({
  value,
  onValueChange,
  storageKey,
  transition,
  size = "sm",
  ...props
}: ThemeSelectProps) {
  const controlled = value !== undefined;
  const page = useDocumentTheme({ storageKey, transition }, !controlled);
  // Empty until hydration: no option is checked, and the pill appears in place.
  const current = value ?? page.theme ?? "";
  return (
    <SegmentedControl
      aria-label="Theme"
      size={size}
      {...props}
      value={current}
      onValueChange={(next) => {
        onValueChange?.(next as Theme);
        if (!controlled) page.setTheme(next as Theme);
      }}
    >
      <Segment value="light">Light</Segment>
      <Segment value="dark">Dark</Segment>
      <Segment value="system">System</Segment>
    </SegmentedControl>
  );
}
