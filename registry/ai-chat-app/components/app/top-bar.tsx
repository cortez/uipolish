"use client";

import type { ReactNode } from "react";
import { SidebarToggle } from "@/components/ui/sidebar/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle/theme-toggle";
import styles from "./app.module.css";

/** Every page's header: the sidebar toggle, the page's title, its own controls, the theme. One 32px row. */
export function TopBar({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className={styles.bar}>
      <SidebarToggle />
      <h1 className={styles.title} dir="auto">
        {title}
      </h1>
      {children}
      <ThemeToggle size="sm" variant="ghost" />
    </header>
  );
}
