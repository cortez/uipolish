"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import { Tooltip } from "../tooltip/tooltip";
import styles from "./message-branches.module.css";

export type MessageVersion = {
  id: string;
  content: ReactNode;
  /** One line about this version, like "Regenerated · Deep". */
  note?: string;
};

type MessageBranchesProps = {
  /** Oldest first. */
  versions: MessageVersion[];
  /** Controlled: the version shown, from 0. */
  index?: number;
  /** Uncontrolled start. Defaults to the newest version. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** "end" for a user message: the switcher sits under the bubble's edge. */
  align?: "start" | "end";
  className?: string;
};

type Leaving = { version: MessageVersion; dir: 1 | -1; key: number; opacity: number; x: number };

export function MessageBranches({
  versions,
  index,
  defaultIndex,
  onIndexChange,
  align = "start",
  className,
}: MessageBranchesProps) {
  const count = versions.length;
  const [inner, setInner] = useState(() => defaultIndex ?? count - 1);
  const current = Math.min(Math.max(index ?? inner, 0), Math.max(count - 1, 0));

  // The version on screen; when it falls behind `current`, the old one leaves.
  const [shown, setShown] = useState(current);
  const [slides, setSlides] = useState(0);
  // 0 until the version first changes, so nothing slides in on mount.
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  // Versions on their way out. More than one only when stepped faster than they fade.
  const [leaving, setLeaving] = useState<Leaving[]>([]);
  // Where the live version visibly is when a step interrupts it.
  const [from, setFrom] = useState<{ opacity: number; x: number } | null>(null);
  const [paging, setPaging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const liveRef = useRef<HTMLDivElement>(null);

  if (shown !== current) {
    const d = current > shown ? 1 : -1;
    const key = slides + 1;
    const old = versions[shown];
    if (old) {
      setLeaving((list) => [...list.slice(-1), { version: old, dir: d, key, opacity: from?.opacity ?? 1, x: from?.x ?? 0 }]);
    }
    setSlides(key);
    setDir(d);
    setShown(current);
    setFrom(null);
    setPaging(true);
    setAnnouncement(`Version ${current + 1} of ${count}`);
  }

  function step(delta: 1 | -1) {
    const next = current + delta;
    if (next < 0 || next >= count) return;
    // Stepped again mid-slide: the version leaves from where it is, not from rest.
    const live = liveRef.current;
    if (live) {
      const style = getComputedStyle(live);
      setFrom({ opacity: parseFloat(style.opacity), x: parseFloat(style.translate) || 0 });
    }
    if (index === undefined) setInner(next);
    onIndexChange?.(next);
  }

  const version = versions[current];
  if (!version) return null;

  const atStart = current === 0;
  const atEnd = current === count - 1;
  const digits = { "--digits": String(count).length } as CSSProperties;

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root} data-align={align}>
      <AnimatedSize>
        <div className={styles.stage} data-paging={paging || undefined}>
          <div
            key={slides}
            ref={liveRef}
            className={styles.version}
            data-dir={dir || undefined}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && e.currentTarget.getAnimations().length === 0) setPaging(false);
            }}
          >
            {version.content}
          </div>
          {leaving.map((out) => (
            <div
              key={`leaving${out.key}`}
              className={`${styles.version} ${styles.leaving}`}
              data-leaving={out.dir}
              style={{ "--from-opacity": out.opacity, "--from-x": `${out.x}px` } as CSSProperties}
              aria-hidden="true"
              inert
              // Gone once it has faded; its slide has nothing left to show.
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget) setLeaving((list) => list.filter((l) => l.key !== out.key));
              }}
            >
              {out.version.content}
            </div>
          ))}
        </div>
      </AnimatedSize>

      {count > 1 && (
        <div className={styles.row}>
          <div className={styles.switcher} role="group" aria-label="Versions">
            <Tooltip content="Previous version" describe={false}>
              <Button
                variant="ghost"
                size="sm"
                className={styles.step}
                aria-label="Previous version"
                // Still focusable at the ends, so focus stays put instead of dropping to the page.
                aria-disabled={atStart || undefined}
                onClick={() => step(-1)}
              >
                <Icon name="chevron-left" />
              </Button>
            </Tooltip>
            <span className={styles.counter} style={digits}>
              <span className={styles.srOnly}>{`Version ${current + 1} of ${count}`}</span>
              <span className={styles.digits} aria-hidden="true">
                <TextMorph>{String(current + 1)}</TextMorph>
              </span>
              <span aria-hidden="true">/</span>
              <span className={styles.digits} data-total="" aria-hidden="true">
                <TextMorph>{String(count)}</TextMorph>
              </span>
            </span>
            <Tooltip content="Next version" describe={false}>
              <Button
                variant="ghost"
                size="sm"
                className={styles.step}
                aria-label="Next version"
                aria-disabled={atEnd || undefined}
                onClick={() => step(1)}
              >
                <Icon name="chevron-right" />
              </Button>
            </Tooltip>
          </div>
          {versions.some((v) => v.note) && (
            // Every note in one cell: the current one shows, the others wait faded out.
            <span className={styles.notes}>
              {versions.map((v, i) => (
                <span key={v.id} className={styles.note} data-current={i === current || undefined} aria-hidden={i !== current || undefined}>
                  {v.note}
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}
