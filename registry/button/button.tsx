"use client";

import { isValidElement, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./button.module.css";
import { useDelayedBusy } from "./use-delayed-busy";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  /** Work is in flight: presses are ignored at once, focus stays. The shimmer
   *  (and `busyLabel`) shows only once it has lasted 300ms, then for 400ms at least. */
  busy?: boolean;
  /** The label while the busy state shows, like "Saving…". Morphs from the label. */
  busyLabel?: ReactNode;
  /** Fills its container's width: the main action of a narrow form or a sheet. */
  block?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  busy = false,
  busyLabel,
  block = false,
  type = "button",
  className,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const shown = useDelayedBusy(busy);
  // One element and no text, named by aria-label: an icon button, drawn as a capsule.
  const iconOnly = isValidElement(children) && Boolean(props["aria-label"]);
  const label = shown && busyLabel !== undefined ? busyLabel : children;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Busy is not disabled: the button keeps focus and its tab stop.
    if (busy) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      type={type}
      data-variant={variant}
      data-size={size}
      data-block={block || undefined}
      aria-busy={busy || undefined}
      aria-disabled={busy || undefined}
      data-busy-shown={shown || undefined}
      data-icon-only={iconOnly || undefined}
      className={className ? `${styles.button} ${className}` : styles.button}
      onClick={handleClick}
      {...props}
    >
      <span className={styles.content}>
        {typeof label === "string" ? <TextMorph>{label}</TextMorph> : label}
      </span>
    </button>
  );
}
