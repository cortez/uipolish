"use client";

import { AvatarGroup } from "@registry/avatar/avatar";

const GOING = [
  { name: "Maya Chen", src: "/avatars/maya-chen.jpg" },
  { name: "Priya Raman" },
  { name: "Tomás Ortega", src: "/avatars/tomas-ortega.jpg" },
  { name: "Ines Laurent", src: "/avatars/ines-laurent.jpg" },
];

export default function Showcase() {
  return <AvatarGroup people={GOING} label="Going" max={4} size={40} />;
}
