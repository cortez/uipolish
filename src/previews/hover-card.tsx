"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Avatar } from "@registry/avatar/avatar";
import { HoverCard } from "@registry/hover-card/hover-card";
import { Icon } from "@registry/icons/icons";
import { Skeleton } from "@registry/skeleton/skeleton";
import styles from "./preview.module.css";
import local from "./hover-card.module.css";

type Guest = { name: string; src?: string; role: string; note: string };

const PRIYA: Guest = { name: "Priya Natarajan", role: "Guest of Dana Whitfield", note: "Vegetarian · Replied yes on Oct 18" };

const GOING: Guest[] = [
  { name: "Maya Chen", src: "/avatars/maya-chen.jpg", role: "Host", note: "Bringing the wine" },
  { name: "Tomás Ortega", src: "/avatars/tomas-ortega.jpg", role: "Chef", note: "Arrives at 4:00 PM to prep" },
  { name: "Ines Laurent", src: "/avatars/ines-laurent.jpg", role: "Guest", note: "Nut allergy · Replied yes on Oct 20" },
];

// The preview has no pages behind its links.
const stay = (event: MouseEvent) => event.preventDefault();

function PersonCard({ guest }: { guest: Guest }) {
  return (
    <span className={local.cardPerson}>
      <Avatar name={guest.name} src={guest.src} size={40} decorative />
      <span className={local.cardText}>
        <span className={local.cardTitle}>{guest.name}</span>
        <span className={local.cardMeta}>{guest.role}</span>
        <span className={local.cardMeta}>{guest.note}</span>
      </span>
    </span>
  );
}

function FileCard({ title, excerpt, meta }: { title: string; excerpt: ReactNode; meta: string }) {
  return (
    <span className={local.cardFile}>
      <span className={local.cardHead}>
        <Icon className={local.cardIcon} name="file" />
        <span className={local.cardTitle}>{title}</span>
      </span>
      <span className={local.cardExcerpt}>{excerpt}</span>
      <span className={local.cardMeta}>{meta}</span>
    </span>
  );
}

function Mention({ guest }: { guest: Guest }) {
  return (
    <HoverCard content={<PersonCard guest={guest} />}>
      <a className={local.cardMention} href={`/guests/${guest.name.toLowerCase().replace(/\s+/g, "-")}`} onClick={stay}>
        @{guest.name}
      </a>
    </HoverCard>
  );
}

export function HoverCardPreview() {
  // A card that fetches what it shows: asked for when it opens, kept after.
  const [budget, setBudget] = useState<"idle" | "loading" | "ready">("idle");
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function loadBudget(open: boolean) {
    if (!open || budget !== "idle") return;
    setBudget("loading");
    timer.current = window.setTimeout(() => setBudget("ready"), 900);
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <h2 className={styles.heading}>Notes for Saturday supper</h2>
        <p className={local.cardProse}>
          Seating is nearly done. <Mention guest={PRIYA} /> is bringing a friend, so table 2 needs one more chair; the
          new layout is in{" "}
          <HoverCard
            content={
              <FileCard
                title="Seating plan, autumn supper"
                excerpt="Two tables of six by the window, with the hosts at either end. Table 2 gains a seat on the garden side, and the high chair moves beside it."
                meta="Edited 2 days ago by Maya Chen"
              />
            }
          >
            <a className={local.cardLink} href="/files/seating-plan" onClick={stay}>
              Seating plan, autumn supper
            </a>
          </HoverCard>
          .
        </p>
        <p className={styles.note}>
          Rest the pointer on the mention or the link, or Tab to it. The card stays while the pointer moves into it,
          and never opens on a touch screen: there the link just works.
        </p>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Neighbours: the first waits, the next opens at once</h2>
        <p className={local.cardProse}>
          Going: <Mention guest={GOING[0]} />, <Mention guest={GOING[1]} /> and <Mention guest={GOING[2]} />.
        </p>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Loaded on open, in the space it will fill; and a card placed above</h2>
        <p className={local.cardProse}>
          The venue’s quote is in{" "}
          <HoverCard
            onOpenChange={loadBudget}
            content={
              budget === "ready" ? (
                <FileCard
                  title="Budget, autumn supper"
                  excerpt="Food and wine come to $1,840 for twelve guests. The venue adds $350, due with the deposit on October 28."
                  meta="Edited yesterday by Dana Whitfield"
                />
              ) : (
                <span className={local.cardFile} aria-busy="true">
                  <Skeleton width={180} height={20} />
                  <span className={local.cardBones}>
                    <Skeleton height={12} />
                    <Skeleton width="72%" height={12} />
                  </span>
                  <span className={local.cardBones}>
                    <Skeleton width={160} height={12} />
                  </span>
                </span>
              )
            }
          >
            <a className={local.cardLink} href="/files/budget" onClick={stay}>
              Budget, autumn supper
            </a>
          </HoverCard>
          . The card for{" "}
          <HoverCard side="top" align="end" content={<PersonCard guest={GOING[1]} />}>
            <a className={local.cardMention} href="/guests/tomas-ortega" onClick={stay}>
              @Tomás Ortega
            </a>
          </HoverCard>{" "}
          opens above the line and ends at the mention’s edge.
        </p>
      </section>
    </div>
  );
}
