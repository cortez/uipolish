"use client";

import type { CSSProperties } from "react";
import { AvatarGroup } from "@registry/avatar/avatar";

const GOING = [
  { name: "Maya Chen", src: "/avatars/maya-chen.jpg" },
  { name: "Priya Raman" },
  { name: "Tomás Ortega", src: "/avatars/tomas-ortega.jpg" },
  { name: "Ines Laurent", src: "/avatars/ines-laurent.jpg" },
];

export default function Showcase() {
  // The card sits on the page's canvas, so the ring between faces is cut in that color.
  return (
    <AvatarGroup
      people={GOING}
      label="Going"
      max={4}
      size={40}
      style={{ "--avatar-ring": "var(--ui-canvas)" } as CSSProperties}
    />
  );
}
