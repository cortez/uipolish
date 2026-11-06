"use client";

import {
  useCallback,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import styles from "./popover.module.css";

export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

type PopoverProps = {
  /** A button; it gets aria-expanded and aria-controls. */
  trigger: ReactElement;
  /** Content, or a function that receives `close`. */
  children: ReactNode | ((api: { close: () => void }) => ReactNode);
  /** `content` focuses inside as a dialog (forms); `none` keeps focus on the trigger. */
  focus?: "content" | "none";
  /** Required when `focus="content"` unless `labelledBy` is set. */
  label?: string;
  labelledBy?: string;
  side?: Side;
  align?: Align;
  arrow?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/** Portal into the nearest themed subtree (tokens) or open modal dialog (else it's inert). */
function portalTarget(trigger: HTMLElement | null) {
  return trigger?.closest<HTMLElement>("dialog[open], [data-theme]") ?? undefined;
}

export function Popover({
  trigger,
  children,
  focus = "content",
  label,
  labelledBy,
  side = "bottom",
  align = "center",
  arrow = false,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);

  const isDialog = focus === "content";

  return (
    <BasePopover.Root open={open} onOpenChange={(next) => setOpen(next)}>
      <BasePopover.Trigger
        ref={setTriggerEl}
        render={trigger}
        aria-haspopup={isDialog ? "dialog" : undefined}
      />
      <BasePopover.Portal container={portalTarget(triggerEl)}>
        <BasePopover.Positioner
          className={styles.positioner}
          side={side}
          align={align}
          sideOffset={arrow ? 12 : 8}
          collisionPadding={8}
        >
          <BasePopover.Popup
            ref={popupRef}
            className={className ? `${styles.panel} ${className}` : styles.panel}
            role={isDialog ? "dialog" : undefined}
            aria-label={labelledBy ? undefined : label}
            aria-labelledby={labelledBy}
            initialFocus={
              isDialog
                ? () => popupRef.current?.querySelector<HTMLElement>("[autofocus]") ?? true
                : false
            }
          >
            {typeof children === "function" ? children({ close }) : children}
            {arrow && (
              <BasePopover.Arrow className={styles.arrow}>
                <svg viewBox="0 0 16 8" aria-hidden="true">
                  <path className={styles.arrowFill} d="M0 0h16L9.41 6.59a2 2 0 0 1-2.82 0z" />
                  <path className={styles.arrowEdge} d="M0 0l6.59 6.59a2 2 0 0 0 2.82 0L16 0" />
                </svg>
              </BasePopover.Arrow>
            )}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
