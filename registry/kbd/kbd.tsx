"use client";

import { useSyncExternalStore, type ComponentProps } from "react";
import styles from "./kbd.module.css";

type Platform = "apple" | "other";

/* [drawn, read] on Apple, then elsewhere. */
const KEYS: Record<string, [[string, string], [string, string]]> = {
  mod: [["⌘", "Command"], ["Ctrl", "Control"]],
  cmd: [["⌘", "Command"], ["⌘", "Command"]],
  ctrl: [["⌃", "Control"], ["Ctrl", "Control"]],
  alt: [["⌥", "Option"], ["Alt", "Alt"]],
  option: [["⌥", "Option"], ["Alt", "Alt"]],
  shift: [["⇧", "Shift"], ["Shift", "Shift"]],
  enter: [["↵", "Return"], ["↵", "Enter"]],
  return: [["↵", "Return"], ["↵", "Enter"]],
  backspace: [["⌫", "Delete"], ["⌫", "Backspace"]],
  delete: [["⌦", "Forward delete"], ["Del", "Delete"]],
  tab: [["Tab", "Tab"], ["Tab", "Tab"]],
  esc: [["esc", "Escape"], ["esc", "Escape"]],
  escape: [["esc", "Escape"], ["esc", "Escape"]],
  space: [["Space", "Space"], ["Space", "Space"]],
  up: [["↑", "Up arrow"], ["↑", "Up arrow"]],
  down: [["↓", "Down arrow"], ["↓", "Down arrow"]],
  left: [["←", "Left arrow"], ["←", "Left arrow"]],
  right: [["→", "Right arrow"], ["→", "Right arrow"]],
};

function key(name: string, platform: Platform): [string, string] {
  const known = KEYS[name.toLowerCase()];
  if (known) return known[platform === "apple" ? 0 : 1];
  const shown = name.length === 1 ? name.toUpperCase() : name;
  return [shown, shown];
}

/* Adds a <head> stylesheet before first paint that picks a spelling. Not an <html>
   attribute: hydration tolerates extra <head> nodes but reports attributes. */
const STYLE_ID = "kbd-platform";
const SCRIPT = `(function(){if(document.getElementById("${STYLE_ID}"))return;var a=/mac|iphone|ipad|ipod/i.test((navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||navigator.userAgent),s=document.createElement("style");s.id="${STYLE_ID}";s.textContent="[data-kbd-spelling="+(a?"other":"apple")+"]{display:none!important}[data-kbd-spelling="+(a?"apple":"other")+"]{visibility:visible!important}";document.head.appendChild(s)})()`;

// Keep in sync with the test in SCRIPT.
function detect(): Platform {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  // iPadOS reports itself as a Mac, which is right here: same keys.
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent) ? "apple" : "other";
}

// No stylesheet yet (script blocked, or no server Kbd): painted Kbds only change visibility.
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const shown = detect();
  const hidden = shown === "apple" ? "other" : "apple";
  const painted = document.querySelector("[data-kbd-spelling]") !== null;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent =
    `[data-kbd-spelling=${hidden}]{${painted ? "visibility:hidden" : "display:none"}!important}` +
    `[data-kbd-spelling=${shown}]{visibility:visible!important}`;
  document.head.appendChild(style);
}

// True only for server HTML and hydration, where the script runs as parsed.
const subscribe = () => () => {};
const useServerHtml = () =>
  useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  );

type KbdProps = Omit<ComponentProps<"kbd">, "children"> & {
  /** Keys pressed together, in order: `["mod", "K"]`. `mod` is ⌘ on Apple, Ctrl elsewhere. */
  keys: string[];
  /** `caps` (default) draws each key as a cap; `plain` is text only, like "⌘K" or "Ctrl+K". */
  variant?: "caps" | "plain";
  size?: "sm" | "md";
  /** Force one platform's spelling. */
  platform?: Platform;
};

/** A key or shortcut as the reader's keyboard labels it: ⌘K on Apple, Ctrl K elsewhere. */
export function Kbd({ keys, variant = "caps", size = "md", platform, className, ...props }: KbdProps) {
  const serverHtml = useServerHtml();

  const spell = (p: Platform) => {
    const parts = keys.map((k) => key(k, p));
    return {
      look: variant === "caps" ? parts.map(([shown]) => shown) : [parts.map(([shown]) => shown).join(p === "apple" ? "" : "+")],
      read: parts.map(([, read]) => read).join(" "),
    };
  };
  const apple = spell("apple");
  const other = spell("other");
  const same = apple.read === other.read && apple.look.join("\n") === other.look.join("\n");
  const both = !platform && !same;

  // Symbols like ⌘ are read inconsistently, so screen readers get key names instead.
  const spelling = ({ look, read }: ReturnType<typeof spell>, p?: Platform) => (
    <span key={p} className={styles.spelling} data-kbd-spelling={p}>
      <span className={styles.keys} aria-hidden="true">
        {variant === "caps"
          ? look.map((shown, i) => (
              <kbd key={i} className={styles.key}>
                {shown}
              </kbd>
            ))
          : look[0]}
      </span>
      <span className={styles.srOnly}>{read}</span>
    </span>
  );

  return (
    <>
      {both && serverHtml && <script dangerouslySetInnerHTML={{ __html: SCRIPT }} suppressHydrationWarning />}
      <kbd
        className={className ? `${styles.root} ${className}` : styles.root}
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {both ? [spelling(apple, "apple"), spelling(other, "other")] : spelling(platform === "apple" ? apple : other)}
      </kbd>
    </>
  );
}
