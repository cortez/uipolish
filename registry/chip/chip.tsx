"use client";

import {
  createContext,
  useContext,
    useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { Icon } from "../icons/icons";
import styles from "./chip.module.css";

type ChipProps = Omit<ComponentProps<"button">, "children"> & {
  children: ReactNode;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

/** A toggle filter: a button with aria-pressed whose plus turns into a check. */
export function Chip({
  pressed: controlled,
  defaultPressed = false,
  onPressedChange,
  onClick,
  type = "button",
  className,
  children,
  ...props
}: ChipProps) {
  const [own, setOwn] = useState(defaultPressed);
  const pressed = controlled ?? own;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (controlled === undefined) setOwn(!pressed);
    onPressedChange?.(!pressed);
  }

  return (
    <button
      type={type}
      data-chip=""
      aria-pressed={pressed}
      className={className ? `${styles.chip} ${className}` : styles.chip}
      onClick={handleClick}
      {...props}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={styles.mark}>
        <path d="M3.25 8 L12.75 8" pathLength={1} className={styles.short} />
        <path d="M8 12.75 L8 3.25" pathLength={1} className={styles.long} />
      </svg>
      <span className={styles.label}>{children}</span>
    </button>
  );
}

type Snapshot = { rects: Map<Element, DOMRect>; index: number; refocus: boolean; name: string };

const GroupContext = createContext<{ beforeRemove: (chip: HTMLElement) => void } | null>(null);

type ChipGroupProps = ComponentProps<"div"> & {
  /** Group name, e.g. "Dietary filters"; or pass `aria-labelledby`. */
  "aria-label"?: string;
};

const token = (el: Element, name: string, fallback: string) => getComputedStyle(el).getPropertyValue(name).trim() || fallback;
const ms = (value: string) => (value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A wrapping row of chips that animates and announces removals. */
export function ChipGroup({ className, children, ...props }: ChipGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const snapshot = useRef<Snapshot | null>(null);
  const status = useRef<HTMLSpanElement>(null);
  // Gates the @starting-style fade so only chips added later fade in.
  useEffect(() => ref.current?.setAttribute("data-ready", ""), []);

  const chips = () => Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-chip]") ?? []);

  function beforeRemove(chip: HTMLElement) {
    const all = chips();
    snapshot.current = {
      rects: new Map(all.map((el) => [el, el.getBoundingClientRect()])),
      index: all.indexOf(chip),
      refocus: chip.contains(document.activeElement),
      name: chip.querySelector("[data-label]")?.textContent ?? "",
    };
  }

  useLayoutEffect(() => {
    const before = snapshot.current;
    const group = ref.current;
    if (!before || !group) return;
    snapshot.current = null;
    const all = chips();
    if (all.length >= before.rects.size) return;

    if (status.current && before.name) status.current.textContent = `Removed ${before.name}`;

    if (!reduced()) {
      const easing = token(group, "--ui-ease-move", "ease-out");
      const duration = ms(token(group, "--ui-dur-move", "320ms"));
      for (const el of all) {
        const from = before.rects.get(el);
        if (!from) continue;
        const to = el.getBoundingClientRect();
        const dx = from.left - to.left;
        const dy = from.top - to.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.animate({ translate: [`${dx}px ${dy}px`, "0 0"] }, { duration, easing });
        }
      }
    }

    if (before.refocus) {
      const next = all[Math.min(before.index, all.length - 1)];
      const target = next?.querySelector<HTMLElement>("[data-remove], button") ?? next;
      if (target) target.focus();
      else {
        // Focusable only for now, so clicks between chips never steal focus.
        group.tabIndex = -1;
        group.focus();
        group.addEventListener("blur", () => group.removeAttribute("tabindex"), { once: true });
      }
    }
  });

  return (
    <GroupContext.Provider value={{ beforeRemove }}>
      <div
        ref={ref}
        role="group"
        className={className ? `${styles.group} ${className}` : styles.group}
        {...props}
      >
        {children}
        <span ref={status} role="status" className={styles.srOnly} />
      </div>
    </GroupContext.Provider>
  );
}

type RemovableChipProps = Omit<ComponentProps<"span">, "children"> & {
  children: ReactNode;
  /** Called after the fade-out; remove it from your list here. */
  onRemove: () => void;
  /** Defaults to "Remove {label}" for text labels. */
  removeLabel?: string;
};

/** A chosen value with a remove button. */
export function RemovableChip({
  children,
  onRemove,
  removeLabel,
  className,
  ...props
}: RemovableChipProps) {
  const group = useContext(GroupContext);
  const ref = useRef<HTMLSpanElement>(null);
  const [leaving, setLeaving] = useState(false);
  const name = removeLabel ?? (typeof children === "string" || typeof children === "number" ? `Remove ${children}` : "Remove");

  function gone() {
    if (ref.current) group?.beforeRemove(ref.current);
    onRemove();
    requestAnimationFrame(() => requestAnimationFrame(() => ref.current?.isConnected && setLeaving(false)));
  }

  function remove() {
    if (leaving) return;
    // No transition will fire under reduced motion.
    if (reduced()) return gone();
    setLeaving(true);
  }

  function finish(event: TransitionEvent<HTMLSpanElement>) {
    if (leaving && event.target === event.currentTarget && event.propertyName === "opacity") gone();
  }

  return (
    <span
      {...props}
      ref={ref}
      data-chip=""
      data-leaving={leaving || undefined}
      className={className ? `${styles.removable} ${className}` : styles.removable}
      onTransitionEnd={finish}
    >
      <span className={styles.label} data-label="">
        {children}
      </span>
      <button
        type="button"
        data-remove=""
        className={styles.remove}
        aria-label={name}
        // Not `disabled`, which would drop focus before the group moves it.
        aria-disabled={leaving || undefined}
        onClick={remove}
      >
        <Icon name="close" />
      </button>
    </span>
  );
}
