"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import styles from "./tooltip.module.css";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

/** Hover delay before the first tooltip opens. */
const OPEN_DELAY = 500;
/** After a tooltip closes, others open instantly for this long. */
const WARM_WINDOW = 300;

type Handle = { finishExit: () => void; rect: () => DOMRect | undefined };

// Shared by every tooltip on the page, so the component needs no provider.
let active: Handle | null = null;
let exiting: Handle | null = null;
let lastClosedAt = -Infinity;
// Where the previous tooltip sat, so a warm hand-off can slide from there.
let handoff: DOMRect | undefined;

function isWarm() {
  return active !== null || performance.now() - lastClosedAt < WARM_WINDOW;
}

/** A CSS time token in ms. Browsers may report "250ms" as ".25s". */
function ms(value: string, fallback: number) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return value.trim().endsWith("ms") ? n : n * 1000;
}

type TriggerProps = { "aria-describedby"?: string };

type TooltipProps = {
  /** What the tooltip says; never the only place something lives. */
  content: ReactNode;
  /** A shortcut shown after the text, like "⌘C". */
  kbd?: string;
  side?: Side;
  align?: Align;
  /** Show an arrow pointing at the trigger. */
  arrow?: boolean;
  /** Link it with `aria-describedby`. Turn off when it only repeats the trigger's `aria-label`. */
  describe?: boolean;
  /** Hover delay before the first tooltip opens, in ms. */
  delay?: number;
  /** One focusable element. Disabled controls need a wrapper; see the guide. */
  children: ReactElement<TriggerProps>;
};

export function Tooltip({
  content,
  kbd,
  side = "top",
  align = "center",
  arrow = false,
  describe = true,
  delay = OPEN_DELAY,
  children,
}: TooltipProps) {
  const tipId = `${useId()}-tooltip`;
  const popupRef = useRef<HTMLDivElement>(null);
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  // Read when the pointer arrives, so Base UI sees a 0ms delay while another tooltip is warm.
  const [warm, setWarm] = useState(false);
  const [instant, setInstant] = useState(false);

  const handle = useRef<Handle>({
    finishExit: () => {
      setInstant(true);
      popupRef.current?.getAnimations().forEach((a) => a.finish());
    },
    // Open or still fading out.
    rect: () => {
      const popup = popupRef.current;
      return popup && +getComputedStyle(popup).opacity > 0 ? popup.getBoundingClientRect() : undefined;
    },
  });

  function onOpenChange(next: boolean) {
    const self = handle.current;
    if (next) {
      const skipEntrance = isWarm();
      const previous = active ?? exiting;
      if (previous && previous !== self) {
        handoff = previous.rect();
        // Don't cross-fade: the outgoing one just goes.
        previous.finishExit();
      }
      active = self;
      exiting = null;
      setInstant(skipEntrance);
    } else {
      if (active === self) {
        active = null;
        lastClosedAt = performance.now();
      }
      exiting = self;
    }
    setOpen(next);
  }

  // A warm hand-off slides from where the previous tooltip sat.
  useEffect(() => {
    if (!open || !instant) return;
    const from = handoff;
    handoff = undefined;
    if (!from || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frame = requestAnimationFrame(() => {
      const popup = popupRef.current;
      if (!popup) return;
      const to = popup.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top - to.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const style = getComputedStyle(popup);
      popup.animate(
        { translate: [`${dx}px ${dy}px`, "0 0"] },
        {
          duration: ms(style.getPropertyValue("--ui-dur-snap"), 250),
          easing: style.getPropertyValue("--ui-ease-snap").trim() || "ease-out",
        },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [open, instant]);

  useEffect(() => {
    const self = handle.current;
    return () => {
      if (active === self) active = null;
      if (exiting === self) exiting = null;
    };
  }, []);

  const describedBy = [children.props["aria-describedby"], describe ? tipId : null].filter(Boolean).join(" ");

  return (
    <BaseTooltip.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(next) => {
        if (next) return;
        if (exiting === handle.current) exiting = null;
        setInstant(false);
      }}
    >
      <BaseTooltip.Trigger
        ref={setTriggerEl}
        delay={warm ? 0 : delay}
        // Pointer events have continuous priority; flush so the delay is in place before mouseenter.
        onPointerEnter={() => flushSync(() => setWarm(isWarm()))}
        render={cloneElement(children, { "aria-describedby": describedBy || undefined })}
      />
      {/* Kept mounted so `aria-describedby` points at real text even while closed. */}
      <BaseTooltip.Portal
        keepMounted={describe}
        container={triggerEl?.closest<HTMLElement>("dialog[open], [data-theme]") ?? undefined}
      >
        <BaseTooltip.Positioner
          className={styles.positioner}
          side={side}
          align={align}
          sideOffset={arrow ? 10 : 6}
          collisionPadding={8}
        >
          <BaseTooltip.Popup
            ref={popupRef}
            id={tipId}
            role="tooltip"
            className={styles.surface}
            data-warm={instant || undefined}
          >
            <span className={styles.content}>{content}</span>
            {kbd && <kbd className={styles.kbd}>{kbd}</kbd>}
            {arrow && (
              <BaseTooltip.Arrow className={styles.arrow}>
                <svg viewBox="0 0 12 6" aria-hidden="true">
                  <path d="M0 0h12L7.2 5.1a1.6 1.6 0 0 1-2.4 0z" />
                </svg>
              </BaseTooltip.Arrow>
            )}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
