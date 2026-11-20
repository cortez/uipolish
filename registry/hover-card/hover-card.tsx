"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { PreviewCard as BasePreviewCard } from "@base-ui/react/preview-card";
import styles from "./hover-card.module.css";

/* Behavior (hover and focus timing, the pointer's path into the card,
   dismissal, positioning against a link that wraps) comes from Base UI's
   PreviewCard. This file keeps the look, which is the popover's panel, and
   the warm hand-off between neighbours. */

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

/** Rest on the link this long before the first card opens. */
const OPEN_DELAY = 500;
/** After the pointer leaves the link and the card. */
const CLOSE_DELAY = 200;
/** After a card closes, others open with no wait for this long. */
const WARM_WINDOW = 300;

type Handle = { leave: () => void };

// Shared by every hover card on the page, so the component needs no provider.
let active: Handle | null = null;
let lastClosedAt = -Infinity;

function isWarm() {
  return active !== null || performance.now() - lastClosedAt < WARM_WINDOW;
}

type HoverCardProps = {
  /** The preview: where the link goes. Nothing the user has to act on. */
  content: ReactNode;
  /** One link, or another focusable element. */
  children: ReactElement;
  side?: Side;
  align?: Align;
  /** How long the pointer or focus rests on the link before the first card opens, in ms. */
  delay?: number;
  /** How long it stays after the pointer leaves both, in ms. */
  closeDelay?: number;
  /** Fires as it opens and closes: the moment to load what it shows. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export function HoverCard({
  content,
  children,
  side = "bottom",
  align = "start",
  delay = OPEN_DELAY,
  closeDelay = CLOSE_DELAY,
  onOpenChange,
  className,
}: HoverCardProps) {
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  // Read when the pointer or focus arrives, so Base UI sees a 0ms delay while a neighbour's card is warm.
  const [warm, setWarm] = useState(false);
  // Goes without its exit: a neighbour's card is taking its place.
  const [instant, setInstant] = useState(false);

  const changed = useRef(onOpenChange);
  useEffect(() => {
    changed.current = onOpenChange;
  });

  const handle = useRef<Handle>({
    leave: () => {
      setInstant(true);
      setOpen(false);
      changed.current?.(false);
    },
  });

  function change(next: boolean) {
    const self = handle.current;
    if (next) {
      // Two cards never overlap: the one a neighbour left open goes in the
      // frame this one starts to arrive.
      if (active && active !== self) active.leave();
      active = self;
      setInstant(false);
    } else if (active === self) {
      active = null;
      lastClosedAt = performance.now();
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    const self = handle.current;
    return () => {
      if (active === self) active = null;
    };
  }, []);

  // A link that wraps onto a second line is one box to the card: it opens
  // clear of the whole link, never over the line the pointer isn't on.
  const anchor = useMemo(
    () =>
      triggerEl && {
        contextElement: triggerEl,
        getBoundingClientRect: () => triggerEl.getBoundingClientRect(),
        getClientRects: () => [triggerEl.getBoundingClientRect()],
      },
    [triggerEl],
  );

  const arrive = () => flushSync(() => setWarm(isWarm()));

  return (
    <BasePreviewCard.Root
      open={open}
      onOpenChange={change}
      onOpenChangeComplete={(next) => {
        if (!next) setInstant(false);
      }}
    >
      <BasePreviewCard.Trigger
        ref={setTriggerEl}
        delay={warm ? 0 : delay}
        closeDelay={closeDelay}
        // Pointer and focus events have continuous priority; flush so the delay is in place before Base UI reads it.
        onPointerEnter={arrive}
        onFocusCapture={arrive}
        render={children}
      />
      <BasePreviewCard.Portal container={triggerEl?.closest<HTMLElement>("dialog[open], [data-theme]") ?? undefined}>
        <BasePreviewCard.Positioner
          className={styles.positioner}
          anchor={anchor}
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={8}
        >
          <BasePreviewCard.Popup
            className={className ? `${styles.card} ${className}` : styles.card}
            data-instant={instant || undefined}
          >
            {content}
          </BasePreviewCard.Popup>
        </BasePreviewCard.Positioner>
      </BasePreviewCard.Portal>
    </BasePreviewCard.Root>
  );
}
