"use client";

import { Breadcrumbs } from "@registry/breadcrumbs/breadcrumbs";
import base from "./preview.module.css";
import styles from "./breadcrumbs.module.css";

export function BreadcrumbsPreview() {
  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.header}>
          <Breadcrumbs
            items={[
              { label: "Events", href: "#events" },
              { label: "Saturday supper", href: "#saturday-supper" },
              { label: "Guests" },
            ]}
          />
          <h2 className={base.heading}>Guests</h2>
          <p className={base.note}>14 invited · 9 going · 3 waiting on a reply</p>
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Long trail, folded</h2>
        <Breadcrumbs
          items={[
            { label: "Maya’s suppers", href: "#suppers" },
            { label: "2026", href: "#2026" },
            { label: "Autumn", href: "#autumn" },
            { label: "Saturday supper", href: "#saturday-supper" },
            { label: "Menu", href: "#menu" },
            { label: "Lemon tart" },
          ]}
        />
        <p className={base.note}>Press … to open the middle in place.</p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Long labels fade</h2>
        <Breadcrumbs
          items={[
            { label: "Events", href: "#events" },
            { label: "Saturday supper at 14 Alder Lane with Priya, Dana and the neighbors from 12B", href: "#saturday-supper" },
            { label: "Seating plan for the long table under the pear tree, if it doesn’t rain" },
          ]}
        />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>A level with no page</h2>
        <Breadcrumbs
          items={[
            { label: "Events", href: "#events" },
            { label: "Drafts" },
            { label: "Soup night" },
          ]}
        />
      </section>
    </div>
  );
}
