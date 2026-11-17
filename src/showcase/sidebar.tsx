"use client";

import { useState } from "react";
import { Sidebar, SidebarProvider, SidebarToggle } from "@registry/sidebar/sidebar";
import { Icon } from "@registry/icons/icons";
import styles from "./showcase.module.css";

const ITEMS = [
  { id: "home", label: "Home", icon: <Icon name="home" /> },
  { id: "guests", label: "Guests", icon: <Icon name="list" />, badge: 3 },
  { id: "calendar", label: "Dinners", icon: <Icon name="calendar" /> },
];

const SECTIONS = [
  {
    id: "menus",
    label: "Menus",
    items: [
      { id: "saturday", label: "Saturday supper", icon: <Icon name="folder" /> },
      { id: "harvest", label: "Harvest dinner", icon: <Icon name="folder" /> },
    ],
  },
];

export default function Showcase() {
  const [page, setPage] = useState("home");
  return (
    <SidebarProvider shortcut={false}>
      <div className={styles.wide}>
        <SidebarToggle />
        <Sidebar aria-label="Supper club" items={ITEMS} sections={SECTIONS} value={page} onValueChange={setPage} />
      </div>
    </SidebarProvider>
  );
}
