"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import styles from "./avatar.module.css";

type Size = 20 | 24 | 32 | 40;

type AvatarProps = Omit<ComponentProps<"span">, "children"> & {
  /** The accessible name unless `decorative`. Without one (or with no letters in it) a head-and-shoulders shape stands in. */
  name?: string;
  /** Photo URL; initials show until it loads. */
  src?: string;
  size?: Size;
  /** Hide when the name is written beside it. */
  decorative?: boolean;
  /** How many initials: 2 by default from 32px up, else 1. Groups use 1, so the next circle never cuts one off. */
  initials?: 1 | 2;
};

function initialsOf(name: string, letters: 1 | 2) {
  const trimmed = name.trim();
  const base = !/\s/.test(trimmed) && trimmed.includes("@") ? trimmed.slice(0, trimmed.indexOf("@")) : trimmed;
  const firsts = base
    .split(/[\s._-]+/)
    .map((word) => word.match(/[\p{L}\p{N}]\p{M}*/u)?.[0])
    .filter((c): c is string => Boolean(c));
  if (firsts.length === 0) return "";
  const picked = letters === 2 && firsts.length > 1 ? firsts[0] + firsts[firsts.length - 1] : firsts[0];
  return picked.toLocaleUpperCase();
}

type Status = "none" | "loading" | "loaded" | "error";

/** A round photo with the person's initials as the fallback, or a head-and-shoulders shape when there's no name. */
export function Avatar({
  name = "",
  src,
  size = 32,
  decorative = false,
  initials = size >= 32 ? 2 : 1,
  className,
  style,
  ...props
}: AvatarProps) {
  const [status, setStatus] = useState<Status>(src ? "loading" : "none");
  const [fade, setFade] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setStatus(src ? "loading" : "none");
    setFade(false);
  }

  const imgRef = useRef<HTMLImageElement>(null);
  // It may have loaded or failed before hydration, missing its event.
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.complete) setStatus(img.naturalWidth > 0 ? "loaded" : "error");
  }, [src]);

  const letters = initialsOf(name, initials);

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name.trim() || "Unnamed person"}
      aria-hidden={decorative || undefined}
      className={className ? `${styles.avatar} ${className}` : styles.avatar}
      data-size={size}
      data-status={status}
      data-fade={fade || undefined}
      style={style}
      {...props}
    >
      {letters ? <Letters text={letters} /> : <Person />}
      {src && (status === "loading" || status === "loaded") && (
        // eslint-disable-next-line @next/next/no-img-element -- any URL, fixed size
        <img
          ref={imgRef}
          className={styles.image}
          src={src}
          alt=""
          width={size}
          height={size}
          draggable={false}
          onLoad={() => {
            setFade(true);
            setStatus("loaded");
          }}
          onError={() => setStatus("error")}
        />
      )}
    </span>
  );
}

function Letters({ text }: { text: string }) {
  /* One letter only a touch larger than two, so a row of mixed avatars
     reads as one size. */
  const fontSize = Array.from(text).length <= 1 ? 16 : 15;
  return (
    <svg className={styles.letters} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <text x="20" y="20" fontSize={fontSize} textAnchor="middle" dominantBaseline="central">
        {text}
      </text>
    </svg>
  );
}

/* No name: a quiet head and shoulders in the letters' color, at a third
   strength, the shoulders running off the bottom edge like a portrait. */
function Person() {
  return (
    <svg className={styles.letters} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <g fill="currentColor" fillOpacity="0.32">
        <circle cx="20" cy="16.5" r="7.5" />
        <path d="M5 41C5 31.6 11.7 26.5 20 26.5S35 31.6 35 41Z" />
      </g>
    </svg>
  );
}

type AvatarGroupProps = Omit<ComponentProps<"span">, "children"> & {
  people: { name?: string; src?: string }[];
  /** The group's accessible name, e.g. "Going". */
  label: string;
  /** Most circles shown, +N included. */
  max?: number;
  /** Group size, when `people` holds only the first few. */
  total?: number;
  size?: Size;
  /** The overflow's accessible name. */
  moreLabel?: (count: number) => string;
};

/** Overlapping avatars with a +N; set `--avatar-ring` off-surface. */
export function AvatarGroup({
  people,
  label,
  max = 4,
  total = people.length,
  size = 32,
  moreLabel = (count) => `${count} more`,
  className,
  ...props
}: AvatarGroupProps) {
  const limit = Math.max(1, max);
  const overflows = total > limit;
  const shown = people.slice(0, overflows ? limit - 1 : limit);
  const more = total - shown.length;

  return (
    <span
      role="group"
      aria-label={label}
      className={className ? `${styles.group} ${className}` : styles.group}
      {...props}
    >
      {shown.map((person, i) => (
        <Avatar key={`${person.name ?? ""}-${i}`} name={person.name} src={person.src} size={size} initials={1} />
      ))}
      {more > 0 && (
        <span role="img" aria-label={moreLabel(more)} className={styles.more} data-size={size}>
          {more > 99 ? "99+" : `+${more}`}
        </span>
      )}
    </span>
  );
}
