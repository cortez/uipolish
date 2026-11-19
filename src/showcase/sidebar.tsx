"use client";

import { useState } from "react";
import { Sidebar, SidebarProvider, SidebarToggle, useSidebar } from "@registry/sidebar/sidebar";
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

/* On a phone the sidebar is a drawer and leaves the row, so the page takes
   the whole card instead of the sidebar's narrow column. */
function Page() {
  const { mobile } = useSidebar();
  return (
    <div className={styles.page} style={mobile ? { gridColumn: "1 / -1" } : undefined}>
      <SidebarToggle />
    </div>
  );
}

export default function Showcase() {
  const [page, setPage] = useState("home");
  return (
    <SidebarProvider shortcut={false}>
      <div className={styles.app}>
        <Sidebar aria-label="Supper club" items={ITEMS} sections={SECTIONS} value={page} onValueChange={setPage} />
        <Page />
      </div>
    </SidebarProvider>
  );
}
