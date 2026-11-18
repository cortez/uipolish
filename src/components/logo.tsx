import type { ComponentProps } from "react";
import acme from "./acme.module.css";

/*
 * The mark: u, i and a four-pointed star, all one height, so it reads as
 * "ui" or "UI" followed by a sparkle. The u's bowl is round; every other
 * corner, on the letters and the star's tips alike, has the same 1.75-unit
 * radius.
 *
 * The star is drawn that radius inside its final size and stroked twice as
 * wide with round joins, which rounds each tip to exactly that radius while
 * keeping the sides smooth. Optically sized and spaced: its points stop just
 * inside the letters' height, since points carry less ink than flat tops,
 * and its left tip sits closer to the i than the u does, since the hollows
 * between the points read as space.
 *
 * One source for the header, the share cards and the apple icon; it takes
 * its color from `color`.
 */

const U =
  "M0 1.75A1.75 1.75 0 0 1 1.75 0H4.25A1.75 1.75 0 0 1 6 1.75V11A3 3 0 0 0 12 11V1.75A1.75 1.75 0 0 1 13.75 0H16.25A1.75 1.75 0 0 1 18 1.75V10.5A9 9 0 0 1 0 10.5Z";
export const STAR = "M38.5 1.75Q39.28 8.98 46.25 9.75Q39.28 10.53 38.5 17.75Q37.73 10.53 30.75 9.75Q37.73 8.98 38.5 1.75Z";

export function Logo({ height = 20, style, ...props }: ComponentProps<"svg"> & { height?: number }) {
  return (
    <svg
      viewBox="0 0 48 19.5"
      width={(height * 48) / 19.5}
      height={height}
      fill="currentColor"
      style={{ display: "block", overflow: "visible", ...style }}
      {...props}
    >
      <path d={U} />
      <rect x="21" width="6" height="19.5" rx="1.75" />
      <g stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round">
        <path d={STAR} data-star="" />
        {/* Two copies that only show while the star sparkles (wordmark.tsx). */}
        <path d={STAR} data-spark="" opacity="0" />
        <path d={STAR} data-spark="" opacity="0" />
      </g>
    </svg>
  );
}

/** The star alone, square and centered: the demo company's mark (Acme) in previews. */
export function StarMark(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="28.5 -0.25 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d={STAR} stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

/** The demo company's mark and name together, sized to each other. */
export function AcmeBrand({ className }: { className?: string }) {
  return (
    <span className={className ? `${acme.brand} ${className}` : acme.brand}>
      <StarMark />
      Acme
    </span>
  );
}
