"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Skeleton, SkeletonCircle, SkeletonGroup, SkeletonText } from "@registry/skeleton/skeleton";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import base from "./preview.module.css";
import styles from "./skeleton.module.css";

const GUESTS = [
  { initials: "MO", name: "Maya Okafor", note: "Hosting, baking the bread", reply: "Coming" },
  { initials: "PR", name: "Priya Raman", note: "Vegetarian, plus one", reply: "Coming" },
  { initials: "TH", name: "Tomás Herrera", note: "Bringing natural wine", reply: "Maybe" },
  { initials: "ID", name: "Inés Duarte", note: "Arriving after eight", reply: "Coming" },
];

const MENU = [
  { course: "Starter", dish: "Charred leeks, hazelnut romesco", about: "Grilled over embers, with toasted hazelnuts, sherry vinegar and a little smoked paprika." },
  { course: "Main", dish: "Slow-roasted lamb shoulder", about: "Six hours with anchovy and rosemary, on white beans with a sharp salsa verde." },
  { course: "Dessert", dish: "Burnt honey custard", about: "With quince poached in its own syrup and a thin, crisp almond biscuit." },
];

const SPEEDS = { slow: 2400, fast: 150 } as const;
type Speed = keyof typeof SPEEDS;

export function SkeletonPreview() {
  const [speed, setSpeed] = useState<Speed>("slow");
  // Both cards start out loading, the way a page opens: the guest list
  // answers first, the menu a little later.
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(true);
  const timers = useRef<number[]>([]);
  const id = useId();

  function answer(next: Speed) {
    timers.current.forEach(clearTimeout);
    const wait = SPEEDS[next];
    timers.current = [
      window.setTimeout(() => setGuestsLoading(false), wait),
      window.setTimeout(() => setMenuLoading(false), wait * 1.4),
    ];
  }

  function load(next: Speed) {
    setGuestsLoading(true);
    setMenuLoading(true);
    answer(next);
  }

  useEffect(() => {
    answer("slow");
    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.toolbar}>
          <SegmentedControl
            size="sm"
            aria-label="Network"
            value={speed}
            onValueChange={(v) => {
              setSpeed(v as Speed);
              load(v as Speed);
            }}
          >
            <Segment value="slow">Slow network</Segment>
            <Segment value="fast">Fast network</Segment>
          </SegmentedControl>
          <Button variant="secondary" onClick={() => load(speed)}>
            <Icon name="retry" />
            Load again
          </Button>
        </div>
        <p className={base.note}>
          On a slow network the skeletons fade in after 300ms and the content crossfades over them. On a fast one
          nothing shows until the content lands, in space already held for it.
        </p>

        <div className={styles.cards}>
          <article className={styles.card} aria-labelledby={`${id}-guests`}>
            <header className={styles.cardHeader}>
              <h2 id={`${id}-guests`} className={styles.cardTitle}>
                Guests
              </h2>
              <span className={styles.meta}>Saturday supper</span>
            </header>
            <SkeletonGroup loading={guestsLoading} label="Loading guest list…" fallback={<GuestRows />}>
              <ul className={styles.list}>
                {GUESTS.map((g) => (
                  <li key={g.name} className={styles.guest}>
                    <span className={styles.avatar} aria-hidden="true">
                      {g.initials}
                    </span>
                    <span className={styles.who}>
                      <span className={styles.name}>{g.name}</span>
                      <span className={styles.note}>{g.note}</span>
                    </span>
                    <span className={styles.reply} data-reply={g.reply}>
                      {g.reply}
                    </span>
                  </li>
                ))}
              </ul>
            </SkeletonGroup>
          </article>

          <article className={styles.card} aria-labelledby={`${id}-menu`}>
            <header className={styles.cardHeader}>
              <h2 id={`${id}-menu`} className={styles.cardTitle}>
                Menu
              </h2>
              <span className={styles.meta}>Three courses</span>
            </header>
            <SkeletonGroup loading={menuLoading} label="Loading menu…" fallback={<MenuCourses />}>
              <ol className={styles.list}>
                {MENU.map((m) => (
                  <li key={m.course} className={styles.course}>
                    <span className={styles.courseName}>{m.course}</span>
                    <span className={styles.dish}>{m.dish}</span>
                    <span className={styles.about}>{m.about}</span>
                  </li>
                ))}
              </ol>
            </SkeletonGroup>
          </article>
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>The pieces</h2>
        <div className={styles.pieces}>
          <SkeletonCircle size={40} />
          <div className={styles.piecesText}>
            <SkeletonText size="md" width="10em" />
            <SkeletonText size="sm" lines={3} />
          </div>
        </div>
        <div className={styles.piecesRow}>
          <Skeleton width={96} height={64} radius="md" />
          <Skeleton width={120} height="var(--ui-control-sm)" radius="full" />
        </div>
      </section>
    </div>
  );
}

/* The skeletons reuse the loaded rows' own classes, so each bone inherits
   the font and line height of the text it stands in for and the rows come
   out exactly as tall as the real ones. */

function GuestRows() {
  return (
    <ul className={styles.list}>
      {["8em", "7em", "9em", "7.5em"].map((width, i) => (
        <li key={i} className={styles.guest}>
          <SkeletonCircle size={36} />
          <span className={styles.who}>
            <span className={styles.name}>
              <SkeletonText width={width} />
            </span>
            <span className={styles.note}>
              <SkeletonText width={i % 2 ? "14em" : "11em"} />
            </span>
          </span>
          <span className={styles.reply}>
            <SkeletonText width="3.5em" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function MenuCourses() {
  return (
    <ol className={styles.list}>
      {["4em", "3em", "4.5em"].map((width, i) => (
        <li key={i} className={styles.course}>
          <span className={styles.courseName}>
            <SkeletonText width={width} />
          </span>
          <span className={styles.dish}>
            <SkeletonText width={i === 1 ? "11em" : "13em"} />
          </span>
          <span className={styles.about}>
            <SkeletonText lines={2} lastLineWidth={i === 2 ? "45%" : "70%"} />
          </span>
        </li>
      ))}
    </ol>
  );
}
