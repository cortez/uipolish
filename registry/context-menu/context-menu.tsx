"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { MenuGroup, MenuItem, MenuRadioGroup, MenuSub } from "../dropdown-menu/dropdown-menu";
import { TextMorph } from "../text-morph/text-morph";
import { Kbd } from "../kbd/kbd";
import styles from "./context-menu.module.css";

/* Behavior (right click, long press, the menu key, focus, keyboard,
   typeahead, submenus, dismissal, positioning at the pointer) comes from Base
   UI's ContextMenu. The look is the dropdown menu's, class for class: this
   file adds only the area that opens it. Its items are the dropdown menu's
   own, so one list serves a row's "…" button and its right click. */

const ITEM = "[data-menu-item]";

/** Moves the panel's one highlight under its highlighted item, as the dropdown menu does. */
function placeHighlight(popup: HTMLElement, bar: HTMLElement) {
  const item =
    popup.querySelector<HTMLElement>(`${ITEM}[data-highlighted]`) ??
    popup.querySelector<HTMLElement>(`${ITEM}[data-popup-open]`);
  if (!item) {
    bar.removeAttribute("data-visible");
    return;
  }
  const jump = !bar.hasAttribute("data-visible");
  if (jump) bar.setAttribute("data-jump", "");
  bar.style.translate = `0 ${item.offsetTop}px`;
  bar.style.height = `${item.offsetHeight}px`;
  bar.dataset.tone = item.dataset.tone ?? "";
  bar.setAttribute("data-visible", "");
  if (jump) {
    bar.getBoundingClientRect();
    bar.removeAttribute("data-jump");
  }
}

/** Mounts with the popup, each time it opens. */
function Highlight() {
  const barRef = useRef<HTMLSpanElement>(null);

  // Hold the popup's width from now on, so a relabelled item never pulls the
  // edge in under the pointer; and keep the bar under whichever item Base UI
  // marks highlighted.
  useLayoutEffect(() => {
    const bar = barRef.current;
    const popup = bar?.parentElement;
    if (!bar || !popup) return;
    popup.style.minWidth = `${popup.offsetWidth}px`;
    placeHighlight(popup, bar);
    const observer = new MutationObserver(() => placeHighlight(popup, bar));
    observer.observe(popup, { subtree: true, attributes: true, attributeFilter: ["data-highlighted", "data-popup-open"] });
    return () => observer.disconnect();
  }, []);

  return <span ref={barRef} className={styles.highlight} aria-hidden="true" />;
}

/** A CSS time token in ms. Browsers may report "250ms" as ".25s". */
function ms(value: string, fallback: number) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return value.trim().endsWith("ms") ? n : n * 1000;
}

/** Plays the panel's entrance again: an open menu asked for at a new point arrives there, it doesn't teleport. */
function arriveAgain(popup: HTMLElement) {
  const style = getComputedStyle(popup);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  popup.animate(
    still
      ? { opacity: [0, 1] }
      : { opacity: [0, 1], scale: [0.97, 1], filter: ["blur(2px)", "blur(0px)"] },
    {
      duration: ms(style.getPropertyValue("--ui-dur-fast"), 160),
      easing: style.getPropertyValue("--ui-ease-enter").trim() || "ease-out",
    },
  );
}

/* ---------- The dropdown menu's item, under this root ---------- */

/* The dropdown menu's MenuItem reads its own root for `close`, so it can't
   render under this one yet. Until the dropdown menu exports that root, a
   MenuItem written here is drawn by this twin: same props, same markup, same
   classes. */

type MenuItemProps = ComponentProps<typeof MenuItem>;

