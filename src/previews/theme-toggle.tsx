"use client";

import { Badge } from "@registry/badge/badge";
import { Button } from "@registry/button/button";
import { ThemeSelect, ThemeToggle, useSystemTheme, type Theme } from "@registry/theme-toggle/theme-toggle";
import { useState } from "react";
import base from "./preview.module.css";
import styles from "./theme-toggle.module.css";

/** Both controls drive one card, themed on its own so the docs page stays put. */
export function ThemeTogglePreview() {
  const [theme, setTheme] = useState<Theme>("system");
  const system = useSystemTheme();
  const resolved = theme === "system" ? system : theme;

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.toolbar}>
          <h2 className={base.label}>Supper card, in its own theme</h2>
          <div className={styles.controls}>
            <ThemeSelect value={theme} onValueChange={setTheme} />
            <ThemeToggle size="sm" value={theme} onValueChange={setTheme} />
          </div>
        </div>

        <div className={styles.stage} data-theme={resolved}>
          <article className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.titles}>
                <h3 className={styles.title}>Saturday supper at Inés’s</h3>
                <p className={base.note}>Sat, Nov 8 · 7:30 pm · 41 Harbor View</p>
              </div>
              <Badge tone="accent">Waitlist open</Badge>
            </div>
            <p className={styles.menu}>
              Charred leeks with romesco, slow lamb shoulder, and a burnt honey tart. Bring something to pour.
            </p>
            <div className={styles.cardFoot}>
              <span className={base.note}>9 of 12 seats taken</span>
              <Button>Reserve a seat</Button>
            </div>
          </article>
        </div>
        <p className={base.note}>
          {theme === "system"
            ? `Following the system, which is ${system ?? "…"} right now.`
            : `Fixed to ${theme}. Choose System to follow the OS again.`}
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Sizes and variants</h2>
        <div className={base.row}>
          <ThemeToggle size="sm" value={theme} onValueChange={setTheme} />
          <ThemeToggle size="sm" variant="secondary" value={theme} onValueChange={setTheme} />
        </div>
        <div className={base.row}>
          <ThemeToggle size="md" value={theme} onValueChange={setTheme} />
          <ThemeToggle size="md" variant="secondary" value={theme} onValueChange={setTheme} />
        </div>
      </section>
    </div>
  );
}
