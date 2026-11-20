"use client";

import Link from "next/link";
import { Avatar } from "@registry/avatar/avatar";
import { HoverCard } from "@registry/hover-card/hover-card";
// The mention and the card's layout are the docs preview's own.
import local from "@/previews/hover-card.module.css";

export default function Showcase() {
  return (
    <p className={local.cardProse}>
      Seated beside{" "}
      <HoverCard
        side="top"
        align="center"
        content={
          <span className={local.cardPerson}>
            <Avatar name="Maya Chen" src="/avatars/maya-chen.jpg" size={40} decorative />
            <span className={local.cardText}>
              <span className={local.cardTitle}>Maya Chen</span>
              <span className={local.cardMeta}>Host</span>
              <span className={local.cardMeta}>Bringing the wine</span>
            </span>
          </span>
        }
      >
        <Link className={local.cardMention} href="/docs/hover-card">
          @Maya Chen
        </Link>
      </HoverCard>
    </p>
  );
}