function ContextMenuItem({
  onSelect,
  variant = "default",
  closeOnSelect = true,
  busy = false,
  disabled = false,
  icon,
  shortcut,
  keyshortcuts,
  description,
  children,
  close,
}: MenuItemProps & { close: () => void }) {
  const id = useId();
  // A label that changes while the menu stays open morphs.
  const morphing = !closeOnSelect && typeof children === "string";
  return (
    <BaseContextMenu.Item
      id={id}
      className={styles.item}
      data-menu-item=""
      // Typeahead reads this; a morphing label renders its text twice.
      label={typeof children === "string" ? children : undefined}
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-description` : undefined}
      aria-keyshortcuts={keyshortcuts}
      disabled={disabled}
      // Busy isn't disabled: it keeps focus but ignores presses.
      closeOnClick={closeOnSelect && !busy}
      data-tone={variant === "danger" ? "danger" : undefined}
      aria-busy={busy || undefined}
      onClick={() => {
        if (!busy) onSelect?.({ close });
      }}
    >
      <span className={styles.leading} data-filled={icon ? "" : undefined} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.text}>
        <span id={`${id}-label`} className={styles.label}>
          {morphing ? <TextMorph>{children as string}</TextMorph> : children}
        </span>
        {description && (
          <span id={`${id}-description`} className={styles.description}>
            {description}
          </span>
        )}
      </span>
      {shortcut && <Kbd keys={[shortcut]} variant="plain" size="sm" className={styles.shortcut} aria-hidden="true" />}
    </BaseContextMenu.Item>
  );
}

/** Swaps each MenuItem for its twin, through fragments, groups and submenus. */
function adopt(nodes: ReactNode, close: () => void): ReactNode {
  return Children.map(nodes, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return child;
    if (child.type === MenuItem) return <ContextMenuItem {...(child.props as MenuItemProps)} close={close} />;
    if (child.type === Fragment || child.type === MenuGroup || child.type === MenuRadioGroup || child.type === MenuSub) {
      return cloneElement(child, undefined, adopt(child.props.children, close));
    }
    return child;
  });
}

/* ---------- Root ---------- */

type ContextMenuProps = {
  /** The area: a row, a card, a canvas. A right click, a long press or the menu key inside it opens the menu. */
  trigger: ReactElement;
  /** The dropdown menu's items: `MenuItem`, `MenuCheckboxItem`, `MenuSub` and the rest. */
  children: ReactNode;
  /** Names the menu for assistive tech: "Actions for Braised short rib". */
  label?: string;
  /** Leaves the browser's own menu alone. */
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export function ContextMenu({ trigger, children, label, disabled = false, onOpenChange, className }: ContextMenuProps) {
  const actionsRef = useRef<BaseContextMenu.Root.Actions | null>(null);
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);
  const close = useCallback(() => actionsRef.current?.close(), []);
  // What had focus when the menu opened: the area, or a button inside it.
  const focusedRef = useRef<Element | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <BaseContextMenu.Root
      disabled={disabled}
      onOpenChange={(next) => {
        if (next) focusedRef.current = document.activeElement;
        onOpenChange?.(next);
      }}
      actionsRef={actionsRef}
    >
      <BaseContextMenu.Trigger
        ref={setTriggerEl}
        className={styles.area}
        render={trigger}
        // A second right click while the menu is open moves it to the new point.
        onContextMenu={() => {
          if (popupRef.current) arriveAgain(popupRef.current);
        }}
      />
      {/* Into the themed subtree the area sits in, so the panel keeps its tokens. */}
      <BaseContextMenu.Portal container={triggerEl?.closest<HTMLElement>("[data-theme]") ?? undefined}>
        <BaseContextMenu.Positioner className={styles.positioner} collisionPadding={8}>
          <BaseContextMenu.Popup
            ref={popupRef}
            aria-label={label}
            className={className ? `${styles.surface} ${className}` : styles.surface}
            // Focus goes back to where it was: the area, or the button in it
            // that had focus. A right click on an area that held no focus
            // leaves none behind, rather than sending it to the first button
            // on the page; and focus the action itself moved (to a rename
            // field, to Undo) stays where the action put it.
            finalFocus={() => {
              const previous = focusedRef.current;
              const now = document.activeElement;
              const moved = now !== null && now !== document.body && !popupRef.current?.contains(now);
              return !moved && previous instanceof HTMLElement && previous.tabIndex >= 0 && previous.isConnected
                ? previous
                : false;
            }}
          >
            <Highlight />
            {adopt(children, close)}
          </BaseContextMenu.Popup>
        </BaseContextMenu.Positioner>
      </BaseContextMenu.Portal>
    </BaseContextMenu.Root>
  );
}
