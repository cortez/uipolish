"use client";

import { AvatarGroup } from "@registry/avatar/avatar";

const GOING = [{ name: "Maya Chen" }, { name: "Priya Raman" }, { name: "Tomás Ortega" }, { name: "Ines Laurent" }];

export default function Showcase() {
  return <AvatarGroup people={GOING} label="Going" max={4} />;
}
