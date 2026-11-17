"use client";

import type { ReactNode } from "react";
import { SidebarToggle } from "@/components/ui/sidebar/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle/theme-toggle";
import styles from "./console.module.css";

/** The row over every screen: the sidebar toggle, the screen's own actions, the theme. The screen's title is its block's h1, just below. */
export function PageBar({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.bar}>
      <SidebarToggle />
      <div className={styles.barActions}>{children}</div>
      <ThemeToggle size="sm" variant="ghost" />
    </header>
  );
}

/** A screen: the bar, then its content scrolling under it. */
export function Page({ actions, children, wide = false }: { actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={styles.page}>
      <PageBar>{actions}</PageBar>
      <div className={styles.scroll}>
        <div className={wide ? `${styles.content} ${styles.wide}` : styles.content}>{children}</div>
      </div>
    </div>
  );
}
