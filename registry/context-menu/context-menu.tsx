"use client";

import { useCallback, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { MenuPanel, MenuScope } from "../dropdown-menu/dropdown-menu";
import styles from "./context-menu.module.css";

/* Behavior (right click, long press, the menu key, focus, keyboard,
   typeahead, submenus, dismissal, positioning at the pointer) comes from Base
   UI's ContextMenu. The panel and the items are the dropdown menu's own, so
   one list serves a row's "…" button and its right click. This file adds
   only the area that opens it. */

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

  // Focus goes back to where it was: the area, or the button in it that had
  // focus. A right click on an area that held no focus leaves none behind,
  // rather than sending it to the first button on the page; and focus the
  // action itself moved (to a rename field, to Undo) stays where the action
  // put it.
  const finalFocus = useCallback(() => {
    const previous = focusedRef.current;
    const now = document.activeElement;
    const moved = now !== null && now !== document.body && !popupRef.current?.contains(now);
    return !moved && previous instanceof HTMLElement && previous.tabIndex >= 0 && previous.isConnected ? previous : false;
  }, []);

  return (
    <MenuScope anchor={triggerEl} close={close}>
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
        {/* No side given: Base UI puts the panel's corner at the pointer. */}
        <MenuPanel popupRef={popupRef} label={label} finalFocus={finalFocus} className={className}>
          {children}
        </MenuPanel>
      </BaseContextMenu.Root>
    </MenuScope>
  );
}
