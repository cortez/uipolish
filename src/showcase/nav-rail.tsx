"use client";

import { useState } from "react";
import { Icon } from "@registry/icons/icons";
import { NavRail } from "@registry/nav-rail/nav-rail";

const ITEMS = [
  { id: "today", label: "Today", icon: <Icon name="home" /> },
  { id: "dinners", label: "Dinners", icon: <Icon name="calendar" /> },
  { id: "guests", label: "Guests", icon: <Icon name="list" />, badge: 3 },
  { id: "settings", label: "Settings", icon: <Icon name="settings" /> },
];

export default function Showcase() {
  const [section, setSection] = useState("dinners");

  return <NavRail aria-label="Supper club" items={ITEMS} value={section} onValueChange={setSection} />;
}
