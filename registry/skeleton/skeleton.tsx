"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import styles from "./skeleton.module.css";

type Length = number | string;

const css = (value: Length | undefined) => (typeof value === "number" ? `${value}px` : value);

/** Puts a late bone on the shared band's clock. */
function syncSweep(el: HTMLElement | null) {
  if (!el || typeof el.getAnimations !== "function") return;
  for (const animation of el.getAnimations()) animation.startTime = 0;
}

type SkeletonProps = Omit<ComponentProps<"span">, "children" | "ref"> & {
  /** Numbers are px. Defaults to full width. */
  width?: Length;
  /** Defaults to 16px. Numbers are px. */
  height?: Length;
  /** `sm` (default), `md`, `lg` or `full`. */
  radius?: "sm" | "md" | "lg" | "full";
};

/** A block standing in for something with a known size. */
export function Skeleton({ width, height, radius = "sm", className, style, ...props }: SkeletonProps) {
  return (
    <span
      ref={syncSweep}
      aria-hidden="true"
      data-radius={radius}
      className={className ? `${styles.bone} ${styles.block} ${className}` : `${styles.bone} ${styles.block}`}
      style={{ "--skeleton-width": css(width), "--skeleton-height": css(height), ...style } as CSSProperties}
      {...props}
    />
  );
}

type SkeletonCircleProps = Omit<ComponentProps<"span">, "children" | "ref"> & {
  /** Diameter. Defaults to 40px. */
  size?: Length;
};

/** A circle standing in for an avatar. */
export function SkeletonCircle({ size = 40, className, style, ...props }: SkeletonCircleProps) {
  return (
    <span
      ref={syncSweep}
      aria-hidden="true"
      className={className ? `${styles.bone} ${styles.circle} ${className}` : `${styles.bone} ${styles.circle}`}
      style={{ "--skeleton-size": css(size), ...style } as CSSProperties}
      {...props}
    />
  );
}

type SkeletonTextProps = Omit<ComponentProps<"span">, "children" | "ref"> & {
  lines?: number;
  /** Width of the whole block, e.g. `"9em"`. */
  width?: Length;
  /** Width of the last of several lines. Defaults to 60%. */
  lastLineWidth?: Length;
  /** Type step. Omit to inherit from the parent, the surest match. */
  size?: "sm" | "md" | "2xl";
};

/** Lines standing in for text, as tall as the real lines. */
export function SkeletonText({
  lines = 1,
  width,
  lastLineWidth = "60%",
  size,
  className,
  style,
  ...props
}: SkeletonTextProps) {
  const count = Number.isFinite(lines) ? Math.max(1, Math.round(lines)) : 1;
  return (
    <span
      aria-hidden="true"
      data-size={size}
      className={className ? `${styles.text} ${className}` : styles.text}
      style={{ "--skeleton-width": css(width), "--skeleton-last": css(lastLineWidth), ...style } as CSSProperties}
      {...props}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} ref={syncSweep} className={`${styles.bone} ${styles.bar}`} />
      ))}
    </span>
  );
}

/** True once `loading` has lasted `delay` ms. */
export function useLoadingDelay(loading: boolean, delay = 300) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setLate(true), delay);
    return () => {
      window.clearTimeout(timer);
      setLate(false);
    };
  }, [loading, delay]);
  return loading && late;
}

// Drops the skeleton anyway in case the entrance animation never runs.
const ENTER_BACKSTOP = 1000;
// And the leaving content, in case its fade never does.
const LEAVE_BACKSTOP = 400;

type SkeletonGroupProps = Omit<ComponentProps<"div">, "children"> & {
  /** While true the skeleton holds the place. */
  loading: boolean;
  fallback: ReactNode;
  children?: ReactNode;
  /** Announced once the wait passes `delay`. */
  label?: string;
  /** Ms before the skeleton shows. Defaults to 300. */
  delay?: number;
};

/** Holds the place of content that is on its way. */
export function SkeletonGroup({
  loading,
  fallback,
  children,
  label = "Loading…",
  delay = 300,
  className,
  ...props
}: SkeletonGroupProps) {
  const late = useLoadingDelay(loading, delay);

  const [kept, setKept] = useState(loading);
  if (loading && !kept) setKept(true);
  const swapping = kept && !loading;

  useEffect(() => {
    if (!swapping) return;
    const timer = window.setTimeout(() => setKept(false), ENTER_BACKSTOP);
    return () => window.clearTimeout(timer);
  }, [swapping]);

  // Loading again: React has just removed the content, which would cut it
  // off in one frame. The removed node goes back into the cell for one quick
  // fade, as a layer React never renders into, inert and unread.
  const fallbackRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const group = fallbackRef.current?.parentElement;
    const ghost = contentRef.current;
    if (!loading || !group || !ghost || ghost.isConnected) return;
    ghost.className = `${styles.content} ${styles.leaving}`;
    ghost.removeAttribute("data-enter");
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    group.append(ghost);
    const remove = () => ghost.remove();
    ghost.addEventListener("animationend", (event) => event.target === ghost && remove());
    const timer = window.setTimeout(remove, LEAVE_BACKSTOP);
    return () => {
      window.clearTimeout(timer);
      remove();
    };
  }, [loading]);

  return (
    <>
      <div
        aria-busy={loading || undefined}
        className={className ? `${styles.group} ${className}` : styles.group}
        {...props}
      >
        {kept && (
          <div ref={fallbackRef} className={styles.fallback} aria-hidden="true" data-shown={late || undefined}>
            {fallback}
          </div>
        )}
        {!loading && (
          <div
            // Kept after React lets go of it, for the fade above.
            ref={(node) => {
              if (node) contentRef.current = node;
            }}
            className={styles.content}
            data-enter={swapping || undefined}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) setKept(false);
            }}
          >
            {children}
          </div>
        )}
      </div>
      {/* Outside aria-busy, which screen readers may hold back. */}
      <span role="status" className={styles.srOnly}>
        {late ? label : ""}
      </span>
    </>
  );
}
