"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { flyPill, stopPill } from "../tabs/pill-flight";
import styles from "./segmented-control.module.css";

type SegmentedControlProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "role"> & {
  /** Accessible name of the group. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** `equal`: every option as wide as the widest. `content`: each as wide as its label. */
  widths?: "equal" | "content";
  /** Form field name. */
  name?: string;
  disabled?: boolean;
  /** Outer height, track included: `sm` matches a small button or select, `md` a default one. */
  size?: "sm" | "md";
};

/** A Base UI radio group with one pill that glides to the checked option, as the Tabs pill does. */
export function SegmentedControl({
  value: controlledValue,
  defaultValue,
  onValueChange,
  widths = "equal",
  size = "md",
  name,
  disabled = false,
  className,
  children,
  ...props
}: SegmentedControlProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const value = controlledValue ?? uncontrolledValue;

  const select = useCallback(
    (next: string) => {
      if (controlledValue === undefined) setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [controlledValue, onValueChange],
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const placed = useRef<{ value: string; x: number; width: number } | null>(null);
  const painted = useRef(false);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        painted.current = true;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const place = useCallback(
    (animate: boolean) => {
      const root = rootRef.current;
      const indicator = indicatorRef.current;
      const option = root?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`);
      if (!root || !indicator) return;
      if (!option) {
        indicator.removeAttribute("data-visible");
        placed.current = null;
        return;
      }

      // Not offsetLeft: it rounds, and equal-width options rarely land on whole pixels.
      const box = option.getBoundingClientRect();
      // Plus the scroll, for a control that scrolls sideways in a narrow container.
      const x = box.left - root.getBoundingClientRect().left + root.scrollLeft;
      const width = box.width;
      const last = placed.current;
      indicator.setAttribute("data-visible", "");
      if (last && last.value === value && last.x === x && last.width === width) return;

      // A change mid-move starts from where the pill is on screen.
      const origin = stopPill(indicator) ?? (last ? { start: last.x, length: last.width } : null);
      indicator.style.transform = `translateX(${x}px)`;
      indicator.style.width = `${width}px`;
      placed.current = { value, x, width };

      const moved = last && last.value !== value;
      if (!animate || !moved || !origin || !painted.current) return;
      // The same flight as the Tabs pill: stretch, dip and draw in.
      flyPill(indicator, origin, { start: x, length: width });
    },
    [value],
  );

  useLayoutEffect(() => {
    place(true);
    rootRef.current?.setAttribute("data-ready", "");
  }, [place]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const remeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place(false));
    };
    const observer = new ResizeObserver(remeasure);
    observer.observe(root);
    for (const option of root.querySelectorAll("[data-value]")) observer.observe(option);
    document.fonts?.ready.then(remeasure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [place]);

  return (
    <BaseRadioGroup
      ref={rootRef}
      value={value}
      onValueChange={(next) => select(next as string)}
      name={name}
      disabled={disabled}
      data-widths={widths}
      data-size={size}
      className={className ? `${styles.root} ${className}` : styles.root}
      {...props}
    >
      <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
      {children}
    </BaseRadioGroup>
  );
}

type SegmentProps = Omit<ComponentProps<"span">, "children" | "role"> & {
  value: string;
  children: ReactNode;
  disabled?: boolean;
};

/** One option. For an icon-only option, pass `aria-label`. */
export function Segment({ value, children, disabled, className, ...props }: SegmentProps) {
  return (
    <BaseRadio.Root
      value={value}
      disabled={disabled}
      data-value={value}
      className={className ? `${styles.option} ${className}` : styles.option}
      {...props}
    >
      <span className={styles.content}>{children}</span>
    </BaseRadio.Root>
  );
}
